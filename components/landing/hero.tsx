"use client";

import { LANDING_CONTENT } from "../../content/landing";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { sounds } from "../../lib/sounds";
import { useRouter } from "next/navigation";
import { setWorkspaceMode } from "../../lib/user";

export function Hero() {
  const { hero } = LANDING_CONTENT;
  const { authenticated } = usePrivy();
  const router = useRouter();

  const handleTestnetClick = () => {
    sounds.playPop();
    if (typeof window !== "undefined") {
      localStorage.removeItem("mesh_explicit_logout");
      sessionStorage.removeItem("mesh_just_logged_out");
    }
    if (authenticated) {
      const hasProfile = typeof window !== "undefined" && Boolean(localStorage.getItem("meshTab_displayName"));
      if (!hasProfile) {
        router.push("/onboarding?fresh=true&intent=testnet");
      } else {
        setWorkspaceMode("testnet");
        router.replace("/home");
      }
    } else {
      router.push("/login?intent=testnet");
    }
  };

  return (
    <section className="relative pt-32 pb-16 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
      
      {/* Friction-removing pill badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-8 border border-indigo-100 dark:border-indigo-500/20 shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        {hero.badge}
      </div>

      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-4">
        {hero.headline} <br className="hidden sm:inline" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          {hero.headlineHighlight}
        </span>
      </h1>

      <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 max-w-2xl mb-3 tracking-tight">
        {hero.subline}
      </p>

      <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mb-10 leading-relaxed font-normal">
        {hero.body}
      </p>

      {/* Dual CTA */}
      <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Action 1: Start a tab. (Primary button: handles login / onboarding / create tab on Monad Testnet) */}
          <button 
            type="button"
            onClick={handleTestnetClick}
            className="w-full sm:w-auto relative group flex items-center justify-center gap-3 text-base md:text-lg px-7 py-3.5 sm:py-4 rounded-full font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 shadow-xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.03] active:scale-[0.98] transition-all border border-purple-400/30 cursor-pointer overflow-hidden"
          >
            {/* Ambient hover flare */}
            <div className="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
            
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>

            <span className="relative tracking-wide font-extrabold">
              {hero.primaryCta}
            </span>

            <span className="relative text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/25 text-white/90 border border-white/20 tracking-normal shrink-0">
              Testnet (Sign-in)
            </span>

            <ChevronRight className="w-5 h-5 relative group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* Action 2: Try the sample (Secondary button: opens the sample tab /demo, no sign-in) */}
          <Link 
            href="/demo?from=/" 
            className="w-full sm:w-auto flex items-center justify-center gap-3 text-base md:text-lg px-7 py-3.5 sm:py-4 rounded-full font-bold text-slate-900 dark:text-white bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/15 shadow-md hover:scale-[1.02] transition-all"
          >
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
            <span>{hero.secondaryCta}</span>
            <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 tracking-normal shrink-0">
              Instant (No Login)
            </span>
          </Link>
        </div>
      </div>

      {/* Concrete Metrics Strip */}
      <div className="mt-14 pt-8 border-t border-gray-200/70 dark:border-white/10 w-full max-w-5xl xl:max-w-6xl grid grid-cols-2 md:flex md:items-center md:justify-around gap-6 md:gap-4 text-center px-4">
        {hero.metrics.map((m) => (
          <div key={m.label} className="p-2 flex flex-col items-center">
            <div className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight md:whitespace-nowrap">
              {m.val}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
