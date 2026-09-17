"use client";

import { motion } from "framer-motion";
import { Zap, Bell } from "lucide-react";
import { formatCurrency } from "../../lib/utils";

interface BalanceCardProps {
  balance: number; // in cents
  currency: string;
  type: 'debtor' | 'creditor';
  onSettle?: () => void;
  onRemind?: () => void;
}

export function BalanceCard({ balance, currency, type, onSettle, onRemind }: BalanceCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl p-6 md:p-8 bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 ${
        type === 'debtor' ? 'shadow-[0_4px_30px_-5px_rgba(244,63,94,0.15)] dark:shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)]' : 'shadow-[0_4px_30px_-5px_rgba(16,185,129,0.15)] dark:shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)]'
      }`}
    >
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 ${
        type === 'debtor' ? 'bg-rose-500/10 dark:bg-rose-500/20' : 'bg-emerald-500/10 dark:bg-emerald-500/20'
      }`} />
      
      <p className="text-sm md:text-base text-slate-500 dark:text-white/60 mb-1 relative z-10 font-medium">Your Net Balance</p>
      <div className="flex items-end gap-3 relative z-10">
        <h2 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
          {type === 'debtor' ? '-' : '+'}{formatCurrency(balance)}
        </h2>
        <span className="text-slate-400 dark:text-white/40 text-xl font-medium mb-1 md:mb-2">{currency}</span>
      </div>
      
      <div className="mt-8 flex gap-3 relative z-10">
         {type === 'debtor' ? (
            <button onClick={onSettle} className="flex-1 bg-slate-900 text-white dark:bg-white dark:text-black font-semibold py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-white/90 active:scale-95 transition-all flex justify-center items-center gap-2 text-lg shadow-lg dark:shadow-xl dark:shadow-white/10">
              <Zap className="w-5 h-5 fill-current" /> Settle Debt
            </button>
         ) : (
            <button onClick={onRemind} className="flex-1 bg-indigo-600 text-white font-semibold py-4 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all text-lg shadow-lg shadow-indigo-500/30 flex justify-center items-center gap-2">
              <Bell className="w-5 h-5" /> Remind Group
            </button>
         )}
      </div>
    </motion.div>
  );
}
