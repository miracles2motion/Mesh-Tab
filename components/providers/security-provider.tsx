"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter, usePathname } from "next/navigation";
import { useWorkspaceMode } from "@/lib/user";

type SecurityContextType = {
  lockTimer: number; // 0 = immediate, > 0 = milliseconds, -1 = never
  setLockTimer: (ms: number) => void;
};

const SecurityContext = createContext<SecurityContextType>({ 
  lockTimer: 300000, 
  setLockTimer: () => {} 
});

export function SecurityProvider({ children }: { children: ReactNode }) {
  const { logout, authenticated, user } = usePrivy();
  const { mode } = useWorkspaceMode();
  const router = useRouter();
  const pathname = usePathname();
  
  // Default to 5 minutes (300000ms)
  const [lockTimer, setLockTimerState] = useState<number>(300000);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mesh_lock_timer");
      if (saved !== null) {
        setLockTimerState(parseInt(saved, 10));
      }
    }
  }, []);

  const setLockTimer = (ms: number) => {
    setLockTimerState(ms);
    if (typeof window !== "undefined") {
      localStorage.setItem("mesh_lock_timer", ms.toString());
    }
  };

  useEffect(() => {
    // 1. Strict Isolation: Auto-lock NEVER runs in demo mode (sample or blank)
    if (mode !== "testnet") return;

    // 2. Strict Auth: Only runs for real authenticated testnet sessions
    if (!authenticated) return;
    if (lockTimer < 0) return;

    // 3. Strict Route Guard: Never lock out on public marketing or auth pages
    const PUBLIC_ROUTES = ["/", "/login", "/demo", "/onboarding", "/locked"];
    if (PUBLIC_ROUTES.includes(pathname)) return;

    let timeoutId: NodeJS.Timeout;

    const performLock = () => {
      // Save passkey status before logging out so the /locked page knows what to say
      const hasPasskey = user?.linkedAccounts?.some(acc => acc.type === 'passkey') || false;
      localStorage.setItem("mesh_last_passkey_status", hasPasskey.toString());
      
      if (typeof window !== "undefined" && navigator.onLine) {
        logout();
      }
      router.replace("/locked");
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (lockTimer > 0) {
        timeoutId = setTimeout(() => {
          performLock();
        }, lockTimer);
      }
    };

    const handleVisibilityChange = () => {
      if (lockTimer === 0 && document.visibilityState === 'hidden') {
         performLock();
      }
    };

    // Listeners for BOTH mobile and desktop
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    resetTimer(); // start initially

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authenticated, lockTimer, logout, router, pathname, user, mode]);

  return (
    <SecurityContext.Provider value={{ lockTimer, setLockTimer }}>
      {children}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => useContext(SecurityContext);
