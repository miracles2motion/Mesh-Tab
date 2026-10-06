"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LANDING_CONTENT } from "../../content/landing";
import { Activity, RotateCcw, TrendingDown, DollarSign, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

const INITIAL_ROLES = ["Aisha", "Kemi", "Ben", "You"];

const CHAOS_POS = [
  { top: "25%", left: "25%" }, // Node 0
  { top: "25%", left: "75%" }, // Node 1
  { top: "75%", left: "25%" }, // Node 2
  { top: "75%", left: "75%" }, // Node 3
];

const NETTED_POS = [
  { top: "50%", left: "50%" }, // Center (Creditor)
  { top: "15%", left: "50%" }, // Top
  { top: "85%", left: "15%" }, // Bottom Left
  { top: "85%", left: "85%" }, // Bottom Right
];

export function NettingVisualizer() {
  const { nettingVisualizer } = LANDING_CONTENT;
  const [isNetted, setIsNetted] = useState(false);
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [floatingNumbers, setFloatingNumbers] = useState<{id: number, val: string, x: number, y: number, delay: number}[]>([]);

  // Generate random floating expenses for the "Chaos" state
  useEffect(() => {
    if (!isNetted) {
      const amounts = ["$12", "$45", "$120", "$8", "$210", "$34", "$65", "$90"];
      const newNumbers = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        val: amounts[Math.floor(Math.random() * amounts.length)],
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        delay: Math.random() * 2 
      }));
      setFloatingNumbers(newNumbers);
    }
  }, [isNetted]);

  const handleToggle = () => {
    if (isNetted) {
      const shuffled = [...roles].sort(() => 0.5 - Math.random());
      setRoles(shuffled);
    }
    setIsNetted(!isNetted);
  };

  const currentPos = isNetted ? NETTED_POS : CHAOS_POS;

  return (
    <section id="netting-engine" className="px-6 py-24 max-w-6xl mx-auto">
      {/* Human Stakes Context */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold mb-4 border border-slate-200 dark:border-white/10">
          The Lisbon Proof
        </div>
        <p className="text-sm md:text-base font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
          {nettingVisualizer.stakes}
        </p>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
          {nettingVisualizer.title}
        </h2>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-300">
          {nettingVisualizer.description}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Visualization Canvas */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="w-full lg:w-2/3 bg-white dark:bg-[#111113] rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden relative flex flex-col items-center p-8"
        >
          {/* Layman Context Banner */}
          <div className="w-full bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-5 mb-6 border border-indigo-100 dark:border-indigo-500/20 text-left z-30 relative">
            <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> How MeshTab Untangles Debts
            </h3>
            
            <div className="space-y-3 text-sm text-indigo-900/80 dark:text-indigo-200/90">
              <div className="flex gap-2.5 items-start">
                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] shrink-0" />
                <p className="leading-relaxed">
                  <strong className="text-indigo-950 dark:text-indigo-100 font-semibold">Without MeshTab:</strong> 
                  {" "}4 travelers incur 12 bilateral repayment obligations. Everyone pays everyone, resulting in a chaotic mess of international bank transfers and fees.
                </p>
              </div>
              
              <div className="flex gap-2.5 items-start">
                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                <p className="leading-relaxed">
                  <strong className="text-indigo-950 dark:text-indigo-100 font-semibold">With MeshTab:</strong> 
                  {" "}Click <em>"Untangle it"</em> below. Our graph algorithm cancels out circular debt loops, collapsing 12 transfers down to 3 direct payments.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[length:32px_32px] pointer-events-none" />
          
          <div className="relative w-full max-w-sm aspect-square my-4">
            {/* Ambient Background Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] transition-colors duration-1000 ${isNetted ? 'bg-emerald-500/20' : 'bg-rose-500/10'}`} />

            {/* SVG Lines Container */}
            <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full pointer-events-none z-0" overflow="visible">
              
              {/* CHAOTIC LINES (Before Netting) */}
              <AnimatePresence>
                {!isNetted && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                    className="text-rose-500/40 dark:text-rose-400/40"
                  >
                    <path d="M 100 100 Q 200 50 300 100" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 100 100 Q 50 200 100 300" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 100 100 Q 200 200 300 300" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 300 100 Q 200 200 100 300" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 300 100 Q 350 200 300 300" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 100 300 Q 200 350 300 300" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* RESOLVED LINES (After Netting) */}
              <AnimatePresence>
                {isNetted && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-emerald-500 dark:text-emerald-400"
                  >
                    <motion.path 
                      d="M 200 60 L 200 200" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
                    />
                    <motion.path 
                      d="M 60 340 L 200 200" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
                    />
                    <motion.path 
                      d="M 340 340 L 200 200" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 1.0 }}
                    />
                  </motion.g>
                )}
              </AnimatePresence>
            </svg>

            {/* Explicit Debt Labels */}
            <AnimatePresence>
              {isNetted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4, delay: 1.4 }}
                  className="absolute inset-0 pointer-events-none z-10"
                >
                  <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-100 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50 shadow-sm whitespace-nowrap backdrop-blur-md">
                    {roles[1]} pays $180
                  </div>
                  <div className="absolute top-[75%] left-[25%] -translate-x-1/2 -translate-y-1/2 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-100 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50 shadow-sm whitespace-nowrap backdrop-blur-md">
                    {roles[2]} pays $80
                  </div>
                  <div className="absolute top-[75%] left-[75%] -translate-x-1/2 -translate-y-1/2 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-100 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50 shadow-sm whitespace-nowrap backdrop-blur-md">
                    {roles[3]} pays $40
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* The 4 Lisbon Nodes */}
            <motion.div
              animate={currentPos[0]}
              transition={{ duration: 0.8, ease: "easeInOut", delay: isNetted ? 0.2 : 0 }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold z-20 shadow-xl border-2 transition-all duration-700 ${isNetted ? 'w-16 h-16 bg-indigo-600 border-indigo-400 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)]' : 'w-12 h-12 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100'}`}
            >
              {roles[0]}
            </motion.div>
            <motion.div
              animate={currentPos[1]}
              transition={{ duration: 0.8, ease: "easeInOut", delay: isNetted ? 0.2 : 0 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 z-20 shadow-md"
            >
              {roles[1]}
            </motion.div>
            <motion.div
              animate={currentPos[2]}
              transition={{ duration: 0.8, ease: "easeInOut", delay: isNetted ? 0.2 : 0 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 z-20 shadow-md"
            >
              {roles[2]}
            </motion.div>
            <motion.div
              animate={currentPos[3]}
              transition={{ duration: 0.8, ease: "easeInOut", delay: isNetted ? 0.2 : 0 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 z-20 shadow-md"
            >
              {roles[3]}
            </motion.div>
            
            {/* Floating Expenses */}
            <AnimatePresence>
              {!isNetted && floatingNumbers.map((num) => (
                <motion.div
                  key={num.id}
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 0], y: -30, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    delay: num.delay,
                    ease: "easeOut"
                  }}
                  className="absolute text-xs font-bold text-rose-500/70 dark:text-rose-400/70 pointer-events-none z-30"
                  style={{ left: `${num.x}%`, top: `${num.y}%` }}
                >
                  {num.val}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Interactive Trigger Button */}
          <div className="mt-8 z-30 w-full flex flex-col items-center">
            <button 
              onClick={handleToggle}
              className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl cursor-pointer ${isNetted ? 'bg-gray-900 text-white dark:bg-white dark:text-black hover:scale-105' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'}`}
            >
              {isNetted ? <RotateCcw className="w-5 h-5" /> : <Activity className="w-5 h-5" />} 
              {isNetted ? nettingVisualizer.resetCta : nettingVisualizer.cta}
            </button>

            {/* Direct Link to Demo */}
            <Link 
              href="/demo"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-all"
            >
              <span>{nettingVisualizer.demoLink}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Metrics Sidebar */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <motion.div 
            layout
            className="p-6 rounded-3xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
              <DollarSign className="w-4 h-4" /> Lisbon Receipts Logged
            </div>
            <div className="text-4xl font-black text-gray-900 dark:text-white line-through decoration-rose-500/50 decoration-4">
              $1,200.00
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">Total gross receipts across 23 Lisbon expenses.</p>
          </motion.div>

          <motion.div 
            layout
            className={`p-6 rounded-3xl border shadow-sm transition-all duration-700 ${isNetted ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 scale-[1.02]' : 'bg-white dark:bg-[#111113] border-gray-200 dark:border-white/10'}`}
          >
            <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
              <CheckCircle2 className={`w-4 h-4 ${isNetted ? 'text-emerald-600 dark:text-emerald-400' : ''}`} /> Capital To Settle
            </div>
            <div className={`text-4xl font-black transition-colors duration-700 ${isNetted ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              $300.00
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">The net liquidity required to fully balance all 4 travelers.</p>
          </motion.div>

          <motion.div 
            layout
            className={`p-6 rounded-3xl border shadow-sm transition-all duration-700 ${isNetted ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' : 'bg-white dark:bg-[#111113] border-gray-200 dark:border-white/10'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
                  <TrendingDown className={`w-4 h-4 ${isNetted ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Transfers Reduced
                </div>
                <div className={`text-3xl font-black transition-colors duration-700 ${isNetted ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                  75.0%
                </div>
              </div>
              <div className="h-10 px-4 bg-slate-100 dark:bg-black rounded-full flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-xs shrink-0 font-mono">
                <span className="text-base font-bold text-slate-500">12</span>
                <span className="text-xs text-slate-400 mx-2">→</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">3</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">Circular debt canceled without unnecessary intermediate wires.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
