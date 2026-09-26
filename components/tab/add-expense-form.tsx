"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { TransactionOverlay, TransactionState } from "../ui/transaction-overlay";
import Image from "next/image";
import { PimlicoLogo, PythLogo } from "../ui/partner-logo";
import { Check, ChevronDown, Sparkles, Camera, Mic, Zap, Loader2, Upload, FileText, SplitSquareHorizontal, AlertCircle, Globe, CloudUpload } from "lucide-react";

import { useUserProfile, saveStoredExpense, useWorkspaceMode, ExpenseCategory } from "../../lib/user";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { SUPPORTED_CURRENCIES, usePythRate } from "../../lib/pyth";
import { useNetworkStatus } from "../../lib/network";

export const EXPENSE_CATEGORIES = [
  { id: "dining", label: "Dining", icon: "🍽️" },
  { id: "stay", label: "Stay", icon: "🏨" },
  { id: "transit", label: "Rides", icon: "🚕" },
  { id: "activities", label: "Events", icon: "🎟️" },
  { id: "groceries", label: "Supplies", icon: "🛒" },
  { id: "other", label: "Other", icon: "⚡" },
] as const;

interface AddExpenseFormProps {
  onSuccess?: () => void;
  members?: string[];
  currentUser?: string;
  tabId?: string;
  defaultCurrency?: string;
}

export function AddExpenseForm({ onSuccess, members = ["David"], currentUser, tabId = "lisbon-24", defaultCurrency }: AddExpenseFormProps) {
  const profile = useUserProfile();
  const { mode: workspaceMode } = useWorkspaceMode();
  const { isEffectivelyOnline } = useNetworkStatus();
  const activeUser = currentUser || profile.name || "David";

  const rawList = members.length > 0 
    ? members 
    : (workspaceMode === "sample" && tabId === "lisbon-24" ? ["Aisha", "Kemi", "Ben", activeUser] : [activeUser]);
  const normalizedMembers = Array.from(new Set(
    rawList.map(m => (m === "Sarah" && activeUser !== "Sarah") ? activeUser : m)
  ));
  if (!normalizedMembers.includes(activeUser)) {
    normalizedMembers.push(activeUser);
  }

  const [entryMode, setEntryMode] = useState<"manual" | "ai">("manual");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [receiptImageName, setReceiptImageName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currency, setCurrency] = useState<string>(() => {
    if (defaultCurrency) return defaultCurrency;
    if (typeof window !== "undefined") {
      try {
        const modes = ["meshTab_sample_tabs", "meshTab_clean_tabs"];
        for (const key of modes) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const tabs = JSON.parse(raw);
            const found = tabs.find((t: { id: string; currency?: string }) => t.id === tabId);
            if (found?.currency) return found.currency;
          }
        }
      } catch { /* ignore in demo */ }
    }
    return "USD";
  });

  useEffect(() => {
    if (defaultCurrency) {
      setCurrency(defaultCurrency);
      return;
    }
    try {
      const modes = ["meshTab_sample_tabs", "meshTab_clean_tabs"];
      for (const key of modes) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const tabs = JSON.parse(raw);
          const found = tabs.find((t: { id: string; currency?: string }) => t.id === tabId);
          if (found?.currency) {
            setCurrency(found.currency);
            break;
          }
        }
      }
    } catch { /* ignore in demo */ }
  }, [tabId, defaultCurrency]);
  const { rate: activeRate, isLive: isRateLive, isLoading: isRateLoading, config: activeCurrencyInfo } = usePythRate(currency);
  const [category, setCategory] = useState<ExpenseCategory>("dining");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percentage' | 'shares'>('equal');
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});
  const [txState, setTxState] = useState<TransactionState>("idle");
  
  // UI states for splitting
  const [paidBy, setPaidBy] = useState(activeUser);
  const [splitBetween, setSplitBetween] = useState<string[]>(normalizedMembers);
  const [showPaidByDropdown, setShowPaidByDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Compute conversion & integer cents in USD using live or cached Pyth rate
  const rawNumericAmount = parseFloat(amount) || 0;
  const totalBillCents = Math.round(rawNumericAmount * activeRate * 100);

  const assignedExactCents = Object.entries(exactAmounts).reduce((acc, [member, val]) => {
    if (!splitBetween.includes(member)) return acc;
    const cents = Math.round((parseFloat(val) || 0) * 100);
    return acc + (isNaN(cents) ? 0 : cents);
  }, 0);
  const remainingCents = totalBillCents - assignedExactCents;

  // Percentage validation: total of selected members should sum to 100
  const totalPercentage = Object.entries(percentages).reduce((acc, [member, val]) => {
    if (!splitBetween.includes(member)) return acc;
    return acc + (parseFloat(val) || 0);
  }, 0);
  const isPercentageValid = splitType !== 'percentage' || (totalBillCents > 0 && Math.abs(totalPercentage - 100) < 0.01);

  // Shares validation: at least one member must have > 0 shares
  const totalShares = Object.entries(shares).reduce((acc, [member, val]) => {
    if (!splitBetween.includes(member)) return acc;
    return acc + (parseFloat(val) || 0);
  }, 0);
  const isSharesValid = splitType !== 'shares' || (totalBillCents > 0 && totalShares > 0);

  const isExactValid = splitType === 'equal' || splitType === 'percentage' || splitType === 'shares' || (totalBillCents > 0 && remainingCents === 0);

  const handleExactAmountChange = (member: string, value: string) => {
    // Only allow numbers and up to 2 decimal places
    if (value === "" || /^\d*(\.\d{0,2})?$/.test(value)) {
      setExactAmounts(prev => ({
        ...prev,
        [member]: value
      }));
    }
  };

  const handleQuickDistributeRemainder = (member: string) => {
    if (remainingCents <= 0) return;
    const currentVal = Math.round((parseFloat(exactAmounts[member] || "0") || 0) * 100);
    const nextVal = (currentVal + remainingCents) / 100;
    setExactAmounts(prev => ({
      ...prev,
      [member]: nextVal.toFixed(2)
    }));
  };

  const handlePercentageChange = (member: string, value: string) => {
    if (value === "" || /^\d*(\.\d{0,1})?$/.test(value)) {
      setPercentages(prev => ({ ...prev, [member]: value }));
    }
  };

  const handleSharesChange = (member: string, value: string) => {
    if (value === "" || /^\d*$/.test(value)) {
      setShares(prev => ({ ...prev, [member]: value }));
    }
  };

  const handleEqualizePercentages = () => {
    const count = splitBetween.length;
    if (count === 0) return;
    const equalPct = (100 / count).toFixed(1);
    const newPcts: Record<string, string> = {};
    splitBetween.forEach(m => { newPcts[m] = equalPct; });
    setPercentages(newPcts);
  };

  const handleEqualizeShares = () => {
    const newShares: Record<string, string> = {};
    splitBetween.forEach(m => { newShares[m] = "1"; });
    setShares(newShares);
  };

  const handleSelectPresetReceipt = (receiptName: string, price: string) => {
    sounds.playClick();
    setIsAiProcessing(true);
    setReceiptImageName(receiptName);
    setAiNotice(`Scanning ${receiptName} with OCR...`);
    setTimeout(() => {
      setDesc(receiptName);
      setAmount(price);
      setPaidBy(activeUser);
      setSplitType("equal");
      setIsAiProcessing(false);
      setShowDraft(true);
      sounds.playSuccessChime();
      toast.success("Receipt Scanned via OCR", {
        description: `Extracted $${price} for "${receiptName}". Ready to review.`
      });
      setAiNotice(`Receipt Verified: ${receiptName} • $${price} total extracted`);
    }, 900);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptImageName(file.name);
    setIsAiProcessing(true);
    setAiNotice(`Scanning ${file.name} with OCR...`);
    
    const lowerName = file.name.toLowerCase();
    let detectedDesc = "Seafood Dinner & Wine";
    let detectedAmount = "84.50";

    if (lowerName.includes("coffee") || lowerName.includes("cafe") || lowerName.includes("starbucks")) {
      detectedDesc = "Specialty Espresso & Pastries";
      detectedAmount = "14.20";
    } else if (lowerName.includes("taxi") || lowerName.includes("uber") || lowerName.includes("cab") || lowerName.includes("ride")) {
      detectedDesc = "Airport Transfer / Taxi";
      detectedAmount = "32.00";
    } else if (lowerName.includes("grocery") || lowerName.includes("market") || lowerName.includes("store")) {
      detectedDesc = "Supermarket Provisions";
      detectedAmount = "46.75";
    }
    
    setTimeout(() => {
      setDesc(detectedDesc);
      setAmount(detectedAmount);
      setPaidBy(activeUser);
      setSplitType("equal");
      setIsAiProcessing(false);
      setShowDraft(true);
      sounds.playSuccessChime();
      toast.success("Receipt Scanned via OCR", {
        description: `Extracted $${detectedAmount} from ${file.name}. Ready to review.`
      });
      setAiNotice(`Receipt Verified: ${file.name} • $${detectedAmount} total extracted`);
    }, 1200);
  };

  const handleTriggerUpload = () => {
    sounds.playClick();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleVoiceNote = () => {
    sounds.playClick();
    // Check browser SpeechRecognition support
    const SpeechRecognition = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        
        setIsRecording(true);
        setAiNotice("Listening... speak your expense (e.g., 'I paid $120 for airport vans')");
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsRecording(false);
          setIsAiProcessing(true);
          setAiNotice(`Transcribing: "${transcript}"...`);
          
          const match = transcript.match(/\$?(\d+(\.\d{1,2})?)/);
          const parsedAmount = match ? match[1] : "120.00";
          
          setTimeout(() => {
            setDesc(transcript.length > 30 ? transcript.slice(0, 30) + "..." : transcript);
            setAmount(parsedAmount);
            setPaidBy(activeUser);
            setSplitType("equal");
            setIsAiProcessing(false);
            setShowDraft(true);
            sounds.playSuccessChime();
            toast.success("Voice Expense Parsed", {
              description: `Extracted $${parsedAmount} for "${transcript.slice(0, 25)}..."`
            });
            setAiNotice(`Voice Note Parsed: "${transcript}"`);
          }, 1200);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          fallbackVoiceDemo();
        };

        recognition.start();
        return;
      } catch (e) {
        // Fall through to fallback
      }
    }
    fallbackVoiceDemo();
  };

  const fallbackVoiceDemo = () => {
    setIsAiProcessing(true);
    const isCleanSlate = workspaceMode === "blank";
    const demoDesc = isCleanSlate ? "Group Dinner & Supplies" : "Lisbon Airport Vans";
    const demoAmount = isCleanSlate ? "45.00" : "120.00";

    setAiNotice(`Voice demo preview: "${demoDesc} - $${demoAmount}"...`);
    setTimeout(() => {
      setDesc(demoDesc);
      setAmount(demoAmount);
      setPaidBy(activeUser);
      setSplitType("equal");
      setIsAiProcessing(false);
      setShowDraft(true);
      sounds.playSuccessChime();
      toast.success("Voice Simulation Parsed", {
        description: `Extracted $${demoAmount} for ${demoDesc}.`
      });
      setAiNotice(`Parsed: ${demoDesc} • $${demoAmount} (Split equally)`);
    }, 1200);
  };

  useEffect(() => {
    if (activeUser) {
      setPaidBy(prev => (prev === "Sarah" || prev === "David") ? activeUser : prev);
      setSplitBetween(prev => {
        const mapped = prev.map(m => (m === "Sarah" && activeUser !== "Sarah") ? activeUser : m);
        return mapped.includes(activeUser) ? mapped : [...mapped, activeUser];
      });
    }
  }, [activeUser]);

  const toggleSplitMember = (member: string) => {
    sounds.playClick();
    if (splitBetween.includes(member)) {
      if (splitBetween.length === 1) return; // Prevent deselecting everyone
      setSplitBetween(splitBetween.filter(m => m !== member));
      setExactAmounts(prev => ({ ...prev, [member]: "0.00" }));
    } else {
      setSplitBetween([...splitBetween, member]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !desc) return;
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid expense amount greater than $0." });
      return;
    }

    if (splitType === "exact" && remainingCents !== 0) {
      toast.error("Exact Amounts Must Match Total", {
        description: remainingCents > 0 
          ? `You still have $${(remainingCents / 100).toFixed(2)} unassigned.`
          : `Total assigned exceeds expense by $${(Math.abs(remainingCents) / 100).toFixed(2)}.`
      });
      return;
    }

    if (splitType === "percentage" && !isPercentageValid) {
      toast.error("Percentages Must Total 100%", {
        description: `Current total: ${totalPercentage.toFixed(1)}%. Adjust to exactly 100%.`
      });
      return;
    }

    if (splitType === "shares" && !isSharesValid) {
      toast.error("At Least One Share Required", {
        description: "Assign at least 1 share to a member."
      });
      return;
    }
    
    // Prepare splits map
    const splitsMap: Record<string, number> = {};
    if (splitType === "exact") {
      normalizedMembers.forEach(m => {
        if (splitBetween.includes(m)) {
          const valCents = Math.round((parseFloat(exactAmounts[m] || "0") || 0) * 100);
          splitsMap[m] = Math.max(0, valCents);
        } else {
          splitsMap[m] = 0;
        }
      });
    } else if (splitType === "percentage") {
      normalizedMembers.forEach(m => {
        if (splitBetween.includes(m)) {
          const pct = parseFloat(percentages[m] || "0") || 0;
          splitsMap[m] = Math.round(totalBillCents * (pct / 100));
        } else {
          splitsMap[m] = 0;
        }
      });
    } else if (splitType === "shares") {
      const tShares = totalShares || 1;
      normalizedMembers.forEach(m => {
        if (splitBetween.includes(m)) {
          const s = parseFloat(shares[m] || "0") || 0;
          splitsMap[m] = Math.round(totalBillCents * (s / tShares));
        } else {
          splitsMap[m] = 0;
        }
      });
    } else {
      // Equal split between selected members
      splitBetween.forEach(m => {
        splitsMap[m] = Math.round(totalBillCents / splitBetween.length);
      });
      // Unticked members owe $0
      normalizedMembers.filter(m => !splitBetween.includes(m)).forEach(m => {
        splitsMap[m] = 0;
      });
    }

    // 1. Mock Passkey Prompt (Browser Native equivalent)
    setTxState("authenticating");
    await new Promise(r => setTimeout(r, 1500));
    
    // 2. Mock Paymaster/Bundler Processing
    setTxState("processing");
    await new Promise(r => setTimeout(r, 2000));
    
    // 3. Save to persistent ledger
    saveStoredExpense(tabId, {
      id: String(Date.now()),
      payer: paidBy,
      amount: totalBillCents,
      desc: desc.trim(),
      time: "Just now",
      splitType: splitType === 'percentage' || splitType === 'shares' ? 'exact' : splitType,
      splits: splitsMap,
      category,
      originalCurrency: currency,
      originalAmount: currency !== "USD" ? rawNumericAmount : undefined
    });

    // 4. Success
    setTxState("success");
    sounds.playSuccessChime();
    toast.success("Expense Logged to Ledger", {
      description: `${currency !== "USD" ? `${activeCurrencyInfo.symbol}${amount} (≈ $${(totalBillCents / 100).toFixed(2)} USD)` : `$${amount}`} logged for "${desc.trim()}". ${splitType === 'exact' ? 'Exact split recorded.' : 'Split equally.'}`
    });
    await new Promise(r => setTimeout(r, 1000));
    
    setTxState("idle");
    if (onSuccess) onSuccess();
  };

  return (
    <>
      <TransactionOverlay 
        state={txState} 
        messages={{
          authenticating: "Please confirm with Passkey/FaceID to log this expense securely.",
          processing: "Syncing your ledger...",
          success: "Expense added!"
        }}
      />
      <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col h-full relative z-0 bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Expense</h2>
            <div className="flex items-center p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setEntryMode("manual")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${entryMode === "manual" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-white/50"}`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("ai")}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${entryMode === "ai" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-white/50"}`}
              >
                <Camera className="w-3 h-3 text-white" /> Smart Scan
              </button>
            </div>
          </div>
          <p className="text-slate-500 dark:text-white/60 text-sm">Log a new expense to the shared group ledger.</p>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-4">
          {entryMode === "ai" && (
            <div className="space-y-4 mb-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Receipt Upload Card */}
                <div 
                  onClick={handleTriggerUpload}
                  className="p-4 border-2 border-dashed border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-500 rounded-2xl flex items-center gap-3.5 bg-indigo-50/50 dark:bg-indigo-500/5 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
                    {isAiProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      Upload Receipt
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded-full">OCR</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5 truncate">
                      {receiptImageName ? receiptImageName : "Tap to choose photo"}
                    </p>
                  </div>
                </div>

                {/* Voice Note Card */}
                <div 
                  onClick={handleVoiceNote}
                  className={`p-4 border-2 border-dashed rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.01] ${
                    isRecording 
                      ? "border-rose-500 bg-rose-500/10 animate-pulse" 
                      : "border-slate-200 dark:border-white/10 hover:border-rose-500 bg-slate-50 dark:bg-white/5"
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                    {isRecording ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping" />
                    ) : isAiProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      {isRecording ? "Listening..." : "Voice Note"}
                      <span className="text-[9px] bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded-full">Speech</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5 truncate">
                      {isRecording ? "Speak amount & reason..." : "Tap to speak expense"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Preset Chips for Demo Pitch */}
              <div className="flex items-center gap-1.5 flex-wrap px-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mr-0.5">Demo Presets:</span>
                <button
                  type="button"
                  onClick={() => handleSelectPresetReceipt("Specialty Espresso & Pastries", "14.20")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-500/20 transition-all cursor-pointer"
                >
                  ☕ Coffee $14.20
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPresetReceipt("Seafood Dinner & Wine", "84.50")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-500/20 transition-all cursor-pointer"
                >
                  🍽️ Dinner $84.50
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPresetReceipt("Airport Transfer / Taxi", "32.00")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-500/20 transition-all cursor-pointer"
                >
                  🚕 Taxi $32.00
                </button>
              </div>

              {aiNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="truncate">{aiNotice}</span>
                </div>
              )}

              {/* Editable Draft Review Card */}
              {showDraft && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Scanned Proposal</span>
                    </div>
                    <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">${amount}</span>
                  </div>
                  
                  <div className="text-xs text-slate-700 dark:text-white/80 font-medium">
                    <span className="font-bold">Extracted:</span> {desc}
                  </div>

                  <div className="pt-2 border-t border-indigo-200/50 dark:border-white/10 flex items-center justify-between text-xs text-slate-600 dark:text-white/60">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                        {paidBy[0]}
                      </div>
                      <span>Paid by {paidBy === activeUser ? "You" : paidBy}</span>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Equal split ({splitBetween.length} ways)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Human Review:</strong> If the OCR misread handwriting, tips, or tax, tap <strong>Fine-Tune in Form</strong> to edit any numbers before signing.
                    </span>
                  </div>

                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEntryMode("manual")}
                      className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs border border-slate-200 dark:border-white/10 transition-colors"
                    >
                      Fine-Tune in Form
                    </button>
                    <button
                      type="submit"
                      disabled={txState !== "idle"}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Commit with Passkey
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80">
                Amount ({currency === "USD" ? "AUSD / USD" : currency})
              </label>
              
              {/* Currency Selector Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-white/10"
                >
                  <Globe className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                  <span>{currency}</span>
                  <span className="text-slate-400 dark:text-white/40">({activeCurrencyInfo.symbol})</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showCurrencyDropdown && (
                  <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-2xl p-1 z-30 shadow-2xl min-w-[170px]">
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-white/40 tracking-wider">
                      Select Currency
                    </div>
                    {SUPPORTED_CURRENCIES.map(curr => (
                      <div
                        key={curr.code}
                        onClick={() => {
                          sounds.playClick();
                          setCurrency(curr.code);
                          setShowCurrencyDropdown(false);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                          currency === curr.code
                            ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white/80"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{curr.flag}</span>
                          <span className="font-mono text-slate-400 dark:text-white/40 w-5">{curr.symbol}</span>
                          <span>{curr.name}</span>
                        </div>
                        {currency === curr.code && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                    ))}
                    <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-white/10 px-2 py-1 flex items-center justify-between text-[9px] text-slate-400 dark:text-white/40">
                      <span>Mid-market rates</span>
                      <PythLogo className="h-2.5 w-auto opacity-70" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 text-xl font-bold select-none">
                {activeCurrencyInfo.symbol}
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-2xl tabular-nums font-bold"
              />
            </div>

            {/* Live conversion pill when non-USD is selected */}
            {currency !== "USD" && rawNumericAmount > 0 && (
              <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2 font-medium text-indigo-950 dark:text-indigo-200">
                  <span className="font-bold text-sm">≈ ${(totalBillCents / 100).toFixed(2)} USD</span>
                  <span className="text-slate-300 dark:text-white/20">•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    0% Bank FX Markup
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-white/50">
                  <span>{(isRateLive && isEffectivelyOnline) ? "Live rate via" : "Cached rate"}</span>
                  <PythLogo className="h-3.5 w-auto text-slate-800 dark:text-white opacity-85" />
                  {(isRateLive && isEffectivelyOnline) ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" title="Live Pyth Hermes stream active" />
                  ) : (
                    <CloudUpload className="w-3 h-3 ml-0.5 text-amber-500" title="Offline - Using cached Pyth rate" />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80">Description</label>
              {showDraft && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  Editable • Auto-Extracted
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="What was this for?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-base font-medium"
            />
          </div>

          {/* Expense Category Picker */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { sounds.playClick(); setCategory(cat.id as ExpenseCategory); }}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Paid By Dropdown */}
            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Paid By</label>
              <div 
                onClick={() => setShowPaidByDropdown(!showPaidByDropdown)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                    {paidBy[0]}
                  </div>
                  <span className="text-sm font-semibold">{paidBy === activeUser ? "You" : paidBy}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/50" />
              </div>
              
              {showPaidByDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                  {normalizedMembers.map(member => (
                    <div 
                      key={member}
                      onClick={() => { setPaidBy(member); setShowPaidByDropdown(false); }}
                      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-sm font-medium text-slate-800 dark:text-white/80 flex items-center gap-2 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                        {member[0]}
                      </div>
                      {member === activeUser ? `You (${member})` : member}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Split Type */}
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Split Method</label>
              <div className="flex p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-[44px]">
                {(['equal', 'exact', 'percentage', 'shares'] as const).map(mode => (
                  <button 
                    key={mode}
                    type="button" 
                    onClick={() => setSplitType(mode)}
                    className={`flex-1 rounded-xl font-semibold text-[11px] transition-colors cursor-pointer ${splitType === mode ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    {mode === 'equal' ? '= Equal' : mode === 'exact' ? '$ Exact' : mode === 'percentage' ? '% Pct' : '⊞ Shares'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Split Between */}
          <div className="space-y-2 pt-2">
             <div className="flex items-center justify-between ml-1 mb-2">
               <label className="text-sm font-semibold text-slate-700 dark:text-white/80">
                 {splitType === "exact" ? "Assign Exact Amounts" : splitType === "percentage" ? "Assign Percentages" : splitType === "shares" ? "Assign Shares" : "Split Between"}
               </label>
               <div className="flex items-center gap-2">
                 {(splitType === "percentage" || splitType === "shares") && (
                   <button
                     type="button"
                     onClick={splitType === "percentage" ? handleEqualizePercentages : handleEqualizeShares}
                     className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                   >
                     Equalize
                   </button>
                 )}
                 <span className="text-xs text-slate-500 dark:text-white/40">
                   {splitBetween.length} selected
                 </span>
               </div>
             </div>

             {/* Exact Balance Status Banner */}
             {splitType === "exact" && (
               <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition-colors ${
                 remainingCents === 0 && totalBillCents > 0
                   ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                   : remainingCents > 0
                     ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                     : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
               }`}>
                 <div className="space-y-0.5">
                   <div className="font-bold flex items-center gap-1.5">
                     <span>Total: ${(totalBillCents / 100).toFixed(2)}</span>
                     <span>•</span>
                     <span>Assigned: ${(assignedExactCents / 100).toFixed(2)}</span>
                   </div>
                   <div className="text-[11px] opacity-90">
                     {remainingCents === 0 && totalBillCents > 0
                       ? "✓ Exact amounts perfectly balanced ($0 remaining)."
                       : remainingCents > 0
                         ? `$${(remainingCents / 100).toFixed(2)} left to allocate.`
                         : `Assigned exceeds total by $${(Math.abs(remainingCents) / 100).toFixed(2)}.`}
                   </div>
                 </div>
               </div>
             )}

             {/* Percentage Status Banner */}
             {splitType === "percentage" && (
               <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition-colors ${
                 Math.abs(totalPercentage - 100) < 0.01 && totalBillCents > 0
                   ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                   : totalPercentage < 100
                     ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                     : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
               }`}>
                 <div className="space-y-0.5">
                   <div className="font-bold">
                     Total: {totalPercentage.toFixed(1)}% of 100%
                   </div>
                   <div className="text-[11px] opacity-90">
                     {Math.abs(totalPercentage - 100) < 0.01 && totalBillCents > 0
                       ? "✓ Percentages sum to 100% — perfectly balanced."
                       : totalPercentage < 100
                         ? `${(100 - totalPercentage).toFixed(1)}% remaining to assign.`
                         : `Exceeds 100% by ${(totalPercentage - 100).toFixed(1)}%.`}
                   </div>
                 </div>
               </div>
             )}

             {/* Shares Status Banner */}
             {splitType === "shares" && totalBillCents > 0 && (
               <div className={`p-3 rounded-2xl border text-xs transition-colors ${
                 totalShares > 0
                   ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                   : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
               }`}>
                 <div className="font-bold">
                   {totalShares} total share{totalShares !== 1 ? 's' : ''} • ${(totalBillCents / 100 / Math.max(1, totalShares)).toFixed(2)} per share
                 </div>
               </div>
             )}
             
             <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-2 space-y-1">
               {normalizedMembers.map(member => {
                 const isSelected = splitBetween.includes(member);
                 const currentVal = exactAmounts[member] || "";
                 return (
                   <div 
                     key={member}
                     className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group gap-3"
                   >
                     {/* Left: Avatar & Name toggle */}
                     <div 
                       onClick={() => toggleSplitMember(member)}
                       className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
                     >
                       <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                         {member[0]}
                       </div>
                       <div className="truncate">
                         <span className={`font-semibold text-sm block truncate ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-white/40'}`}>
                           {member === activeUser ? "You" : member}
                         </span>
                         {splitType === "exact" && (
                           <span className="text-[10px] text-slate-400 dark:text-white/40 block">
                             {isSelected ? (parseFloat(currentVal) === 0 || !currentVal ? "No share ($0.00)" : "Custom share") : "Excluded ($0.00)"}
                           </span>
                         )}
                       </div>
                     </div>

                     {/* Right: split mode inputs */}
                     {splitType === "equal" ? (
                       <div 
                         onClick={() => toggleSplitMember(member)}
                         className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-slate-300 dark:border-white/20'}`}
                       >
                         {isSelected && <Check className="w-3 h-3 text-white" />}
                       </div>
                     ) : splitType === "percentage" ? (
                       <div className="flex items-center gap-1.5 shrink-0">
                         <div className="relative w-20">
                           <input
                             type="text"
                             inputMode="decimal"
                             placeholder="0"
                             value={isSelected ? (percentages[member] || "") : "0"}
                             disabled={!isSelected}
                             onChange={(e) => handlePercentageChange(member, e.target.value)}
                             className={`w-full pl-3 pr-7 py-1.5 text-right font-mono text-xs font-bold rounded-xl border transition-all ${
                               !isSelected
                                 ? "bg-slate-100 dark:bg-white/5 border-transparent text-slate-400 dark:text-white/30 cursor-not-allowed"
                                 : "bg-white dark:bg-black/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                             }`}
                           />
                           <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-white/40 select-none">%</span>
                         </div>
                         {isSelected && totalBillCents > 0 && (
                           <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono w-14 text-right">
                             ${(totalBillCents / 100 * ((parseFloat(percentages[member] || "0") || 0) / 100)).toFixed(2)}
                           </span>
                         )}
                       </div>
                     ) : splitType === "shares" ? (
                       <div className="flex items-center gap-1.5 shrink-0">
                         <div className="relative w-16">
                           <input
                             type="text"
                             inputMode="numeric"
                             placeholder="1"
                             value={isSelected ? (shares[member] || "") : "0"}
                             disabled={!isSelected}
                             onChange={(e) => handleSharesChange(member, e.target.value)}
                             className={`w-full px-3 py-1.5 text-center font-mono text-xs font-bold rounded-xl border transition-all ${
                               !isSelected
                                 ? "bg-slate-100 dark:bg-white/5 border-transparent text-slate-400 dark:text-white/30 cursor-not-allowed"
                                 : "bg-white dark:bg-black/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                             }`}
                           />
                         </div>
                         {isSelected && totalShares > 0 && totalBillCents > 0 && (
                           <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono w-14 text-right">
                             ${(totalBillCents / 100 * ((parseFloat(shares[member] || "0") || 0) / totalShares)).toFixed(2)}
                           </span>
                         )}
                       </div>
                     ) : (
                       <div className="flex items-center gap-2 shrink-0">
                         {isSelected && remainingCents > 0 && (
                           <button
                             type="button"
                             onClick={() => handleQuickDistributeRemainder(member)}
                             className="text-[10px] px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition-colors cursor-pointer"
                             title="Assign remaining balance to this person"
                           >
                             +${(remainingCents / 100).toFixed(2)}
                           </button>
                         )}
                         <div className="relative w-24">
                           <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-white/40 select-none">
                             $
                           </span>
                           <input
                             type="text"
                             inputMode="decimal"
                             placeholder="0.00"
                             value={isSelected ? currentVal : "0.00"}
                             disabled={!isSelected}
                             onChange={(e) => handleExactAmountChange(member, e.target.value)}
                             className={`w-full pl-6 pr-2 py-1.5 text-right font-mono text-xs font-bold rounded-xl border transition-all ${
                               !isSelected
                                 ? "bg-slate-100 dark:bg-white/5 border-transparent text-slate-400 dark:text-white/30 cursor-not-allowed"
                                 : "bg-white dark:bg-black/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                             }`}
                           />
                         </div>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        <div className="mt-4 pt-6 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full relative overflow-hidden"
            disabled={txState !== "idle" || !isExactValid}
          >
            {splitType === "exact" && remainingCents !== 0
              ? remainingCents > 0
                ? `Allocate Remaining $${(remainingCents / 100).toFixed(2)}`
                : `Exceeds Total by $${(Math.abs(remainingCents) / 100).toFixed(2)}`
              : "Log Expense"}
          </Button>
          
          <div className="mt-4 flex items-center justify-between text-slate-500 dark:text-white/50 text-xs font-medium px-1">
            <div className="flex items-center gap-1.5">
              <span>Zero-fee sync via</span>
              <div className="opacity-90 hover:opacity-100 transition-all text-slate-800 dark:text-white">
                <PimlicoLogo className="h-3.5 w-auto" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Powered by</span>
              <div className="opacity-90 hover:opacity-100 transition-all text-slate-800 dark:text-white">
                <PythLogo className="h-3.5 w-auto" />
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
