import { createModularAccountAlchemyClient, defineAlchemyChain } from "@alchemy/aa-alchemy";
import { WalletClientSigner } from "@alchemy/aa-core";
import { createWalletClient, custom } from "viem";

export const monadTestnet = defineAlchemyChain({
  chain: {
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: { name: 'MONAD', symbol: 'MONAD', decimals: 18 },
    rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] } }
  },
  rpcBaseUrl: `https://monad-testnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ''}`
});

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem version mismatch between project and aa-core internals
  const privySigner = new WalletClientSigner(privyClient as any, "privy");
  
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
