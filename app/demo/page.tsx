"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, CheckCircle2, ArrowRight, Compass, PlusCircle, Users, Receipt, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "../../components/theme-toggle";
import { setWorkspaceMode, resetLisbonDemo } from "../../lib/user";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import Image from "next/image";
import { MeshBuddy } from "../../components/ui/mesh-buddy";
import { FreshDemoModal } from "../../components/demo/fresh-demo-modal";
function DemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from");
  const [showFreshModal, setShowFreshModal] = useState(false);

  const handleBack = () => {
    sounds.playClick();
    if (fromUrl && fromUrl.startsWith("/")) {
      router.push(fromUrl);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const handleSelectSample = () => {
    resetLisbonDemo();
    sounds.playSuccessChime();
    toast.success("Loaded Lisbon Trip Demo", {
      description: "Pre-loaded with 4 members, $1,200 expenses, and un-netted debts."
    });
    router.push("/home");
  };

  const handleSelectBlank = () => {
    sounds.playPop();
    toast.info("Testnet Mode Coming Soon!", {
      description: "Live testnet smart contracts and clean workspace mode are coming soon. MeshTab is currently running in full Demo Mode with the Lisbon Benchmark."
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex flex-col transition-colors duration-300 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="px-6 md:px-12 py-6 max-w-6xl mx-auto w-full flex items-center justify-between z-10">
        <button 
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {fromUrl?.startsWith("/tab") ? "Back to Tab" : fromUrl === "/home" ? "Back to Hub" : "Back"}
        </button>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/home" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">
            Skip to Hub
          </Link>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-5xl mx-auto w-full z-10">
        {/* Badge & Headlines */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-2xl mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-4 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Demo Sandbox</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            How would you like to explore MeshTab?
          </h1>
          <p className="text-slate-500 dark:text-white/60 text-base md:text-lg mt-3 leading-relaxed">
            Select your preferred sandbox mode. You can switch between these modes anytime with 1-click in the app.
          </p>
        </motion.div>

        {/* 2 Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Card 1: Sample Trip (Lisbon '24) */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -4 }}
            onClick={handleSelectSample}
            className="bg-white dark:bg-[#18181b] border-2 border-indigo-500/30 dark:border-indigo-500/30 rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between relative group overflow-hidden"
          >
            {/* Corner Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-600 to-purple-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-bl-2xl shadow-sm">
              Recommended for Quick Tour
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-3xl mb-6 shadow-sm group-hover:scale-110 transition-transform">
                🏖️
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Start with Sample Data
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-4">
                The Lisbon &apos;24 Trip Benchmark
              </p>

              <p className="text-sm text-slate-600 dark:text-white/70 leading-relaxed mb-6">
                Pre-populated with 4 international travelers, $1,200 in shared trip expenses, and 12 crisscrossing debt loops ready to simplify.
              </p>

              {/* Feature Chips */}
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Tangle Netting Visualizer:</strong> Collapse 12 crisscrossing debts into 3 direct payments ($900 cleared).</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Atomic Settlement & Receipt:</strong> Test one-tap AUSD settlement with Monad block height confirmation.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Smart OCR & Voice Dictation:</strong> Inspect extracted villa bookings and wine dinner receipts.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all cursor-pointer"
            >
              <span>Explore Lisbon Demo Tab</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Card 2: Live Testnet Mode (Coming Soon) */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -2 }}
            onClick={handleSelectBlank}
            className="bg-white/80 dark:bg-[#18181b]/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-8 shadow-md hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between relative group overflow-hidden"
          >
            {/* Corner Badge */}
            <div className="absolute top-0 right-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-b border-l border-amber-500/20 text-[11px] font-bold px-4 py-1.5 rounded-bl-2xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Coming Soon</span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-3xl mb-6 shadow-sm">
                ⚡
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Live Testnet Mode
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-4">
                Clean Slate &amp; On-Chain Contracts
              </p>

              <p className="text-sm text-slate-600 dark:text-white/70 leading-relaxed mb-6">
                Direct deployment of on-chain tab ledgers to Monad testnet and fresh multi-user passkey signing will unlock in the upcoming testnet release. Currently, MeshTab operates in full Demo Mode with the Lisbon Benchmark.
              </p>

              {/* Feature Chips */}
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-white/70">
                  <span className="text-amber-500 font-bold shrink-0">⏳</span>
                  <span><strong>Monad Testnet Genesis:</strong> Deploy individual on-chain group tab ledgers.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-white/70">
                  <span className="text-amber-500 font-bold shrink-0">⏳</span>
                  <span><strong>Real Passkey Signatures:</strong> Dynamic WebAuthn turnkeys on Monad testnet.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-white/70">
                  <span className="text-amber-500 font-bold shrink-0">⏳</span>
                  <span><strong>On-Chain AUSD Settlement:</strong> Real testnet transactions with sub-second finality.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <span>Coming Soon (Testnet Phase)</span>
            </button>
          </motion.div>
        </div>

        {/* Quick Switching Tip */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 text-center text-xs text-slate-500 dark:text-white/40 flex items-center gap-2 bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-4 py-2 rounded-full shadow-xs"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-500" />
          <span>Need to switch later? Use the 1-click mode toggle at the top of your Hub or in Settings anytime.</span>
        </motion.div>
      </main>

      <FreshDemoModal 
        isOpen={showFreshModal} 
        onClose={() => setShowFreshModal(false)} 
      />

      <MeshBuddy />
    </div>
  );
}

export default function DemoSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a]" />}>
      <DemoContent />
    </Suspense>
  );
}
