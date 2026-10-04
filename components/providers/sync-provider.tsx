"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { flushOutbox } from "@/lib/sync-engine";
import { useWorkspaceMode } from "@/lib/user";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { mode } = useWorkspaceMode();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || !user?.wallet?.address || mode !== "testnet") return;

    const walletAddress = user.wallet.address;

    const runSync = async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        await flushOutbox(getAccessToken, walletAddress, mode);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Run initially
    runSync();

    // Re-run when outbox updates
    const handleOutboxUpdate = () => runSync();
    window.addEventListener("meshtab:outbox:updated", handleOutboxUpdate);

    // Safety retry loop (every 60s)
    const intervalId = setInterval(runSync, 60000);

    return () => {
      window.removeEventListener("meshtab:outbox:updated", handleOutboxUpdate);
      clearInterval(intervalId);
    };
  }, [ready, authenticated, user?.wallet?.address, mode, getAccessToken]);

  return <>{children}</>;
}
