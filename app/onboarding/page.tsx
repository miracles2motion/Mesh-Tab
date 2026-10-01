"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  User, 
  Fingerprint, 
  CheckCircle2, 
  Key, 
  ShieldCheck, 
  Loader2, 
  Sparkles,
  Home,
  PlusCircle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { ThemeToggle } from "../../components/theme-toggle";
import { saveStoredUser, AVATAR_COLORS, saveBuddySettings, setWorkspaceMode } from "../../lib/user";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import Image from "next/image";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { encodeFunctionData } from "viem";
import { getAlchemySmartAccountClient } from "../../lib/alchemy";

const MockAUSD_ABI = [
  {
    "inputs": [],
    "name": "claimWelcomeBonus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'MONAD', symbol: 'MONAD', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] } }
} as const;
function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvite = searchParams.get("invite") === "true";
  const inviteTab = searchParams.get("tab");
  const isFresh = searchParams.get("fresh") === "true";
  const { user, linkPasskey } = usePrivy();
  const { wallets } = useWallets();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Passkey enrollment
  const [isScanningPasskey, setIsScanningPasskey] = useState(false);
  const [passkeyDone, setPasskeyDone] = useState(false);

  // Step 2: Name & Color
  const [name, setName] = useState("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [enableBuddy, setEnableBuddy] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickNames = ["Sarah", "Alex", "Liam", "Elena", "Marcus"];

  const handleContinueName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    sounds.playClick();

    const finalName = name.trim();
    const result = await saveStoredUser(finalName, selectedColorIdx, user?.wallet?.address);
    if (result.error) {
      toast.error("Error", { description: result.error });
      setIsSubmitting(false);
      return;
    }
    
    saveBuddySettings({
      enabled: enableBuddy,
      name: `${finalName}'s Buddy`,
      color: AVATAR_COLORS[selectedColorIdx]
    });

    if (isFresh) {
      setWorkspaceMode("testnet");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("meshTab-tabs-update"));
      }
    } else {
      setWorkspaceMode("sample");
    }

    setIsSubmitting(false);
    setStep(2); // Move to Passkey step
  };

  const handleEnrollPasskey = async () => {
    if (isScanningPasskey || passkeyDone) return;
    setIsScanningPasskey(true);
    sounds.playClick();

    toast.info("Setting Up Passkey", {
      description: "Requesting Touch ID / Face ID biometric registration..."
    });

    try {
      if (linkPasskey) {
        await linkPasskey();
        setIsScanningPasskey(false);
        setPasskeyDone(true);
        sounds.playSuccessChime();

        toast.success("Passkey Registered", {
          description: "Secured in your device's biometric vault for 1-tap sign in."
        });

        setTimeout(() => {
          finishOnboarding();
        }, 500);
      } else {
        throw new Error("Passkey linking not available");
      }
    } catch (error) {
      console.error(error);
      setIsScanningPasskey(false);
      toast.error("Passkey Setup Cancelled", {
        description: "You can set this up later in settings."
      });
      // Optionally don't auto-finish if they cancel, let them click skip
    }
  };

  const skipPasskey = () => {
    finishOnboarding();
  };

  const finishOnboarding = async () => {
    setStep(3);

    // Trigger Welcome Bonus Gasless Transaction
    toast.info("Funding Smart Account", { description: "Minting 5,000 AUSD welcome bonus via Alchemy Paymaster..." });
    try {
      const privyWallet = wallets.find(w => w.walletClientType === 'privy');
      if (privyWallet) {
        const smartAccountClient = await getAlchemySmartAccountClient(privyWallet);

        // Call the smart contract silently (Alchemy pays gas)
        await smartAccountClient.sendUserOperation({
          uo: {
            target: process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS as `0x${string}`,
            data: encodeFunctionData({
              abi: MockAUSD_ABI,
              functionName: "claimWelcomeBonus",
              args: []
            })
          }
        });

        // Short delay to let the TX broadcast smoothly
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (err) {
      console.warn("Welcome bonus failed or already claimed:", err);
      // We don't block onboarding if this fails, they might be logging in again
    }

    sounds.playSuccessChime();
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    if (isInvite && inviteTab) {
      router.push(`/tab/${inviteTab}?invite=true`);
    } else {
      setWorkspaceMode("testnet");
      router.push("/home");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-y-auto py-12 transition-colors duration-300">
      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20 blur-[100px] rounded-full pointer-events-none transition-colors duration-500 ${AVATAR_COLORS[selectedColorIdx]}`} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-3xl relative z-10 shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {/* STEP 1: Name & Color Selection */}
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleContinueName}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full ${AVATAR_COLORS[selectedColorIdx]} text-white flex items-center justify-center font-bold text-2xl mx-auto mb-3 shadow-md transition-colors`}>
                  {name.trim() ? name.trim()[0].toUpperCase() : "U"}
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  Choose Your Identity
                </h1>
                <p className="text-slate-500 dark:text-white/60 text-xs">
                  Set up your display name and personal avatar color.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/80 ml-1 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Sarah, Alex, or your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-base font-semibold"
                />

                {/* Quick Name Chips */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[11px] text-slate-400 dark:text-white/40 font-medium">Quick Pick:</span>
                  {quickNames.map(qName => (
                    <button
                      key={qName}
                      type="button"
                      onClick={() => {
                        setName(qName);
                        sounds.playClick();
                      }}
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                        name === qName 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
                      }`}
                    >
                      {qName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-white/80 ml-1 uppercase tracking-wider">
                  Avatar Theme Color
                </label>
                <div className="flex items-center gap-3 justify-between p-2 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  {AVATAR_COLORS.map((color, idx) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColorIdx(idx);
                        sounds.playClick();
                      }}
                      className={`w-9 h-9 rounded-full ${color} transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        selectedColorIdx === idx 
                          ? "ring-2 ring-indigo-600 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-[#121212] scale-110 shadow-sm" 
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {selectedColorIdx === idx && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* MeshBuddy Opt-In Toggle */}
              <div className="p-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Enable MeshBuddy</span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.2 rounded-full border border-indigo-500/20">AI</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-white/50">Smart tips, netting suggestions & co-pilot</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableBuddy(!enableBuddy)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    enableBuddy ? "bg-indigo-600" : "bg-slate-300 dark:bg-white/10"
                  }`}
                  aria-label="Toggle MeshBuddy"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      enableBuddy ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <Button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                variant="primary"
                size="lg"
                className="w-full group cursor-pointer"
                isLoading={isSubmitting}
              >
                Continue Setup
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.form>
          )}

          {/* STEP 2: Passkey Registration */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-200 dark:border-white/20">
                <Fingerprint className="w-8 h-8 text-slate-700 dark:text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  Create Passkey
                </h1>
                <p className="text-slate-500 dark:text-white/60 text-xs md:text-sm">
                  Register your device for instant, passwordless sign-ins.
                </p>
              </div>

              <div className="py-4 flex flex-col items-center">
                <div
                  onClick={handleEnrollPasskey}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                    passkeyDone
                      ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600"
                      : isScanningPasskey
                      ? "bg-indigo-500/20 border-2 border-indigo-500 text-indigo-600 animate-pulse"
                      : "bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:scale-105"
                  }`}
                >
                  {passkeyDone ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  ) : isScanningPasskey ? (
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  ) : (
                    <Fingerprint className="w-12 h-12" />
                  )}
                </div>

                <span className="text-xs font-semibold text-slate-600 dark:text-white/60 mt-3">
                  {passkeyDone 
                    ? "Passkey Enrolled!" 
                    : isScanningPasskey 
                    ? "Scanning biometric sensor..." 
                    : "Tap Sensor to Register Passkey"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/5 border border-indigo-200/70 dark:border-indigo-500/20 flex items-center gap-2.5 text-xs text-left text-slate-600 dark:text-white/70">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Protected by your device hardware. Zero passwords required.</span>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleEnrollPasskey}
                  disabled={isScanningPasskey || passkeyDone}
                  variant="primary"
                  size="lg"
                  className="w-full cursor-pointer"
                >
                  {isScanningPasskey ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Enrolling Passkey...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Key className="w-4 h-4" /> Enroll Passkey (Touch ID / Face ID)
                    </span>
                  )}
                </Button>
                
                <button
                  type="button"
                  onClick={skipPasskey}
                  disabled={isScanningPasskey}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white transition-colors py-2 cursor-pointer"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Smart Account Genesis on Monad */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="relative w-20 h-20">
                <Loader2 className="w-20 h-20 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-500" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  Setting Up Your Account
                </h2>
                <p className="text-slate-500 dark:text-white/50 text-xs max-w-xs mx-auto">
                  Securing your passkey with biometric protection and instant network sync...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a]" />}>
      <OnboardingContent />
    </Suspense>
  );
}
