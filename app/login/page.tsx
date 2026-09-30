"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";

import { ThemeToggle } from "../../components/theme-toggle";
import { setWorkspaceMode, saveStoredUser } from "../../lib/user";

import { usePrivy, useLogin } from "@privy-io/react-auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated } = usePrivy();

  const isInvite = searchParams.get("invite") === "true";
  const inviteTab = searchParams.get("tab");

  const { login } = useLogin({
    onComplete: ({ user, isNewUser }) => {
      // Lock in sample mode during demo phase so Lisbon Weekend & demo data are loaded
      if (typeof window !== "undefined" && localStorage.getItem("meshTab_workspaceMode") !== "blank") {
        setWorkspaceMode("sample");
      }

      const hasProfile = typeof window !== "undefined" && Boolean(localStorage.getItem("meshTab_displayName"));
      if (!hasProfile || isNewUser) {
        router.push("/onboarding?fresh=true");
      } else {
        router.push(isInvite ? `/tab/${inviteTab}?invite=true` : "/home");
      }
    },
  });

  const handleLogin = () => {
    login();
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
        <p className="text-slate-500 dark:text-white/60 text-sm mb-8">Sign in to access your shared tabs and synchronize your identity.</p>

        <Button
          onClick={handleLogin}
          disabled={!ready || authenticated}
          variant="primary"
          size="lg"
          className="w-full relative overflow-hidden bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {(!ready) ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Initializing...
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
