"use client";

import { createPublicClient, http, formatUnits, erc20Abi, encodeFunctionData } from "viem";
import { useState, useEffect, useCallback } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { monadTestnet } from "./chains";
import { isEffectivelyOnline } from "./network";

export function useRealAusdBalance(workspaceMode: string) {
  const { client } = useSmartWallets();
  const [balance, setBalance] = useState<number>(0);
  const [cents, setCents] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [at, setAt] = useState<number>(Date.now());
  const [isStale, setIsStale] = useState<boolean>(false);

  const fetchBalance = useCallback(async () => {
    if (workspaceMode !== "testnet") {
      setIsLoading(false);
      return;
    }
    
    const walletAddress = client?.account?.address;
    if (!walletAddress) {
      return;
    }

    // Try to load cached snapshot first
    try {
      const cached = localStorage.getItem("meshTab_testnet_walletSnapshot");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.wallet === walletAddress) {
          setCents(parsed.cents);
          setBalance(parsed.cents / 100);
          setAt(parsed.at);
          // If older than 30 seconds and offline, mark stale
          if (!isEffectivelyOnline() && Date.now() - parsed.at > 30000) {
            setIsStale(true);
          } else {
            setIsStale(false);
          }
        }
      }
    } catch (e) {}

    if (!isEffectivelyOnline()) {
      setIsLoading(false);
      return;
    }

    try {
      const publicClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
      });

      const rawBalance = await publicClient.readContract({
        address: (process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS as `0x${string}`) || "0xF9bA02Cd0aFc210e0867852eEb0E994B07d9957F",
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [client.account.address as `0x${string}`],
      });

      const formatted = parseFloat(formatUnits(rawBalance as bigint, 6));
      const newCents = Math.round(formatted * 100);
      setBalance(formatted);
      setCents(newCents);
      setAt(Date.now());
      setIsStale(false);
      
      localStorage.setItem("meshTab_testnet_walletSnapshot", JSON.stringify({
        cents: newCents,
        at: Date.now(),
        wallet: walletAddress
      }));
    } catch (err) {
      console.error("Error fetching real AUSD balance:", err);
    } finally {
      setIsLoading(false);
    }
  }, [client, workspaceMode]);

  useEffect(() => {
    fetchBalance();
    
    if (workspaceMode === "testnet") {
      const interval = setInterval(fetchBalance, 10000);
      const handleOnline = () => fetchBalance();
      window.addEventListener("online", handleOnline);
      window.addEventListener("meshTab-network-change", handleOnline);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("meshTab-network-change", handleOnline);
      };
    }
  }, [fetchBalance, workspaceMode]);

  return { balance, cents, isLoading, at, isStale, refetch: fetchBalance };
}

export function useClaimWelcomeBonus(workspaceMode: string) {
  const { client } = useSmartWallets();
  const [isClaiming, setIsClaiming] = useState(false);

  const claimBonus = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!client) {
      return { success: false, error: "Please log in first to claim." };
    }
    
    if (workspaceMode !== "testnet") {
      return { success: false, error: "Smart contract writes are only permitted in Testnet mode." };
    }

    try {
      setIsClaiming(true);
      
      const claimAbi = [{
        "inputs": [],
        "name": "claimWelcomeBonus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }];

      const data = encodeFunctionData({
        abi: claimAbi,
        functionName: "claimWelcomeBonus"
      });

      const txHash = await client.sendTransaction({
        to: (process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS as `0x${string}`) || "0xF9bA02Cd0aFc210e0867852eEb0E994B07d9957F",
        data,
      });
      
      const publicClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      return { success: true };
    } catch (err: any) {
      const userMessage = err?.message?.includes("Unsupported chain")
        ? "Network connection issue. Please try again in a moment."
        : err?.message?.includes("already")
        ? "You've already claimed your welcome bonus!"
        : "Something went wrong. Please try again.";
      return { success: false, error: userMessage };
    } finally {
      setIsClaiming(false);
    }
  }, [client, workspaceMode]);

  return { claimBonus, isClaiming };
}
