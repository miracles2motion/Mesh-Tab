
import { createMultiOwnerModularAccount, multiOwnerPluginActions, pluginManagerActions, accountLoupeActions } from "@alchemy/aa-accounts";
import { alchemyGasManagerMiddleware } from "@alchemy/aa-alchemy";
import { createSmartAccountClient, createBundlerClient, WalletClientSigner } from "@alchemy/aa-core";
import { createWalletClient, custom, http, defineChain, type Chain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MONAD', symbol: 'MONAD', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] },
  },
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
