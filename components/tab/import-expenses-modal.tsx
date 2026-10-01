"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Sparkles, Check, AlertCircle, Trash2, ArrowRight, X, FileText, CheckCircle2 } from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import { ExpenseCategory, getStoredTabMembers, saveStoredTabMembers, saveStoredExpense, type TabMember } from "../../lib/user";
import { pushTabStateToRedis } from "../../lib/sync";
import { sounds } from "../../lib/sounds";
import { fireSettlementConfetti } from "../../lib/confetti";
import { toast } from "sonner";
import { EnvioLogo, MonadLogo } from "../ui/partner-logo";

interface ImportExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabId: string;
  tabName: string;
  currentUserName: string;
}

interface ParsedExpense {
  id: string;
  desc: string;
  amountCents: number;
  payer: string;
  category: ExpenseCategory;
}

function inferCategory(desc: string): ExpenseCategory {
  const lower = desc.toLowerCase();
  if (lower.includes("villa") || lower.includes("hotel") || lower.includes("airbnb") || lower.includes("stay") || lower.includes("room")) {
    return "stay";
  }
  if (lower.includes("dinner") || lower.includes("food") || lower.includes("wine") || lower.includes("coffee") || lower.includes("cafe") || lower.includes("lunch") || lower.includes("meal") || lower.includes("pizza") || lower.includes("seafood")) {
    return "dining";
  }
  if (lower.includes("taxi") || lower.includes("uber") || lower.includes("cab") || lower.includes("van") || lower.includes("flight") || lower.includes("gas") || lower.includes("transfer")) {
    return "transit";
  }
  if (lower.includes("excursion") || lower.includes("event") || lower.includes("ticket") || lower.includes("tour") || lower.includes("party") || lower.includes("show")) {
    return "activities";
  }
  if (lower.includes("grocery") || lower.includes("market") || lower.includes("supplies") || lower.includes("store") || lower.includes("provisions")) {
    return "groceries";
  }
  return "other";
}

export function ImportExpensesModal({
  isOpen,
  onClose,
  tabId,
  tabName,
  currentUserName
}: ImportExpensesModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState("");
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"file" | "paste">("paste");

  if (!isOpen) return null;

  const parseCsvText = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const results: ParsedExpense[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header lines
      if (i === 0 && (line.toLowerCase().includes("cost") || line.toLowerCase().includes("amount") || line.toLowerCase().includes("description"))) {
        continue;
      }

      // Support comma, tab, or semicolon separation
      const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ""));

      if (parts.length >= 2) {
        let desc = parts[0];
        let amountStr = parts[1];
        let payer = parts[2] || currentUserName;

        // If part 0 is a number, user might have pasted: "Amount, Description, Payer"
        if (/^\$?\d+(\.\d+)?$/.test(desc) && isNaN(Number(amountStr))) {
          const temp = desc;
          desc = amountStr;
          amountStr = temp;
        }

        const cleanAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ""));
        if (!isNaN(cleanAmount) && cleanAmount > 0) {
          results.push({
            id: `import-${Date.now()}-${i}`,
            desc: desc || `Imported Expense #${i + 1}`,
            amountCents: Math.round(cleanAmount * 100),
            payer: payer || currentUserName,
            category: inferCategory(desc)
          });
        }
      }
    }

    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playClick();
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCsvText(text);
        if (parsed.length > 0) {
          setParsedExpenses(parsed);
          sounds.playSuccessChime();
          toast.success(`Parsed ${parsed.length} Expenses from CSV!`, {
            description: "Review your items below before importing."
          });
        } else {
          toast.error("Could not parse expenses from file", {
            description: "Please check your CSV format (Description, Amount, Payer)."
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleParsePastedText = () => {
    if (!pasteText.trim()) return;
    sounds.playClick();
    const parsed = parseCsvText(pasteText);
    if (parsed.length > 0) {
      setParsedExpenses(parsed);
      sounds.playSuccessChime();
      toast.success(`Found ${parsed.length} Expenses!`, {
        description: "Review and click Import to add them to your live ledger."
      });
    } else {
      toast.error("No valid lines detected", {
        description: "Enter one expense per line (e.g., 'Villa Booking, 600, Aisha')."
      });
    }
  };

  const handleLoadSampleData = () => {
    sounds.playClick();
    const sample = `Villa Booking, 600.00, Aisha
Dinners & Wine, 260.00, Kemi
Boat Excursions, 220.00, Ben
Airport Van Logistics, 120.00, Sarah`;
    setPasteText(sample);
    const parsed = parseCsvText(sample);
    setParsedExpenses(parsed);
    sounds.playSuccessChime();
  };

  const handleRemoveItem = (id: string) => {
    sounds.playClick();
    setParsedExpenses(prev => prev.filter(p => p.id !== id));
  };

  const handleExecuteImport = async () => {
    if (parsedExpenses.length === 0) return;
    setIsProcessing(true);
    sounds.playClick();

    // 1. Fetch current roster
    let members = getStoredTabMembers(tabId, currentUserName);
    const memberNames = new Set(members.map(m => m.name.toLowerCase()));

    // 2. Add any newly discovered payers to the roster if they don't already exist
    parsedExpenses.forEach(exp => {
      if (!memberNames.has(exp.payer.toLowerCase())) {
        members.push({
          name: exp.payer,
          balance: 0,
          type: "settled",
          role: "member"
        });
        memberNames.add(exp.payer.toLowerCase());
      }
    });

    // 2.5 Save members first so saveStoredExpense sees any new payers
    saveStoredTabMembers(tabId, members);

    // 3. Import each expense and compute zero-sum distribution
    const now = new Date();
    parsedExpenses.forEach((exp, idx) => {
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      
      // Let saveStoredExpense handle the balance update and participants automatically
      saveStoredExpense(tabId, {
        id: `import-${Date.now()}-${idx}`,
        desc: exp.desc,
        amount: exp.amountCents,
        payer: exp.payer,
        time: timeStr,
        category: exp.category
      });
    });

    // 5. Push to Redis for cross-device sync
    pushTabStateToRedis(tabId);

    // 6. Notify UI
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meshTab-expenses-update"));
      window.dispatchEvent(new Event("meshTab-members-update"));
      window.dispatchEvent(new Event("meshTab-tabs-update"));
    }

    await new Promise(r => setTimeout(r, 600));
    setIsProcessing(false);
    sounds.playSuccessChime();
    fireSettlementConfetti();

    toast.success(`Successfully Imported ${parsedExpenses.length} Expenses!`, {
      description: `Added to ${tabName} with zero-sum debt conservation.`
    });

    onClose();
  };

  const totalGrossCents = parsedExpenses.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <Modal onClose={onClose} hideCloseButton={true} className="max-w-xl p-0 overflow-hidden bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-white/10 rounded-[32px] shadow-2xl text-slate-900 dark:text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Import Expenses</h3>
            <p className="text-xs text-slate-500 dark:text-white/50">Migrate from Splitwise, CSV, or text</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Method Toggle */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-white/5 p-1 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "paste"
                ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-white/60 hover:text-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Paste Lines / Text
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "file"
                ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-white/60 hover:text-slate-800"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload CSV File
          </button>
        </div>

        {/* Option 1: Paste Text */}
        {activeTab === "paste" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">
                Paste Rows (Description, Amount, Payer)
              </label>
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Load Sample Lisbon Trip
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Villa Booking, 600.00, Aisha&#10;Dinners & Wine, 260.00, Kemi&#10;Excursions, 220.00, Ben"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-400"
            />
            <Button
              type="button"
              onClick={handleParsePastedText}
              disabled={!pasteText.trim()}
              variant="secondary"
              size="sm"
              className="w-full gap-2 font-bold cursor-pointer"
            >
              Parse Pasted Lines
            </Button>
          </div>
        )}

        {/* Option 2: File Upload */}
        {activeTab === "file" && (
          <div className="space-y-3">
            <input
              type="file"
              accept=".csv,.txt"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-slate-200 dark:border-white/20 hover:border-indigo-500 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3 text-indigo-600 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Choose CSV File from Device</h4>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-xs">
                Export your group data from Splitwise or Tricount as a CSV and drop it here.
              </p>
            </div>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedExpenses.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                Ready to Import ({parsedExpenses.length} Items)
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Total: {formatCurrency(totalGrossCents)}
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {parsedExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-sm shrink-0">
                      {exp.category === "dining" ? "🍽️" : exp.category === "stay" ? "🏨" : exp.category === "transit" ? "🚕" : exp.category === "activities" ? "🎟️" : "⚡"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{exp.desc}</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50">Paid by <strong className="text-slate-700 dark:text-white/80">{exp.payer}</strong></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                      {formatCurrency(exp.amountCents)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(exp.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 space-y-3">
        <Button
          onClick={handleExecuteImport}
          disabled={parsedExpenses.length === 0 || isProcessing}
          variant="primary"
          size="lg"
          className="w-full h-12 font-bold cursor-pointer"
          isLoading={isProcessing}
        >
          {parsedExpenses.length > 0
            ? `Import ${parsedExpenses.length} Expenses (${formatCurrency(totalGrossCents)})`
            : "Select or Paste Expenses to Import"}
        </Button>

        {/* Partner Attribution */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-white/40 pt-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zero-Sum Netting Preserved</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Indexed via</span>
            <div className="opacity-90 hover:opacity-100 text-slate-700 dark:text-white">
              <EnvioLogo className="h-3.5 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
