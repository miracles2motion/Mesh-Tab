"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import Image from "next/image";
import { MeraLogo } from "../../components/ui/partner-logo";

import { ThemeToggle } from "../../components/theme-toggle";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const isInvite = searchParams.get("invite") === "true";
  const inviteTab = searchParams.get("tab");

  const handleLogin = async () => {
    setIsAuthenticating(true);
    // Mock Passkey / FaceID delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Check if user has an existing profile
    const hasProfile = typeof window !== "undefined" && Boolean(localStorage.getItem("meshTab_displayName"));
    if (!hasProfile) {
      router.push(`/onboarding${isInvite ? `?invite=true&tab=${inviteTab}` : ""}`);
    } else {
      router.push(isInvite ? `/tab/${inviteTab}?invite=true` : "/home");
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
        <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
          <Fingerprint className="w-8 h-8 text-slate-800 dark:text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
        <p className="text-slate-500 dark:text-white/60 text-sm mb-8">Sign in securely using your device passkey. No passwords required.</p>

        <Button
          onClick={handleLogin}
          disabled={isAuthenticating}
          variant="primary"
          size="lg"
          className="w-full relative overflow-hidden"
        >
          {isAuthenticating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Authenticating...
            </span>
          ) : (
            "Continue with Passkey"
          )}
        </Button>

        <div className="mt-5 pt-5 border-t border-slate-200/80 dark:border-white/10 w-full flex flex-col gap-2 text-xs">
          <Link
            href="/demo"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Start Fresh Demo or Explore Sandbox →
          </Link>
          <Link
            href="/onboarding?fresh=true"
            className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Create New Profile with Custom Name & Color
          </Link>
        </div>
      </motion.div>

      {/* Powered by Mera branding in bottom left */}
      <div className="fixed bottom-6 left-6 flex items-center gap-2 text-slate-500 dark:text-white/50 text-xs font-medium">
        <span>Powered by</span>
        <div className="opacity-90 hover:opacity-100 transition-all text-slate-800 dark:text-white">
          <MeraLogo className="h-5 w-auto" />
        </div>
      </div>
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
