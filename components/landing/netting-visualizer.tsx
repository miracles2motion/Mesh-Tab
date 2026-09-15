"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LANDING_CONTENT } from "../../content/landing";
import { Activity, RotateCcw, TrendingDown, DollarSign, CheckCircle2 } from "lucide-react";

const INITIAL_ROLES = ["Aisha", "Sarah", "Ben", "Kemi"];

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
      // Shuffling roles when returning to Chaos so a new random person becomes the Creditor next time!
      const shuffled = [...roles].sort(() => 0.5 - Math.random());
      setRoles(shuffled);
    }
    setIsNetted(!isNetted);
  };

  const currentPos = isNetted ? NETTED_POS : CHAOS_POS;

  return (
    <section className="px-6 pb-32 max-w-6xl mx-auto pt-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{nettingVisualizer.title}</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">{nettingVisualizer.description}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Visualization Canvas */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="w-full lg:w-2/3 bg-white dark:bg-black rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden relative flex flex-col items-center p-8"
        >
          {/* Layman Context Banner */}
          <div className="w-full bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-6 mb-6 border border-indigo-100 dark:border-indigo-500/20 text-left z-30 relative">
            <h3 className="font-bold text-xl text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" /> The Magic of Netting
            </h3>
            
            <div className="space-y-4 text-indigo-800 dark:text-indigo-200">
              <div className="flex gap-3 items-start">
                <div className="w-3 h-3 mt-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] shrink-0" />
                <p className="leading-relaxed">
                  <strong className="text-indigo-900 dark:text-indigo-100 block mb-1">Without MeshTab (The Chaos):</strong> 
                  4 friends on a trip generate 12 shared expenses. Everyone owes everyone, resulting in a chaotic mess of international bank transfers and heavy FX fees.
                </p>
              </div>
              
              <div className="flex gap-3 items-start">
                <div className="w-3 h-3 mt-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] shrink-0" />
                <p className="leading-relaxed">
                  <strong className="text-indigo-900 dark:text-indigo-100 block mb-1">With MeshTab (The Solution):</strong> 
                  Click <em>"Calculate Settlement Map"</em> below. Our algorithm instantly cancels out mutual debts, reducing 12 payments down to just 3 direct transfers.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[length:32px_32px] pointer-events-none" />
          
          <div className="relative w-full max-w-sm aspect-square my-4">
            {/* Ambient Background Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] transition-colors duration-1000 ${isNetted ? 'bg-emerald-500/20' : 'bg-rose-500/10'}`} />

            {/* SVG Lines Container (Z-0 so it slides UNDER the nodes) */}
            <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full pointer-events-none z-0" overflow="visible">
              
              {/* CHAOTIC LINES (Before Netting) */}
              <AnimatePresence>
                {!isNetted && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 }} // Wait for nodes to return to 2x2 before drawing
                    className="text-rose-500/40 dark:text-rose-400/40"
                  >
                    {/* Crisscrossing Paths between the 2x2 grid (100,100), (300,100), (100,300), (300,300) */}
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
                    {/* Direct Paths to Center Node (200, 200) */}
                    <motion.path 
                      d="M 200 60 L 200 200" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }} // Wait for nodes to move first
                    />
                    <motion.path 
                      d="M 60 340 L 200 200" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 1.0 }}
                    />
                    <motion.path 
                      d="M 340 340 L 200 200" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 1.2 }}
                    />
                  </motion.g>
                )}
              </AnimatePresence>
            </svg>

            {/* Explicit Debt Labels (Z-10 so they are above lines but below nodes) */}
            <AnimatePresence>
              {isNetted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, delay: 1.8 }} // Fade in after all lines are drawn
                  className="absolute inset-0 pointer-events-none z-10"
                >
                  {/* Node 1 -> Node 0 */}
                  <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-100 text-xs font-bold px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50 shadow-sm whitespace-nowrap backdrop-blur-md">
                    {roles[1]} owes $180
                  </div>
                  {/* Node 2 -> Node 0 */}
                  <div className="absolute top-[75%] left-[25%] -translate-x-1/2 -translate-y-1/2 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-100 text-xs font-bold px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50 shadow-sm whitespace-nowrap backdrop-blur-md">
                    {roles[2]} owes $80
                  </div>
                  {/* Node 3 -> Node 0 */}
                  <div className="absolute top-[75%] left-[75%] -translate-x-1/2 -translate-y-1/2 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-100 text-xs font-bold px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50 shadow-sm whitespace-nowrap backdrop-blur-md">
                    {roles[3]} owes $40
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* THE 4 NODES (Z-20 so they stay above everything) */}
            <motion.div
              animate={currentPos[0]}
              transition={{ duration: 0.8, ease: "easeInOut", delay: isNetted ? 0.2 : 0 }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold z-20 shadow-xl border-2 transition-all duration-1000 ${isNetted ? 'w-16 h-16 bg-indigo-500 border-indigo-400 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)]' : 'w-12 h-12 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-gray-100'}`}
            >
              {roles[0]}
            </motion.div>
            <motion.div
              animate={currentPos[1]}
              transition={{ duration: 0.8, ease: "easeInOut", delay: isNetted ? 0.2 : 0 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 z-20 shadow-md"
            >
              {roles[1]}
            </motion.div>
            <motion.div
              animate={currentPos[2]}
              transition={{ duration: 0.8, ease: "easeInOut", delay: isNetted ? 0.2 : 0 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 z-20 shadow-md"
            >
              {roles[2]}
            </motion.div>
            <motion.div
              animate={currentPos[3]}
              transition={{ duration: 0.8, ease: "easeInOut", delay: isNetted ? 0.2 : 0 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 z-20 shadow-md"
            >
              {roles[3]}
            </motion.div>
            
            {/* Floating Expenses (Chaos Mode Only) */}
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

          <div className="mt-8 z-30 w-full flex justify-center">
            <button 
              onClick={handleToggle}
              className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl ${isNetted ? 'bg-gray-900 text-white dark:bg-white dark:text-black hover:scale-105' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'}`}
            >
              {isNetted ? <RotateCcw className="w-5 h-5" /> : <Activity className="w-5 h-5" />} 
              {isNetted ? "Reset Ledger" : nettingVisualizer.cta}
            </button>
          </div>
        </motion.div>

        {/* Metrics Sidebar */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <motion.div 
            layout
            className="p-6 rounded-3xl bg-white dark:bg-[#111] border border-gray-100 dark:border-white/10 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2 text-gray-500">
              <DollarSign className="w-5 h-5" /> Gross Volume
            </div>
            <div className="text-4xl font-black text-gray-900 dark:text-white line-through decoration-rose-500/50 decoration-4">
              $1,200.00
            </div>
            <p className="text-sm text-gray-500 mt-2 font-medium">The total sum of all hotel, food, and taxi receipts logged.</p>
          </motion.div>

          <motion.div 
            layout
            className={`p-6 rounded-3xl border shadow-sm transition-all duration-700 ${isNetted ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 scale-105' : 'bg-white dark:bg-[#111] border-gray-100 dark:border-white/10'}`}
          >
            <div className="flex items-center gap-3 mb-2 text-gray-500">
              <CheckCircle2 className={`w-5 h-5 ${isNetted ? 'text-emerald-600 dark:text-emerald-400' : ''}`} /> Capital Required
            </div>
            <div className={`text-4xl font-black transition-colors duration-700 ${isNetted ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              $300.00
            </div>
            <p className="text-sm text-gray-500 mt-2 font-medium">The actual money that needs to move to settle all debts.</p>
          </motion.div>

          <motion.div 
            layout
            className={`p-6 rounded-3xl border shadow-sm transition-all duration-700 ${isNetted ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' : 'bg-white dark:bg-[#111] border-gray-100 dark:border-white/10'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                  <TrendingDown className={`w-5 h-5 ${isNetted ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Debt Cleared
                </div>
                <div className={`text-3xl font-bold transition-colors duration-700 ${isNetted ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                  75.0%
                </div>
              </div>
              <div className="h-10 px-4 bg-white dark:bg-black rounded-full flex items-center justify-center border border-gray-100 dark:border-white/10 shadow-sm shrink-0">
                <span className="text-lg font-black">12</span>
                <span className="text-sm text-gray-400 mx-2">→</span>
                <span className="text-lg font-black text-indigo-500">3</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2 font-medium">$900 of redundant debt perfectly cancelled out.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
