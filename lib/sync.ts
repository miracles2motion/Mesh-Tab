"use client";

import { useEffect, useState, useRef } from "react";
import { getStoredTabMembers, getStoredExpenses, getWorkspaceMode, getStoredUser, getStoredTabs, TabMember, StoredExpense } from "./user";

const FAST_INTERVAL = 4000;  // 4s polling during active user interaction
const SLOW_INTERVAL = 16000; // 16s back-off when idle to protect Upstash quota
const IDLE_TIMEOUT = 45000;  // 45s without activity enters idle mode

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

    const markUserActive = () => {
      lastActivityTime = Date.now();
    };

    // 1. Initial Pull & Smart Polling
    const pullFromRedis = async () => {
      if (!isActive || document.visibilityState !== "visible") return;
      
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
          if (stateUpdated) setIsSyncing(true);
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
      const delay = isUserActive ? FAST_INTERVAL : SLOW_INTERVAL;

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

    const handleWindowFocus = () => {
      markUserActive();
      pullFromRedis();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    
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
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("meshTab-members-update", handleLocalUpdate);
      window.removeEventListener("meshTab-expenses-update", handleLocalUpdate);
    };
  }, [tabId]);

  return { isSyncing, lastSync, syncError };
}
