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

export type WorkspaceMode = "sample" | "blank";

export function getWorkspaceMode(): WorkspaceMode {
  if (typeof window === "undefined") return "sample";
  const mode = localStorage.getItem("meshTab_workspaceMode");
  return mode === "blank" ? "blank" : "sample";
}

export function setWorkspaceMode(mode: WorkspaceMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem("meshTab_workspaceMode", mode);
  window.dispatchEvent(new Event("meshTab-workspace-update"));
  window.dispatchEvent(new Event("meshTab-tabs-update"));
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

  return { mode, setMode: setWorkspaceMode };
}

export function getStoredTabs(): TabSummary[] {
  if (typeof window === "undefined") return DEFAULT_TABS;
  const mode = getWorkspaceMode();
  try {
    const stored = localStorage.getItem("meshTab_tabs");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        if (mode === "blank") {
          return parsed.filter(t => t.id !== "lisbon-24" && t.id !== "house-groceries");
        }
        return parsed;
      }
    }
  } catch (e) {}
  return mode === "blank" ? [] : DEFAULT_TABS;
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
  
  if (typeof window === "undefined") {
    if (tabId === "lisbon-24") {
      return [
        ...DEFAULT_LISBON_MEMBERS,
        { name: activeUser, balance: -18000, type: "debtor", role: "member" }
      ];
    }
    return [{ name: activeUser, balance: 0, type: "settled", role: "admin" }];
  }

  try {
    const raw = localStorage.getItem(`meshTab_members_${tabId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  if (tabId === "lisbon-24") {
    const defaultList: TabMember[] = [
      ...DEFAULT_LISBON_MEMBERS,
      { name: activeUser, balance: -18000, type: "debtor", role: "member" }
    ];
    localStorage.setItem(`meshTab_members_${tabId}`, JSON.stringify(defaultList));
    return defaultList;
  }

  if (tabId === "house-groceries") {
    const defaultList: TabMember[] = [
      { name: "Alex", balance: -4500, type: "debtor", role: "admin" },
      { name: activeUser, balance: 4500, type: "creditor", role: "member" }
    ];
    localStorage.setItem(`meshTab_members_${tabId}`, JSON.stringify(defaultList));
    return defaultList;
  }

  // Brand new clean slate / custom tab
  const initialMembers: TabMember[] = [
    { name: activeUser, balance: 0, type: "settled", role: "admin" }
  ];
  localStorage.setItem(`meshTab_members_${tabId}`, JSON.stringify(initialMembers));
  return initialMembers;
}

export function saveStoredTabMembers(tabId: string, members: TabMember[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`meshTab_members_${tabId}`, JSON.stringify(members));

  // Sync member count in stored tabs
  const tabs = getStoredTabs();
  const updatedTabs = tabs.map(t => {
    if (t.id === tabId) {
      return { ...t, memberCount: members.length };
    }
    return t;
  });
  localStorage.setItem("meshTab_tabs", JSON.stringify(updatedTabs));

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

  // Dynamically recalculate tab member balances if custom tab
  if (tabId !== "lisbon-24") {
    try {
      const members = getStoredTabMembers(tabId);
      if (members.length > 0) {
        const splitCount = members.length;
        const splitAmount = Math.round(expense.amount / splitCount);

        const updatedMembers = members.map(m => {
          let delta = -splitAmount;
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
        localStorage.setItem(`meshTab_members_${tabId}`, JSON.stringify(updatedMembers));
        window.dispatchEvent(new Event("meshTab-members-update"));

        // Update user balance in tab summary
        const profile = getStoredUser();
        const userMember = updatedMembers.find(m => m.name.toLowerCase() === profile.name.toLowerCase());
        if (userMember) {
          const tabs = getStoredTabs();
          const nextTabs = tabs.map(t => {
            if (t.id === tabId) {
              return { ...t, balance: userMember.balance, lastActivity: "Just now" };
            }
            return t;
          });
          localStorage.setItem("meshTab_tabs", JSON.stringify(nextTabs));
          window.dispatchEvent(new Event("meshTab-tabs-update"));
        }
      }
    } catch (e) {}
  }

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

  // 2. Update member balances for this tab
  try {
    const members = getStoredTabMembers(tabId, currentUserName);
    const updatedMembers = members.map(m => {
      if (m.name.toLowerCase() === currentUserName.toLowerCase()) {
        return { ...m, balance: 0, type: "settled" as const };
      }
      return m;
    });
    localStorage.setItem(`meshTab_members_${tabId}`, JSON.stringify(updatedMembers));
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
      return {
        enabled: parsed.enabled ?? true,
        name: parsed.name || defaultName,
        voice: parsed.voice || "mute",
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


