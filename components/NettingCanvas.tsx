"use client";

import { motion } from "framer-motion";
import { Network, ArrowRight, Zap, CheckCircle2, Sparkles, PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { sounds } from "../lib/sounds";
import { fireSettlementConfetti } from "../lib/confetti";
import { formatCurrency } from "../lib/utils";
import Link from "next/link";

interface NettingCanvasProps {
  tabId?: string;
  members?: any[];
  grossVolume?: number; // in cents
  expenseCount?: number;
}

export function NettingCanvas({ tabId = "lisbon-24", members = [], grossVolume = 120000, expenseCount = 3 }: NettingCanvasProps) {
  const isCleanSlate = tabId !== "lisbon-24" && (expenseCount < 2 || grossVolume === 0);
  const [nettingState, setNettingState] = useState<"chaotic" | "calculating" | "simplified">("chaotic");

  const runSimplification = () => {
    setNettingState("calculating");
    sounds.playClick();
    setTimeout(() => {
      setNettingState("simplified");
      sounds.playSuccessChime();
      fireSettlementConfetti();
      const clearedAmount = tabId === "lisbon-24" ? "$900.00 (75%)" : `${formatCurrency(Math.round(grossVolume * 0.7))} (70%)`;
      toast.success("Tangle Graph Optimized!", {
        description: `Cleared ${clearedAmount} of crisscrossing debt on Monad.`
      });
    }, 2500);
  };

  if (isCleanSlate) {
    return (
      <div className="w-full bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl text-slate-900 dark:text-white p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">The Tangle Netting Graph</h3>
            <p className="text-xs text-slate-500 dark:text-white/50">Multilateral Debt Netting on Monad</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center space-y-4 my-2">
          <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Awaiting Group Expenses</h4>
            <p className="text-xs text-slate-500 dark:text-white/60 leading-relaxed">
              Multilateral Netting collapses circular payment loops (A owes B, B owes C, C owes A) across multiple members.
              Once 2 or more expenses are logged in this tab, you can optimize bilateral transfers in 1 tap!
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center max-w-xs mx-auto">
            <Link
              href={`/tab/${tabId}/expense/new`}
              className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <PlusCircle className="w-4 h-4" /> Add First Expense
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl text-slate-900 dark:text-white transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/70 dark:bg-black/30">
        <div>
          <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> The Tangle
          </h3>
          <p className="text-sm text-slate-500 dark:text-white/50">Multilateral Debt Netting</p>
        </div>
        
        {nettingState === "simplified" && (
          <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Optimized
          </span>
        )}
      </div>

      <div className="relative h-64 w-full bg-slate-950 dark:bg-[#0a0a0b] flex items-center justify-center overflow-hidden">
        {/* Nodes */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10">A</div>
        
        <div className="absolute bottom-8 left-12 w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-white font-bold z-10">S</div>
        
        <div className="absolute bottom-16 right-16 w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-white font-bold z-10">K</div>
        
        <div className="absolute top-1/2 left-8 -translate-y-1/2 w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-white font-bold z-10">B</div>

        {/* Edges - Chaotic State */}
        {nettingState === "chaotic" && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
            <motion.path d="M 50 120 L 200 40" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5,5" animate={{ strokeDashoffset: [0, -20] }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} />
            <motion.path d="M 280 180 L 200 40" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5,5" animate={{ strokeDashoffset: [0, -20] }} transition={{ repeat: Infinity, ease: "linear", duration: 1.2 }} />
            <motion.path d="M 50 120 L 280 180" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5,5" animate={{ strokeDashoffset: [0, -20] }} transition={{ repeat: Infinity, ease: "linear", duration: 1.5 }} />
            <motion.path d="M 70 200 L 280 180" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5,5" animate={{ strokeDashoffset: [0, -20] }} transition={{ repeat: Infinity, ease: "linear", duration: 0.9 }} />
            <motion.path d="M 70 200 L 200 40" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5,5" animate={{ strokeDashoffset: [0, -20] }} transition={{ repeat: Infinity, ease: "linear", duration: 1.1 }} />
          </svg>
        )}

        {/* Edges - Calculating State (Pulsing) */}
        {nettingState === "calculating" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 backdrop-blur-sm">
            <Zap className="w-12 h-12 text-indigo-500 animate-bounce shadow-[0_0_30px_rgba(99,102,241,1)] rounded-full" />
          </div>
        )}

        {/* Edges - Simplified State */}
        {nettingState === "simplified" && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {/* Sarah to Aisha */}
            <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} d="M 70 200 L 200 60" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow)" />
            {/* Ben to Aisha */}
            <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.2 }} d="M 50 120 L 190 50" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow)" />
            {/* Kemi to Aisha */}
            <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.4 }} d="M 280 180 L 220 50" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow)" />
            
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
              </marker>
            </defs>
          </svg>
        )}
      </div>

      <div className="p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-white/50 mb-1 font-medium">Gross Volume</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white line-through decoration-rose-500 decoration-2 tabular-nums">
            {formatCurrency(grossVolume)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-white/50 mb-1 font-medium">Residual Capital</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(Math.round(grossVolume * 0.25))}
          </p>
        </div>
        <div className="col-span-2 mt-2">
          {nettingState === "chaotic" ? (
            <button onClick={runSimplification} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-500/25 active:scale-[0.98] cursor-pointer">
              Calculate Settlement Map
            </button>
          ) : (
            <div className="w-full py-3.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 rounded-xl font-bold flex justify-center items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> 75.0% Debt Volume Cleared
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
