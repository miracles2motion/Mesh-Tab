"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getStoredExpenses, StoredExpense } from "@/lib/user";
import { globalReachabilityFailed } from "@/lib/network";
import { getOutbox } from "@/lib/outbox";

interface ConnectivityContextType {
  isBrowserOnline: boolean;
  isSimulatedOffline: boolean;
  reachabilityFailed: boolean;
  isEffectivelyOnline: boolean;
  pendingCount: number;
  toggleAirplaneMode: () => void;
}

const ConnectivityContext = createContext<ConnectivityContextType | null>(null);

let reachabilityFailedGlobal = false;

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [reachabilityFailed, setReachabilityFailed] = useState<boolean>(reachabilityFailedGlobal);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const calculatePendingCount = useCallback(() => {
    let count = 0;
    if (typeof window === "undefined") return;

    // Outbox count
    try {
      const raw = localStorage.getItem("meshTab_testnet_outbox");
      if (raw) {
        const outbox = JSON.parse(raw);
        if (Array.isArray(outbox)) {
          count += outbox.filter((o) => o.status !== "failed").length;
        }
      }
    } catch (e) {
      console.error("Failed to parse outbox", e);
    }
    
    // Legacy pending count
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("_expenses_")) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const expenses: StoredExpense[] = JSON.parse(raw);
            if (Array.isArray(expenses)) {
              count += expenses.filter((e) => e.syncStatus === "pending").length;
            }
          }
        } catch (e) {}
      }
    }
    setPendingCount(count);
  }, []);

  useEffect(() => {
    setIsBrowserOnline(navigator.onLine);
    setIsSimulatedOffline(localStorage.getItem("meshTab_simulatedOffline") === "true");
    calculatePendingCount();

    let failureCount = 0;
    let timeoutId: NodeJS.Timeout;
    let isChecking = false;

    const checkReachability = async () => {
      if (isChecking) return;
      if (document.visibilityState !== "visible") return;
      if (!navigator.onLine || localStorage.getItem("meshTab_simulatedOffline") === "true") return;

      isChecking = true;
      clearTimeout(timeoutId);

      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        
        const res = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal
        });
        clearTimeout(id);

        if (res.ok) {
          failureCount = 0;
          if (reachabilityFailedGlobal) {
            reachabilityFailedGlobal = false;
            setReachabilityFailed(false);
          }
        } else {
          throw new Error("Not OK");
        }
      } catch (e) {
        failureCount++;
        if (failureCount >= 2 && !reachabilityFailedGlobal) {
          reachabilityFailedGlobal = true;
          setReachabilityFailed(true);
        }
      } finally {
        isChecking = false;
        const nextDelay = reachabilityFailedGlobal ? 20000 : 60000;
        timeoutId = setTimeout(checkReachability, nextDelay);
      }
    };

    checkReachability();

    const handleOnline = () => {
      setIsBrowserOnline(true);
      failureCount = 0;
      checkReachability();
    };
    const handleOffline = () => setIsBrowserOnline(false);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkReachability();
      }
    };

    const handleNetworkChange = () => {
      const isSim = localStorage.getItem("meshTab_simulatedOffline") === "true";
      setIsSimulatedOffline(isSim);
      if (!isSim) {
        failureCount = 0;
        checkReachability();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "meshTab_testnet_outbox" || (e.key && e.key.includes("_expenses_"))) {
        calculatePendingCount();
      }
    };
    
    const handleOutboxUpdate = () => {
      calculatePendingCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("meshTab-network-change", handleNetworkChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("meshtab:outbox:updated", handleOutboxUpdate);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("meshTab-network-change", handleNetworkChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("meshtab:outbox:updated", handleOutboxUpdate);
    };
  }, [calculatePendingCount]);

  const toggleAirplaneMode = () => {
    const newState = !isSimulatedOffline;
    localStorage.setItem("meshTab_simulatedOffline", newState.toString());
    setIsSimulatedOffline(newState);
    
    if (newState) {
      reachabilityFailedGlobal = false;
      setReachabilityFailed(false);
    }
    
    window.dispatchEvent(new Event("meshTab-network-change"));
  };

  const isEffectivelyOnline = isBrowserOnline && !isSimulatedOffline && !reachabilityFailed;

  return (
    <ConnectivityContext.Provider value={{
      isBrowserOnline,
      isSimulatedOffline,
      reachabilityFailed,
      isEffectivelyOnline,
      pendingCount,
      toggleAirplaneMode
    }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error("useConnectivity must be used within a ConnectivityProvider");
  }
  return context;
}
