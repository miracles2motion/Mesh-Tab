"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sounds } from "../../lib/sounds";
import { usePrivy } from "@privy-io/react-auth";
import { setWorkspaceMode } from "../../lib/user";

export function TestnetLoginButton() {
  const router = useRouter();
  const { login, authenticated, ready } = usePrivy();

  const handleTestnetLogin = () => {
    sounds.playClick();
    if (authenticated) {
      const hasProfile = typeof window !== "undefined" && Boolean(localStorage.getItem("meshTab_displayName"));
      if (!hasProfile) {
        router.push("/onboarding?fresh=true");
      } else {
        setWorkspaceMode("testnet");
        router.push("/home");
      }
    } else {
      router.push("/login");
    }
  };

  return (
    <button 
      onClick={handleTestnetLogin}
      className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-white/90 text-sm font-semibold backdrop-blur-sm cursor-pointer"
    >
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span>{authenticated ? "Enter App" : "Explore Testnet (Live)"}</span>
    </button>
  );
}
