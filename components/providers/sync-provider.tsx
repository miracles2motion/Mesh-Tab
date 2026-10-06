"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { flushOutbox } from "@/lib/sync-engine";
import { useWorkspaceMode } from "@/lib/user";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { client } = useSmartWallets();
  const { mode } = useWorkspaceMode();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Prioritize the Smart Wallet address if available
    const walletAddress = client?.account?.address || user?.wallet?.address;

    if (!ready || !authenticated || !walletAddress || mode !== "testnet") return;

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
  }, [ready, authenticated, user?.wallet?.address, client?.account?.address, mode, getAccessToken]);

  return <>{children}</>;
}
