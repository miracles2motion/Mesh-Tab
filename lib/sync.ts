"use client";

import { useEffect, useState, useRef } from "react";
import { getStoredTabMembers, getStoredExpenses, getWorkspaceMode, getStoredUser, getStoredTabs, TabMember, StoredExpense } from "./user";
import { isEffectivelyOnline } from "./network";

const FAST_INTERVAL = 15000;  // 15s polling during active user interaction
const SLOW_INTERVAL = 60000; // 60s back-off when idle to protect Upstash quota
const IDLE_TIMEOUT = 30000;  // 30s without activity enters idle mode

function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

function haveMembersChanged(serverMembers: TabMember[], localMembers: TabMember[]): boolean {
  if (!serverMembers || !localMembers) return true;
  if (serverMembers.length !== localMembers.length) return true;

  for (const sm of serverMembers) {
    const lm = localMembers.find(m => m.name.toLowerCase() === sm.name.toLowerCase());
    if (!lm) return true;
    if (lm.balance !== sm.balance || lm.type !== sm.type || lm.role !== sm.role) {
      return true;
    }
  }
  return false;
}

function haveExpensesChanged(serverExpenses: StoredExpense[], localExpenses: StoredExpense[]): boolean {
  if (!serverExpenses || !localExpenses) return true;
  if (serverExpenses.length !== localExpenses.length) return true;

  for (const se of serverExpenses) {
    const le = localExpenses.find(e => e.id === se.id);
    if (!le) return true;
    if (le.amount !== se.amount || le.desc !== se.desc || le.payer !== se.payer) {
      return true;
    }
  }
  return false;
}

export function pushTabStateToRedis(tabId: string) {
  if (typeof window === "undefined" || !tabId || tabId === "new") return;
  if (!isEffectivelyOnline()) return;

  const mode = getWorkspaceMode();
  const members = getStoredTabMembers(tabId);
  const expenses = getStoredExpenses(tabId);

  const localHash = simpleHash(JSON.stringify({ members, expenses }));
  const lastPushedHash = sessionStorage.getItem(`meshTab_lastPush_${tabId}`);
  if (localHash === lastPushedHash) return; // Skip — nothing changed since last push
  sessionStorage.setItem(`meshTab_lastPush_${tabId}`, localHash);

  // Background fetch
  fetch(`/api/sync/${tabId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode, members, expenses }),
  }).then((res) => {
    if (res.ok) {
      // Mark all pending expenses as synced
      const currentExpenses = getStoredExpenses(tabId);
      const hadPending = currentExpenses.some(e => e.syncStatus === "pending");
      if (hadPending) {
        const updated = currentExpenses.map(e => ({ ...e, syncStatus: "synced" as const }));
        const storageKey = mode === "blank" ? `meshTab_clean_expenses_${tabId}` : `meshTab_expenses_${tabId}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("meshTab-expenses-update", { detail: { fromServer: true } }));
      }
    }
  }).catch((error) => {
    console.error("Failed to sync tab to redis:", error);
  });
}

export function useTabSync(tabId: string) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    if (!tabId || tabId === "new") return;

    let pollingTimer: NodeJS.Timeout | null = null;
    let isActive = true;
    let errorCount = 0;
    let lastActivityTime = Date.now();
    let consecutiveNoChanges = 0;

    const markUserActive = () => {
      lastActivityTime = Date.now();
    };

    // 1. Initial Pull & Smart Polling
    const pullFromRedis = async () => {
      if (!isActive || document.visibilityState !== "visible") return;
      if (!isEffectivelyOnline()) return;
      
      try {
        const mode = getWorkspaceMode();
        const res = await fetch(`/api/sync/${tabId}?mode=${mode}`);
        if (res.ok) {
          errorCount = 0;
          setSyncError(false);
          const data = await res.json();
          const { members, expenses } = data;
          
          let stateUpdated = false;

          // Smart Deep Merge for Members
          if (members && Array.isArray(members) && members.length > 0) {
            const localMembers = getStoredTabMembers(tabId);
            if (haveMembersChanged(members, localMembers)) {
              const storageKey = mode === "blank" ? `meshTab_clean_members_${tabId}` : `meshTab_members_${tabId}`;
              localStorage.setItem(storageKey, JSON.stringify(members));
              window.dispatchEvent(new CustomEvent("meshTab-members-update", { detail: { fromServer: true } }));
              stateUpdated = true;

              // Update user balance in stored tab summaries for home dashboard
              try {
                const profile = getStoredUser();
                const userMember = members.find(m => m.name.toLowerCase() === profile.name.toLowerCase());
                if (userMember) {
                  const key = mode === "blank" ? "meshTab_clean_tabs" : "meshTab_sample_tabs";
                  const tabs = getStoredTabs();
                  const nextTabs = tabs.map(t => {
                    if (t.id === tabId) {
                      return { ...t, balance: userMember.balance, memberCount: members.length, lastActivity: "Just now" };
                    }
                    return t;
                  });
                  localStorage.setItem(key, JSON.stringify(nextTabs));
                  window.dispatchEvent(new Event("meshTab-tabs-update"));
                }
              } catch (e) {}
            }
          }

          // Smart Deep Merge for Expenses
          if (expenses && Array.isArray(expenses) && expenses.length > 0) {
            const localExpenses = getStoredExpenses(tabId);
            if (haveExpensesChanged(expenses, localExpenses)) {
              const storageKey = mode === "blank" ? `meshTab_clean_expenses_${tabId}` : `meshTab_expenses_${tabId}`;
              localStorage.setItem(storageKey, JSON.stringify(expenses));
              window.dispatchEvent(new CustomEvent("meshTab-expenses-update", { detail: { fromServer: true } }));
              stateUpdated = true;
            }
          }

          setLastSync(new Date());
          if (stateUpdated) {
            setIsSyncing(true);
            consecutiveNoChanges = 0;
          } else {
            consecutiveNoChanges++;
          }
        } else {
          errorCount++;
          if (errorCount >= 3) setSyncError(true);
        }
      } catch (error) {
        console.error("Polling error:", error);
        errorCount++;
        if (errorCount >= 3) setSyncError(true);
      } finally {
        setTimeout(() => setIsSyncing(false), 500);
      }
    };

    // Adaptive Polling Scheduler
    const scheduleNextPoll = () => {
      if (!isActive) return;
      if (document.visibilityState !== "visible") return;

      const isUserActive = Date.now() - lastActivityTime < IDLE_TIMEOUT;
      const baseDelay = isUserActive ? FAST_INTERVAL : SLOW_INTERVAL;
      const backoffMultiplier = Math.min(consecutiveNoChanges, 4); // max 4× backoff
      const delay = baseDelay * (1 + backoffMultiplier);

      pollingTimer = setTimeout(async () => {
        await pullFromRedis();
        scheduleNextPoll();
      }, delay);
    };

    const startAdaptivePolling = () => {
      if (pollingTimer) clearTimeout(pollingTimer);
      pullFromRedis();
      scheduleNextPoll();
    };

    const stopPolling = () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
        pollingTimer = null;
      }
    };

    // User Activity Listeners (Keep fast polling alive during active interaction)
    const handleActivity = () => {
      markUserActive();
      // If was idle or polling was stopped, resume
      if (!pollingTimer && document.visibilityState === "visible") {
        startAdaptivePolling();
      }
    };

    // Visibility & Focus Listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markUserActive();
        startAdaptivePolling();
      } else {
        stopPolling();
      }
    };

    let focusDebounce: NodeJS.Timeout | null = null;
    const handleWindowFocus = () => {
      if (focusDebounce) clearTimeout(focusDebounce);
      focusDebounce = setTimeout(() => {
        markUserActive();
        pullFromRedis();
      }, 1000);
    };

    const handleOnline = () => {
      markUserActive();
      // Push any offline-created expenses/members, then pull remote updates
      pushTabStateToRedis(tabId);
      pullFromRedis();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    
    const handleNetworkChange = () => {
      const isSimulatedOffline = localStorage.getItem("meshTab_simulatedOffline") === "true";
      if (navigator.onLine && !isSimulatedOffline) {
        markUserActive();
        // Force push before the next poll can overwrite our pending offline data
        pushTabStateToRedis(tabId);
        pullFromRedis();
      }
    };
    window.addEventListener("meshTab-network-change", handleNetworkChange);
    
    // Initial start
    if (document.visibilityState === "visible") {
      startAdaptivePolling();
    }

    // Trigger Push on Local Updates (skipping if came from server pull)
    const handleLocalUpdate = (e: any) => {
      if (e?.detail?.fromServer) return;
      markUserActive();
      pushTabStateToRedis(tabId);
    };

    window.addEventListener("meshTab-members-update", handleLocalUpdate);
    window.addEventListener("meshTab-expenses-update", handleLocalUpdate);

    return () => {
      isActive = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("meshTab-network-change", handleNetworkChange);
      window.removeEventListener("meshTab-members-update", handleLocalUpdate);
      window.removeEventListener("meshTab-expenses-update", handleLocalUpdate);
    };
  }, [tabId]);

  return { isSyncing, lastSync, syncError };
}
