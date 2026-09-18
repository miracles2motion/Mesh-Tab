"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected error silently in development
    console.error("MeshTab Global Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
      <div className="w-16 h-16 rounded-3xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center mb-6 shadow-sm">
        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
        Something unexpected happened
      </h1>
      <p className="text-sm text-slate-500 dark:text-white/60 max-w-md mb-8 leading-relaxed">
        Your group tab data and ledger remain safe in your local storage. Tap below to reload the screen or return to the main hub.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
          onClick={() => reset()}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/home"
          className="px-6 py-3 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to Hub</span>
        </Link>
      </div>
    </div>
  );
}
