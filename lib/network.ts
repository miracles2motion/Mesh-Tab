"use client";

import { useState, useEffect } from "react";
import { getStoredExpenses, StoredExpense } from "./user";

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
  
  return isBrowserOnline && !isSimulatedOffline;
}

export function useNetworkStatus() {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const calculatePendingCount = () => {
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
  };

  useEffect(() => {
    // Initial state
    setIsBrowserOnline(navigator.onLine);
    setIsSimulatedOffline(localStorage.getItem("meshTab_simulatedOffline") === "true");
    calculatePendingCount();

    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    const handleNetworkChange = () => {
      setIsSimulatedOffline(localStorage.getItem("meshTab_simulatedOffline") === "true");
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
    window.addEventListener("meshTab-network-change", handleNetworkChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("meshTab-expenses-update", handleExpensesUpdate);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("meshTab-network-change", handleNetworkChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("meshTab-expenses-update", handleExpensesUpdate);
    };
  }, []);

  const toggleAirplaneMode = () => {
    const newState = !isSimulatedOffline;
    localStorage.setItem("meshTab_simulatedOffline", newState.toString());
    setIsSimulatedOffline(newState);
    window.dispatchEvent(new Event("meshTab-network-change"));
    
    // The actual push on reconnect will happen in the network status badge UI
    // when it sees the state change, or via the 'online' event if it was real offline.
  };

  return {
    isBrowserOnline,
    isSimulatedOffline,
    isEffectivelyOnline: isBrowserOnline && !isSimulatedOffline,
    pendingCount,
    toggleAirplaneMode,
  };
}
