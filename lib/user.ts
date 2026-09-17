"use client";

import { useState, useEffect } from "react";

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
  role: "Creator" | "Member";
  balance: number;
  memberCount: number;
  lastActivity: string;
}

export const DEFAULT_TABS: TabSummary[] = [
  { id: "lisbon-24", name: "Lisbon Weekend", role: "Creator", balance: -18000, memberCount: 4, lastActivity: "2 hours ago" },
  { id: "house-groceries", name: "House Groceries", role: "Member", balance: 4500, memberCount: 2, lastActivity: "Yesterday" },
];

export function getStoredTabs(): TabSummary[] {
  if (typeof window === "undefined") return DEFAULT_TABS;
  try {
    const stored = localStorage.getItem("meshTab_tabs");
    if (!stored) return DEFAULT_TABS;
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {}
  return DEFAULT_TABS;
}

export function saveNewTab(tab: TabSummary) {
  if (typeof window === "undefined") return;
  const current = getStoredTabs();
  const existingIdx = current.findIndex(t => t.id === tab.id);
  let updated: TabSummary[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = tab;
  } else {
    updated = [tab, ...current];
  }
  localStorage.setItem("meshTab_tabs", JSON.stringify(updated));
  window.dispatchEvent(new Event("meshTab-tabs-update"));
}

export function useStoredTabs() {
  const [tabs, setTabs] = useState<TabSummary[]>(getStoredTabs);

  useEffect(() => {
    const sync = () => {
      setTabs(getStoredTabs());
    };

    sync();

    window.addEventListener("meshTab-tabs-update", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("meshTab-tabs-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { tabs, saveTab: saveNewTab };
}

// Expense & Settlement Persistence
export interface StoredExpense {
  id: string;
  payer: string;
  amount: number; // in cents
  desc: string;
  time: string;
}

export const DEFAULT_FEED: Record<string, StoredExpense[]> = {
  "lisbon-24": [
    { id: "1", payer: "Aisha", amount: 60000, desc: "Villa booking", time: "Just now" },
    { id: "2", payer: "Kemi", amount: 26000, desc: "Dinners & wine", time: "5h ago" },
    { id: "3", payer: "Ben", amount: 22000, desc: "Excursions", time: "1d ago" },
  ]
};

export function getStoredExpenses(tabId: string): StoredExpense[] {
  if (typeof window === "undefined") return DEFAULT_FEED[tabId] || [];
  try {
    const raw = localStorage.getItem(`meshTab_expenses_${tabId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_FEED[tabId] || [];
}

export function saveStoredExpense(tabId: string, expense: StoredExpense) {
  if (typeof window === "undefined") return;
  const current = getStoredExpenses(tabId);
  const updated = [expense, ...current];
  localStorage.setItem(`meshTab_expenses_${tabId}`, JSON.stringify(updated));
  window.dispatchEvent(new Event("meshTab-expenses-update"));
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
    addExpense: (expense: StoredExpense) => saveStoredExpense(tabId, expense) 
  };
}

export function settleTab(tabId: string, currentUserName: string, amount: number) {
  if (typeof window === "undefined") return;
  
  // 1. Update tab balance in stored tabs
  const tabs = getStoredTabs();
  const updatedTabs = tabs.map(t => {
    if (t.id === tabId) {
      return { ...t, balance: 0, lastActivity: "Settled just now" };
    }
    return t;
  });
  localStorage.setItem("meshTab_tabs", JSON.stringify(updatedTabs));
  window.dispatchEvent(new Event("meshTab-tabs-update"));

  // 2. Add settlement entry to tab expenses
  saveStoredExpense(tabId, {
    id: `settle-${Date.now()}`,
    payer: currentUserName,
    amount: amount,
    desc: "Settled balance in AUSD (Monad)",
    time: "Just now"
  });
}

