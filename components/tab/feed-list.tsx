"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Receipt, ShieldCheck, Activity, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import Image from "next/image";
import { EnvioLogo } from "../ui/partner-logo";
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
  currentUserName?: string;
}

export function FeedList({ expenses, currentUserName }: FeedListProps) {
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
          <div className="flex items-center gap-2 text-slate-500 dark:text-white/50 text-xs font-medium">
            <span>Synced via</span>
            <div className="opacity-90 hover:opacity-100 transition-all text-slate-800 dark:text-white">
              <EnvioLogo className="h-4 w-auto" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {expenses.map((item) => {
            const isSettlement = 
              item.id.startsWith("settle") || 
              item.desc.toLowerCase().includes("settle") || 
              item.desc.toLowerCase().includes("cleared") ||
              item.desc.toLowerCase().includes("repaid");

            return (
              <motion.div 
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                key={item.id}
              >
                <Link
                  href={`/tab/${tabId}/expense/${item.id}`}
                  className={`backdrop-blur-md rounded-2xl p-4 flex gap-4 items-center cursor-pointer transition-all group shadow-sm ${
                    isSettlement
                      ? "bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]"
                      : "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
                    isSettlement
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/20"
                      : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 group-hover:text-indigo-600 dark:group-hover:text-white/80"
                  }`}>
                    {isSettlement ? (
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    ) : (
                      <Receipt className="w-5 h-5 transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="flex items-center gap-2 truncate">
                        <p className={`font-bold truncate text-base ${isSettlement ? "text-emerald-950 dark:text-emerald-200" : "text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white"}`}>
                          {item.desc}
                        </p>
                        {isSettlement && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> Settled
                          </span>
                        )}
                      </div>
                      <span className={`font-extrabold text-base sm:text-lg tabular-nums ml-2 shrink-0 ${isSettlement ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                        {isSettlement ? `+${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className={isSettlement ? "text-emerald-700/80 dark:text-emerald-300/70 font-medium" : "text-slate-500 dark:text-white/50"}>
                        {isSettlement ? "Settled by" : "Paid by"}{" "}
                        <span className={`font-bold ${isSettlement ? "text-emerald-900 dark:text-emerald-200" : "text-slate-700 dark:text-white/80"}`}>
                          {currentUserName && item.payer.toLowerCase() === currentUserName.toLowerCase() ? `You (${item.payer})` : item.payer}
                        </span>
                      </span>
                      <span className={isSettlement ? "text-emerald-600/70 dark:text-emerald-400/60 font-semibold" : "text-slate-400 dark:text-white/40"}>
                        {item.time}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-colors hidden sm:block ${isSettlement ? "text-emerald-500/60 group-hover:text-emerald-500" : "text-slate-300 dark:text-white/20 group-hover:text-slate-600 dark:group-hover:text-white/50"}`} />
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
