"use client";

import { LANDING_CONTENT } from "../../content/landing";
import { Camera, Mic, Coins, WifiOff, Sparkles, CheckCircle2 } from "lucide-react";

export function FeatureGrid() {
  const { liveSuperpowers } = LANDING_CONTENT;

  return (
    <section id="superpowers" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-4 border border-indigo-100 dark:border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          Engineering Craft
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
          {liveSuperpowers.title}
        </h2>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-300">
          {liveSuperpowers.description}
        </p>
      </div>

      {/* Asymmetrical Bento Box Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Bento Tile 1 (Hero Tile - Spans 2 Columns): Gemini Flash OCR */}
        <div className="md:col-span-2 p-8 md:p-10 rounded-3xl bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Camera className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live on Testnet
            </span>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">
              {liveSuperpowers.items[0].title}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed max-w-xl">
              {liveSuperpowers.items[0].desc}
            </p>
          </div>

          {/* Micro-Visual of OCR Parsing */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold shadow-xs">
              Merchant: Cervejaria Ramiro
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold shadow-xs">
              Total: €85.40
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 4 Items Parsed in 0.9s
            </span>
          </div>
        </div>

        {/* Bento Tile 2: Voice Expense Logging */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Mic className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live on Testnet
              </span>
            </div>

            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
              {liveSuperpowers.items[1].title}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
              {liveSuperpowers.items[1].desc}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 italic font-mono">
            "I paid 45 euros for Uber ride to airport" → Draft Tab Saved
          </div>
        </div>

        {/* Bento Tile 3: Real-Time Pyth Network FX */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Coins className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live on Testnet
              </span>
            </div>

            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
              {liveSuperpowers.items[2].title}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
              {liveSuperpowers.items[2].desc}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-white/10 font-bold">EUR/USD: 1.0842</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-white/10 font-bold">GBP/USD: 1.2915</span>
          </div>
        </div>

        {/* Bento Tile 4 (Spans 2 Columns): Offline-First PWA Sync */}
        <div className="md:col-span-2 p-8 md:p-10 rounded-3xl bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <WifiOff className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live on Testnet
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">
              {liveSuperpowers.items[3].title}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed mb-6 max-w-xl">
              {liveSuperpowers.items[3].desc}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-600 dark:text-slate-300">
              IndexedDB local storage active · 0 network latency on creation
            </span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Auto-Reconciliation Engine
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
