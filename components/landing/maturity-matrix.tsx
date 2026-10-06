"use client";

import { LANDING_CONTENT } from "../../content/landing";
import { CheckCircle2, Clock, Shield } from "lucide-react";

export function MaturityMatrix() {
  const { maturityMatrix } = LANDING_CONTENT;

  return (
    <section id="trust-matrix" className="py-24 px-6 max-w-6xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-4 border border-emerald-200/60 dark:border-emerald-500/20">
          <Shield className="w-3.5 h-3.5" />
          Radical Transparency
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
          {maturityMatrix.title}
        </h2>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-300">
          {maturityMatrix.description}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Core Live on Testnet Column (Spans 2 columns) */}
        <div className="md:col-span-2 p-8 rounded-3xl bg-white dark:bg-[#111113] border border-emerald-500/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Live in this Build (Monad Testnet)
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {maturityMatrix.live.map((item) => (
              <div 
                key={item.name}
                className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-emerald-100">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-emerald-300/70 mt-0.5">
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap / In Development Column (1 column) */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#111113] border border-amber-500/20 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Mainnet Roadmap
            </h3>
          </div>

          <div className="space-y-4">
            {maturityMatrix.inDevelopment.map((item) => (
              <div 
                key={item.name}
                className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30"
              >
                <div className="font-semibold text-sm text-slate-900 dark:text-amber-100">
                  {item.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-amber-300/70 mt-0.5">
                  {item.detail}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 leading-relaxed">
            All banking integrations and physical cards are designed for post-hackathon Phase 2 deployment with licensed partners.
          </p>
        </div>

      </div>
    </section>
  );
}
