"use client";

import { createMultiOwnerModularAccount, multiOwnerPluginActions, pluginManagerActions, accountLoupeActions } from "@alchemy/aa-accounts";
import { alchemyGasManagerMiddleware } from "@alchemy/aa-alchemy";
import { createSmartAccountClient, createBundlerClient, WalletClientSigner } from "@alchemy/aa-core";
import { createWalletClient, custom, http, createPublicClient, formatUnits, erc20Abi, encodeFunctionData } from "viem";
import { useState, useEffect, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { monadTestnet } from "./chains";

export async function getAlchemySmartAccountClient(privyWallet: any) {
  if (!privyWallet) throw new Error("No privy wallet provided");
  
  const provider = await privyWallet.getEthereumProvider();
  
  // 1. Create a viem wallet client from the Privy EOA provider
  const privyClient = createWalletClient({
    account: privyWallet.address as `0x${string}`,
    chain: monadTestnet,
    transport: custom(provider)
  });

  // 2. Convert to aa-core Smart Account Signer
  const privySigner = new WalletClientSigner(privyClient, "privy");
  
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
  const policyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID || "";
  
  if (!apiKey || !policyId) {
    throw new Error("Alchemy configuration missing (API Key or Policy ID)");
  }

  // 3. Create the Smart Account Client
  const rpcUrl = `https://monad-testnet.g.alchemy.com/v2/${apiKey}`;
  const transport = http(rpcUrl);

  const account = await createMultiOwnerModularAccount({
    transport,
    chain: monadTestnet,
    signer: privySigner,
  });

  const bundlerClient = createBundlerClient({
    chain: monadTestnet,
    transport,
  }).extend(() => ({
    updateHeaders(newHeaders: HeadersInit) {}
  }));

  const smartAccountClient = createSmartAccountClient({
    transport,
    chain: monadTestnet,
    account,
    ...alchemyGasManagerMiddleware(bundlerClient, { policyId }),
  })
    .extend(multiOwnerPluginActions)
    .extend(pluginManagerActions)
    .extend(accountLoupeActions);

  return smartAccountClient;
}

export function useRealAusdBalance(workspaceMode: string) {
  const { wallets } = useWallets();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchBalance = useCallback(async () => {
    if (workspaceMode !== "testnet") {
      setIsLoading(false);
      return;
    }
    
    const primaryWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    if (!primaryWallet || !primaryWallet.address) {
      setIsLoading(false);
      return;
    }

    try {
      const smartClient = await getAlchemySmartAccountClient(primaryWallet);
      const client = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
      });

      const rawBalance = await client.readContract({
        address: (process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS as `0x${string}`) || "0xF9bA02Cd0aFc210e0867852eEb0E994B07d9957F",
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [smartClient.account.address as `0x${string}`],
      });

      const formatted = parseFloat(formatUnits(rawBalance as bigint, 6));
      setBalance(formatted);
    } catch (err) {
      console.error("Error fetching real AUSD balance:", err);
    } finally {
      setIsLoading(false);
    }
  }, [wallets, workspaceMode]);

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
  const { wallets } = useWallets();
  const [isClaiming, setIsClaiming] = useState(false);

  const claimBonus = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (wallets.length === 0) {
      return { success: false, error: "Please log in first to claim." };
    }
    const primaryWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    if (!primaryWallet) {
      return { success: false, error: "No wallet found to process the transaction." };
    }
    
    if (workspaceMode !== "testnet") {
      return { success: false, error: "Smart contract writes are only permitted in Testnet mode." };
    }

    try {
      setIsClaiming(true);
      const smartClient = await getAlchemySmartAccountClient(primaryWallet);
      
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

      const uoResult = await smartClient.sendUserOperation({
        uo: {
          target: (process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS as `0x${string}`) || "0xF9bA02Cd0aFc210e0867852eEb0E994B07d9957F",
          data,
        }
      });
      
      await smartClient.waitForUserOperationTransaction({ hash: uoResult.hash });
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
  }, [wallets]);

  return { claimBonus, isClaiming };
}
