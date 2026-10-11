"use client";

import { useState, useEffect, Suspense } from "react";
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
import { saveStoredUser, AVATAR_COLORS, saveBuddySettings, setWorkspaceMode, getWorkspaceMode, getStoredTabMembers, saveStoredTabMembers, saveNewTab } from "../../lib/user";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvite = searchParams.get("invite") === "true";
  const inviteTab = searchParams.get("tab");
  const isFresh = searchParams.get("fresh") === "true";
  const intent = searchParams.get("intent");
  const { user, linkPasskey, getAccessToken } = usePrivy();
  const { client } = useSmartWallets();
  const smartWalletAddress = client?.account?.address || user?.wallet?.address;
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
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  // Auto-restore profile if user already configured their account on another device
  useEffect(() => {
    const effectiveWallet = smartWalletAddress || user?.wallet?.address;
    if (!effectiveWallet) {
      setIsCheckingProfile(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/user/profile?wallet=${effectiveWallet}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled) return;
        setIsCheckingProfile(false);

        if (data && data.name) {
          // Existing user detected: restore profile & buddy settings
          localStorage.setItem("meshTab_displayName", data.name.trim());
          localStorage.setItem("meshTab_avatarColorIndex", String(data.avatarColorIndex ?? 0));
          if (data.buddySettings) {
            localStorage.setItem("meshTab_buddySettings", JSON.stringify(data.buddySettings));
            window.dispatchEvent(new Event("meshTab-buddy-update"));
          }
          if (data.developerMode !== undefined) {
            localStorage.setItem("meshTab_developerMode", String(data.developerMode));
            localStorage.setItem("meshTab_showAddress", String(data.developerMode));
            window.dispatchEvent(new Event("meshTab-developerMode-change"));
            window.dispatchEvent(new Event("meshTab-settings-update"));
          }
          if (data.theme) {
            localStorage.setItem("meshTab_theme", data.theme);
            window.dispatchEvent(new Event("meshTab-theme-change"));
          }
          window.dispatchEvent(new Event("meshTab-profile-update"));

          setWorkspaceMode(intent === "testnet" ? "testnet" : "sample");

          toast.success(`Welcome back, ${data.name.trim()}!`, {
            description: "Your profile and MeshBuddy settings have been restored."
          });

          if (isInvite && inviteTab) {
            // Commit returning user to invited tab on Monad Testnet
            (async () => {
              try {
                const token = (await getAccessToken()) || "";
                const joinCode = inviteTab.includes("-") ? inviteTab.split("-").pop() : inviteTab.slice(-8);
                const joinRes = await fetch("/api/tab/join", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": token ? `Bearer ${token}` : ""
                  },
                  body: JSON.stringify({
                    tabId: inviteTab,
                    joinCode,
                    name: data.name.trim(),
                    mode: "testnet",
                    walletAddress: effectiveWallet && /^0x[a-fA-F0-9]{40}$/.test(effectiveWallet) ? effectiveWallet : undefined
                  })
                });

                if (joinRes.ok) {
                  const tabName = searchParams?.get("n") || inviteTab.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const members = getStoredTabMembers(inviteTab);
                  const existing = members.find(m => m.name.toLowerCase() === data.name.trim().toLowerCase());
                  let updatedMembers = members;
                  if (!existing) {
                    updatedMembers = [...members, {
                      name: data.name.trim(),
                      balance: 0,
                      type: "settled",
                      role: "member",
                      walletAddress: effectiveWallet || undefined
                    }];
                  }
                  saveStoredTabMembers(inviteTab, updatedMembers);
                  saveNewTab({
                    id: inviteTab,
                    name: tabName,
                    role: "Member",
                    balance: 0,
                    memberCount: updatedMembers.length,
                    createdAt: Date.now(),
                    lastActivityAt: Date.now(),
                    lastActivityKind: "joined"
                  });
                  router.replace(`/tab/${inviteTab}`);
                  return;
                } else if (joinRes.status === 404) {
                  toast.error("Tab Not Found on Testnet", {
                    description: "This tab does not exist on Monad Testnet. Demo tabs are stored only on their local device."
                  });
                  router.replace("/home");
                  return;
                }
              } catch (e) {
                console.error("Failed to commit returning user to tab", e);
              }
              router.replace(`/tab/${inviteTab}`);
            })();
          } else {
            router.replace("/home");
          }
        }
      })
      .catch(() => {
        if (!cancelled) setIsCheckingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [smartWalletAddress, user?.wallet?.address, isInvite, inviteTab, intent, router]);

  const handleContinueName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    sounds.playClick();

    const finalName = name.trim();
    let authToken = "";
    try {
      authToken = (await getAccessToken()) || "";
    } catch {}
    const result = await saveStoredUser(finalName, selectedColorIdx, smartWalletAddress, authToken || undefined);
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

    if (intent === "testnet") {
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
      const mode = intent === "testnet" ? "testnet" : getWorkspaceMode();
      if (mode === "testnet") {
        try {
          const token = (await getAccessToken()) || "";
          const effectiveWallet = smartWalletAddress || user?.wallet?.address;
          const joinCode = inviteTab.includes("-") ? inviteTab.split("-").pop() : inviteTab.slice(-8);
          const finalName = name.trim();

          const joinRes = await fetch("/api/tab/join", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token ? `Bearer ${token}` : ""
            },
            body: JSON.stringify({
              tabId: inviteTab,
              joinCode,
              name: finalName,
              mode: "testnet",
              walletAddress: effectiveWallet && /^0x[a-fA-F0-9]{40}$/.test(effectiveWallet) ? effectiveWallet : undefined
            })
          });

          if (!joinRes.ok) {
            const errData = await joinRes.json().catch(() => ({}));
            if (joinRes.status === 404 || errData.error === "NOT_FOUND") {
              toast.error("Tab Not Found on Testnet", {
                description: "This tab does not exist on Monad Testnet. Demo tabs are stored only on their local device."
              });
              router.replace("/home");
              return;
            }
          } else {
            const tabName = searchParams?.get("n") || inviteTab.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const members = getStoredTabMembers(inviteTab);
            const existing = members.find(m => m.name.toLowerCase() === finalName.toLowerCase());
            let updatedMembers = members;
            if (!existing) {
              updatedMembers = [...members, {
                name: finalName,
                balance: 0,
                type: "settled",
                role: "member",
                walletAddress: effectiveWallet || undefined
              }];
            }
            saveStoredTabMembers(inviteTab, updatedMembers);
            saveNewTab({
              id: inviteTab,
              name: tabName,
              role: "Member",
              balance: 0,
              memberCount: updatedMembers.length,
              createdAt: Date.now(),
              lastActivityAt: Date.now(),
              lastActivityKind: "joined"
            });
            toast.success("Joined Group Tab!", {
              description: `Welcome to ${tabName}, ${finalName}!`
            });
            router.replace(`/tab/${inviteTab}`);
            return;
          }
        } catch (e) {
          console.error("Failed to commit new user to tab during onboarding", e);
        }
      }
      router.replace(`/tab/${inviteTab}`);
    } else {
      if (intent === "testnet") setWorkspaceMode("testnet");
      router.replace("/home");
    }
  };

  if (isCheckingProfile && (smartWalletAddress || user?.wallet?.address)) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Restoring profile & buddy settings...</p>
        </div>
      </div>
    );
  }

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
