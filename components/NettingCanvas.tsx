"use client";

import { motion } from "framer-motion";
import { Network, ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function NettingCanvas() {
  const [nettingState, setNettingState] = useState<"chaotic" | "calculating" | "simplified">("chaotic");

  const runSimplification = () => {
    setNettingState("calculating");
    setTimeout(() => {
      setNettingState("simplified");
    }, 2500);
  };

  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-[32px] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" /> The Tangle
          </h3>
          <p className="text-sm text-white/50">Multilateral Debt Netting</p>
        </div>
        
        {nettingState === "simplified" && (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Optimized
          </span>
        )}
      </div>

      <div className="relative h-64 w-full bg-[#0a0a0b] flex items-center justify-center overflow-hidden">
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

      <div className="p-6 bg-white/5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-white/50 mb-1">Gross Volume</p>
          <p className="text-lg font-bold text-white line-through decoration-rose-500 decoration-2">$1,200.00</p>
        </div>
        <div>
          <p className="text-xs text-white/50 mb-1">Residual Capital</p>
          <p className="text-lg font-bold text-emerald-400">$300.00</p>
        </div>
        <div className="col-span-2 mt-2">
          {nettingState === "chaotic" ? (
            <button onClick={runSimplification} className="w-full py-3 bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-600 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              Calculate Settlement Map
            </button>
          ) : (
            <div className="w-full py-3 bg-white/10 text-white/70 rounded-xl font-semibold flex justify-center items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> 75.0% Debt Volume Cleared
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
