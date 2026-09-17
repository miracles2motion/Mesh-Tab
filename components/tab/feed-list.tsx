"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Receipt, ShieldCheck, Activity, ChevronRight } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

export interface ExpenseItem {
  id: string;
  payer: string;
  amount: number; // in cents
  desc: string;
  time: string;
}

interface FeedListProps {
  expenses: ExpenseItem[];
}

export function FeedList({ expenses }: FeedListProps) {
  const params = useParams();
  const tabId = params?.id || "default";

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl border-dashed">
        <Receipt className="w-12 h-12 text-slate-300 dark:text-white/20 mb-4" />
        <h4 className="text-slate-800 dark:text-white/70 font-semibold">No expenses yet</h4>
        <p className="text-slate-500 dark:text-white/40 text-sm mt-1">Be the first to buy a round.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Live Ledger</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/20 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Fee Sync
          </div>
          {/* Partner Branding */}
          <div className="flex items-center gap-2 text-slate-400 dark:text-white/30 text-xs font-medium">
            <span>Synced via</span>
            <div className="opacity-70 dark:opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
              <Image src="/logos/envio.png" alt="Envio" width={50} height={16} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {expenses.map((item) => (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              key={item.id}
            >
              <Link
                href={`/tab/${tabId}/expense/${item.id}`}
                className="bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex gap-4 items-center cursor-pointer transition-colors group shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Receipt className="w-5 h-5 text-slate-600 dark:text-white/50 group-hover:text-indigo-600 dark:group-hover:text-white/80 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white/90 truncate text-base group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">{item.desc}</p>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums ml-2">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-white/50">Paid by <span className="font-medium text-slate-700 dark:text-white/80">{item.payer}</span></span>
                    <span className="text-slate-400 dark:text-white/40">{item.time}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-white/20 group-hover:text-slate-600 dark:group-hover:text-white/50 transition-colors hidden sm:block" />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
