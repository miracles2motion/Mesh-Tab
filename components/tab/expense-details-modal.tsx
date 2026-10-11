"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Receipt, Clock, User, ArrowRight, Trash2, AlertTriangle, Loader2, Edit2, Check, ExternalLink } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { useUserProfile, getWorkspaceMode, getStoredTabMembers, getStoredExpenses, StoredExpense, deleteStoredExpense, updateStoredExpenseDescription } from "../../lib/user";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import { MonadLogo, PythLogo } from "../ui/partner-logo";
import { EXPENSE_CATEGORIES } from "./add-expense-form";
import { LiveTime } from "../ui/live-time";

interface ExpenseDetailsProps {
  onClose?: () => void;
  expenseId: string;
  tabId: string;
}

export function ExpenseDetails({ onClose, expenseId, tabId }: ExpenseDetailsProps) {
  const router = useRouter();
  const profile = useUserProfile();
  const currentUserName = profile.name || "David";
  const mode = getWorkspaceMode();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 1. Look up if this is a custom-created expense in localStorage or default feed
  let foundCustomExpense: StoredExpense | null = null;
  if (typeof window !== "undefined") {
    try {
      const expenses = getStoredExpenses(tabId);
      foundCustomExpense = expenses.find(e => String(e.id) === String(expenseId)) || null;
    } catch {}
  }

  const isLisbon = mode === "sample" && tabId === "lisbon-24";
  const isMock1 = isLisbon && expenseId === "1";
  const isMock2 = isLisbon && expenseId === "2";
  const isMock3 = isLisbon && expenseId === "3";

  if (typeof window !== "undefined" && !isLisbon && !foundCustomExpense) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[320px] text-center space-y-4 bg-white dark:bg-[#0a0a0a]">
        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-2xl">
          🧾
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Expense Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-white/60 mt-1 max-w-sm">
            This expense has already been removed from the ledger or synchronized.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (onClose ? onClose() : router.replace(`/tab/${tabId}`))}
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
        >
          Return to Tab
        </button>
      </div>
    );
  }

  const desc = foundCustomExpense?.desc || (isMock1 ? "Villa booking" : isMock2 ? "Dinners & wine" : isMock3 ? "Excursions" : "Shared Group Expense");
  const amount = foundCustomExpense?.amount || (isMock1 ? 60000 : isMock2 ? 26000 : isMock3 ? 22000 : 0);
  const payer = foundCustomExpense?.payer || (isMock1 ? "Aisha" : isMock2 ? "Kemi" : isMock3 ? "Ben" : currentUserName);
  const time = foundCustomExpense?.createdAt ? new Date(foundCustomExpense.createdAt).toLocaleString() : foundCustomExpense?.time || (isMock1 ? "October 12, 2024 at 10:42 AM" : isMock2 ? "October 11, 2024 at 8:15 PM" : "Just now");

  const categoryInfo = foundCustomExpense?.category
    ? EXPENSE_CATEGORIES.find(c => c.id === foundCustomExpense.category)
    : (isMock1 ? { label: "Stay", icon: "🏨" } : isMock2 ? { label: "Dining", icon: "🍽️" } : isMock3 ? { label: "Events", icon: "🎟️" } : null);


  let dynamicSplits: { name: string; amount: number }[] = [];
  const splitType = foundCustomExpense?.splitType || "equal";

  if (foundCustomExpense?.splits && Object.keys(foundCustomExpense.splits).length > 0) {
    // Exact or custom split stored directly on expense
    dynamicSplits = Object.entries(foundCustomExpense.splits).map(([name, splitAmt]) => ({
      name,
      amount: splitAmt
    }));
  } else if (isLisbon) {
    const splitAmount = Math.round(amount / 4);
    dynamicSplits = [
      { name: "Aisha", amount: splitAmount },
      { name: "Kemi", amount: splitAmount },
      { name: "Ben", amount: splitAmount },
      { name: currentUserName, amount: splitAmount }
    ];
  } else {
    const tabMembers = getStoredTabMembers(tabId, currentUserName);
    const memberNames = tabMembers.map(m => m.name);
    const names = memberNames.length > 0 ? memberNames : [payer];
    const splitAmount = names.length > 0 ? Math.round(amount / names.length) : amount;
    dynamicSplits = names.map(name => ({ name, amount: splitAmount }));
  }

  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(desc);

  const details = {
    desc: editDesc,
    amount,
    payer,
    time,
    createdAt: foundCustomExpense?.createdAt,
    splitType,
    splits: dynamicSplits,
    txHash: foundCustomExpense?.txHash
  };

  const handleSaveEdit = async () => {
    if (!editDesc.trim()) return;
    sounds.playClick();
    const res = updateStoredExpenseDescription(tabId, expenseId, editDesc);
    if (res.success) {
      sounds.playSuccessChime();
      setIsEditing(false);
      toast.success("Expense Note Updated!");
    } else {
      toast.error(res.error || "Failed to update note");
    }
  };

  const handleDeleteExpense = async () => {
    setIsDeleting(true);
    sounds.playClick();
    
    const res = deleteStoredExpense(tabId, expenseId);
    if (!res.success) {
      setIsDeleting(false);
      toast.error("Cannot Delete Expense", {
        description: res.error || "Failed to remove expense from ledger."
      });
      return;
    }

    // SyncProvider will handle pushing this offline update

    setIsDeleting(false);
    toast.success("Expense Removed", {
      description: "Ledger balances updated and synchronized across all devices."
    });
    
    if (onClose) {
      onClose();
    } else {
      router.replace(`/tab/${tabId}`);
    }
  };

  return (
    <div className="p-6 md:p-8 flex flex-col h-full bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
      <div className="flex flex-col xl:flex-row gap-8 xl:gap-12 flex-1">
        {/* Left Column: Core Info & Actions */}
        <div className="flex-1 flex flex-col max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
            {categoryInfo ? (
              <span className="text-2xl">{categoryInfo.icon}</span>
            ) : (
              <Receipt className="w-6 h-6 text-slate-600 dark:text-white/50" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="px-2.5 py-1 text-sm font-bold rounded-lg border border-indigo-500 bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                    title="Save Note"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditDesc(desc); }}
                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editDesc || details.desc}</h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Edit Note"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {categoryInfo && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10">
                  {categoryInfo.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-white/50 text-sm mt-1">
              <Clock className="w-4 h-4" />
              <LiveTime ts={details.createdAt} kind={expenseId.startsWith("settle-") ? "settled" : "expense"} variant="compact" fallback={details.time} />
            </div>
          </div>
        </div>

      </div>

      {/* Total & Payer */}
      <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 mb-8 flex flex-col items-center justify-center text-center shadow-sm">
        <span className="text-slate-500 dark:text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">Total Amount</span>
        <span className="text-5xl font-bold text-slate-900 dark:text-white tabular-nums mb-3">{formatCurrency(details.amount)}</span>
        
        {/* Foreign currency converted pill */}
        {foundCustomExpense?.originalCurrency && foundCustomExpense.originalCurrency !== "USD" && (
          <div className="mb-4 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-2 text-xs">
            <span className="text-indigo-900 dark:text-indigo-300 font-semibold">
              Original: {foundCustomExpense.originalCurrency} {foundCustomExpense.originalAmount?.toFixed(2)}
            </span>
            <span className="text-slate-300 dark:text-white/20">•</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-white/50">
              <span>0% markup via</span>
              <PythLogo className="h-2.5 w-auto text-slate-700 dark:text-white" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 bg-white dark:bg-white/5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="w-6 h-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
            {details.payer[0]}
          </div>
          <span className="text-slate-700 dark:text-white/80 text-sm">
            Paid by <span className="font-semibold text-slate-900 dark:text-white">
              {currentUserName && details.payer.toLowerCase() === currentUserName.toLowerCase() ? `You (${details.payer})` : details.payer}
            </span>
          </span>
        </div>

        {details.txHash && (
          <div className="w-full mt-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Monad Blockchain Proof</p>
                <p className="text-[10px] font-mono text-slate-500 dark:text-white/60 truncate">
                  {`${details.txHash.slice(0, 10)}...${details.txHash.slice(-8)}`}
                </p>
              </div>
            </div>
            <a
              href={`https://testnet.monadvision.com/tx/${details.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <span>View on MonadVision</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
      </div>

      {/* Right Column: Splits Breakdown */}
      <div className="flex-1 xl:border-l xl:border-slate-200 dark:xl:border-white/10 xl:pl-12 flex flex-col">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-slate-700 dark:text-white/80 font-semibold text-sm">Split Breakdown</h3>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 font-medium">
            {details.splitType === "exact" ? "Exact Amounts" : "Equal Split"}
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-2 space-y-1">
          {details.splits.map((split, i) => (
            <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 dark:bg-white/10 flex items-center justify-center font-bold text-sm text-indigo-600 dark:text-white/70">
                  {split.name[0]}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-white/90">{split.name}</span>
                  {currentUserName && split.name.toLowerCase() === currentUserName.toLowerCase() && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      You
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`font-bold tabular-nums ${split.amount === 0 ? "text-slate-400 dark:text-white/40" : "text-slate-900 dark:text-white"}`}>
                  {formatCurrency(split.amount)}
                </span>
                {split.amount === 0 ? (
                  <div className="flex flex-col items-end text-[10px] text-slate-400 dark:text-white/40 font-semibold">
                    <span>No Share</span>
                    <span>$0.00</span>
                  </div>
                ) : split.name !== details.payer ? (
                  <div className="flex flex-col items-end text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                    <span>Owes</span>
                    <span>{currentUserName && details.payer.toLowerCase() === currentUserName.toLowerCase() ? "You" : details.payer}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-end text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Paid</span>
                    <span>Direct</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      
      {/* Footer Actions (Full width below columns) */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 space-y-4 shrink-0">
        {showDeleteConfirm ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-rose-950 dark:text-rose-200">Remove from Shared Ledger?</p>
                <p className="text-rose-700 dark:text-rose-300/80 mt-1 leading-relaxed">
                  This will reverse all shares and automatically recalculate everyone&apos;s balances across all devices.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-white/10 text-slate-700 dark:text-white font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteExpense}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/20 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Remove</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Expense from Ledger</span>
          </button>
        )}

        {/* Partner credit */}
        <div className="flex items-center justify-end text-[11px] text-slate-400 dark:text-white/40 pt-1">
          <div className="flex items-center gap-1.5">
            <span>Ledger on</span>
            <div className="opacity-80 hover:opacity-100 transition-all text-slate-700 dark:text-white/80">
              <MonadLogo className="h-3.5 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
