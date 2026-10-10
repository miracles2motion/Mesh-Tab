"use client";

import { useState, useEffect } from "react";
import { getWorkspaceMode, WorkspaceMode } from "./user";

export type NotificationType = "expense" | "settlement" | "netting" | "tab_created" | "faucet" | "cashout" | "payment_request";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  desc: string;
  actor: string;
  tabId?: string;
  tabName?: string;
  amount?: number; // in cents
  timestamp: number;
  unread: boolean;
  link?: string;
}

import { formatTimeAgo } from "./time";


export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-sample-1",
    type: "expense",
    title: "New Expense Added",
    desc: "Aisha paid €550.00 ($599.50) for 'Villa Booking' in Lisbon Weekend.",
    actor: "Aisha",
    tabId: "lisbon-24",
    tabName: "Lisbon Weekend",
    amount: 59950,
    timestamp: Date.now() - 2 * 60 * 1000, // 2m ago
    unread: true,
    link: "/tab/lisbon-24"
  },
  {
    id: "notif-sample-2",
    type: "netting",
    title: "Netting Engine Optimized",
    desc: "Debts across 4 members were simplified. 9 multi-currency transfers collapsed into 3 payments.",
    actor: "Mesh Engine",
    tabId: "lisbon-24",
    tabName: "Lisbon Weekend",
    timestamp: Date.now() - 60 * 60 * 1000, // 1h ago
    unread: true,
    link: "/tab/lisbon-24"
  },
  {
    id: "notif-sample-3",
    type: "expense",
    title: "New Expense Added",
    desc: "Kemi paid €240.00 ($261.60) for 'Dinners & Wine' in Lisbon Weekend.",
    actor: "Kemi",
    tabId: "lisbon-24",
    tabName: "Lisbon Weekend",
    amount: 26160,
    timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5h ago
    unread: false,
    link: "/tab/lisbon-24"
  },
  {
    id: "notif-sample-4",
    type: "settlement",
    title: "Settlement Received",
    desc: "Ben settled his $16.77 balance in AUSD on Monad.",
    actor: "Ben",
    tabId: "lisbon-24",
    tabName: "Lisbon Weekend",
    amount: 1677,
    timestamp: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
    unread: false,
    link: "/tab/lisbon-24"
  }
];

export const BLANK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-blank-1",
    type: "tab_created",
    title: "Welcome to MeshTab",
    desc: "Your shared expense space is ready. Tap + to create your first tab and invite friends.",
    actor: "MeshTab",
    timestamp: Date.now() - 60 * 1000,
    unread: true,
    link: "/tab/new"
  }
];

export const TESTNET_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-testnet-1",
    type: "tab_created",
    title: "Testnet Workspace Ready",
    desc: "Your Monad Testnet workspace is live. All group tabs settle using Agora AUSD with cryptographic finality.",
    actor: "MeshTab",
    timestamp: Date.now() - 60 * 1000,
    unread: false,
    link: "/home"
  }
];

function getNotificationsStorageKey(mode?: WorkspaceMode): string {
  const activeMode = mode || getWorkspaceMode();
  return activeMode === "testnet" ? "meshTab_testnet_notifications" : activeMode === "blank" ? "meshTab_clean_notifications" : "meshTab_sample_notifications";
}

export function getStoredNotifications(): AppNotification[] {
  const mode = getWorkspaceMode();
  if (typeof window === "undefined") {
    return mode === "testnet" ? TESTNET_NOTIFICATIONS : mode === "blank" ? BLANK_NOTIFICATIONS : SAMPLE_NOTIFICATIONS;
  }
  const key = getNotificationsStorageKey(mode);
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (mode === "blank" || mode === "testnet") {
          return parsed.filter((n) => n.tabId !== "lisbon-24");
        }
        return parsed;
      }
    }
  } catch (e) {}

  return mode === "testnet" ? TESTNET_NOTIFICATIONS : mode === "blank" ? BLANK_NOTIFICATIONS : SAMPLE_NOTIFICATIONS;
}

export function saveStoredNotifications(notifs: AppNotification[], mode?: WorkspaceMode) {
  if (typeof window === "undefined") return;
  const key = getNotificationsStorageKey(mode);
  try {
    localStorage.setItem(key, JSON.stringify(notifs.slice(0, 50)));
    window.dispatchEvent(new Event("meshTab-notifications-update"));
  } catch (e) {}
}

export function getExpenseNotifId(expenseId: string): string {
  return `notif-exp-${expenseId}`;
}

export function getMemberJoinNotifId(tabId: string, memberName: string): string {
  return `notif-join-${tabId}-${memberName.toLowerCase().replace(/\s+/g, "_")}`;
}

export function getSettlementNotifId(expenseId: string): string {
  return `notif-settle-${expenseId}`;
}

export function getPaymentRequestNotifId(tabId: string, debtor: string, creditor: string): string {
  return `notif-payreq-${tabId}-${debtor.toLowerCase().replace(/\s+/g, "_")}-${creditor.toLowerCase().replace(/\s+/g, "_")}`;
}

export function addNotification(
  notif: Omit<AppNotification, "id" | "timestamp" | "unread"> & {
    timestamp?: number;
    unread?: boolean;
    id?: string;
  }
): AppNotification {
  const current = getStoredNotifications();
  const targetId = notif.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const existing = current.find((n) => n.id === targetId);

  // Preserve read status permanently once marked read — never flip back to unread on re-sync
  const unreadStatus = existing !== undefined ? existing.unread : (notif.unread !== undefined ? notif.unread : true);
  const effectiveTs = existing?.timestamp || notif.timestamp || Date.now();

  const newNotif: AppNotification = {
    ...notif,
    id: targetId,
    timestamp: effectiveTs,
    unread: unreadStatus
  };

  const updated = [newNotif, ...current.filter((n) => n.id !== targetId)];
  saveStoredNotifications(updated);
  return newNotif;
}

export function markNotificationAsRead(id: string) {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, unread: false } : n));
  saveStoredNotifications(updated);
}

export function markAllNotificationsAsRead() {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, unread: false }));
  saveStoredNotifications(updated);
}

export function removeNotification(id: string) {
  if (typeof window === "undefined") return;
  const current = getStoredNotifications();
  const updated = current.filter((n) => n.id !== id);
  const mode = getWorkspaceMode();
  saveStoredNotifications(updated, mode);
}

export function hasNotification(id: string): boolean {
  const current = getStoredNotifications();
  return current.some((n) => n.id === id);
}

export function clearAllNotifications() {
  if (typeof window === "undefined") return;
  const mode = getWorkspaceMode();
  saveStoredNotifications([], mode);
}

export function resetNotificationsToMode(mode: WorkspaceMode) {
  if (typeof window === "undefined") return;
  const notifs = mode === "sample" ? SAMPLE_NOTIFICATIONS : mode === "testnet" ? TESTNET_NOTIFICATIONS : BLANK_NOTIFICATIONS;
  saveStoredNotifications(notifs, mode);
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(getStoredNotifications);

  useEffect(() => {
    const sync = () => setNotifications(getStoredNotifications());
    sync();
    window.addEventListener("meshTab-notifications-update", sync);
    window.addEventListener("meshTab-workspace-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("meshTab-notifications-update", sync);
      window.removeEventListener("meshTab-workspace-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    clearAll: clearAllNotifications
  };
}
