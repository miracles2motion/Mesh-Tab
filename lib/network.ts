"use client";

import { useState, useEffect, useCallback } from "react";
import { getStoredExpenses, StoredExpense } from "./user";

export let globalReachabilityFailed = false;

interface NetworkState {
  isBrowserOnline: boolean;
  isSimulatedOffline: boolean;
  isEffectivelyOnline: boolean;
  pendingCount: number;
}

export function isEffectivelyOnline(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;
  
  const isBrowserOnline = navigator.onLine;
  const isSimulatedOffline = localStorage.getItem("meshTab_simulatedOffline") === "true";
  
  return isBrowserOnline && !isSimulatedOffline && !globalReachabilityFailed;
}

export function useNetworkStatus() {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [reachabilityFailed, setReachabilityFailed] = useState<boolean>(globalReachabilityFailed);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const calculatePendingCount = useCallback(() => {
    let count = 0;
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
        } catch (e) {
          console.error("Failed to parse expenses for pending count", e);
        }
      }
    }
    setPendingCount(count);
  }, []);

  useEffect(() => {
    // Initial state
    setIsBrowserOnline(navigator.onLine);
    setIsSimulatedOffline(localStorage.getItem("meshTab_simulatedOffline") === "true");
    calculatePendingCount();

    // --- Reachability Check ---
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
          if (globalReachabilityFailed) {
            globalReachabilityFailed = false;
            setReachabilityFailed(false);
          }
        } else {
          throw new Error("Not OK");
        }
      } catch (e) {
        failureCount++;
        if (failureCount >= 2 && !globalReachabilityFailed) {
          globalReachabilityFailed = true;
          setReachabilityFailed(true);
        }
      } finally {
        isChecking = false;
        const nextDelay = globalReachabilityFailed ? 20000 : 60000;
        timeoutId = setTimeout(checkReachability, nextDelay);
      }
    };

    // Kick off
    checkReachability();

    const handleOnline = () => {
      setIsBrowserOnline(true);
      failureCount = 0; // reset
      checkReachability(); // immediate check
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
      if (e.key && e.key.includes("_expenses_")) {
        calculatePendingCount();
      }
    };
    
    const handleExpensesUpdate = () => {
      calculatePendingCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("meshTab-network-change", handleNetworkChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("meshTab-expenses-update", handleExpensesUpdate);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("meshTab-network-change", handleNetworkChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("meshTab-expenses-update", handleExpensesUpdate);
    };
  }, [calculatePendingCount]);

  const toggleAirplaneMode = () => {
    const newState = !isSimulatedOffline;
    localStorage.setItem("meshTab_simulatedOffline", newState.toString());
    setIsSimulatedOffline(newState);
    
    if (newState) {
      // if going offline, clear failure count
      globalReachabilityFailed = false;
      setReachabilityFailed(false);
    }
    
    window.dispatchEvent(new Event("meshTab-network-change"));
  };

  return {
    isBrowserOnline,
    isSimulatedOffline,
    reachabilityFailed,
    isEffectivelyOnline: isBrowserOnline && !isSimulatedOffline && !reachabilityFailed,
    pendingCount,
    toggleAirplaneMode,
  };
}
