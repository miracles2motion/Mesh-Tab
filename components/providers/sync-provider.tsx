"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { flushOutbox } from "@/lib/sync-engine";
import { useWorkspaceMode, mergePulledTabs } from "@/lib/user";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { client } = useSmartWallets();
  const { mode } = useWorkspaceMode();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Prioritize the Smart Wallet address if available
    const smartWalletAddress = client?.account?.address;
    const walletAddress = smartWalletAddress || user?.wallet?.address || (typeof window !== "undefined" ? localStorage.getItem("meshTab_walletAddress") : null) || "";

    if (!ready || !authenticated || mode !== "testnet") return;

    if (typeof window !== "undefined" && walletAddress) {
      const prevStored = localStorage.getItem("meshTab_walletAddress");
      if (prevStored !== walletAddress) {
        localStorage.setItem("meshTab_walletAddress", walletAddress);
        window.dispatchEvent(new Event("meshTab-profile-update"));
      }
    }

    // Auto-sync profile and smart wallet to Redis with zero manual steps
    const syncProfileToServer = async () => {
      if (!walletAddress) return;
      try {
        const token = await getAccessToken();
        if (token) {
          const displayName = typeof window !== "undefined" ? localStorage.getItem("meshTab_displayName") : "";
          await fetch("/api/user/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              wallet: walletAddress,
              name: displayName || undefined
            })
          });
        }
      } catch (err) {
        console.warn("Auto profile sync to Redis error:", err);
      }
    };
    syncProfileToServer();

    const runSync = async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        // [OVERSEER MANDATE - Baseline 16]: Push first, then pull
        await flushOutbox(getAccessToken, walletAddress, mode);
        
        // Pull tabs from server with cache: no-store
        const token = await getAccessToken();
        if (token) {
          const res = await fetch(`/api/tab/user?mode=${mode}`, {
            headers: { 
              "Authorization": `Bearer ${token}`,
              "x-wallet-address": walletAddress
            },
            cache: "no-store"
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.tabs) {
              mergePulledTabs(data.tabs, walletAddress);
            }
          }
        }
      } catch (err) {
        console.warn("Sync provider error:", err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Run initially
    runSync();

    // Re-run when outbox updates (debounced to prevent tight CPU thrashing)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleOutboxUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runSync();
      }, 500);
    };
    window.addEventListener("meshtab:outbox:updated", handleOutboxUpdate);

    // Safety retry loop (every 60s)
    const intervalId = setInterval(runSync, 60000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("meshtab:outbox:updated", handleOutboxUpdate);
      clearInterval(intervalId);
    };
  }, [ready, authenticated, user?.wallet?.address, client?.account?.address, mode, getAccessToken]);

  return <>{children}</>;
}
