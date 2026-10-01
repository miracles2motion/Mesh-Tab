"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter, usePathname } from "next/navigation";

/**
 * AuthGuard — Session security wrapper for private routes.
 * 
 * Monitors Privy's `ready` and `authenticated` states:
 * - While Privy is loading: shows a branded spinner (prevents layout flash).
 * - If session expired / user unauthenticated: soft-locks to `/locked`.
 * - If authenticated: renders children normally.
 * 
 * Uses `router.replace` so browser back button can't return to a dead session.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/locked");
    }
  }, [ready, authenticated, router]);

  // Privy still initializing — show a minimal branded loader
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-200 dark:border-indigo-500/30 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400 dark:text-white/40 font-medium">Securing session…</p>
        </div>
      </div>
    );
  }

  // Session expired — render nothing while redirect happens
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-200 dark:border-indigo-500/30 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400 dark:text-white/40 font-medium">Redirecting…</p>
        </div>
      </div>
    );
  }

  // Authenticated — render the protected content
  return <>{children}</>;
}
