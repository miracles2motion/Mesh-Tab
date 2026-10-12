"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Building2, 
  Zap, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  Plus, 
  ChevronRight,
  Sparkles,
  ArrowDownLeft,
  Check
} from "lucide-react";
import { 
  MonadLogo, 
  AgoraLogo, 
  PrivyLogo, 
  PimlicoLogo 
} from "@/components/ui/partner-logo";
import { 
  addSettledPayout, 
  topUpVirtualBalance, 
  useUserProfile,
  useWorkspaceMode,
  useDeveloperMode
} from "@/lib/user";
import { useAvailableBalance } from "@/lib/balance";
import { useRealAusdBalance, useClaimWelcomeBonus, useFaucetCooldown } from "@/lib/onchain";
import { addNotification } from "@/lib/notifications";
import { formatCurrency } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { fireFaucetConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { authenticateWithBiometrics } from "@/lib/biometrics";
import { usePrivy } from "@privy-io/react-auth";
import { PasskeyPromptModal, isPasskeyEnrolled } from "@/components/ui/passkey-prompt-modal";

interface AddFundsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amountCents: number) => void;
  suggestedAmountCents?: number;
  reason?: string;
}

type DepositMethod = "card" | "bank" | "gpay";

const STEPPER_STAGES = [
  {
    title: "Verifying Device Biometrics",
    desc: "Scanning Face ID / Touch ID Enclave...",
    devTitle: "Authenticating WebAuthn Keypair",
    devDesc: "Passkey credential cryptographic assertion..."
  },
  {
    title: "Connecting to Instant Rails",
    desc: "Establishing secure FedNow banking channel...",
    devTitle: "Sponsoring Gas via Paymaster",
    devDesc: "Pimlico ERC-4337 UserOp paymaster sponsorship..."
  },
  {
    title: "Authorizing Instant Deposit",
    desc: "Transfer clearing and settlement verification...",
    devTitle: "Broadcasting to Monad Testnet",
    devDesc: "Minting Agora AUSD via contract 0xd236c18D..."
  },
  {
    title: "Deposit Ready in Account",
    desc: "Balance updated and available immediately.",
    devTitle: "Block Finalized (800ms)",
    devDesc: "Sub-second Monad finality achieved • Tx confirmed."
  }
];

const QUICK_CHIPS = [
  { label: "+$25", value: 2500 },
  { label: "+$50", value: 5000 },
  { label: "+$100", value: 10000 },
  { label: "+$250", value: 25000 }
];

export function AddFundsDrawer({ isOpen, onClose, onSuccess, suggestedAmountCents, reason }: AddFundsDrawerProps) {
  const profile = useUserProfile();
  const { isDeveloperMode } = useDeveloperMode();
  const { isCooldownActive, secondsRemaining } = useFaucetCooldown();
  const { mode: workspaceMode } = useWorkspaceMode();
  const isTestnet = workspaceMode === "testnet";
  const { totalCents, heldCents, availableCents } = useAvailableBalance(profile.name || "David");
  const { balance: testnetBalance, refetch: refetchTestnetBalance } = useRealAusdBalance(workspaceMode);
  const { claimBonus, isClaiming: isTestnetClaiming, hasClaimed, checkHasClaimed } = useClaimWelcomeBonus(workspaceMode);
  const { user } = usePrivy();
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);

  const initialAmount = isTestnet 
    ? "10000.00" 
    : suggestedAmountCents && suggestedAmountCents > 0 
      ? (suggestedAmountCents / 100).toFixed(2) 
      : "100.00";

  const [amountStr, setAmountStr] = useState(initialAmount);
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod>("card");
  const [currentStep, setCurrentStep] = useState<"select" | "details" | "success">("select");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [lastDepositedCents, setLastDepositedCents] = useState(isTestnet ? 1000000 : 10000);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When drawer opens, reset step and prefill exact shortage if provided
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("select");
      setIsProcessing(false);
      setProcessingStage(0);
      if (isTestnet) {
        setAmountStr("10000.00");
        checkHasClaimed();
      } else if (suggestedAmountCents && suggestedAmountCents > 0) {
        setAmountStr((suggestedAmountCents / 100).toFixed(2));
      } else {
        setAmountStr("100.00");
      }
    }
  }, [isOpen, isTestnet, suggestedAmountCents, checkHasClaimed]);

  // Compute integer cents from input string or 10k on testnet
  const parsedFloat = parseFloat(amountStr) || 0;
  const depositCents = isTestnet ? 1000000 : Math.max(0, Math.round(parsedFloat * 100));
  // Total Net Available Balance across all tabs (funds available to spend right now)
  const currentNetBalance = availableCents;
  const newProjectedBalance = currentNetBalance + depositCents;
  const isAlreadyAllocated = isTestnet && (hasClaimed || testnetBalance >= 100000);

  const handleChipClick = (centsToAdd: number) => {
    sounds.playClick();
    const currentCents = Math.round((parseFloat(amountStr) || 0) * 100);
    const updatedTotal = currentCents + centsToAdd;
    setAmountStr((updatedTotal / 100).toFixed(2));
  };

  const handleSelectMethod = (method: DepositMethod) => {
    sounds.playClick();
    setSelectedMethod(method);
    setCurrentStep("details");
  };

  const handleBackToMethods = () => {
    sounds.playClick();
    setCurrentStep("select");
  };

  const handleConfirmDeposit = async (opts?: { bypassBiometrics?: boolean } | React.MouseEvent) => {
    const bypassBiometrics = Boolean(opts && "bypassBiometrics" in opts && opts.bypassBiometrics);

    if (depositCents <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a deposit amount greater than $0." });
      return;
    }

    // Passkey Gate: on Testnet, check if user has an enrolled passkey or snoozed prompt
    const isSnoozed = typeof window !== "undefined" && localStorage.getItem("mesh_snooze_passkey_prompt") === "true";
    if (isTestnet && !isPasskeyEnrolled(user) && !isSnoozed && !bypassBiometrics) {
      setShowPasskeyPrompt(true);
      return;
    }

    // Prompt native device biometrics only if passkey is enrolled and not bypassed
    if (!bypassBiometrics && isPasskeyEnrolled(user)) {
      const authRes = await authenticateWithBiometrics("Authorize Instant Deposit");
      if (authRes.canceled) {
        toast.info("Deposit Canceled", { description: "Biometric authentication was canceled." });
        return;
      }
    }

    setIsProcessing(true);
    setProcessingStage(1);
    sounds.playClick();

    const t1 = setTimeout(() => setProcessingStage(2), 650);
    const t2 = setTimeout(() => setProcessingStage(3), 1400);

    try {
      if (isTestnet) {
        const { success, error } = await claimBonus();
        if (!success) {
          clearTimeout(t1);
          clearTimeout(t2);
          setIsProcessing(false);
          setProcessingStage(0);
          toast.error("Deposit Failed", { description: error || "Could not complete deposit." });
          return;
        }
        refetchTestnetBalance();
      } else {
        // Realistic multi-stage simulated timing
        await new Promise((r) => setTimeout(r, 2100));
        addSettledPayout(depositCents);
        topUpVirtualBalance(depositCents);
      }

      setProcessingStage(4);
      await new Promise((r) => setTimeout(r, 450));

      // Audio & celebratory feedback
      sounds.playCoinClink();
      fireFaucetConfetti();

      const methodLabel = 
        selectedMethod === "card" ? "Visa Platinum Debit" :
        selectedMethod === "bank" ? "Chase Checking (FedNow)" : 
        "Google Pay";

      // In-app activity notification
      try {
        addNotification({
          type: "faucet",
          title: isDeveloperMode && isTestnet ? "Testnet Deposit Received" : "Deposit Received",
          desc: `Added ${formatCurrency(depositCents)} via ${methodLabel}.`,
          actor: "You",
          amount: depositCents,
          link: "/home"
        });
      } catch {}

      toast.success("Deposit Successful!", {
        description: `Added ${formatCurrency(depositCents)} to your account balance.`
      });

      setLastDepositedCents(depositCents);
      setIsProcessing(false);
      setProcessingStage(0);
      setCurrentStep("success");
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsProcessing(false);
      setProcessingStage(0);
      toast.error("Deposit Failed", { description: err?.message || "An unexpected error occurred." });
    }
  };

  const handleClose = () => {
    if (currentStep === "success" && onSuccess) {
      onSuccess(lastDepositedCents);
    }
    setCurrentStep("select");
    setIsProcessing(false);
    onClose();
  };

  return (
    <>
      <Sheet isOpen={isOpen && !isProcessing && currentStep !== "success"} onClose={handleClose} size="4xl">
      <div className="p-6 md:p-8 flex flex-col items-center bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        <AnimatePresence mode="wait">
          {/* CEILING ALLOCATED VIEW */}
          {isAlreadyAllocated ? (
            <motion.div
              key="allocation-active-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="py-6 flex flex-col items-center max-w-md mx-auto text-center"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 shadow-lg shadow-purple-500/10">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isDeveloperMode ? "Monad Testnet • Faucet Ceiling" : "Account Deposit Limit"}</span>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {isDeveloperMode ? "Faucet Ceiling Reached" : "Deposit Limit Reached"}
              </h3>
              <p className="text-slate-500 dark:text-white/60 text-sm mb-6 leading-relaxed">
                {isDeveloperMode ? (
                  <>Your wallet holds the maximum testnet allocation of <strong className="text-slate-900 dark:text-white font-semibold">$100,000.00 Agora AUSD</strong>.</>
                ) : (
                  <>Your account holds the maximum allocation of <strong className="text-slate-900 dark:text-white font-semibold">$100,000.00</strong>.</>
                )}
              </p>

              {/* Status details card */}
              <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 text-xs space-y-2.5 text-left">
                <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
                  <span>Available Balance:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(Math.round(testnetBalance * 100))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
                  <span>Settlement Asset:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isDeveloperMode ? "Agora AUSD (Digital USD)" : "US Dollars ($)"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
                  <span>Network:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {isDeveloperMode ? "Monad High-Speed Network" : "Instant Payment Rails"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
                  <span>Transfer Fee:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {isDeveloperMode ? "100% Free (Sponsored)" : "$0.00 (Zero Fees)"}
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleClose} 
                variant="primary" 
                size="lg"
                className="w-full h-12 font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
              >
                Got It
              </Button>
            </motion.div>
          ) : null}

          {/* STEP 1: SELECT METHOD & AMOUNT */}
          {!isAlreadyAllocated && currentStep === "select" && (
            <motion.div 
              key="select-step"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20 mx-auto">
                  <ArrowDownLeft className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {isTestnet ? "Official Agora Faucet Drip" : "Add Funds"}
                </h2>
                <p className="text-slate-500 dark:text-white/60 text-sm max-w-sm mx-auto">
                  {isTestnet 
                    ? "Claim $10,000.00 Agora AUSD from the official testnet faucet (1 claim per 60s, up to $100k ceiling)."
                    : "Instant account funding with zero fees, powered by Privy on-ramps."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {/* Left Column: Amount Input & Live Preview */}
                <div className="space-y-6">
                  {/* Amount Input Card */}
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                    <label className="text-slate-500 dark:text-white/40 font-semibold text-xs uppercase tracking-wider block mb-2">
                      {isTestnet ? "Allocation Amount (USD)" : "Deposit Amount (USD)"}
                    </label>

                    {suggestedAmountCents && suggestedAmountCents > 0 && !isTestnet && (
                      <div className="mb-3 p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs flex items-center justify-between text-indigo-800 dark:text-indigo-300">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{reason || "Shortage to Cover"}: <strong>{formatCurrency(suggestedAmountCents)}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setAmountStr((suggestedAmountCents / 100).toFixed(2));
                          }}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 underline cursor-pointer hover:opacity-80"
                        >
                          Reset to exact
                        </button>
                      </div>
                    )}

                    <div className="relative flex items-center">
                      <span className="text-3xl font-extrabold text-slate-400 dark:text-white/40 mr-2">$</span>
                      <input 
                        type="number"
                        step="any"
                        min="1"
                        max="10000"
                        value={isTestnet ? "10000.00" : amountStr}
                        disabled={isTestnet}
                        onChange={(e) => !isTestnet && setAmountStr(e.target.value)}
                        placeholder="100.00"
                        className={`w-full bg-transparent text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white focus:outline-none tabular-nums tracking-tight ${isTestnet ? "cursor-not-allowed opacity-90" : ""}`}
                      />
                    </div>

                    {/* Quick Adjustment Chips (Demo) or 1-Time Allocation Tag (Testnet) */}
                    {isTestnet ? (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Official Agora Testnet Allocation ($10,000.00 AUSD)</span>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        {suggestedAmountCents && suggestedAmountCents > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setAmountStr((suggestedAmountCents / 100).toFixed(2));
                            }}
                            className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                              depositCents === suggestedAmountCents
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/25"
                                : "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                            }`}
                          >
                            Exact ({formatCurrency(suggestedAmountCents)})
                          </button>
                        )}
                        {QUICK_CHIPS.map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => handleChipClick(chip.value)}
                            className="px-3 py-1.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white/80 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Balance Preview Card */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
                      <span>{isDeveloperMode && isTestnet ? "Current Available Monad AUSD:" : "Current Net Available Balance:"}</span>
                      <span className="font-semibold text-slate-800 dark:text-white font-mono">
                        {formatCurrency(currentNetBalance)}
                      </span>
                    </div>
                    {heldCents > 0 && !isTestnet && (
                      <div className="flex justify-between items-center text-slate-500 dark:text-white/50 text-[11px]">
                        <span>Reserved for Group Tab Debt:</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">
                          -{formatCurrency(heldCents)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-indigo-700 dark:text-indigo-300 font-bold">
                      <span>Projected Balance After Deposit:</span>
                      <span className="font-mono text-sm">
                        {formatCurrency(newProjectedBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Zero Fee Guarantee */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{isDeveloperMode ? "0% Deposit Fee • Sponsored by Pimlico Paymaster" : "0% Deposit Fee • Zero Network Charges"}</span>
                  </div>
                </div>

                {/* Right Column: Payment Methods List */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60 block mb-3">
                    Select Funding Method
                  </label>

                  <div className="space-y-3">
                    {/* Option 1: Instant Debit Card */}
                    <button
                      type="button"
                      onClick={() => handleSelectMethod("card")}
                      className="w-full p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all flex items-center justify-between group cursor-pointer shadow-sm text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                              Instant Debit Card
                            </h4>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-bold">
                              Instant
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                            {isDeveloperMode ? "Visa / Mastercard via Privy" : "Visa / Mastercard (Instant)"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* Option 2: Direct Bank Account (ACH / FedNow) */}
                    <button
                      type="button"
                      onClick={() => handleSelectMethod("bank")}
                      className="w-full p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all flex items-center justify-between group cursor-pointer shadow-sm text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                              Direct Bank Account
                            </h4>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                              FedNow
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                            {isDeveloperMode ? "Bank transfer via Bridge ACH" : "Instant ACH Bank Transfer"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* Option 3: Google Pay */}
                    <button
                      type="button"
                      onClick={() => handleSelectMethod("gpay")}
                      className="w-full p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all flex items-center justify-between group cursor-pointer shadow-sm text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                              Google Pay
                            </h4>
                            <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full font-bold">
                              1-Tap
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                            Fast device wallet checkout
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Partner Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-center gap-3 text-slate-400 dark:text-white/40 text-xs font-medium">
                {isDeveloperMode ? (
                  <>
                    <span>Infrastructure powered by</span>
                    <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity text-slate-700 dark:text-white/80">
                      <MonadLogo className="h-3.5 w-auto" />
                      <span className="text-slate-300 dark:text-white/20">×</span>
                      <AgoraLogo className="h-3.5 w-auto" />
                      <span className="text-slate-300 dark:text-white/20">×</span>
                      <PrivyLogo className="h-3 w-auto" />
                      <span className="text-slate-300 dark:text-white/20">×</span>
                      <PimlicoLogo className="h-3 w-auto" />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-white/50">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Bank-grade 256-bit encryption • 100% Zero-fee deposits</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: METHOD DETAILS & CONFIRMATION */}
          {currentStep === "details" && (
            <motion.div 
              key="details-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBackToMethods}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-white/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Funding Methods
              </button>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  Confirm Deposit
                </h3>
                <p className="text-slate-500 dark:text-white/60 text-xs">
                  Review your funding details before confirming.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                {/* Method Preview Box */}
                {selectedMethod === "card" && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                        Visa Platinum Debit
                      </span>
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="font-mono text-lg tracking-widest my-3">
                      •••• •••• •••• 4242
                    </div>
                    <div className="flex justify-between items-end text-xs text-slate-300 pt-2 border-t border-white/10">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Cardholder</span>
                        <span className="font-medium text-white">{profile.name || "David Miller"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Expires</span>
                        <span className="font-medium text-white font-mono">12/28</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 text-[10px] text-indigo-200 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      <span>Verified Debit Card • Read Only</span>
                    </div>
                  </div>
                )}

                {selectedMethod === "bank" && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          JPMorgan Chase Bank, N.A.
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-white/50">Checking •••• 8821</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-white/60 space-y-1 pt-2 border-t border-slate-200 dark:border-white/10">
                      <div className="flex justify-between">
                        <span>Routing Number:</span>
                        <span className="font-mono font-semibold">•••••0210</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Settlement Rails:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">FedNow Real-Time Instant</span>
                      </div>
                    </div>
                    <div className="pt-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      <span>{isDeveloperMode ? "Verified Bank Account via Bridge • Read Only" : "Verified Bank Account • Read Only"}</span>
                    </div>
                  </div>
                )}

                {selectedMethod === "gpay" && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          Google Pay
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-white/50">Google Wallet • 1-Tap Checkout</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-white/60 space-y-1 pt-2 border-t border-slate-200 dark:border-white/10">
                      <div className="flex justify-between">
                        <span>Linked Card:</span>
                        <span className="font-mono font-semibold">Visa ending in 4242</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">Authenticated & Ready</span>
                      </div>
                    </div>
                    <div className="pt-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      <span>{isDeveloperMode ? "Fast Device Wallet • Read Only" : "Fast Device Checkout • Read Only"}</span>
                    </div>
                  </div>
                )}

                {/* Summary Table */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-white/50">Deposit Amount:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                      {formatCurrency(depositCents)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-white/50">Processing Fee:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">$0.00 (Free)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-white/50">Settlement Asset:</span>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {isDeveloperMode ? "Agora AUSD (1:1 USD)" : "US Dollars ($)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-white/50">Estimated Arrival:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Instant</span>
                  </div>
                </div>

                {/* Confirm CTA Button */}
                <Button
                  onClick={() => handleConfirmDeposit()}
                  isLoading={isProcessing}
                  disabled={isProcessing || isCooldownActive}
                  variant="primary"
                  size="lg"
                  className={`w-full h-14 font-bold text-base shadow-xl transition-all ${
                    isCooldownActive
                      ? "bg-amber-500/80 cursor-not-allowed opacity-90"
                      : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer"
                  }`}
                >
                  {isCooldownActive
                    ? (isDeveloperMode ? `Agora Cooldown: ${secondsRemaining}s remaining` : `Next deposit ready in ${secondsRemaining}s`)
                    : isProcessing 
                    ? (isDeveloperMode ? "Broadcasting to Monad Testnet..." : "Securing instant deposit...") 
                    : (isTestnet ? (isDeveloperMode ? "Confirm $10,000.00 Agora AUSD Allocation" : "Confirm $10,000.00 Instant Deposit") : `Confirm ${formatCurrency(depositCents)} Deposit`)}
                </Button>
              </div>

              {/* Partner Footer */}
              {isDeveloperMode ? (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-center gap-3 text-slate-400 dark:text-white/40 text-xs font-medium">
                  <span>Infrastructure powered by</span>
                  <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity text-slate-700 dark:text-white/80">
                    <MonadLogo className="h-3.5 w-auto" />
                    <span className="text-slate-300 dark:text-white/20">×</span>
                    <AgoraLogo className="h-3.5 w-auto" />
                    <span className="text-slate-300 dark:text-white/20">×</span>
                    <PrivyLogo className="h-3 w-auto" />
                    <span className="text-slate-300 dark:text-white/20">×</span>
                    <PimlicoLogo className="h-3 w-auto" />
                  </div>
                </div>
              ) : (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-2 text-slate-400 dark:text-white/40 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Encrypted Bank Rails • Zero Platform Deposit Fees</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>

    {/* DEDICATED TRANSACTION CONFIRMATION MODAL OVERLAY */}
    {isProcessing && mounted && typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Dark blurred backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Centered Confirmation Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center text-slate-900 dark:text-white z-10"
          >
            {/* Animated processing spinner */}
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Zap className="w-8 h-8 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-indigo-600/20 border-t-indigo-600 animate-spin" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1.5">
              {isDeveloperMode ? "Executing Web3 Settlement" : "Processing Instant Deposit"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60 mb-6">
              {isDeveloperMode 
                ? "Routing UserOp through Pimlico Paymaster to Monad Testnet..." 
                : `Securing ${formatCurrency(depositCents)} deposit via instant payment rails...`}
            </p>

            {/* 4-Stage Visual Stepper */}
            <div className="w-full space-y-2.5 text-left mb-6">
              {STEPPER_STAGES.map((stg, idx) => {
                const stageNum = idx + 1;
                const isDone = processingStage > stageNum;
                const isCurrent = processingStage === stageNum;

                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                      isDone 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : isCurrent 
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-xs"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200/50 dark:border-white/5 text-slate-400 opacity-60"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isDone 
                        ? "bg-emerald-500 text-white" 
                        : isCurrent 
                        ? "bg-indigo-600 text-white animate-pulse" 
                        : "bg-slate-200 dark:bg-white/10 text-slate-500"
                    }`}>
                      {isDone ? <Check className="w-3.5 h-3.5" /> : stageNum}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-none truncate">
                        {isDeveloperMode ? stg.devTitle : stg.title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-white/50 mt-1 truncate">
                        {isDeveloperMode ? stg.devDesc : stg.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trust Badge */}
            <div className="text-[11px] text-slate-400 dark:text-white/40 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isDeveloperMode ? "Monad × Agora × Pimlico • 0% Gas" : "Encrypted Bank Rails • 0% Platform Fee"}</span>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    )}

    {/* DEDICATED SUCCESS RECEIPT MODAL */}
    {currentStep === "success" && mounted && typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={handleClose}
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center text-slate-900 dark:text-white z-10"
          >
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-5 border border-emerald-500/20 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              Deposit Successful!
            </h3>
            <p className="text-slate-500 dark:text-white/60 text-sm mb-6 leading-relaxed">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-base">
                +{formatCurrency(lastDepositedCents)}
              </span>{" "}
              has been credited directly to your Account Balance.
            </p>

            {/* Receipt Summary Card */}
            <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 text-xs text-slate-500 dark:text-white/60 space-y-2.5 text-left">
              <div className="flex justify-between">
                <span>Funding Method</span>
                <span className="font-semibold text-slate-800 dark:text-white">
                  {isDeveloperMode && isTestnet
                    ? "Official Agora AUSD Faucet"
                    : (selectedMethod === "card" ? "Visa Platinum Debit (Instant)" :
                       selectedMethod === "bank" ? "Direct Bank (FedNow)" : 
                       "Google Pay")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>New Available Balance</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatCurrency(availableCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID</span>
                <span className="font-mono text-slate-400">DEP-{Date.now().toString().slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              </div>
            </div>

            <Button 
              onClick={handleClose} 
              variant="primary" 
              size="lg"
              className="w-full h-12 font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
            >
              Done
            </Button>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    )}

    <PasskeyPromptModal
      isOpen={showPasskeyPrompt}
      onClose={() => setShowPasskeyPrompt(false)}
      onSuccess={() => {
        setShowPasskeyPrompt(false);
        handleConfirmDeposit();
      }}
      onContinueWithoutPasskey={() => {
        setShowPasskeyPrompt(false);
        toast.info("Using Cloud Smart Wallet", {
          description: "Authorizing deposit using your secure embedded account."
        });
        handleConfirmDeposit({ bypassBiometrics: true });
      }}
      actionTitle="claim testnet AUSD"
    />
  </>
  );
}
