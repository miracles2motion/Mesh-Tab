import { createModularAccountAlchemyClient } from "@alchemy/aa-alchemy";
import { walletClientToSmartAccountSigner } from "@alchemy/aa-core";
import { createWalletClient, custom } from "viem";

export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'MONAD', symbol: 'MONAD', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] } }
} as const;

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
  const privySigner = walletClientToSmartAccountSigner(privyClient);
  
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
  const policyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID || "";
  
  if (!apiKey || !policyId) {
    throw new Error("Alchemy configuration missing (API Key or Policy ID)");
  }

  // 3. Create the Alchemy Smart Account Client (Modular Account / Light Account)
  const smartAccountClient = await createModularAccountAlchemyClient({
    apiKey,
    chain: monadTestnet,
    signer: privySigner,
    gasManagerConfig: {
      policyId,
    }
  });

  return smartAccountClient;
}
