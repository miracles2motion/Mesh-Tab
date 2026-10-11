"use client";

import { createPublicClient, http, formatUnits, erc20Abi, encodeFunctionData } from "viem";
import { useState, useCallback } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { monadTestnet } from "./chains";
import { isEffectivelyOnline } from "./network";
import { useQuery } from "@tanstack/react-query";
import { addClaimRecord } from "./claims";

const monadPublicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
});

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
        const cached = localStorage.getItem("meshTab_testnet_agoraWalletSnapshot");
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

      const rawBalance = await monadPublicClient.readContract({
        address: (process.env.NEXT_PUBLIC_AGORA_AUSD_ADDRESS as `0x${string}`) || "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
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

      localStorage.setItem("meshTab_testnet_agoraWalletSnapshot", JSON.stringify({
        cents: newCents,
        at: Date.now(),
        wallet: walletAddress
      }));

      return result;
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
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

export function useClaimAgoraFunds(workspaceMode: string) {
  const { client } = useSmartWallets();
  const [isClaiming, setIsClaiming] = useState(false);
  const walletAddress = client?.account?.address;

  // Determine claimed status based on holding Agora AUSD allocation (>= 10,000 AUSD)
  const { data: hasClaimed = false, refetch: checkHasClaimed } = useQuery({
    queryKey: ["hasClaimedAgoraFunds", workspaceMode, walletAddress],
    queryFn: async () => {
      if (workspaceMode !== "testnet" || !walletAddress) return false;
      const rawBal = await monadPublicClient.readContract({
        address: (process.env.NEXT_PUBLIC_AGORA_AUSD_ADDRESS as `0x${string}`) || "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      const balance = parseFloat(formatUnits(rawBal as bigint, 6));
      return balance >= 100000; // Agora Faucet allows up to 100,000 AUSD max ceiling
    },
    staleTime: 10000,
    enabled: workspaceMode === "testnet" && !!walletAddress,
  });

  const claimBonus = useCallback(async (): Promise<{ success: boolean; error?: string; txHash?: string }> => {
    if (!client) {
      return { success: false, error: "Please log in first to claim." };
    }
    
    if (workspaceMode !== "testnet") {
      return { success: false, error: "Smart contract writes are only permitted in Testnet mode." };
    }

    // Check client-side 60s cooldown failsafe
    if (typeof window !== "undefined") {
      const lastClaimStr = localStorage.getItem("meshTab_testnet_lastFaucetClaim");
      if (lastClaimStr) {
        const elapsedSec = Math.floor((Date.now() - parseInt(lastClaimStr, 10)) / 1000);
        if (elapsedSec < 60) {
          const remainingSec = 60 - elapsedSec;
          return {
            success: false,
            error: `Please wait ${remainingSec}s before claiming again. Agora Faucet limit is 1 claim per 60 seconds.`
          };
        }
      }
    }

    try {
      setIsClaiming(true);
      
      const faucetAbi = [{
        "inputs": [{ "name": "_receiver", "type": "address" }],
        "name": "requestFunds",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }];

      const data = encodeFunctionData({
        abi: faucetAbi,
        functionName: "requestFunds",
        args: [walletAddress as `0x${string}`]
      });

      const txHash = await client.sendTransaction({
        to: (process.env.NEXT_PUBLIC_AGORA_FAUCET_ADDRESS as `0x${string}`) || "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C",
        data,
      });
      
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (typeof window !== "undefined") {
        localStorage.setItem("meshTab_testnet_lastFaucetClaim", Date.now().toString());
        addClaimRecord({
          txHash,
          amount: 10000,
          currency: "Agora AUSD",
          network: "Monad Testnet",
          timestamp: Date.now(),
          walletAddress: walletAddress || undefined
        }, workspaceMode);
      }

      await checkHasClaimed();
      return { success: true, txHash };
    } catch (err: any) {
      const errStr = (err?.message || err?.toString() || "").toLowerCase();
      let userMessage = "Something went wrong requesting funds from Agora Faucet. Please try again.";

      if (errStr.includes("unsupported chain")) {
        userMessage = "Network connection issue. Please try again in a moment.";
      } else if (errStr.includes("exceeds max") || errStr.includes("ceiling") || errStr.includes("max balance") || errStr.includes("100000")) {
        userMessage = "Your wallet has reached the $100,000 AUSD testnet ceiling.";
      } else if (errStr.includes("cooldown") || errStr.includes("wait") || errStr.includes("recent") || errStr.includes("rate") || errStr.includes("60")) {
        userMessage = "Please wait 60 seconds before claiming again from Agora Faucet (1 claim per 60 seconds).";
      }
      return { success: false, error: userMessage };
    } finally {
      setIsClaiming(false);
    }
  }, [client, workspaceMode, walletAddress, checkHasClaimed]);

  return { claimBonus, claimFunds: claimBonus, isClaiming, hasClaimed, checkHasClaimed };
}

// Backward-compatible alias for existing imports
export const useClaimWelcomeBonus = useClaimAgoraFunds;
