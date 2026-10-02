"use client";

import { createPublicClient, http, formatUnits, erc20Abi, encodeFunctionData } from "viem";
import { useState, useEffect, useCallback } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { monadTestnet } from "./chains";

export function useRealAusdBalance(workspaceMode: string) {
  const { client } = useSmartWallets();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchBalance = useCallback(async () => {
    if (workspaceMode !== "testnet") {
      setIsLoading(false);
      return;
    }
    
    if (!client?.account?.address) {
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
      setBalance(formatted);
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
      return () => clearInterval(interval);
    }
  }, [fetchBalance, workspaceMode]);

  return { balance, isLoading, refetch: fetchBalance };
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
