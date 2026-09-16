"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import Image from "next/image";

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
    
    // Simulate New vs Returning user for demonstration
    const isNewUser = Math.random() > 0.5;
    if (isNewUser) {
      router.push(`/onboarding${isInvite ? `?invite=true&tab=${inviteTab}` : ""}`);
    } else {
      router.push(isInvite ? `/tab/${inviteTab}?invite=true` : "/home");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white/5 border border-white/10 p-8 rounded-3xl relative z-10 shadow-2xl flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
          <Fingerprint className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-white/60 text-sm mb-8">Sign in securely using your device passkey. No passwords required.</p>

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
      </motion.div>

      {/* Powered by Mera branding in bottom left */}
      <div className="fixed bottom-6 left-6 flex items-center gap-2 text-white/40 text-xs font-medium">
        <span>Powered by</span>
        <div className="opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <Image src="/logos/mera.svg" alt="Mera" width={60} height={20} />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <LoginContent />
    </Suspense>
  );
}
