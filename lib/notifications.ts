"use client";

import { useState, useEffect } from "react";
import { getWorkspaceMode } from "./user";

export type NotificationType = "expense" | "settlement" | "netting" | "tab_created" | "faucet" | "cashout";

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

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-sample-1",
    type: "expense",
    title: "New Expense Added",
    desc: "Aisha paid $600.00 for 'Villa booking' in Lisbon Weekend.",
    actor: "Aisha",
    tabId: "lisbon-24",
    tabName: "Lisbon Weekend",
    amount: 60000,
    timestamp: Date.now() - 2 * 60 * 1000, // 2m ago
    unread: true,
    link: "/tab/lisbon-24"
  },
  {
    id: "notif-sample-2",
    type: "netting",
    title: "Tangle Netting Optimized",
    desc: "Debts across 4 members were simplified. 12 transfers collapsed into 3 payments.",
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
    desc: "Kemi paid $260.00 for 'Dinners & wine' in Lisbon Weekend.",
    actor: "Kemi",
    tabId: "lisbon-24",
    tabName: "Lisbon Weekend",
    amount: 26000,
    timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5h ago
    unread: false,
    link: "/tab/lisbon-24"
  },
  {
    id: "notif-sample-4",
    type: "settlement",
    title: "Settlement Received",
    desc: "Ben settled his $80.00 balance in AUSD on Monad.",
    actor: "Ben",
    tabId: "lisbon-24",
    tabName: "Lisbon Weekend",
    amount: 8000,
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

function getNotificationsStorageKey(mode?: "sample" | "blank"): string {
  const activeMode = mode || getWorkspaceMode();
  return activeMode === "blank" ? "meshTab_clean_notifications" : "meshTab_sample_notifications";
}

export function getStoredNotifications(): AppNotification[] {
  const mode = getWorkspaceMode();
  if (typeof window === "undefined") return mode === "blank" ? BLANK_NOTIFICATIONS : SAMPLE_NOTIFICATIONS;
  const key = getNotificationsStorageKey(mode);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (mode === "blank") {
          return parsed.filter((n) => n.tabId !== "lisbon-24" && n.tabId !== "house-groceries");
        }
        return parsed;
      }
    }
  } catch (e) {}

  return mode === "blank" ? BLANK_NOTIFICATIONS : SAMPLE_NOTIFICATIONS;
}

export function saveStoredNotifications(notifs: AppNotification[], mode?: "sample" | "blank") {
  if (typeof window === "undefined") return;
  const key = getNotificationsStorageKey(mode);
  try {
    localStorage.setItem(key, JSON.stringify(notifs.slice(0, 50)));
    window.dispatchEvent(new Event("meshTab-notifications-update"));
  } catch (e) {}
}

export function addNotification(
  notif: Omit<AppNotification, "id" | "timestamp" | "unread"> & {
    timestamp?: number;
    unread?: boolean;
    id?: string;
  }
): AppNotification {
  const current = getStoredNotifications();
  const newNotif: AppNotification = {
    ...notif,
    id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: notif.timestamp || Date.now(),
    unread: notif.unread !== undefined ? notif.unread : true
  };

  const updated = [newNotif, ...current.filter((n) => n.id !== newNotif.id)];
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

export function clearAllNotifications() {
  if (typeof window === "undefined") return;
  const mode = getWorkspaceMode();
  saveStoredNotifications([], mode);
}

export function resetNotificationsToMode(mode: "sample" | "blank") {
  if (typeof window === "undefined") return;
  const notifs = mode === "sample" ? SAMPLE_NOTIFICATIONS : BLANK_NOTIFICATIONS;
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
