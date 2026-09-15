"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LANDING_CONTENT } from "../../content/landing";
import { Activity, RotateCcw, TrendingDown, DollarSign, CheckCircle2 } from "lucide-react";

export function NettingVisualizer() {
  const { nettingVisualizer } = LANDING_CONTENT;
  const [isNetted, setIsNetted] = useState(false);

  return (
    <section className="px-6 pb-32 max-w-6xl mx-auto pt-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{nettingVisualizer.title}</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">{nettingVisualizer.description}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
        {/* Visualization Canvas */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="w-full lg:w-2/3 aspect-square md:aspect-[16/9] bg-white dark:bg-black rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden relative flex flex-col items-center justify-center"
        >
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[length:32px_32px]" />
          
          <div className="relative w-full max-w-md h-72 md:h-96 my-8">
            {/* Ambient Background Glow based on state */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] transition-colors duration-1000 ${isNetted ? 'bg-emerald-500/20' : 'bg-rose-500/10'}`} />

            {/* Nodes */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-500/20 border-2 border-indigo-500 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold z-20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              Aisha
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700 z-20">Sarah</div>
            <div className="absolute bottom-4 left-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700 z-20">Ben</div>
            <div className="absolute bottom-4 right-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700 z-20">Kemi</div>
            
            {/* SVG Lines Container */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" overflow="visible">
              
              {/* CHAOTIC LINES (Before Netting) */}
              <AnimatePresence>
                {!isNetted && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-rose-500/40 dark:text-rose-400/40"
                  >
                    {/* Crisscrossing Paths */}
                    <path d="M 50% 0 Q 20% 40% 0 100%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 50% 0 Q 80% 40% 100% 100%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 0 100% Q 50% 120% 100% 100%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    {/* Reverse directed arrows for chaos */}
                    <path d="M 50% 50% L 0 100%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 50% 50% L 100% 100%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 50% 0 L 50% 50%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* RESOLVED LINES (After Netting) */}
              <AnimatePresence>
                {isNetted && (
                  <motion.g
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: 1, pathLength: 1 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="text-emerald-500 dark:text-emerald-400"
                  >
                    {/* Direct Paths to Aisha */}
                    <motion.path 
                      d="M 50% 0 L 50% 50%" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ strokeDashoffset: 100, strokeDasharray: 100 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                    <motion.path 
                      d="M 0 100% L 50% 50%" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ strokeDashoffset: 150, strokeDasharray: 150 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    />
                    <motion.path 
                      d="M 100% 100% L 50% 50%" 
                      fill="none" stroke="currentColor" strokeWidth="3" 
                      initial={{ strokeDashoffset: 150, strokeDasharray: 150 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                    />
                  </motion.g>
                )}
              </AnimatePresence>
            </svg>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full px-6 flex justify-center">
            <button 
              onClick={() => setIsNetted(!isNetted)}
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
            <p className="text-sm text-gray-500 mt-2">Total I.O.Us generated on trip</p>
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
            <p className="text-sm text-gray-500 mt-2">Minimum capital needed to settle</p>
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
                  {isNetted ? '75.0%' : '0.0%'}
                </div>
              </div>
              <div className="w-12 h-12 bg-white dark:bg-black rounded-full flex items-center justify-center border border-gray-100 dark:border-white/10">
                <span className="text-xl font-black">12</span>
                <span className="text-xs text-gray-400 mx-1">→</span>
                <span className="text-xl font-black text-indigo-500">3</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Transactions reduced</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
