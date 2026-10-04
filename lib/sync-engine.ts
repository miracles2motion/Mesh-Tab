import { getPendingOps, markOpInflight, resolveOp, failOp, OutboxOp } from "./outbox";
import { getStoredUser, useWorkspaceMode } from "./user";
import { globalReachabilityFailed } from "./network";

export async function flushOutbox(
  getAccessToken: () => Promise<string | null>,
  walletAddress: string,
  workspaceMode: string
) {
  if (workspaceMode !== "testnet") return;
  if (typeof window === "undefined") return;
  if (!navigator.onLine || globalReachabilityFailed) return; // Wait until truly online

  const pendingOps = getPendingOps(walletAddress);
  if (pendingOps.length === 0) return;

  // Use web locks to ensure only one tab syncs at a time
  if (navigator.locks) {
    await navigator.locks.request("meshtab-sync", { ifAvailable: true }, async (lock) => {
      if (!lock) return; // Another tab is syncing
      await executeFlush(pendingOps, getAccessToken, workspaceMode);
    });
  } else {
    // Fallback for browsers without web locks
    await executeFlush(pendingOps, getAccessToken, workspaceMode);
  }
}

async function executeFlush(ops: OutboxOp[], getAccessToken: () => Promise<string | null>, mode: string) {
  let token = null;
  try {
    token = await getAccessToken();
  } catch (e) {
    console.error("Failed to get auth token for sync", e);
    return;
  }

  if (!token) return;

  for (const op of ops) {
    markOpInflight(op.opId);

    try {
      const { endpoint, method } = getOpRoute(op);
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...op.payload, mode })
      });

      if (res.ok) {
        resolveOp(op.opId);
      } else if (res.status === 401 || res.status === 403) {
        // Auth error, pause sync or mark failed
        failOp(op.opId, "Authentication failed or unauthorized", false);
      } else if (res.status === 400 || res.status === 413) {
        // Bad request, fatal
        failOp(op.opId, "Invalid request", false);
      } else {
        // Server error, can retry
        failOp(op.opId, "Server error", true);
      }
    } catch (err) {
      failOp(op.opId, "Network error", true);
    }
  }
}

function getOpRoute(op: OutboxOp) {
  switch (op.type) {
    case "createTab":
      return { endpoint: `/api/tab/new`, method: "POST" };
    case "addMember":
    case "removeMember":
      return { endpoint: `/api/tab/${op.tabId}/members`, method: "POST" };
    case "addExpense":
      return { endpoint: `/api/tab/${op.tabId}/expense/new`, method: "POST" };
    case "editExpense":
      return { endpoint: `/api/tab/${op.tabId}/expense/${op.entityId}`, method: "PATCH" };
    case "deleteExpense":
      return { endpoint: `/api/tab/${op.tabId}/expense/${op.entityId}`, method: "DELETE" };
    default:
      throw new Error(`Unknown operation type: ${op.type}`);
  }
}
