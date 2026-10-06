export type OutboxOp = {
  opId: string;
  type: "createTab" | "deleteTab" | "addMember" | "removeMember" | "addExpense" | "editExpense" | "deleteExpense";
  tabId: string;
  entityId?: string; // expenseId or member name
  payload: any;
  createdAt: number;
  ownerWallet: string;
  attempts: number;
  status: "pending" | "inflight" | "failed";
  lastError?: string;
};

import { removeDeletedTabTombstone } from "./storage-keys";

const OUTBOX_KEY = "meshTab_testnet_outbox";

export function getOutbox(): OutboxOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOutbox(outbox: OutboxOp[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch (e) {
    console.error("Failed to save outbox", e);
  }
}

export function queueOutboxOp(op: Omit<OutboxOp, "opId" | "createdAt" | "attempts" | "status">): string {
  const outbox = getOutbox();
  const opId = crypto.randomUUID();
  
  // Fold edits into pending creations if possible
  if (op.type === "editExpense" && op.entityId) {
    const existingAdd = outbox.find(o => o.type === "addExpense" && o.entityId === op.entityId && o.status === "pending");
    if (existingAdd) {
      existingAdd.payload = { ...existingAdd.payload, ...op.payload };
      saveOutbox(outbox);
      return existingAdd.opId;
    }
  }

  // Cancel out deletes for pending additions
  if (op.type === "deleteExpense" && op.entityId) {
    const existingAddIdx = outbox.findIndex(o => o.type === "addExpense" && o.entityId === op.entityId && o.status === "pending");
    if (existingAddIdx !== -1) {
      outbox.splice(existingAddIdx, 1);
      saveOutbox(outbox);
      return "cancelled";
    }
  }
  
  outbox.push({
    ...op,
    opId,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending"
  });
  
  saveOutbox(outbox);
  // Dispatch event for UI to update
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("meshtab:outbox:updated"));
  }
  return opId;
}

export function getPendingOps(ownerWallet: string): OutboxOp[] {
  const normTarget = ownerWallet ? ownerWallet.toLowerCase() : "";
  return getOutbox().filter(o => {
    if (o.status === "failed") return false;
    if (!o.ownerWallet) return true;
    return o.ownerWallet.toLowerCase() === normTarget;
  });
}

export function markOpInflight(opId: string) {
  const outbox = getOutbox();
  const op = outbox.find(o => o.opId === opId);
  if (op) {
    op.status = "inflight";
    saveOutbox(outbox);
  }
}

export function resolveOp(opId: string) {
  const outbox = getOutbox();
  const op = outbox.find(o => o.opId === opId);
  if (op && op.type === "deleteTab") {
    removeDeletedTabTombstone(op.tabId);
  }
  const filtered = outbox.filter(o => o.opId !== opId);
  saveOutbox(filtered);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("meshtab:outbox:updated"));
  }
}

export function failOp(opId: string, errorMsg: string, canRetry: boolean) {
  const outbox = getOutbox();
  const op = outbox.find(o => o.opId === opId);
  if (op) {
    op.attempts += 1;
    op.lastError = errorMsg;
    if (!canRetry || op.attempts >= 5) {
      op.status = "failed";
    } else {
      op.status = "pending";
    }
    saveOutbox(outbox);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meshtab:outbox:updated"));
    }
  }
}

export function getPendingExpenses(tabId: string): OutboxOp[] {
  return getOutbox().filter(o => o.tabId === tabId && ["addExpense", "editExpense", "deleteExpense"].includes(o.type));
}

export function discardFailedOp(opId: string) {
  const outbox = getOutbox();
  const filtered = outbox.filter(o => o.opId !== opId);
  saveOutbox(filtered);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("meshtab:outbox:updated"));
  }
}
