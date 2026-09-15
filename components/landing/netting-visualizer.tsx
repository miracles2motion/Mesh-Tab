"use client";

import { motion } from "framer-motion";
import { LANDING_CONTENT } from "../../content/landing";
import { Network, Activity } from "lucide-react";

export function NettingVisualizer() {
  const { nettingVisualizer } = LANDING_CONTENT;

  return (
    <section className="px-6 pb-32 max-w-6xl mx-auto pt-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-bold mb-4">{nettingVisualizer.title}</h2>
        <p className="text-gray-600 dark:text-gray-400">{nettingVisualizer.description}</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="w-full aspect-[16/9] md:aspect-[21/9] bg-white dark:bg-black rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden relative flex flex-col items-center justify-center"
      >
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[length:32px_32px]" />
        
        {/* Animated Nodes Representation */}
        <div className="relative w-full max-w-md h-64 mb-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-gray-300 dark:border-gray-700"
            />
            
            {/* Center Node (Aisha) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-500/20 border-2 border-indigo-500 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold z-10 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              Aisha
            </div>

            {/* Orbiting Nodes */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700">Sarah</div>
            <div className="absolute bottom-1/4 left-0 -translate-x-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700">Ben</div>
            <div className="absolute bottom-1/4 right-0 translate-x-1/2 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-medium border border-gray-200 dark:border-gray-700">Kemi</div>
            
            {/* SVG Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
              <motion.path 
                d="M 224 0 L 224 128" 
                stroke="currentColor" 
                className="text-indigo-500"
                strokeWidth="2" 
                strokeDasharray="5,5" 
                animate={{ strokeDashoffset: [0, -20] }} 
                transition={{ repeat: Infinity, ease: "linear", duration: 1 }} 
              />
              <motion.path 
                d="M 32 192 L 224 128" 
                stroke="currentColor" 
                className="text-indigo-500"
                strokeWidth="2" 
                strokeDasharray="5,5" 
                animate={{ strokeDashoffset: [0, -20] }} 
                transition={{ repeat: Infinity, ease: "linear", duration: 1.5 }} 
              />
              <motion.path 
                d="M 416 192 L 224 128" 
                stroke="currentColor" 
                className="text-indigo-500"
                strokeWidth="2" 
                strokeDasharray="5,5" 
                animate={{ strokeDashoffset: [0, -20] }} 
                transition={{ repeat: Infinity, ease: "linear", duration: 1.2 }} 
              />
            </svg>
        </div>

        <button className="z-20 btn-primary flex items-center gap-2 px-6 py-3">
          <Activity className="w-4 h-4" /> {nettingVisualizer.cta}
        </button>
      </motion.div>
    </section>
  );
}
