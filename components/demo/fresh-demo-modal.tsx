"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Fingerprint, 
  CheckCircle2, 
  User, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Key, 
  Loader2, 
  X,
  PlusCircle,
  Home
} from "lucide-react";
import { Modal } from "../ui/modal";
import { AVATAR_COLORS, saveStoredUser, saveBuddySettings, setWorkspaceMode } from "../../lib/user";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import Image from "next/image";

interface FreshDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FreshDemoModal({ isOpen, onClose }: FreshDemoModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Passkey Simulation State
  const [isScanning, setIsScanning] = useState(false);
  const [passkeyEnrolled, setPasskeyEnrolled] = useState(false);

  // Step 2: User Profile State
  const [name, setName] = useState("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [enableBuddy, setEnableBuddy] = useState(true);

  // Quick name chips for easy tapping during presentations
  const quickNames = ["Sarah", "Alex", "Liam", "Elena", "Jordan"];

  if (!isOpen) return null;

  // Handler for Step 1: Simulated WebAuthn Passkey Registration
  const handleScanPasskey = async () => {
    if (isScanning || passkeyEnrolled) return;
    setIsScanning(true);
    sounds.playClick();

    toast.info("WebAuthn Prompt", {
      description: "Requesting Touch ID / Face ID hardware passkey creation..."
    });

    // Simulate 1.6s biometric verification
    await new Promise(r => setTimeout(r, 1600));

    setIsScanning(false);
    setPasskeyEnrolled(true);
    sounds.playSuccessChime();

    toast.success("Passkey Created & Bound", {
      description: "Cryptographic P-256 hardware keypair generated on device."
    });

    // Automatically transition to profile customization step
    setTimeout(() => {
      setStep(2);
    }, 600);
  };

  // Handler for Step 2 -> Step 3: Deploy Smart Account on Monad
  const handleProceedToDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || "Guest User";
    setStep(3);
    sounds.playClick();

    // 1. Save user profile
    saveStoredUser(finalName, selectedColorIdx);
    saveBuddySettings({
      enabled: enableBuddy,
      name: `${finalName}'s Buddy`,
      color: AVATAR_COLORS[selectedColorIdx]
    });

    // 2. Switch to clean slate mode
    setWorkspaceMode("blank");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("meshTab-tabs-update"));
      window.dispatchEvent(new Event("meshTab-profile-update"));
    }

    // 3. Simulate Smart Account Genesis on Monad
    await new Promise(r => setTimeout(r, 1800));

    setStep(4);
    sounds.playSuccessChime();

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore if canvas unavailable
    }
  };

  const handleLaunchCreateTab = () => {
    sounds.playClick();
    if (typeof window !== "undefined") {
      localStorage.removeItem("mesh_explicit_logout");
      sessionStorage.removeItem("mesh_just_logged_out");
    }
    onClose();
    router.replace("/tab/new");
  };

  const handleLaunchHub = () => {
    sounds.playClick();
    if (typeof window !== "undefined") {
      localStorage.removeItem("mesh_explicit_logout");
      sessionStorage.removeItem("mesh_just_logged_out");
    }
    onClose();
    router.replace("/home");
  };

  return (
    <Modal onClose={onClose} hideCloseButton={true} size="2xl" className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl text-slate-900 dark:text-white shadow-2xl relative overflow-hidden">
      <div className="p-6 md:p-10 h-full flex flex-col">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            Real-Time User Simulation
          </span>
          <span className="text-xs text-slate-500 dark:text-white/40 font-medium">
            Step {step} of 4
          </span>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Passkey Biometric Simulation */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 text-center"
          >
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create Your Device Passkey
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-white/60 mt-1">
                MeshTab uses WebAuthn passkeys. No passwords, no seed phrases, no private keys to manage.
              </p>
            </div>

            {/* Interactive Biometric Sensor Graphic */}
            <div className="py-6 flex flex-col items-center justify-center">
              <div 
                onClick={handleScanPasskey}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all cursor-pointer select-none shadow-lg ${
                  passkeyEnrolled
                    ? "bg-emerald-500/15 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : isScanning
                    ? "bg-indigo-500/20 border-2 border-indigo-500 text-indigo-600 animate-pulse scale-105"
                    : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border-2 border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:scale-105"
                }`}
                title="Click to authenticate passkey"
              >
                {/* Ambient pulse rings during scan */}
                {isScanning && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-75" />
                    <div className="absolute -inset-3 rounded-full border border-indigo-400 animate-pulse opacity-40" />
                  </>
                )}

                {passkeyEnrolled ? (
                  <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                ) : isScanning ? (
                  <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
                ) : (
                  <Fingerprint className="w-14 h-14" />
                )}
              </div>

              <span className="text-xs font-bold text-slate-600 dark:text-white/70 mt-4">
                {passkeyEnrolled 
                  ? "✓ Passkey Enrolled (Hardware P-256)" 
                  : isScanning 
                  ? "Scanning Touch ID / Face ID sensor..." 
                  : "Tap Sensor to Register Passkey"}
              </span>
            </div>

            {/* Security Guarantee Box */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/5 border border-indigo-200/70 dark:border-indigo-500/20 flex items-center gap-3 text-left text-xs">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="text-slate-600 dark:text-white/70 leading-relaxed">
                Cryptographic signatures are signed inside your phone or laptop&apos;s Secure Enclave.
              </div>
            </div>

            <button
              type="button"
              onClick={handleScanPasskey}
              disabled={isScanning || passkeyEnrolled}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enrolling Hardware Key...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Enroll Passkey (Touch ID / Face ID)</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* STEP 2: Profile Customization (Name & Avatar Color) */}
        {step === 2 && (
          <motion.form
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleProceedToDeployment}
            className="space-y-8"
          >
            <div className="text-center">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full ${AVATAR_COLORS[selectedColorIdx]} text-white flex items-center justify-center font-bold text-3xl mx-auto mb-4 shadow-lg transition-colors`}>
                {name.trim() ? name.trim()[0].toUpperCase() : "U"}
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Choose Your Identity
              </h2>
              <p className="text-sm text-slate-500 dark:text-white/60 mt-1">
                What should your friends see when you split bills?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-left">
              {/* Name Input */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-white/80 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Sarah, Alex, or your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={24}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-semibold text-lg"
                />

                {/* Quick Suggestion Chips */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-xs text-slate-400 dark:text-white/40 font-medium">Quick Pick:</span>
                  {quickNames.map(qName => (
                    <button
                      key={qName}
                      type="button"
                      onClick={() => {
                        setName(qName);
                        sounds.playClick();
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer hover:-translate-y-0.5 ${
                        name === qName 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                          : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
                      }`}
                    >
                      {qName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Color Picker */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-white/80 uppercase tracking-wider">
                  Avatar Theme Color
                </label>
                <div className="grid grid-cols-6 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
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
            </div>

            {/* MeshBuddy Co-Pilot Opt-in - Spans both columns on desktop */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="text-left text-sm">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Enable MeshBuddy Co-Pilot</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-bold">AI</span>
                </div>
                <div className="text-slate-500 dark:text-white/50 text-xs mt-0.5">
                  Provides proactive netting advice and instant help
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEnableBuddy(!enableBuddy)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  enableBuddy ? "bg-indigo-600" : "bg-slate-300 dark:bg-white/10"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  enableBuddy ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="md:col-span-2 w-full py-4 md:py-5 md:text-lg rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <span>Continue with {name.trim() || "Chosen Persona"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.form>
        )}

        {/* STEP 3: Smart Account Genesis on Monad */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="py-8 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="relative w-20 h-20">
              <Loader2 className="w-20 h-20 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Setting Up Your Account
              </h2>
              <p className="text-xs text-slate-500 dark:text-white/60 max-w-xs mx-auto leading-relaxed">
                Securing account with Face ID / Touch ID • Enabling instant ledger sync...
              </p>
            </div>

            <div className="space-y-2 w-full max-w-xs text-left text-xs bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 font-mono">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Passkey registered securely</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Instant settlement network connected</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Zero-fee account protection active...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Success & Launch Options */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center py-2"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Welcome, {name.trim()}! 🎉
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-white/70 mt-1 max-w-sm mx-auto leading-relaxed">
                Your fresh persona and pristine Clean Slate workspace are ready. How would you like to start?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleLaunchCreateTab}
                className="p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Create First Group Tab</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchHub}
                className="p-4 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home className="w-5 h-5" />
                <span>Enter Clean Hub</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </Modal>
  );
}
