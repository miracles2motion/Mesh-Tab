"use client";

import { useState, useEffect } from "react";
import { addNotification, resetNotificationsToMode } from "./notifications";
import { isEffectivelyOnline } from "./network";

export interface UserProfile {
  name: string;
  avatarColor: string;
  avatarColorIndex: number;
}

export const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-600"
];

export const DEFAULT_USER_NAME = "David";

export function getStoredUser(): UserProfile {
  if (typeof window === "undefined") {
    return { name: DEFAULT_USER_NAME, avatarColor: AVATAR_COLORS[0], avatarColorIndex: 0 };
  }
  const name = localStorage.getItem("meshTab_displayName") || DEFAULT_USER_NAME;
  const rawIdx = localStorage.getItem("meshTab_avatarColorIndex");
  const colorIdx = rawIdx !== null ? parseInt(rawIdx, 10) : 0;
  const safeIdx = isNaN(colorIdx) ? 0 : Math.abs(colorIdx) % AVATAR_COLORS.length;

  return {
    name,
    avatarColor: AVATAR_COLORS[safeIdx],
    avatarColorIndex: safeIdx,
  };
}

export function saveStoredUser(name: string, colorIndex?: number) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) {
    localStorage.setItem("meshTab_displayName", trimmed);
  }
  if (typeof colorIndex === "number") {
    localStorage.setItem("meshTab_avatarColorIndex", String(colorIndex));
  }
  window.dispatchEvent(new Event("meshTab-profile-update"));
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(getStoredUser);

  useEffect(() => {
    const sync = () => {
      setProfile(getStoredUser());
    };

    sync();

    window.addEventListener("meshTab-profile-update", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("meshTab-profile-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return profile;
}

export function useDeveloperMode() {
  const [showAddress, setShowAddress] = useState(false);

  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("meshTab_showAddress");
      setShowAddress(saved === "true");
    };

    sync();

    window.addEventListener("meshTab-settings-update", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("meshTab-settings-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleAddress = () => {
    const nextVal = !showAddress;
    setShowAddress(nextVal);
    localStorage.setItem("meshTab_showAddress", String(nextVal));
    window.dispatchEvent(new Event("meshTab-settings-update"));
  };

  return { showAddress, toggleAddress };
}

// Tab Persistence Helpers
export interface TabSummary {
  id: string;
  name: string;
  creator?: string;
  role: "Creator" | "Member";
  balance: number;
  memberCount: number;
  lastActivity: string;
  currency?: string;
}

export const SAMPLE_BENCHMARK_TABS: TabSummary[] = [
  { id: "lisbon-24", name: "Lisbon Weekend", creator: "Aisha", role: "Member", balance: -18000, memberCount: 4, lastActivity: "2 hours ago" },
  { id: "house-groceries", name: "House Groceries", creator: "Alex", role: "Member", balance: 4500, memberCount: 2, lastActivity: "Yesterday" },
];

export const DEFAULT_TABS: TabSummary[] = [];

export type WorkspaceMode = "sample" | "blank";

export function getWorkspaceMode(): WorkspaceMode {
  if (typeof window === "undefined") return "sample";
  const mode = localStorage.getItem("meshTab_workspaceMode");
  // Default to "sample" during demo phase so Lisbon Weekend demo trip data is loaded by default
  return mode === "blank" ? "blank" : "sample";
}

function getTabsStorageKey(mode?: WorkspaceMode): string {
  const activeMode = mode || getWorkspaceMode();
  return activeMode === "sample" ? "meshTab_sample_tabs" : "meshTab_clean_tabs";
}

export function setWorkspaceMode(mode: WorkspaceMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem("meshTab_workspaceMode", mode);
  resetNotificationsToMode(mode);
  
  if (mode === "sample") {
    // When switching to sample trip mode, ensure the Lisbon benchmark tabs exist in the sample namespace
    try {
      const raw = localStorage.getItem("meshTab_sample_tabs");
      let current: TabSummary[] = [];
      if (raw) current = JSON.parse(raw);
      if (Array.isArray(current)) {
        const hasLisbon = current.some(t => t.id === "lisbon-24");
        if (!hasLisbon) {
          localStorage.setItem("meshTab_sample_tabs", JSON.stringify(SAMPLE_BENCHMARK_TABS));
        }
      } else {
        localStorage.setItem("meshTab_sample_tabs", JSON.stringify(SAMPLE_BENCHMARK_TABS));
      }
    } catch (e) {
      localStorage.setItem("meshTab_sample_tabs", JSON.stringify(SAMPLE_BENCHMARK_TABS));
    }
  }

  window.dispatchEvent(new Event("meshTab-workspace-update"));
  window.dispatchEvent(new Event("meshTab-tabs-update"));
}

export function resetLisbonDemo() {
  if (typeof window === "undefined") return;
  const activeUser = getStoredUser().name || DEFAULT_USER_NAME;
  
  // 1. Reset Lisbon tab members
  const defaultList: TabMember[] = [
    ...DEFAULT_LISBON_MEMBERS,
    { name: activeUser, balance: -18000, type: "debtor", role: "member" }
  ];
  localStorage.setItem("meshTab_members_lisbon-24", JSON.stringify(defaultList));

  // 2. Clear added/settled expenses for Lisbon to restore initial benchmark
  localStorage.removeItem("meshTab_expenses_lisbon-24");

  // 3. Ensure Lisbon benchmark tabs are active with -$180.00 debt in the sample namespace
  try {
    const raw = localStorage.getItem("meshTab_sample_tabs");
    let current: TabSummary[] = [];
    if (raw) current = JSON.parse(raw);
    const nonLisbon = Array.isArray(current) ? current.filter(t => t.id !== "lisbon-24") : [SAMPLE_BENCHMARK_TABS[1]];
    localStorage.setItem("meshTab_sample_tabs", JSON.stringify([SAMPLE_BENCHMARK_TABS[0], ...nonLisbon]));
  } catch (e) {
    localStorage.setItem("meshTab_sample_tabs", JSON.stringify(SAMPLE_BENCHMARK_TABS));
  }

  // 4. Reset settled payout balance to benchmark clean state ($0)
  localStorage.removeItem("meshTab_settledPayoutBalance");
  window.dispatchEvent(new Event("meshTab-payout-update"));

  // 5. Force mode to sample and reset notifications to sample
  localStorage.setItem("meshTab_workspaceMode", "sample");
  resetNotificationsToMode("sample");

  window.dispatchEvent(new Event("meshTab-workspace-update"));
  window.dispatchEvent(new Event("meshTab-tabs-update"));
  window.dispatchEvent(new Event("meshTab-members-update"));
  window.dispatchEvent(new Event("meshTab-expenses-update"));
}

export function useWorkspaceMode() {
  const [mode, setMode] = useState<WorkspaceMode>(getWorkspaceMode);

  useEffect(() => {
    const sync = () => setMode(getWorkspaceMode());
    sync();
    window.addEventListener("meshTab-workspace-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("meshTab-workspace-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { mode, setMode: setWorkspaceMode, resetLisbonDemo };
}

export function getStoredTabs(): TabSummary[] {
  const mode = getWorkspaceMode();
  if (typeof window === "undefined") return [];
  
  const key = getTabsStorageKey(mode);
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((t: TabSummary) => {
          if (t.id === "lisbon-24") {
            return { ...t, role: "Member" as const, creator: "Aisha" };
          }
          if (t.id === "house-groceries") {
            return { ...t, role: "Member" as const, creator: "Alex" };
          }
          return t;
        });

        if (mode === "blank") {
          // Clean Slate: guaranteed no sample demo tabs ever leak into clean slate
          return normalized.filter(t => t.id !== "lisbon-24" && t.id !== "house-groceries");
        }
        
        // Sample Mode: ensure Lisbon benchmark is present
        const hasLisbon = normalized.some(t => t.id === "lisbon-24");
        if (!hasLisbon) {
          const merged = [...SAMPLE_BENCHMARK_TABS, ...normalized.filter(t => t.id !== "lisbon-24" && t.id !== "house-groceries")];
          localStorage.setItem(key, JSON.stringify(merged));
          return merged;
        }
        return normalized;
      }
    }
  } catch (e) {}

  if (mode === "sample") {
    // Initialize sample tabs
    localStorage.setItem(key, JSON.stringify(SAMPLE_BENCHMARK_TABS));
    return SAMPLE_BENCHMARK_TABS;
  }
  return [];
}

export function saveNewTab(tab: TabSummary) {
  if (typeof window === "undefined") return;
  const mode = getWorkspaceMode();
  const key = getTabsStorageKey(mode);
  const current = getStoredTabs();
  const existingIdx = current.findIndex(t => t.id === tab.id);
  let updated: TabSummary[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = tab;
  } else {
    updated = [tab, ...current];
  }
  localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new Event("meshTab-tabs-update"));

  try {
    addNotification({
      type: "tab_created",
      title: "Group Tab Created",
      desc: `You created "${tab.name}". Ready to share group costs!`,
      actor: "You",
      tabId: tab.id,
      tabName: tab.name,
      link: `/tab/${tab.id}`
    });
  } catch (e) {}
}

export function useStoredTabs() {
  const [tabs, setTabs] = useState<TabSummary[]>(getStoredTabs);

  useEffect(() => {
    const sync = () => {
      setTabs(getStoredTabs());
    };

    sync();

    window.addEventListener("meshTab-tabs-update", sync);
    window.addEventListener("meshTab-workspace-update", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("meshTab-tabs-update", sync);
      window.removeEventListener("meshTab-workspace-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { tabs, saveTab: saveNewTab };
}

// Tab Member Persistence
export interface TabMember {
  name: string;
  balance: number; // in cents
  type: "creditor" | "debtor" | "settled";
  role?: "admin" | "member";
}

export const DEFAULT_LISBON_MEMBERS: TabMember[] = [
  { name: "Aisha", balance: 30000, type: "creditor", role: "admin" },
  { name: "Kemi", balance: -4000, type: "debtor", role: "member" },
  { name: "Ben", balance: -8000, type: "debtor", role: "member" },
];

export function getStoredTabMembers(tabId: string, currentUserName?: string): TabMember[] {
  const activeUser = currentUserName || getStoredUser().name;
  const mode = getWorkspaceMode();
  
  if (typeof window === "undefined") {
    if (mode === "sample" && tabId === "lisbon-24") {
      return [
        ...DEFAULT_LISBON_MEMBERS,
        { name: activeUser, balance: -18000, type: "debtor", role: "member" }
      ];
    }
    return [{ name: activeUser, balance: 0, type: "settled", role: "admin" }];
  }

  // Use workspace-isolated key prefix for clean slate vs sample mode
  const storageKey = mode === "blank" ? `meshTab_clean_members_${tabId}` : `meshTab_members_${tabId}`;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: TabMember[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let members = parsed;

        // In Lisbon benchmark (sample mode only): ensure activeUser is mapped to the 4th debtor slot
        if (mode === "sample" && tabId === "lisbon-24") {
          const hasActiveUser = members.some(m => m.name.toLowerCase() === activeUser.toLowerCase());
          if (!hasActiveUser) {
            const debtorIdx = members.findIndex(m => m.name === "David" || (m.name !== "Aisha" && m.name !== "Kemi" && m.name !== "Ben"));
            if (debtorIdx >= 0) {
              members = members.map((m, idx) => idx === debtorIdx ? { ...m, name: activeUser } : m);
              localStorage.setItem(storageKey, JSON.stringify(members));
            }
          }
        }

        // Enforce ledger consistency: if all debtors have settled (no negative balances), all members are settled
        const totalDebts = members.reduce((sum, m) => sum + (m.balance < 0 ? Math.abs(m.balance) : 0), 0);
        if (totalDebts === 0 && members.some(m => m.type === "settled" || m.balance === 0)) {
          return members.map(m => ({
            ...m,
            balance: 0,
            type: "settled" as const
          }));
        }
        return members;
      }
    }
  } catch (e) {}

  // Sample mode defaults
  if (mode === "sample") {
    if (tabId === "lisbon-24") {
      const defaultList: TabMember[] = [
        ...DEFAULT_LISBON_MEMBERS,
        { name: activeUser, balance: -18000, type: "debtor", role: "member" }
      ];
      localStorage.setItem(storageKey, JSON.stringify(defaultList));
      return defaultList;
    }

    if (tabId === "house-groceries") {
      const defaultList: TabMember[] = [
        { name: "Alex", balance: -4500, type: "debtor", role: "admin" },
        { name: activeUser, balance: 4500, type: "creditor", role: "member" }
      ];
      localStorage.setItem(storageKey, JSON.stringify(defaultList));
      return defaultList;
    }
  }

  // Clean Slate Mode: absolutely 0 sample demo contamination
  const initialMembers: TabMember[] = [
    { name: activeUser, balance: 0, type: "settled", role: "admin" }
  ];
  localStorage.setItem(storageKey, JSON.stringify(initialMembers));
  return initialMembers;
}

export function saveStoredTabMembers(tabId: string, members: TabMember[]) {
  if (typeof window === "undefined") return;
  const mode = getWorkspaceMode();
  const storageKey = mode === "blank" ? `meshTab_clean_members_${tabId}` : `meshTab_members_${tabId}`;
  localStorage.setItem(storageKey, JSON.stringify(members));

  // Sync member count in stored tabs
  const key = getTabsStorageKey(mode);
  const tabs = getStoredTabs();
  const updatedTabs = tabs.map(t => {
    if (t.id === tabId) {
      return { ...t, memberCount: members.length };
    }
    return t;
  });
  localStorage.setItem(key, JSON.stringify(updatedTabs));

  window.dispatchEvent(new Event("meshTab-members-update"));
  window.dispatchEvent(new Event("meshTab-tabs-update"));
}

export function useStoredTabMembers(tabId: string, currentUserName?: string) {
  const [members, setMembers] = useState<TabMember[]>(() => getStoredTabMembers(tabId, currentUserName));

  useEffect(() => {
    const sync = () => {
      setMembers(getStoredTabMembers(tabId, currentUserName));
    };

    sync();

    window.addEventListener("meshTab-members-update", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("meshTab-members-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, [tabId, currentUserName]);

  return { 
    members, 
    setMembers: (newMembers: TabMember[]) => saveStoredTabMembers(tabId, newMembers) 
  };
}

// Expense & Settlement Persistence
export type ExpenseCategory = "dining" | "stay" | "transit" | "activities" | "groceries" | "other";

export interface StoredExpense {
  id: string;
  payer: string;
  amount: number; // in cents
  desc: string;
  time: string;
  splitType?: "equal" | "exact";
  splits?: Record<string, number>; // memberName -> amount in cents
  category?: ExpenseCategory;
  originalCurrency?: string; // e.g. "EUR", "GBP", "NGN", "JPY"
  originalAmount?: number; // amount in original foreign currency
  syncStatus?: "synced" | "pending";
}

export const DEFAULT_FEED: Record<string, StoredExpense[]> = {
  "lisbon-24": [
    { id: "1", payer: "Aisha", amount: 60000, desc: "Villa booking", time: "Just now", splitType: "equal", category: "stay", originalCurrency: "EUR", originalAmount: 555.50 },
    { id: "2", payer: "Kemi", amount: 26000, desc: "Dinners & wine", time: "5h ago", splitType: "equal", category: "dining", originalCurrency: "EUR", originalAmount: 240.00 },
    { id: "3", payer: "Ben", amount: 22000, desc: "Excursions", time: "1d ago", splitType: "equal", category: "activities", originalCurrency: "EUR", originalAmount: 203.70 },
  ]
};

export function getStoredExpenses(tabId: string): StoredExpense[] {
  const mode = getWorkspaceMode();
  if (typeof window === "undefined") {
    return mode === "blank" ? [] : (DEFAULT_FEED[tabId] || []);
  }

  const storageKey = mode === "blank" ? `meshTab_clean_expenses_${tabId}` : `meshTab_expenses_${tabId}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  if (mode === "blank") return [];
  return DEFAULT_FEED[tabId] || [];
}

export function saveStoredExpense(tabId: string, expense: StoredExpense) {
  if (typeof window === "undefined") return;
  
  // Tag sync status based on current connectivity
  expense.syncStatus = isEffectivelyOnline() ? "synced" : "pending";
  
  const mode = getWorkspaceMode();
  const storageKey = mode === "blank" ? `meshTab_clean_expenses_${tabId}` : `meshTab_expenses_${tabId}`;
  const current = getStoredExpenses(tabId);
  const updated = [expense, ...current];
  localStorage.setItem(storageKey, JSON.stringify(updated));

  // Dynamically recalculate tab member balances
  try {
    const members = getStoredTabMembers(tabId);
      if (members.length > 0) {
        const isExact = expense.splitType === "exact" && expense.splits && Object.keys(expense.splits).length > 0;
        const isSelectedSplit = !isExact && expense.splits && Object.keys(expense.splits).length > 0;
        const participatingMembers = isSelectedSplit 
          ? members.filter(m => expense.splits && expense.splits[m.name] !== undefined)
          : members;
        
        const splitCount = Math.max(1, participatingMembers.length);
        const baseShare = Math.floor(expense.amount / splitCount);
        let remainderPennies = expense.amount - (baseShare * splitCount);

        const updatedMembers = members.map(m => {
          let memberOwes = 0;
          if (isExact) {
            memberOwes = expense.splits?.[m.name] ?? 0;
          } else if (isSelectedSplit) {
            if (expense.splits && expense.splits[m.name] !== undefined) {
              const extraPenny = remainderPennies > 0 ? 1 : 0;
              if (remainderPennies > 0) remainderPennies--;
              memberOwes = baseShare + extraPenny;
            } else {
              memberOwes = 0;
            }
          } else {
            const extraPenny = remainderPennies > 0 ? 1 : 0;
            if (remainderPennies > 0) remainderPennies--;
            memberOwes = baseShare + extraPenny;
          }

          let delta = -memberOwes;
          if (m.name.toLowerCase() === expense.payer.toLowerCase()) {
            delta += expense.amount;
          }
          const nextBal = m.balance + delta;
          const nextType: "creditor" | "debtor" | "settled" =
            nextBal === 0 ? "settled" : nextBal > 0 ? "creditor" : "debtor";
          return {
            ...m,
            balance: nextBal,
            type: nextType
          };
        });
        const membersKey = mode === "blank" ? `meshTab_clean_members_${tabId}` : `meshTab_members_${tabId}`;
        localStorage.setItem(membersKey, JSON.stringify(updatedMembers));
        window.dispatchEvent(new Event("meshTab-members-update"));

        // Update user balance in tab summary
        const profile = getStoredUser();
        const userMember = updatedMembers.find(m => m.name.toLowerCase() === profile.name.toLowerCase());
        if (userMember) {
          const key = getTabsStorageKey();
          const tabs = getStoredTabs();
          const nextTabs = tabs.map(t => {
            if (t.id === tabId) {
              return { ...t, balance: userMember.balance, lastActivity: "Just now" };
            }
            return t;
          });
          localStorage.setItem(key, JSON.stringify(nextTabs));
          window.dispatchEvent(new Event("meshTab-tabs-update"));
        }
      }
    } catch (e) {}

  // Live Notification Dispatch
  try {
    const tabs = getStoredTabs();
    const tabName = tabId === "lisbon-24" ? "Lisbon Weekend" : tabId === "house-groceries" ? "House Groceries" : (tabs.find(t => t.id === tabId)?.name || "Group Tab");
    const isSettle = expense.id.startsWith("settle-");

    addNotification({
      type: isSettle ? "settlement" : "expense",
      title: isSettle ? "Debt Settled" : "New Expense Added",
      desc: isSettle 
        ? `${expense.payer} settled $${(expense.amount / 100).toFixed(2)} on ${tabName} via Agora AUSD.`
        : `${expense.payer} added '${expense.desc}' for $${(expense.amount / 100).toFixed(2)} in ${tabName}.`,
      actor: expense.payer,
      tabId,
      tabName,
      amount: expense.amount,
      link: `/tab/${tabId}`
    });
  } catch (e) {}

  window.dispatchEvent(new Event("meshTab-expenses-update"));
}

export function deleteStoredExpense(tabId: string, expenseId: string): { success: boolean; error?: string } {
  if (typeof window === "undefined") return { success: false, error: "Window undefined" };
  const mode = getWorkspaceMode();
  const storageKey = mode === "blank" ? `meshTab_clean_expenses_${tabId}` : `meshTab_expenses_${tabId}`;
  const current = getStoredExpenses(tabId);
  const target = current.find(e => e.id === expenseId);
  if (!target) return { success: false, error: "Expense not found" };

  if (target.id.startsWith("settle-") || target.desc.toLowerCase().includes("settled balance")) {
    return { success: false, error: "Finalized debt settlements cannot be deleted." };
  }

  // 1. Rollback balances
  try {
    const members = getStoredTabMembers(tabId);
      if (members.length > 0) {
        const isExact = target.splitType === "exact" && target.splits && Object.keys(target.splits).length > 0;
        const isSelectedSplit = !isExact && target.splits && Object.keys(target.splits).length > 0;
        const participatingMembers = isSelectedSplit 
          ? members.filter(m => target.splits && target.splits[m.name] !== undefined)
          : members;
        
        const splitCount = Math.max(1, participatingMembers.length);
        const baseShare = Math.floor(target.amount / splitCount);
        let remainderPennies = target.amount - (baseShare * splitCount);

        const updatedMembers = members.map(m => {
          let memberOwed = 0;
          if (isExact) {
            memberOwed = target.splits?.[m.name] ?? 0;
          } else if (isSelectedSplit) {
            if (target.splits && target.splits[m.name] !== undefined) {
              const extraPenny = remainderPennies > 0 ? 1 : 0;
              if (remainderPennies > 0) remainderPennies--;
              memberOwed = baseShare + extraPenny;
            } else {
              memberOwed = 0;
            }
          } else {
            const extraPenny = remainderPennies > 0 ? 1 : 0;
            if (remainderPennies > 0) remainderPennies--;
            memberOwed = baseShare + extraPenny;
          }

          // Invert delta to reverse the expense
          let reverseDelta = memberOwed;
          if (m.name.toLowerCase() === target.payer.toLowerCase()) {
            reverseDelta -= target.amount;
          }

          const nextBal = m.balance + reverseDelta;
          const nextType: "creditor" | "debtor" | "settled" =
            nextBal === 0 ? "settled" : nextBal > 0 ? "creditor" : "debtor";
          return {
            ...m,
            balance: nextBal,
            type: nextType
          };
        });

        const membersKey = mode === "blank" ? `meshTab_clean_members_${tabId}` : `meshTab_members_${tabId}`;
        localStorage.setItem(membersKey, JSON.stringify(updatedMembers));
        window.dispatchEvent(new Event("meshTab-members-update"));

        // Update user balance in tab summary
        const profile = getStoredUser();
        const userMember = updatedMembers.find(m => m.name.toLowerCase() === profile.name.toLowerCase());
        if (userMember) {
          const key = getTabsStorageKey();
          const tabs = getStoredTabs();
          const nextTabs = tabs.map(t => {
            if (t.id === tabId) {
              return { ...t, balance: userMember.balance, lastActivity: "Just now" };
            }
            return t;
          });
          localStorage.setItem(key, JSON.stringify(nextTabs));
          window.dispatchEvent(new Event("meshTab-tabs-update"));
        }
      }
    } catch (e) {}

  // 2. Remove expense from stored list
  const filtered = current.filter(e => e.id !== expenseId);
  localStorage.setItem(storageKey, JSON.stringify(filtered));
  window.dispatchEvent(new Event("meshTab-expenses-update"));

  return { success: true };
}

export function updateStoredExpenseDescription(tabId: string, expenseId: string, newDesc: string): { success: boolean; error?: string } {
  if (typeof window === "undefined") return { success: false, error: "Window undefined" };
  const mode = getWorkspaceMode();
  const storageKey = mode === "blank" ? `meshTab_clean_expenses_${tabId}` : `meshTab_expenses_${tabId}`;
  const current = getStoredExpenses(tabId);
  const targetIndex = current.findIndex(e => String(e.id) === String(expenseId));
  if (targetIndex === -1) return { success: false, error: "Expense not found" };

  current[targetIndex] = {
    ...current[targetIndex],
    desc: newDesc.trim()
  };

  localStorage.setItem(storageKey, JSON.stringify(current));
  window.dispatchEvent(new Event("meshTab-expenses-update"));
  return { success: true };
}

export function useStoredExpenses(tabId: string) {
  const [expenses, setExpenses] = useState<StoredExpense[]>(() => getStoredExpenses(tabId));

  useEffect(() => {
    const sync = () => {
      setExpenses(getStoredExpenses(tabId));
    };

    sync();

    window.addEventListener("meshTab-expenses-update", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("meshTab-expenses-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, [tabId]);

  return { 
    expenses, 
    addExpense: (expense: StoredExpense) => saveStoredExpense(tabId, expense),
    deleteExpense: (expenseId: string) => deleteStoredExpense(tabId, expenseId)
  };
}

export function settleTab(tabId: string, currentUserName: string, amount: number) {
  if (typeof window === "undefined") return;
  
  // 1. Update tab balance in stored tabs
  const key = getTabsStorageKey();
  const tabs = getStoredTabs();
  const updatedTabs = tabs.map(t => {
    if (t.id === tabId) {
      return { ...t, balance: 0, lastActivity: "Settled just now" };
    }
    return t;
  });
  localStorage.setItem(key, JSON.stringify(updatedTabs));
  window.dispatchEvent(new Event("meshTab-tabs-update"));

  // 2. Update member balances for this tab
  try {
    const members = getStoredTabMembers(tabId, currentUserName);
    let remainingToDeduct = amount;
    
    // First, mark the settling user as settled
    const updatedMembers = members.map(m => {
      if (m.name.toLowerCase() === currentUserName.toLowerCase()) {
        return { ...m, balance: 0, type: "settled" as const };
      }
      return m;
    }).map(m => {
      // Then reduce creditor balance accordingly
      if (remainingToDeduct > 0 && m.balance > 0) {
        const deduct = Math.min(m.balance, remainingToDeduct);
        const newBal = m.balance - deduct;
        remainingToDeduct -= deduct;
        return {
          ...m,
          balance: newBal,
          type: newBal === 0 ? ("settled" as const) : ("creditor" as const)
        };
      }
      return m;
    });

    const mode = getWorkspaceMode();
    const membersKey = mode === "blank" ? `meshTab_clean_members_${tabId}` : `meshTab_members_${tabId}`;
    localStorage.setItem(membersKey, JSON.stringify(updatedMembers));
    window.dispatchEvent(new Event("meshTab-members-update"));
  } catch (e) {}

  // 3. Add settlement entry to tab expenses
  saveStoredExpense(tabId, {
    id: `settle-${Date.now()}`,
    payer: currentUserName,
    amount: amount,
    desc: "Settled balance in AUSD (Monad)",
    time: "Just now"
  });

  // 4. Credit the accumulated settled payouts (cashable balance)
  addSettledPayout(amount);
}

// -------------------------------------------------------------
// Settled Payouts / Cashable Balance (Accumulated from others settling)
// -------------------------------------------------------------
export function getSettledPayoutBalance(): number {
  if (typeof window === "undefined") return 0;
  const mode = getWorkspaceMode();
  if (mode === "blank") {
    const val = localStorage.getItem("meshTab_clean_settledPayoutBalance");
    if (val === null) return 0;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }
  const val = localStorage.getItem("meshTab_settledPayoutBalance");
  if (val === null) return 0;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

export function addSettledPayout(amountCents: number) {
  if (typeof window === "undefined") return;
  const mode = getWorkspaceMode();
  const key = mode === "blank" ? "meshTab_clean_settledPayoutBalance" : "meshTab_settledPayoutBalance";
  const current = getSettledPayoutBalance();
  const next = current + amountCents;
  localStorage.setItem(key, String(next));
  window.dispatchEvent(new Event("meshTab-payout-update"));
}

export function withdrawSettledPayout(amountCents?: number): number {
  if (typeof window === "undefined") return 0;
  const mode = getWorkspaceMode();
  const key = mode === "blank" ? "meshTab_clean_settledPayoutBalance" : "meshTab_settledPayoutBalance";
  const current = getSettledPayoutBalance();
  const toWithdraw = amountCents !== undefined ? Math.min(current, amountCents) : current;
  const next = Math.max(0, current - toWithdraw);
  localStorage.setItem(key, String(next));
  window.dispatchEvent(new Event("meshTab-payout-update"));
  return toWithdraw;
}

export function useSettledPayoutBalance() {
  const [balance, setBalance] = useState<number>(getSettledPayoutBalance);

  useEffect(() => {
    const sync = () => setBalance(getSettledPayoutBalance());
    sync();
    window.addEventListener("meshTab-payout-update", sync);
    window.addEventListener("meshTab-workspace-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("meshTab-payout-update", sync);
      window.removeEventListener("meshTab-workspace-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    settledBalance: balance,
    addPayout: addSettledPayout,
    withdrawPayout: withdrawSettledPayout
  };
}

// -------------------------------------------------------------
// Virtual Sandbox Faucet Balance (AUSD play money)
// -------------------------------------------------------------
export function getVirtualBalance(): number {
  if (typeof window === "undefined") return 50000; // default $500.00
  const val = localStorage.getItem("meshTab_virtualBalance");
  if (val === null) return 50000;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 50000 : parsed;
}

export function topUpVirtualBalance(amountCents: number = 50000) {
  if (typeof window === "undefined") return;
  const current = getVirtualBalance();
  const next = current + amountCents;
  localStorage.setItem("meshTab_virtualBalance", String(next));
  window.dispatchEvent(new Event("meshTab-balance-update"));
}

export function deductVirtualBalance(amountCents: number): boolean {
  if (typeof window === "undefined") return false;
  const current = getVirtualBalance();
  if (current < amountCents) return false;
  const next = current - amountCents;
  localStorage.setItem("meshTab_virtualBalance", String(next));
  window.dispatchEvent(new Event("meshTab-balance-update"));
  return true;
}

export function useVirtualBalance() {
  const [balance, setBalance] = useState<number>(getVirtualBalance);

  useEffect(() => {
    const sync = () => setBalance(getVirtualBalance());
    sync();
    window.addEventListener("meshTab-balance-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("meshTab-balance-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { 
    balance, 
    topUp: topUpVirtualBalance, 
    deduct: deductVirtualBalance 
  };
}

// -------------------------------------------------------------
// MeshBuddy Tab Co-Pilot Preferences
// -------------------------------------------------------------
export interface BuddySettings {
  enabled: boolean;
  name: string;
  voice: "mute" | "deep-male" | "warm-female";
  color: string;
}

export function getBuddySettings(): BuddySettings {
  const defaultName = typeof window !== "undefined" && localStorage.getItem("meshTab_displayName")
    ? `${localStorage.getItem("meshTab_displayName")}'s Buddy`
    : "Demo Buddy";

  if (typeof window === "undefined") {
    return { enabled: true, name: defaultName, voice: "mute", color: AVATAR_COLORS[0] };
  }

  try {
    const raw = localStorage.getItem("meshTab_buddySettings");
    if (raw) {
      const parsed = JSON.parse(raw);
      let safeVoice: "mute" | "deep-male" | "warm-female" = "mute";
      if (parsed.voice === "deep-male" || parsed.voice === "male" || parsed.voice === "deep-tech-male") {
        safeVoice = "deep-male";
      } else if (parsed.voice === "warm-female" || parsed.voice === "female" || parsed.voice === "warm-concierge") {
        safeVoice = "warm-female";
      }

      return {
        enabled: parsed.enabled ?? true,
        name: parsed.name || defaultName,
        voice: safeVoice,
        color: parsed.color || AVATAR_COLORS[0]
      };
    }
  } catch (e) {}

  return { enabled: true, name: defaultName, voice: "mute", color: AVATAR_COLORS[0] };
}

export function saveBuddySettings(settings: Partial<BuddySettings>) {
  if (typeof window === "undefined") return;
  const current = getBuddySettings();
  const updated: BuddySettings = { ...current, ...settings };
  localStorage.setItem("meshTab_buddySettings", JSON.stringify(updated));
  window.dispatchEvent(new Event("meshTab-buddy-update"));
}

export function useBuddySettings() {
  const [settings, setSettings] = useState<BuddySettings>(getBuddySettings);

  useEffect(() => {
    const sync = () => setSettings(getBuddySettings());
    sync();
    window.addEventListener("meshTab-buddy-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("meshTab-buddy-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { settings, updateSettings: saveBuddySettings };
}

// -------------------------------------------------------------
// Live Demo Seeder (1-Click populate any custom tab with rich demo data)
// -------------------------------------------------------------
export function seedDemoExpenses(tabId: string, currentUserName?: string) {
  if (typeof window === "undefined" || !tabId) return;
  const activeUser = currentUserName || getStoredUser().name || DEFAULT_USER_NAME;
  const mode = getWorkspaceMode();

  // 1. Seed members: Aisha, Kemi, Ben, and activeUser
  const demoMembers: TabMember[] = [
    { name: "Aisha", balance: 30000, type: "creditor", role: "member" },
    { name: "Kemi", balance: -4000, type: "debtor", role: "member" },
    { name: "Ben", balance: -8000, type: "debtor", role: "member" },
    { name: activeUser, balance: -18000, type: "debtor", role: "admin" }
  ];
  const membersKey = mode === "blank" ? `meshTab_clean_members_${tabId}` : `meshTab_members_${tabId}`;
  localStorage.setItem(membersKey, JSON.stringify(demoMembers));

  // 2. Seed 3 realistic expenses
  const demoExpenses: StoredExpense[] = [
    { id: `demo-${Date.now()}-1`, payer: "Aisha", amount: 60000, desc: "Seaside Villa Booking", time: "2h ago", splitType: "equal" },
    { id: `demo-${Date.now()}-2`, payer: "Kemi", amount: 26000, desc: "Tasting Menu & Wine", time: "5h ago", splitType: "equal" },
    { id: `demo-${Date.now()}-3`, payer: "Ben", amount: 22000, desc: "Catamaran Excursion", time: "1d ago", splitType: "equal" }
  ];
  const expensesKey = mode === "blank" ? `meshTab_clean_expenses_${tabId}` : `meshTab_expenses_${tabId}`;
  localStorage.setItem(expensesKey, JSON.stringify(demoExpenses));

  // 3. Update tab summary
  const key = getTabsStorageKey(mode);
  const tabs = getStoredTabs();
  const updatedTabs = tabs.map(t => {
    if (t.id === tabId) {
      return { ...t, balance: -18000, memberCount: 4, lastActivity: "Demo seeded just now" };
    }
    return t;
  });
  localStorage.setItem(key, JSON.stringify(updatedTabs));

  window.dispatchEvent(new Event("meshTab-expenses-update"));
  window.dispatchEvent(new Event("meshTab-members-update"));
  window.dispatchEvent(new Event("meshTab-tabs-update"));
}



