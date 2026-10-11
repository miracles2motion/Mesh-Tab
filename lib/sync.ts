"use client";

import { useEffect, useState, useRef } from "react";
import { getStoredTabMembers, getStoredExpenses, getWorkspaceMode, getStoredUser, getStoredTabs, TabMember, StoredExpense } from "./user";
import { isEffectivelyOnline } from "./network";
import { storageKey, safeSetItem } from "./storage-keys";
import { addNotification, getExpenseNotifId, getMemberJoinNotifId, getSettlementNotifId, removeNotification } from "./notifications";

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
    if (lm.balance !== sm.balance || lm.type !== sm.type || lm.role !== sm.role || lm.walletAddress !== sm.walletAddress) {
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
    if (le.amount !== se.amount || le.desc !== se.desc || le.payer !== se.payer || le.syncStatus !== se.syncStatus) {
      return true;
    }
  }
  return false;
}

export function useTabSync(tabId: string, getAccessToken?: () => Promise<string | null>) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const hasHydratedMembersRef = useRef(false);
  const hasHydratedExpensesRef = useRef(false);

  useEffect(() => {
    hasHydratedMembersRef.current = false;
    hasHydratedExpensesRef.current = false;
  }, [tabId]);

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
        if (mode !== "testnet") return;
        
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
          const { members, expenses, deletedIds, creator, activity } = data;
          
          let stateUpdated = false;

          // Ingest server-side activity (peer joins, settlements)
          if (activity && Array.isArray(activity)) {
            try {
              const profile = getStoredUser();
              const currentName = profile.name ? profile.name.toLowerCase() : "";
              activity.forEach((actRaw: any) => {
                let act = actRaw;
                if (typeof act === "string") {
                  try { act = JSON.parse(act); } catch { return; }
                }
                if (!act || !act.id) return;
                if (act.actor && act.actor.toLowerCase() === currentName) return;

                addNotification({
                  id: act.id,
                  type: act.type || "tab_created",
                  title: act.title,
                  desc: act.desc,
                  actor: act.actor,
                  tabId: act.tabId || tabId,
                  tabName: act.tabName,
                  timestamp: act.timestamp || Date.now(),
                  link: act.link || `/tab/${tabId}`
                });
              });
            } catch (e) {}
          }

          // Smart Deep Merge for Members
          if (members && Array.isArray(members) && members.length > 0) {
            const localMembers = getStoredTabMembers(tabId);
              // Apply member types (creditor, debtor) and preserve wallet addresses
              const updatedMembers = members.map((m: any) => {
                 const localMatch = localMembers.find(lm => lm.name.toLowerCase() === m.name.toLowerCase());
                 return {
                    name: m.name,
                    balance: m.balance,
                    type: m.balance === 0 ? ("settled" as const) : m.balance > 0 ? ("creditor" as const) : ("debtor" as const),
                    role: m.role || localMatch?.role || (creator && m.name.toLowerCase() === creator.toLowerCase() ? "admin" : "member"),
                    walletAddress: m.walletAddress || localMatch?.walletAddress
                 };
              });

              if (haveMembersChanged(updatedMembers, localMembers)) {
                const storageKeyStr = storageKey("members", mode, tabId);
                safeSetItem(storageKeyStr, JSON.stringify(updatedMembers));
                window.dispatchEvent(new CustomEvent("meshTab-members-update", { detail: { fromServer: true } }));
                stateUpdated = true;

              if (creator) {
                try {
                  const tabs = getStoredTabs();
                  const tabIdx = tabs.findIndex(t => t.id === tabId);
                  if (tabIdx >= 0 && (!tabs[tabIdx].creator || tabs[tabIdx].creator !== creator)) {
                    const updatedTabs = [...tabs];
                    updatedTabs[tabIdx] = {
                      ...tabs[tabIdx],
                      creator
                    };
                    const key = storageKey("tabs", mode);
                    safeSetItem(key, JSON.stringify(updatedTabs));
                    window.dispatchEvent(new Event("meshTab-tabs-update"));
                  }
                } catch (e) {}
              }

                // Derive peer join notifications if not the first hydration
                if (hasHydratedMembersRef.current && localMembers.length > 0) {
                  try {
                    const profile = getStoredUser();
                    const currentName = profile.name ? profile.name.toLowerCase() : "";
                    const tabs = getStoredTabs();
                    const tabName = tabs.find(t => t.id === tabId)?.name || "Group Space";

                    updatedMembers.forEach(m => {
                      const mName = m.name.toLowerCase();
                      const isCreator = Boolean(creator && mName === creator.toLowerCase());
                      const isSelf = mName === currentName;
                      if (!isSelf && !isCreator && m.role !== "admin" && !localMembers.some(lm => lm.name.toLowerCase() === mName)) {
                        addNotification({
                          id: getMemberJoinNotifId(tabId, m.name),
                          type: "tab_created",
                          title: "New Member Joined",
                          desc: `${m.name} joined "${tabName}" via passkey.`,
                          actor: m.name,
                          tabId,
                          tabName,
                          link: `/tab/${tabId}`
                        });
                      }
                    });
                  } catch (e) {}
                }
                hasHydratedMembersRef.current = true;

                // Update user balance in stored tab summaries for home dashboard
                try {
                  const profile = getStoredUser();
                  const userMember = updatedMembers.find((m: any) => m.name.toLowerCase() === profile.name.toLowerCase());
                  if (userMember) {
                    const key = storageKey("tabs", mode);
                    const tabs = getStoredTabs();
                    const nextTabs = tabs.map(t => {
                      if (t.id === tabId) {
                        return { ...t, balance: userMember.balance, memberCount: updatedMembers.length };
                      }
                      return t;
                    });
                    safeSetItem(key, JSON.stringify(nextTabs));
                    window.dispatchEvent(new Event("meshTab-tabs-update"));

                    // Self-heal wallet address in Redis if missing on server
                    const localWallet = typeof window !== "undefined" ? (localStorage.getItem("meshTab_walletAddress") || "") : "";
                    if (localWallet && !userMember.walletAddress) {
                      fetch("/api/tab/join", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          tabId,
                          name: profile.name,
                          walletAddress: localWallet,
                          mode
                        })
                      }).catch(() => {});
                    }
                  }
                } catch (e) {}
              }
          }

          // Smart Deep Merge for Expenses (protects offline pending and cleans up tombstones)
          if (expenses !== undefined || (Array.isArray(deletedIds) && deletedIds.length > 0)) {
            const localExpenses = getStoredExpenses(tabId);
            const rawServerExpenses = Array.isArray(expenses) ? expenses : [];
            const deletedIdSet = new Set(Array.isArray(deletedIds) ? deletedIds : []);

            const mappedExpenses: StoredExpense[] = rawServerExpenses
              .filter((e: any) => !deletedIdSet.has(e.expenseId))
              .map((e: any) => {
                const expTimestamp = typeof e.timestamp === "number"
                  ? e.timestamp
                  : e.createdAt
                    ? (typeof e.createdAt === "number" ? e.createdAt : new Date(e.createdAt).getTime())
                    : e.timestamp
                      ? new Date(e.timestamp).getTime()
                      : (e.serverSyncedAt ? Number(e.serverSyncedAt) : Date.now());

                if (e.metadata) {
                  return { 
                    ...e.metadata, 
                    createdAt: e.metadata.createdAt || expTimestamp,
                    time: "Just now",
                    syncStatus: "synced" as const 
                  };
                }
                return {
                  id: e.expenseId || Math.random().toString(36).substr(2, 9),
                  payer: e.payers?.[0]?.name || "Unknown",
                  amount: e.finalAmountUsd || 0,
                  desc: e.description || "",
                  createdAt: expTimestamp,
                  time: "Just now",
                  splitType: e.splitType || "equal",
                  splits: e.splits,
                  participants: e.participants || (e.borrowers ? e.borrowers.map((b: any) => b.name) : undefined),
                  category: e.category || "other",
                  originalCurrency: e.originalCurrency || "USD",
                  originalAmount: e.originalAmount,
                  syncStatus: "synced" as const
                };
              });

            // Preserve local pending expenses that have not synced yet and have not been deleted
            const localPending = localExpenses.filter((le: StoredExpense) =>
              le.syncStatus === "pending" &&
              !mappedExpenses.some((me: StoredExpense) => me.id === le.id) &&
              !deletedIdSet.has(le.id)
            );

            const mergedExpenses = [...mappedExpenses, ...localPending];

            if (haveExpensesChanged(mergedExpenses, localExpenses)) {
              const storageKeyStr = storageKey("expenses", mode, tabId);
              safeSetItem(storageKeyStr, JSON.stringify(mergedExpenses));
              window.dispatchEvent(new CustomEvent("meshTab-expenses-update", { detail: { fromServer: true } }));
              stateUpdated = true;

              // Derive peer expense and settlement notifications if not first hydration
              if (hasHydratedExpensesRef.current && localExpenses.length > 0) {
                try {
                  const profile = getStoredUser();
                  const currentName = profile.name ? profile.name.toLowerCase() : "";
                  const tabs = getStoredTabs();
                  const tabName = tabs.find(t => t.id === tabId)?.name || "Group Space";

                  mappedExpenses.forEach(exp => {
                    const isNew = !localExpenses.some(le => le.id === exp.id);
                    const isPeer = exp.payer.toLowerCase() !== currentName;
                    if (isNew && isPeer) {
                      const isSettle = exp.id.startsWith("settle-") || exp.desc.toLowerCase().includes("settled balance");
                      if (isSettle) {
                        addNotification({
                          id: getSettlementNotifId(exp.id),
                          type: "settlement",
                          title: "Settlement Received",
                          desc: `${exp.payer} settled $${(exp.amount / 100).toFixed(2)} in Agora AUSD on Monad.`,
                          actor: exp.payer,
                          tabId,
                          tabName,
                          amount: exp.amount,
                          link: `/tab/${tabId}`
                        });
                      } else {
                        addNotification({
                          id: getExpenseNotifId(exp.id),
                          type: "expense",
                          title: "New Expense Added",
                          desc: `${exp.payer} added '${exp.desc}' for $${(exp.amount / 100).toFixed(2)} in ${tabName}.`,
                          actor: exp.payer,
                          tabId,
                          tabName,
                          amount: exp.amount,
                          link: `/tab/${tabId}/expense/${exp.id}`
                        });
                      }
                    }
                  });

                  // Check for expense deletions on server
                  deletedIdSet.forEach(delId => {
                    // Remove stale "New Expense Added" notification so no dead links remain
                    try {
                      removeNotification(getExpenseNotifId(delId));
                    } catch (e) {}

                    const wasLocal = localExpenses.find(le => le.id === delId);
                    if (wasLocal && wasLocal.payer.toLowerCase() !== currentName) {
                      addNotification({
                        id: `notif-exp-del-${delId}`,
                        type: "expense",
                        title: "Expense Removed",
                        desc: `${wasLocal.payer} removed '${wasLocal.desc}' ($${(wasLocal.amount / 100).toFixed(2)}) from ${tabName}.`,
                        actor: wasLocal.payer,
                        tabId,
                        tabName,
                        amount: wasLocal.amount,
                        timestamp: Date.now(),
                        link: `/tab/${tabId}`
                      });
                    }
                  });
                } catch (e) {}
              }
              hasHydratedExpensesRef.current = true;
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
      // Pull remote updates
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
