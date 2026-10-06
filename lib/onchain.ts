"use client";

import { createPublicClient, http, formatUnits, erc20Abi, encodeFunctionData } from "viem";
import { useState, useCallback } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { monadTestnet } from "./chains";
import { isEffectivelyOnline } from "./network";
import { useQuery } from "@tanstack/react-query";

export function useRealAusdBalance(workspaceMode: string) {
  const { client } = useSmartWallets();
  const walletAddress = client?.account?.address;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["realAusdBalance", workspaceMode, walletAddress],
    queryFn: async () => {
      if (workspaceMode !== "testnet" || !walletAddress) {
        return { balance: 0, cents: 0, at: Date.now(), isStale: false };
      }
      
      if (!isEffectivelyOnline()) {
        const cached = localStorage.getItem("meshTab_testnet_walletSnapshot");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.wallet === walletAddress) {
            const isStale = Date.now() - parsed.at > 30000;
            return {
              balance: parsed.cents / 100,
              cents: parsed.cents,
              at: parsed.at,
              isStale
            };
          }
        }
        return { balance: 0, cents: 0, at: Date.now(), isStale: true };
      }

      const publicClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
      });

      const rawBalance = await publicClient.readContract({
        address: (process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS as `0x${string}`) || "0xF9bA02Cd0aFc210e0867852eEb0E994B07d9957F",
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });

      const formatted = parseFloat(formatUnits(rawBalance as bigint, 6));
      const newCents = Math.round(formatted * 100);
      
      const result = {
        balance: formatted,
        cents: newCents,
        at: Date.now(),
        isStale: false
      };

      localStorage.setItem("meshTab_testnet_walletSnapshot", JSON.stringify({
        cents: newCents,
        at: Date.now(),
        wallet: walletAddress
      }));

      return result;
    },
    refetchInterval: 10000,
    staleTime: 5000,
    enabled: workspaceMode === "testnet" && !!walletAddress,
  });

  return {
    balance: data?.balance || 0,
    cents: data?.cents || 0,
    isLoading,
    at: data?.at || Date.now(),
    isStale: data?.isStale || false,
    refetch
  };
}

export function useClaimWelcomeBonus(workspaceMode: string) {
  const { client } = useSmartWallets();
  const [isClaiming, setIsClaiming] = useState(false);
  const walletAddress = client?.account?.address;

  const { data: hasClaimed = false, refetch: checkHasClaimed } = useQuery({
    queryKey: ["hasClaimedWelcomeBonus", workspaceMode, walletAddress],
    queryFn: async () => {
      if (workspaceMode !== "testnet" || !walletAddress) return false;
      const publicClient = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
      });
      const claimed = await publicClient.readContract({
        address: (process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS as `0x${string}`) || "0xF9bA02Cd0aFc210e0867852eEb0E994B07d9957F",
        abi: [{
          inputs: [{ name: "", type: "address" }],
          name: "hasReceivedBonus",
          outputs: [{ name: "", type: "bool" }],
          stateMutability: "view",
          type: "function"
        }],
        functionName: "hasReceivedBonus",
        args: [walletAddress as `0x${string}`],
      });
      return Boolean(claimed);
    },
    staleTime: Infinity,
    enabled: workspaceMode === "testnet" && !!walletAddress,
  });

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

      await checkHasClaimed();
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
  }, [client, workspaceMode, checkHasClaimed]);

  return { claimBonus, isClaiming, hasClaimed, checkHasClaimed };
}
