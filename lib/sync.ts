"use client";

import { useEffect, useState } from "react";
import { getStoredTabMembers, getStoredExpenses, getWorkspaceMode } from "./user";

const SYNC_INTERVAL = 3000; // 3 seconds polling when active

export function pushTabStateToRedis(tabId: string) {
  if (typeof window === "undefined") return;

  const mode = getWorkspaceMode();
  const members = getStoredTabMembers(tabId);
  const expenses = getStoredExpenses(tabId);

  // Background fetch
  fetch(`/api/sync/${tabId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode, members, expenses }),
  }).catch((error) => {
    console.error("Failed to sync tab to redis:", error);
    // Queue it for retry (offline-first mechanism can be added here)
  });
}

export function useTabSync(tabId: string) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!tabId || tabId === "new") return;

    let pollingTimer: NodeJS.Timeout;
    let isActive = true;

    // 1. Initial Pull & Smart Polling
    const pullFromRedis = async () => {
      if (!isActive || document.visibilityState !== "visible") return;
      
      try {
        const mode = getWorkspaceMode();
        const res = await fetch(`/api/sync/${tabId}?mode=${mode}`);
        if (res.ok) {
          const data = await res.json();
          const { members, expenses } = data;
          
          let updated = false;

          if (members && Array.isArray(members) && members.length > 0) {
            const localMembers = getStoredTabMembers(tabId);
            if (members.length > localMembers.length) {
              const storageKey = mode === "blank" ? `meshTab_clean_members_${tabId}` : `meshTab_members_${tabId}`;
              localStorage.setItem(storageKey, JSON.stringify(members));
              window.dispatchEvent(new Event("meshTab-members-update"));
              updated = true;
            }
          }

          if (expenses && Array.isArray(expenses) && expenses.length > 0) {
            const localExpenses = getStoredExpenses(tabId);
            if (expenses.length > localExpenses.length) {
              const storageKey = mode === "blank" ? `meshTab_clean_expenses_${tabId}` : `meshTab_expenses_${tabId}`;
              localStorage.setItem(storageKey, JSON.stringify(expenses));
              window.dispatchEvent(new Event("meshTab-expenses-update"));
              updated = true;
            }
          }

          setLastSync(new Date());
          if (updated) setIsSyncing(true);
        }
      } catch (error) {
        console.error("Polling error:", error);
      } finally {
        setTimeout(() => setIsSyncing(false), 500);
      }
    };

    // Smart Polling: Poll every 4 seconds ONLY if the tab is visible
    const startPolling = () => {
      pullFromRedis();
      pollingTimer = setInterval(pullFromRedis, 4000);
    };

    const stopPolling = () => clearInterval(pollingTimer);

    // Visibility Change Listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Initial start
    if (document.visibilityState === "visible") {
      startPolling();
    }

    // 2. Trigger Push on Local Updates
    const handleLocalUpdate = () => {
      pushTabStateToRedis(tabId);
    };

    window.addEventListener("meshTab-members-update", handleLocalUpdate);
    window.addEventListener("meshTab-expenses-update", handleLocalUpdate);

    return () => {
      isActive = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("meshTab-members-update", handleLocalUpdate);
      window.removeEventListener("meshTab-expenses-update", handleLocalUpdate);
    };
  }, [tabId]);

  return { isSyncing, lastSync };
}
