"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";

import { ThemeToggle } from "../../components/theme-toggle";
import { setWorkspaceMode, saveStoredUser } from "../../lib/user";

import { usePrivy, useLogin, useLoginWithPasskey } from "@privy-io/react-auth";
import { toast } from "sonner";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, login } = usePrivy();
  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: ({ user, isNewUser }) => {
      handleComplete(user, isNewUser);
    },
    onError: (error) => {
      console.log("Passkey login failed or cancelled", error);
      toast.error("Passkey Not Recognized", {
        description: "Your passkey couldn't be validated. You may need to sign in with email first."
      });
      // Disable hadPasskey so the next click opens the normal modal
      localStorage.setItem("mesh_last_passkey_status", "false");
      setHadPasskey(false);
    }
  });

  const [hadPasskey, setHadPasskey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check if they had a passkey configured previously on this device
    const savedStatus = localStorage.getItem("mesh_last_passkey_status");
    if (savedStatus === "true") {
      setHadPasskey(true);
    }
  }, []);

  const isInvite = searchParams.get("invite") === "true";
  const inviteTab = searchParams.get("tab");
  const intent = searchParams.get("intent");

  const handleComplete = async (user: any, isNewUser: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mesh_explicit_logout");
      sessionStorage.removeItem("mesh_just_logged_out");
    }
    let hasProfile = typeof window !== "undefined" && Boolean(localStorage.getItem("meshTab_displayName"));
    
    // Redis Sync: If they are not a new user but have no local profile (cleared site data)
    if (!hasProfile && !isNewUser && user?.wallet?.address) {
      setIsVerifying(true);
      try {
        const res = await fetch(`/api/user/profile?wallet=${user.wallet.address}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.name) {
            localStorage.setItem("meshTab_displayName", data.name.trim());
            localStorage.setItem("meshTab_avatarColorIndex", String(data.avatarColorIndex));
            window.dispatchEvent(new Event("meshTab-profile-update"));
            hasProfile = true;
          }
        }
      } catch (err) {
        console.error("Failed to verify existing profile", err);
      } finally {
        setIsVerifying(false);
      }
    }

    if (!hasProfile || isNewUser) {
      // If no profile, they must onboard into the live Web3 app
      router.push("/onboarding?fresh=true&intent=testnet");
    } else {
      // Successful login always drops them into the live Web3 app
      setWorkspaceMode("testnet");
      
      if (isInvite) {
        router.push(`/tab/${inviteTab}?invite=true`);
      } else {
        router.push("/home");
      }
    }
  };

  useLogin({
    onComplete: ({ user, isNewUser }) => {
      handleComplete(user, isNewUser);
    },
  });

  const handleLogin = () => {
    if (hadPasskey) {
      loginWithPasskey();
    } else {
      login();
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-y-auto py-12 transition-colors duration-300">
      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-3xl relative z-10 shadow-2xl flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
          <Fingerprint className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Secure Login</h1>
        <div className="space-y-4 mb-8">
          <p className="text-slate-500 dark:text-white/60 text-sm">Sign in to access your shared tabs and synchronize your identity.</p>
          <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 p-3.5 rounded-2xl text-xs text-left leading-relaxed">
            <strong className="block mb-1">New to Mesh Tab?</strong>
            Start with Google or Email. Please <strong>do not</strong> click the blue &quot;I have a passkey&quot; link until you&apos;ve registered one inside!
          </div>
        </div>

        <Button
          onClick={handleLogin}
          disabled={!ready || authenticated || isVerifying}
          variant="primary"
          size="lg"
          className="w-full relative overflow-hidden bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {(!ready) ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Initializing...
            </span>
          ) : isVerifying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Verifying Profile...
            </span>
          ) : (
            "Sign In Securely"
          )}
        </Button>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a]" />}>
      <LoginContent />
    </Suspense>
  );
}
