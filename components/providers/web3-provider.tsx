"use client";

import { ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { SecurityProvider } from "./security-provider";
import { monadTestnet } from "../../lib/chains";

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Initial check
    const checkTheme = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(checkTheme());

    // Observe changes to the html class for dark mode toggles
    const observer = new MutationObserver(() => setTheme(checkTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  return (
      <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: theme, // Dynamically syncs with app's light/dark mode!
          accentColor: '#4f46e5', // The true MeshTab brand primary color (indigo-600)
          logo: 'https://imagedelivery.net/oHBRUd2clqykxgDWmeAyLg/23967a44-79df-4671-a90f-90bff2e89b00/icon',
          walletList: ['metamask', 'rainbow', 'wallet_connect_qr'],
          walletChainType: 'ethereum-only',
        },
        loginMethods: ['email', 'google', 'discord'],
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          }
        },
        externalWallets: {
          solana: {
            connectors: []
          }
        }
      }}
    >
      <SmartWalletsProvider>
        <QueryClientProvider client={queryClient}>
          <SecurityProvider>
            {children}
          </SecurityProvider>
        </QueryClientProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
