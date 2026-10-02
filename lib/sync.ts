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

export async function pushTabStateToRedis(tabId: string, getAccessToken?: () => Promise<string | null>) {
  if (typeof window === "undefined" || !tabId || tabId === "new") return;
  if (!isEffectivelyOnline()) return;

  const mode = getWorkspaceMode();
  const expenses = getStoredExpenses(tabId);
  const pendingExpenses = expenses.filter(e => e.syncStatus === "pending");
  if (pendingExpenses.length === 0) return; // Skip — nothing to push

  let token = "";
  if (getAccessToken) {
    try {
      token = (await getAccessToken()) || "";
    } catch (e) {
      console.warn("Failed to get token for sync push");
    }
  }

  for (const exp of pendingExpenses) {
    // Transform to payload
    const payload = {
      expenseId: exp.id,
      description: exp.desc,
      originalAmount: exp.originalAmount || Math.floor(exp.amount / 100),
      originalCurrency: exp.originalCurrency || "USD",
      finalAmountUsd: exp.amount, // assuming everything is cents
      timestamp: new Date(exp.time).getTime() || Date.now(), // approximation if time is string like "Just now"
      mode: mode,
      payers: [{ name: exp.payer, amount: exp.amount }],
      borrowers: [] as {name: string, amount: number}[],
      metadata: exp // Include full UI state
    };
    
    // We can infer borrowers based on splitType
    if (exp.splitType === "exact" && exp.splits) {
       for (const [name, amount] of Object.entries(exp.splits)) {
           payload.borrowers.push({ name, amount });
       }
    } else if (exp.participants && exp.participants.length > 0) {
       const splitCount = exp.participants.length;
       const baseShare = Math.floor(exp.amount / splitCount);
       let remainder = exp.amount - (baseShare * splitCount);
       for (const p of exp.participants) {
          let owes = baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
          payload.borrowers.push({ name: p, amount: owes });
       }
    } else {
       // fallback
       payload.borrowers.push({ name: "Unknown", amount: exp.amount });
    }

    try {
      const res = await fetch(`/api/tab/${tabId}/expense/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
         // Mark as synced locally
         const currentExpenses = getStoredExpenses(tabId);
         const idx = currentExpenses.findIndex(e => e.id === exp.id);
         if (idx >= 0) {
            currentExpenses[idx].syncStatus = "synced";
            const storageKey = mode === "sample"
              ? `meshTab_expenses_${tabId}`
              : mode === "testnet"
                ? `meshTab_testnet_expenses_${tabId}`
                : `meshTab_clean_expenses_${tabId}`;
            localStorage.setItem(storageKey, JSON.stringify(currentExpenses));
            window.dispatchEvent(new CustomEvent("meshTab-expenses-update", { detail: { fromServer: true } }));
         }
      }
    } catch (err) {
      console.error("Failed to push expense", err);
    }
  }
}

export function useTabSync(tabId: string, getAccessToken?: () => Promise<string | null>) {
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
        let token = "";
        if (getAccessToken) {
          try {
            token = (await getAccessToken()) || "";
          } catch (e) {}
        }

        const res = await fetch(`/api/tab/${tabId}/expenses?mode=${mode}`, {
           headers: {
             "Authorization": token ? `Bearer ${token}` : ""
           }
        });
        if (res.ok) {
          errorCount = 0;
          setSyncError(false);
          const data = await res.json();
          const { members, expenses } = data;
          
          let stateUpdated = false;

          // Smart Deep Merge for Members
          if (members && Array.isArray(members) && members.length > 0) {
            const localMembers = getStoredTabMembers(tabId);
              // Apply member types (creditor, debtor) to match UI
              const updatedMembers = members.map((m: any) => ({
                 name: m.name,
                 balance: m.balance,
                 type: m.balance === 0 ? "settled" : m.balance > 0 ? "creditor" : "debtor",
                 role: "member"
              }));

              const storageKey = mode === "sample" 
                ? `meshTab_members_${tabId}`
                : mode === "testnet" 
                  ? `meshTab_testnet_members_${tabId}`
                  : `meshTab_clean_members_${tabId}`;
              localStorage.setItem(storageKey, JSON.stringify(updatedMembers));
              window.dispatchEvent(new CustomEvent("meshTab-members-update", { detail: { fromServer: true } }));
              stateUpdated = true;

              // Update user balance in stored tab summaries for home dashboard
              try {
                const profile = getStoredUser();
                const userMember = updatedMembers.find((m: any) => m.name.toLowerCase() === profile.name.toLowerCase());
                if (userMember) {
                  const key = mode === "sample"
                    ? "meshTab_sample_tabs"
                    : mode === "testnet"
                      ? "meshTab_testnet_tabs"
                      : "meshTab_clean_tabs";
                  const tabs = getStoredTabs();
                  const nextTabs = tabs.map(t => {
                    if (t.id === tabId) {
                      return { ...t, balance: userMember.balance, memberCount: updatedMembers.length, lastActivity: "Just now" };
                    }
                    return t;
                  });
                  localStorage.setItem(key, JSON.stringify(nextTabs));
                  window.dispatchEvent(new Event("meshTab-tabs-update"));
                }
              } catch (e) {}
          }

          // Smart Deep Merge for Expenses
          if (expenses && Array.isArray(expenses) && expenses.length > 0) {
            const mappedExpenses = expenses.map((e: any) => {
               if (e.metadata) {
                 return { ...e.metadata, syncStatus: "synced" };
               }
               // Fallback if metadata is missing
               return {
                 id: e.expenseId || Math.random().toString(36).substr(2, 9),
                 payer: e.payers?.[0]?.name || "Unknown",
                 amount: e.finalAmountUsd || 0,
                 desc: e.description || "",
                 time: new Date(e.timestamp || Date.now()).toISOString(),
                 syncStatus: "synced"
               };
            });
            const localExpenses = getStoredExpenses(tabId);
            if (haveExpensesChanged(mappedExpenses, localExpenses)) {
              const storageKey = mode === "sample"
                ? `meshTab_expenses_${tabId}`
                : mode === "testnet"
                  ? `meshTab_testnet_expenses_${tabId}`
                  : `meshTab_clean_expenses_${tabId}`;
              localStorage.setItem(storageKey, JSON.stringify(mappedExpenses));
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
      pushTabStateToRedis(tabId, getAccessToken);
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
        pushTabStateToRedis(tabId, getAccessToken);
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
      pushTabStateToRedis(tabId, getAccessToken);
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
