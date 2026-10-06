"use client";

import { LANDING_CONTENT } from "../../content/landing";
import { Zap, ShieldCheck, Check, Fingerprint, Coins } from "lucide-react";
import Link from "next/link";

export function SettlementShowcase() {
  const { settlementMoment } = LANDING_CONTENT;

  return (
    <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-6 border border-indigo-500/20 shadow-xs">
            <Zap className="w-3.5 h-3.5" />
            {settlementMoment.badge}
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            {settlementMoment.title}
          </h2>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed">
            {settlementMoment.description}
          </p>
        </div>

        {/* The 3 Core Execution Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {settlementMoment.metrics.map((metric) => (
            <div 
              key={metric.title}
              className="p-8 rounded-3xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md hover:border-slate-600 transition-all shadow-lg"
            >
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                {metric.title}
              </div>
              <div className="text-4xl font-black text-white tracking-tight mb-2">
                {metric.val}
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {metric.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Execution Architecture Mock Card */}
        <div className="p-8 rounded-3xl bg-slate-950/80 border border-indigo-500/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                Monad Testnet · MeshTabLedger
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white">
              Atomic On-Chain Settlement Finality
            </h3>
            <p className="text-sm text-slate-400 max-w-xl">
              When all members approve the netted plan, transfers execute atomically in a single block. No partial default loops, no counterparty guessing, and no manual bank wires.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link 
              href="/demo"
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all hover:scale-105"
            >
              Experience 1-Tap Settlement
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
