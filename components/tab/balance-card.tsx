"use client";

import { motion } from "framer-motion";
import { Zap, Bell, CheckCircle2, ArrowDownToLine } from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "../../lib/utils";

interface BalanceCardProps {
  balance: number; // in cents
  currency: string;
  type: 'debtor' | 'creditor' | 'settled';
  onSettle?: () => void;
  onRemind?: () => void;
  onCashOut?: () => void;
}

export function BalanceCard({ balance, currency, type, onSettle, onRemind, onCashOut }: BalanceCardProps) {
  const isSettled = balance === 0 || type === 'settled';
  const prefix = isSettled ? '' : type === 'debtor' ? '-' : '+';
  const formattedAmount = `${prefix}${formatCurrency(balance)}`;
  const charLength = formattedAmount.length;

  // Adaptive font scaling: automatically adjusts text size so millions or billions never clip or break the card
  const getBalanceFontSize = (len: number) => {
    if (len <= 7) return "text-4xl sm:text-5xl";      // e.g. +$99.00
    if (len <= 10) return "text-3xl sm:text-4xl";     // e.g. +$1,293.33
    if (len <= 13) return "text-2xl sm:text-3xl";     // e.g. +$125,000.00
    if (len <= 16) return "text-xl sm:text-2xl";      // e.g. +$1,250,000.00 (millions)
    return "text-lg sm:text-xl";                      // 100M+
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl p-6 md:p-8 bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 ${
        isSettled 
          ? 'shadow-[0_4px_30px_-5px_rgba(16,185,129,0.15)] dark:shadow-[0_0_40px_-15px_rgba(16,185,129,0.2)]'
          : type === 'debtor' 
          ? 'shadow-[0_4px_30px_-5px_rgba(244,63,94,0.15)] dark:shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)]' 
          : 'shadow-[0_4px_30px_-5px_rgba(16,185,129,0.15)] dark:shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)]'
      }`}
    >
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 ${
        isSettled 
          ? 'bg-emerald-500/10 dark:bg-emerald-500/20'
          : type === 'debtor' 
          ? 'bg-rose-500/10 dark:bg-rose-500/20' 
          : 'bg-emerald-500/10 dark:bg-emerald-500/20'
      }`} />
      
      <div className="flex items-center justify-between mb-2 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs md:text-sm text-slate-500 dark:text-white/60 font-medium">Your Net Balance</p>
          <span className="text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 border border-slate-200/50 dark:border-white/5">
            {currency}
          </span>
        </div>
        {isSettled && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
          </span>
        )}
      </div>

      <div className="relative z-10 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <h2 
            className={`${getBalanceFontSize(charLength)} font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums break-words min-w-0`}
            title={formattedAmount}
          >
            {formattedAmount}
          </h2>
          <span className="text-slate-400 dark:text-white/40 text-xs sm:text-sm font-semibold tracking-normal shrink-0">
            {currency}
          </span>
        </div>

        {/* Compact notation helper for balances >= $100k */}
        {balance >= 100_000_00 && (
          <p className="text-xs text-slate-400 dark:text-white/50 font-medium mt-1">
            ≈ {prefix}{formatCompactCurrency(balance)} {currency}
          </p>
        )}
      </div>
      
      <div className="mt-8 flex gap-3 relative z-10">
         {isSettled ? (
            <div className="w-full py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold flex justify-center items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5" /> All balances settled
            </div>
         ) : type === 'debtor' ? (
            <button onClick={onSettle} className="flex-1 bg-slate-900 text-white dark:bg-white dark:text-black font-semibold py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-white/90 active:scale-95 transition-all flex justify-center items-center gap-2 text-lg shadow-lg dark:shadow-xl dark:shadow-white/10 cursor-pointer">
              <Zap className="w-5 h-5 fill-current" /> Settle Debt
            </button>
         ) : (
            <div className="flex-1 flex gap-2">
              <button 
                onClick={onCashOut} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 md:py-4 rounded-2xl active:scale-95 transition-all text-xs sm:text-sm md:text-base shadow-lg shadow-emerald-500/25 flex justify-center items-center gap-2 cursor-pointer"
                title="Transfer received funds to your bank account"
              >
                <ArrowDownToLine className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span className="truncate">Cash Out to Bank</span>
              </button>
              <button 
                onClick={onRemind} 
                className="px-3.5 md:px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white font-semibold py-3.5 md:py-4 rounded-2xl active:scale-95 transition-all text-xs sm:text-sm flex justify-center items-center gap-1.5 border border-slate-200 dark:border-white/10 shrink-0 cursor-pointer"
                title="Send reminders to debtors"
              >
                <Bell className="w-4 h-4 shrink-0" /> Remind
              </button>
            </div>
         )}
      </div>
    </motion.div>
  );
}
