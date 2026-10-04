"use client";

import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Camera, Download, RefreshCw, X, AlertCircle } from "lucide-react";
import { getStoredExpenses, getStoredTabMembers, getWorkspaceMode, StoredExpense, TabMember, saveStoredExpense, saveStoredTabMembers } from "../../lib/user";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import confetti from "canvas-confetti";

interface OfflineMeshSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabId: string;
}

export function OfflineMeshSyncModal({ isOpen, onClose, tabId }: OfflineMeshSyncModalProps) {
  const [activeTab, setActiveTab] = useState<"share" | "scan">("share");
  const [pendingExpenses, setPendingExpenses] = useState<StoredExpense[]>([]);
  const [payload, setPayload] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [mergeReceipt, setMergeReceipt] = useState<{ expenses: number, members: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const expenses = getStoredExpenses(tabId);
      const pending = expenses.filter(e => e.syncStatus === "pending");
      
      // Limit to 15 to keep QR readable
      const capped = pending.slice(0, 15);
      setPendingExpenses(capped);
      
      const localMembers = getStoredTabMembers(tabId, "System");

      // Compress expenses
      const compExp = capped.map(e => ({
        id: e.id,
        p: e.payer,
        a: e.amount,
        d: e.desc,
        tm: e.time,
        st: e.splitType,
        sp: e.splits,
        cat: e.category,
        oc: e.originalCurrency,
        oa: e.originalAmount,
        ss: e.syncStatus
      }));

      // Compress members
      const compMem = localMembers.map(m => ({
        n: m.name,
        b: m.balance,
        t: m.type,
        r: m.role
      }));

      const dataPayload = JSON.stringify({
        tabId,
        type: "mesh-sync",
        expenses: compExp,
        members: compMem
      });
      // Base64 encode
      setPayload(btoa(dataPayload));
      setPasteData("");
    }
  }, [isOpen, tabId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncPaste = async () => {
    if (!pasteData) return;
    setIsSyncing(true);
    
    try {
      const decoded = atob(pasteData);
      const data = JSON.parse(decoded);
      
      if (data.type !== "mesh-sync" || data.tabId !== tabId) {
        toast.error("Invalid Sync Data", { description: "This data doesn't belong to this tab." });
        setIsSyncing(false);
        return;
      }

      let expCount = 0;
      let memCount = 0;
      const currentExpenses = getStoredExpenses(tabId);
      const currentMembers = getStoredTabMembers(tabId, "System");
      
      // Decompress and merge expenses
      (data.expenses || []).forEach((c: any) => {
        if (!currentExpenses.some((e: StoredExpense) => e.id === c.id)) {
          const remoteExp: StoredExpense = {
            id: c.id, payer: c.p, amount: c.a, desc: c.d, time: c.tm,
            splitType: c.st, splits: c.sp, category: c.cat, 
            originalCurrency: c.oc, originalAmount: c.oa, syncStatus: "pending",
            participants: c.pa
          };
          saveStoredExpense(tabId, remoteExp);
          expCount++;
        }
      });

      // Decompress and merge members
      const newMembers: TabMember[] = [];
      (data.members || []).forEach((c: any) => {
        if (!currentMembers.some((m: TabMember) => m.name.toLowerCase() === c.n.toLowerCase())) {
          newMembers.push({ name: c.n, balance: c.b, type: c.t, role: c.r });
          memCount++;
        }
      });
      
      if (newMembers.length > 0) {
        saveStoredTabMembers(tabId, [...currentMembers, ...newMembers]);
        window.dispatchEvent(new CustomEvent("meshTab-members-update"));
      }
      
      sounds.playSuccessChime();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      
      setMergeReceipt({ expenses: expCount, members: memCount });
      setIsSyncing(false);
      
    } catch (e) {
      toast.error("Sync Failed", { description: "The pasted data is invalid or corrupted." });
      setIsSyncing(false);
    }
  };

  const handleSimulate = () => {
    sounds.playClick();
    const mockPayload = {
      tabId,
      type: "mesh-sync",
      expenses: [
        {
          id: `demo_${Date.now()}`,
          p: "Alice",
          a: 8500,
          d: "Offline Demo Transfer",
          ca: Date.now(),
          st: "equal",
          cat: "other"
        }
      ],
      members: [
        { n: "Alice", b: 0, t: "settled", r: "member" }
      ]
    };
    setPasteData(btoa(JSON.stringify(mockPayload)));
    toast.success("Demo payload generated!");
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Offline Mesh Sync</h2>
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-6">
        <button
          onClick={() => { setActiveTab("share"); sounds.playClick(); }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeTab === "share" 
              ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/5"
          }`}
        >
          Share (Host)
        </button>
        <button
          onClick={() => { setActiveTab("scan"); sounds.playClick(); }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeTab === "scan" 
              ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/5"
          }`}
        >
          Scan (Join)
        </button>
      </div>

      {activeTab === "share" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-white/60 text-center px-4">
            Show this QR code to a friend to sync your {pendingExpenses.length} pending offline expenses directly device-to-device.
          </p>
          
          <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/10">
            {pendingExpenses.length > 0 ? (
              <div className="p-3 bg-white rounded-xl">
                <QRCodeSVG value={payload} size={200} level="M" includeMargin={false} />
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                <p className="text-sm font-semibold">No pending expenses</p>
              </div>
            )}
          </div>
          
          {pendingExpenses.length > 15 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Too many expenses:</strong> QR only contains the 15 most recent offline items to remain scannable. Use Copy Payload for all.
              </span>
            </div>
          )}

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white text-sm font-bold transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Payload Copied!" : "Copy Full Payload String"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {mergeReceipt ? (
            <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 flex flex-col items-center justify-center gap-4 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">Offline Mesh Sync Success</h3>
                <p className="text-emerald-700 dark:text-emerald-400 text-sm mt-1">
                  ✅ {mergeReceipt.expenses} new expenses added
                  <br/>
                  ✅ {mergeReceipt.members} new members added
                </p>
                <p className="text-emerald-800 dark:text-emerald-200 text-xs font-bold mt-3">
                  Net balances updated instantly in your local vault.
                </p>
              </div>
              <button
                onClick={() => {
                  setMergeReceipt(null);
                  onClose();
                }}
                className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Camera Scanner</p>
                <p className="text-xs text-slate-500 dark:text-white/50 text-center">
                  BarcodeDetector API not supported in Firefox/Safari iOS.<br/>Use Payload Paste below for demo.
                </p>
              </div>
              
              <div className="relative">
                <textarea 
                  placeholder="Paste the offline payload string here..."
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  className="w-full h-32 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:font-sans"
                />
              </div>

              <button
                onClick={handleSyncPaste}
                disabled={!pasteData || isSyncing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isSyncing ? "Syncing..." : "Sync from Payload"}
              </button>
              
              <button
                onClick={handleSimulate}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 text-xs font-bold transition-colors border border-slate-200 dark:border-white/10"
              >
                <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                Simulate Receiving Alice&apos;s Expenses
              </button>
            </>
          )}
        </div>
      )}
      </div>
    </Modal>
  );
}
