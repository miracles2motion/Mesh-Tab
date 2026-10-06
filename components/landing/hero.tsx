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
    if (authenticated) {
      const hasProfile = typeof window !== "undefined" && Boolean(localStorage.getItem("meshTab_displayName"));
      if (!hasProfile) {
        router.push("/onboarding?fresh=true&intent=testnet");
      } else {
        setWorkspaceMode("testnet");
        router.push("/home");
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

      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
        {hero.headline} <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          {hero.headlineHighlight}
        </span>
      </h1>

      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10 leading-relaxed font-normal">
        {hero.subheadline}
      </p>

      {/* Dual CTA */}
      <div className="flex flex-col items-center gap-3 w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/demo" 
            className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4 shadow-xl shadow-indigo-500/25 hover:scale-[1.02] transition-transform"
          >
            <Sparkles className="w-5 h-5" />
            {hero.primaryCta} <ChevronRight className="w-5 h-5" />
          </Link>
          <button 
            type="button"
            onClick={handleTestnetClick}
            className="btn-secondary flex items-center justify-center gap-2.5 text-lg px-8 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <span>{authenticated ? "Enter App" : hero.secondaryCta}</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">
          {hero.primaryCtaMicro}
        </p>
      </div>

      {/* Concrete Metrics Strip */}
      <div className="mt-14 pt-8 border-t border-gray-200/70 dark:border-white/10 w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {hero.metrics.map((m) => (
          <div key={m.label} className="p-2">
            <div className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{m.val}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">{m.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
