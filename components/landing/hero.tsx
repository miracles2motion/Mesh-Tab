import { LANDING_CONTENT } from "../../content/landing";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";

export function Hero() {
  const { hero } = LANDING_CONTENT;

  return (
    <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px] rounded-full -z-10" />
      
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-8 border border-indigo-100 dark:border-indigo-500/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
        {hero.badge}
      </div>

      <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.1] mb-8">
        {hero.headline} <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          {hero.headlineHighlight}
        </span>
      </h1>

      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mb-12 leading-relaxed">
        {hero.subheadline}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link href="/tab/new" className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4">
          {hero.primaryCta} <ChevronRight className="w-5 h-5" />
        </Link>
        <Link href="/tab/lisbon-24" className="btn-secondary flex items-center justify-center gap-2 text-lg px-8 py-4">
          {hero.secondaryCta}
        </Link>
      </div>
    </section>
  );
}
