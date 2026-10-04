"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sounds } from "../../lib/sounds";
import { usePrivy } from "@privy-io/react-auth";
import { setWorkspaceMode } from "../../lib/user";
import { useConnectivity } from "../../components/providers/connectivity-provider";

export function TestnetLoginButton() {
  const router = useRouter();
  const { login, authenticated, ready } = usePrivy();
  const { isEffectivelyOnline } = useConnectivity();

  const handleTestnetLogin = () => {
    sounds.playClick();
    if (authenticated) {
      const hasProfile = typeof window !== "undefined" && Boolean(localStorage.getItem("meshTab_displayName"));
      if (!hasProfile) {
        if (!isEffectivelyOnline) return; // need network to onboard
        router.push("/onboarding?fresh=true&intent=testnet");
      } else {
        setWorkspaceMode("testnet");
        router.push("/home");
      }
    } else {
      if (!isEffectivelyOnline) return; // need network to login
      router.push("/login?intent=testnet");
    }
  };

  return (
    <button 
      onClick={handleTestnetLogin}
      disabled={!authenticated && !isEffectivelyOnline}
      className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-full border transition-colors text-sm font-semibold backdrop-blur-sm cursor-pointer ${!authenticated && !isEffectivelyOnline ? 'border-white/10 text-white/50 bg-white/5 cursor-not-allowed' : 'border-white/20 hover:bg-white/10 text-white/90'}`}
    >
      <span className={`w-2 h-2 rounded-full ${!authenticated && !isEffectivelyOnline ? 'bg-slate-500' : 'bg-amber-400 animate-pulse'}`} />
      <span>{!authenticated && !isEffectivelyOnline ? "Offline" : authenticated ? "Enter App" : "Explore Testnet (Live)"}</span>
    </button>
  );
}
