"use client";

import { X, Receipt, Clock, User, ArrowRight } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { useUserProfile } from "../../lib/user";

interface ExpenseDetailsProps {
  onClose?: () => void;
  expenseId: string;
}

export function ExpenseDetails({ onClose, expenseId }: ExpenseDetailsProps) {
  const profile = useUserProfile();
  const currentUserName = profile.name || "David";

  // 1. Look up if this is a custom-created expense in localStorage
  let foundCustomExpense: { desc: string; amount: number; payer: string; time: string } | null = null;
  if (typeof window !== "undefined") {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("meshTab_expenses_"));
      for (const k of keys) {
        const parsed = JSON.parse(localStorage.getItem(k) || "[]");
        const match = parsed.find((item: any) => String(item.id) === String(expenseId));
        if (match) {
          foundCustomExpense = match;
          break;
        }
      }
    } catch {}
  }

  const isMock1 = expenseId === "1";
  const isMock2 = expenseId === "2";
  const isMock3 = expenseId === "3";

  const desc = foundCustomExpense?.desc || (isMock1 ? "Villa booking" : isMock2 ? "Dinners & wine" : isMock3 ? "Excursions" : "Shared Group Expense");
  const amount = foundCustomExpense?.amount || (isMock1 ? 60000 : isMock2 ? 26000 : isMock3 ? 22000 : 15000);
  const payer = foundCustomExpense?.payer || (isMock1 ? "Aisha" : isMock2 ? "Kemi" : isMock3 ? "Ben" : currentUserName);
  const time = foundCustomExpense?.time || (isMock1 ? "October 12, 2024 at 10:42 AM" : isMock2 ? "October 11, 2024 at 8:15 PM" : "October 10, 2024 at 2:30 PM");

  const splitAmount = Math.round(amount / 4);
  const details = {
    desc,
    amount,
    payer,
    time,
    splits: [
      { name: "Aisha", amount: splitAmount },
      { name: "Kemi", amount: splitAmount },
      { name: "Ben", amount: splitAmount },
      { name: currentUserName, amount: splitAmount }
    ]
  };

  return (
    <div className="p-6 md:p-8 flex flex-col h-full bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-slate-600 dark:text-white/50" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{details.desc}</h2>
            <div className="flex items-center gap-2 text-slate-500 dark:text-white/50 text-sm mt-1">
              <Clock className="w-4 h-4" />
              <span>{details.time}</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/70 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Total & Payer */}
      <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 mb-8 flex flex-col items-center justify-center text-center shadow-sm">
        <span className="text-slate-500 dark:text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">Total Amount</span>
        <span className="text-5xl font-bold text-slate-900 dark:text-white tabular-nums mb-6">{formatCurrency(details.amount)}</span>
        
        <div className="flex items-center gap-3 bg-white dark:bg-white/5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="w-6 h-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
            {details.payer[0]}
          </div>
          <span className="text-slate-700 dark:text-white/80 text-sm">Paid by <span className="font-semibold text-slate-900 dark:text-white">{details.payer}</span></span>
        </div>
      </div>

      {/* Splits Breakdown */}
      <div className="flex-1">
        <h3 className="text-slate-700 dark:text-white/80 font-semibold mb-4 px-2 text-sm">Split Details (Equal)</h3>
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-2 space-y-1">
          {details.splits.map((split, i) => (
            <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 dark:bg-white/10 flex items-center justify-center font-bold text-sm text-indigo-600 dark:text-white/70">
                  {split.name[0]}
                </div>
                <span className="font-semibold text-slate-900 dark:text-white/90">{split.name === currentUserName ? "You" : split.name}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(split.amount)}</span>
                {split.name !== details.payer ? (
                  <div className="flex flex-col items-end text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                    <span>Owes</span>
                    <span>{details.payer}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-end text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Paid</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
