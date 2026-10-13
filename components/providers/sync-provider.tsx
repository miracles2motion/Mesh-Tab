"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { flushOutbox } from "@/lib/sync-engine";
import { useWorkspaceMode, mergePulledTabs } from "@/lib/user";
import { storageKey } from "@/lib/storage-keys";

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

              // Automatically sync expenses for user tabs so settlements & receipts are always up-to-date across peers
              let hasNewExpenses = false;
              await Promise.all(
                data.tabs.map(async (tab: any) => {
                  try {
                    const expRes = await fetch(`/api/tab/${tab.id}/expenses?mode=${mode}`, {
                      headers: {
                        "Authorization": `Bearer ${token}`,
                        "x-wallet-address": walletAddress
                      },
                      cache: "no-store"
                    });
                    if (expRes.ok) {
                      const expData = await expRes.json();
                      if (expData.success && Array.isArray(expData.expenses)) {
                        const expStorageKey = storageKey("expenses", mode, tab.id);
                        const rawLocal = localStorage.getItem(expStorageKey);
                        const localList = rawLocal ? JSON.parse(rawLocal) : [];

                        const serverMapped = expData.expenses.map((e: any) => {
                          const isSettle = Boolean(e.isSettlement || e.expenseId?.startsWith("settle-") || e.description?.toLowerCase().includes("settled"));
                          return {
                            id: e.expenseId || e.id,
                            payer: e.payers?.[0]?.name || "Unknown",
                            amount: e.finalAmountUsd || 0,
                            desc: e.description || "",
                            createdAt: e.createdAt || e.timestamp || Date.now(),
                            time: "Just now",
                            splitType: e.splitType || "equal",
                            splits: e.splits || (e.borrowers ? Object.fromEntries(e.borrowers.map((b: any) => [b.name, b.amount])) : undefined),
                            participants: e.participants || (e.borrowers ? e.borrowers.map((b: any) => b.name) : undefined),
                            category: e.category || "other",
                            originalCurrency: e.originalCurrency || "USD",
                            originalAmount: e.originalAmount,
                            syncStatus: "synced" as const,
                            isSettlement: isSettle,
                            txHash: e.txHash
                          };
                        });

                        const localPending = localList.filter((le: any) =>
                          le.syncStatus === "pending" && !serverMapped.some((sm: any) => sm.id === le.id)
                        );
                        const merged = [...serverMapped, ...localPending].sort((a: any, b: any) => {
                          const tsB = b.createdAt || 0;
                          const tsA = a.createdAt || 0;
                          return tsB - tsA;
                        });
                        localStorage.setItem(expStorageKey, JSON.stringify(merged));
                        hasNewExpenses = true;
                      }
                    }
                  } catch {}
                })
              );
              if (hasNewExpenses) {
                window.dispatchEvent(new Event("meshTab-expenses-update"));
              }
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

    // Profile settings sync handlers (developerMode, buddySettings)
    const handleDevModeChange = async () => {
      if (!walletAddress) return;
      try {
        const token = await getAccessToken();
        if (!token) return;
        const devMode = typeof window !== "undefined" ? localStorage.getItem("meshTab_developerMode") === "true" : false;
        await fetch("/api/user/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            wallet: walletAddress,
            developerMode: devMode
          })
        });
      } catch (err) {
        console.warn("Dev mode sync error:", err);
      }
    };

    const handleBuddyUpdate = async () => {
      if (!walletAddress) return;
      try {
        const token = await getAccessToken();
        if (!token) return;
        const rawBuddy = typeof window !== "undefined" ? localStorage.getItem("meshTab_buddySettings") : null;
        const buddySettings = rawBuddy ? JSON.parse(rawBuddy) : undefined;
        await fetch("/api/user/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            wallet: walletAddress,
            buddySettings
          })
        });
      } catch (err) {
        console.warn("Buddy settings sync error:", err);
      }
    };

    window.addEventListener("meshTab-developerMode-change", handleDevModeChange);
    window.addEventListener("meshTab-buddy-update", handleBuddyUpdate);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("meshtab:outbox:updated", handleOutboxUpdate);
      window.removeEventListener("meshTab-developerMode-change", handleDevModeChange);
      window.removeEventListener("meshTab-buddy-update", handleBuddyUpdate);
      clearInterval(intervalId);
    };
  }, [ready, authenticated, user?.wallet?.address, client?.account?.address, mode, getAccessToken]);

  return <>{children}</>;
}
