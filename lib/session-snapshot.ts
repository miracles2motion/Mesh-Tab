import { getWorkspaceMode } from "./user";
import { storageKey } from "./storage-keys";

export interface SessionSnapshot {
  walletAddress: string;
  privyUserId: string;
  displayName: string;
  lastVerifiedAt: number;
}

export function saveSessionSnapshot(snapshot: Omit<SessionSnapshot, "lastVerifiedAt">) {
  if (typeof window === "undefined") return;
  const mode = getWorkspaceMode();
  if (mode !== "testnet") return;
  
  const fullSnapshot: SessionSnapshot = {
    ...snapshot,
    lastVerifiedAt: Date.now()
  };
  
  try {
    localStorage.setItem(storageKey("sessionSnapshot", mode), JSON.stringify(fullSnapshot));
  } catch (e) {
    console.error("Failed to save session snapshot", e);
  }
}

export function getSessionSnapshot(): SessionSnapshot | null {
  if (typeof window === "undefined") return null;
  const mode = getWorkspaceMode();
  if (mode !== "testnet") return null;
  
  try {
    const raw = localStorage.getItem(storageKey("sessionSnapshot", mode));
    if (!raw) return null;
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    return null;
  }
}

export function clearSessionSnapshot() {
  if (typeof window === "undefined") return;
  const mode = getWorkspaceMode();
  if (mode !== "testnet") return;
  
  localStorage.removeItem(storageKey("sessionSnapshot", mode));
}

export function isSessionSnapshotValid(snapshot: SessionSnapshot): boolean {
  // 7 days (D8)
  const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  return (Date.now() - snapshot.lastVerifiedAt) < MAX_AGE;
}
