import { createModularAccountAlchemyClient, defineAlchemyChain } from "@alchemy/aa-alchemy";
import { WalletClientSigner } from "@alchemy/aa-core";
import { createWalletClient, custom, type Chain } from "viem";

// Build the Alchemy-compatible chain via their SDK helper.
// `defineAlchemyChain` stamps the object so their internal Zod schema accepts it.
// We cast to `any` first, then to viem's `Chain` to bridge the version mismatch
// between @alchemy/aa-core's bundled viem and the project's own viem.
const alchemyMonad = defineAlchemyChain({
  chain: {
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: { name: 'MONAD', symbol: 'MONAD', decimals: 18 },
    rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] } }
  },
  rpcBaseUrl: `https://monad-testnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ''}`
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridge viem version gap
export const monadTestnet = alchemyMonad as any as Chain;

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
  // Pass the raw alchemyMonad (not the re-cast) so it keeps the alchemy rpcUrls stamp
  const smartAccountClient = await createModularAccountAlchemyClient({
    apiKey,
    chain: alchemyMonad,
    signer: privySigner,
    gasManagerConfig: {
      policyId,
    }
  });

  return smartAccountClient;
}
