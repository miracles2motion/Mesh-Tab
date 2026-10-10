"use client";

import { useEffect, useState, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter, usePathname } from "next/navigation";
import { useWorkspaceMode } from "@/lib/user";
import { getSessionSnapshot, saveSessionSnapshot, isSessionSnapshotValid } from "@/lib/session-snapshot";

/**
 * AuthGuard — Session security wrapper for private routes.
 * 
 * Monitors Privy's `ready` and `authenticated` states:
 * - While Privy is loading: shows a branded spinner (prevents layout flash).
 * - If Privy hangs for > 5s: assumes stale session, redirects to /locked.
 * - If session expired / user unauthenticated: soft-locks to `/locked`.
 * - If authenticated: renders children normally.
 * 
 * Uses `router.replace` so browser back button can't return to a dead session.
 */

const SDK_TIMEOUT_MS = 5000; // 5 second failsafe
const PUBLIC_ROUTES = ["/", "/login", "/demo", "/onboarding", "/locked"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useWorkspaceMode();
  
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineAllowed, setIsOfflineAllowed] = useState(false);
  const [offlineStatusDetermined, setOfflineStatusDetermined] = useState(false);

  const isDemo = mode !== "testnet";
  const isJoinRoute = Boolean(pathname && (pathname.includes("/join") || pathname.endsWith("/join")));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || isJoinRoute;

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check offline snapshot
  useEffect(() => {
    if (isDemo || isPublicRoute) return;
    if (isOnline) {
      setIsOfflineAllowed(false);
      setOfflineStatusDetermined(true);
      return;
    }
    
    // We are offline
    const snapshot = getSessionSnapshot();
    if (snapshot && isSessionSnapshotValid(snapshot)) {
      setIsOfflineAllowed(true);
    } else {
      setIsOfflineAllowed(false);
    }
    setOfflineStatusDetermined(true);
  }, [isOnline, isDemo, isPublicRoute]);

  // Timeout failsafe: if Privy SDK hasn't initialized within 5s, flag it
  useEffect(() => {
    if (isDemo || isPublicRoute || !isOnline) return;
    if (!ready) {
      timeoutRef.current = setTimeout(() => {
        setHasTimedOut(true);
      }, SDK_TIMEOUT_MS);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [ready, isDemo, isPublicRoute, isOnline]);

  // Hard-check explicit logout to prevent back-button access to private views
  const [isExplicitlyLoggedOut, setIsExplicitlyLoggedOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || isPublicRoute) return;
    const isLoggedOutFlag = (
      localStorage.getItem("mesh_explicit_logout") === "true" ||
      sessionStorage.getItem("mesh_just_logged_out") === "true"
    );
    if (isLoggedOutFlag) {
      setIsExplicitlyLoggedOut(true);
      window.location.replace("/");
    }
  }, [isPublicRoute]);

  // Handle bfcache restores (browser Back/Forward navigation)
  useEffect(() => {
    if (typeof window === "undefined" || isPublicRoute) return;

    const handlePageShow = (e: PageTransitionEvent) => {
      const isLoggedOutFlag = (
        localStorage.getItem("mesh_explicit_logout") === "true" ||
        sessionStorage.getItem("mesh_just_logged_out") === "true"
      );
      if (isLoggedOutFlag || (!isDemo && ready && !authenticated)) {
        window.location.replace("/");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [isPublicRoute, isDemo, ready, authenticated]);

  // Redirect on timeout (hung SDK) or expired session
  useEffect(() => {
    if (isDemo || isPublicRoute) return;
    if (!isOnline) {
      // Do not redirect to /locked here; let the render block show the "Please connect" UI.
      return;
    }
    
    if (hasTimedOut && !ready) {
      const isLocked = typeof window !== "undefined" && localStorage.getItem("mesh_session_locked") === "true";
      if (isLocked) {
        router.replace("/locked");
      } else {
        router.replace("/");
      }
    }
  }, [hasTimedOut, ready, router, isDemo, isPublicRoute, isOnline]);

  useEffect(() => {
    if (isDemo || isPublicRoute || !isOnline) return;
    if (ready && !authenticated) {
      const isLocked = typeof window !== "undefined" && localStorage.getItem("mesh_session_locked") === "true";
      if (isLocked) {
        router.replace("/locked");
      } else {
        router.replace("/");
      }
    }
  }, [ready, authenticated, router, isDemo, isPublicRoute, isOnline]);

  // Save snapshot when authenticated and online
  useEffect(() => {
    if (isDemo || isPublicRoute || !isOnline) return;
    if (ready && authenticated && user) {
      const activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      
      saveSessionSnapshot({
        walletAddress: activeWallet?.address || "",
        privyUserId: user.id,
        displayName: user.google?.name || user.twitter?.name || user.email?.address || "You"
      });
    }
  }, [ready, authenticated, user, wallets, isDemo, isPublicRoute, isOnline]);

  // If explicitly logged out, render loader while redirecting to landing page
  if (isExplicitlyLoggedOut && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-200 dark:border-indigo-500/30 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400 dark:text-white/40 font-medium">Redirecting to landing page…</p>
        </div>
      </div>
    );
  }

  // Bypass entirely for demo mode or public marketing/onboarding routes
  if (isDemo || isPublicRoute) {
    return <>{children}</>;
  }

  // If offline, check if allowed
  if (!isOnline) {
    if (!offlineStatusDetermined) {
      return null;
    }
    if (isOfflineAllowed) {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <p className="text-sm text-slate-400 dark:text-white/40 font-medium">Please connect to the internet to authenticate.</p>
        </div>
      </div>
    );
  }

  // Privy still initializing — show a minimal branded loader
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-200 dark:border-indigo-500/30 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400 dark:text-white/40 font-medium">
            {hasTimedOut ? "Session expired, redirecting…" : "Securing session…"}
          </p>
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
