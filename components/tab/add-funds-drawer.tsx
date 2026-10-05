"use client";

import React, { useState, useEffect } from "react";
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
  ArrowDownLeft
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
  useSettledPayoutBalance, 
  useUserProfile,
  useWorkspaceMode
} from "@/lib/user";
import { useRealAusdBalance, useClaimWelcomeBonus } from "@/lib/onchain";
import { addNotification } from "@/lib/notifications";
import { formatCurrency } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { fireFaucetConfetti } from "@/lib/confetti";
import { toast } from "sonner";

interface AddFundsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amountCents: number) => void;
  suggestedAmountCents?: number;
  reason?: string;
}

type DepositMethod = "card" | "bank" | "gpay";

const QUICK_CHIPS = [
  { label: "+$25", value: 2500 },
  { label: "+$50", value: 5000 },
  { label: "+$100", value: 10000 },
  { label: "+$250", value: 25000 }
];

export function AddFundsDrawer({ isOpen, onClose, onSuccess, suggestedAmountCents, reason }: AddFundsDrawerProps) {
  const profile = useUserProfile();
  const { settledBalance } = useSettledPayoutBalance();
  const { mode: workspaceMode } = useWorkspaceMode();
  const isTestnet = workspaceMode === "testnet";
  const { balance: testnetBalance, refetch: refetchTestnetBalance } = useRealAusdBalance(workspaceMode);
  const { claimBonus, isClaiming: isTestnetClaiming, hasClaimed, checkHasClaimed } = useClaimWelcomeBonus(workspaceMode);

  const initialAmount = isTestnet 
    ? "5000.00" 
    : suggestedAmountCents && suggestedAmountCents > 0 
      ? (suggestedAmountCents / 100).toFixed(2) 
      : "100.00";

  const [amountStr, setAmountStr] = useState(initialAmount);
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod>("card");
  const [currentStep, setCurrentStep] = useState<"select" | "details" | "success">("select");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDepositedCents, setLastDepositedCents] = useState(isTestnet ? 500000 : 10000);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When drawer opens, reset step and prefill exact shortage if provided
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("select");
      setIsProcessing(false);
      if (isTestnet) {
        setAmountStr("5000.00");
        checkHasClaimed();
      } else if (suggestedAmountCents && suggestedAmountCents > 0) {
        setAmountStr((suggestedAmountCents / 100).toFixed(2));
      } else {
        setAmountStr("100.00");
      }
    }
  }, [isOpen, isTestnet, suggestedAmountCents, checkHasClaimed]);

  // Compute integer cents from input string or fixed 5k on testnet
  const parsedFloat = parseFloat(amountStr) || 0;
  const depositCents = isTestnet ? 500000 : Math.max(0, Math.round(parsedFloat * 100));
  const currentActiveBalance = isTestnet ? Math.round(testnetBalance * 100) : settledBalance;
  const newProjectedBalance = currentActiveBalance + depositCents;
  const isAlreadyAllocated = isTestnet && (hasClaimed || testnetBalance >= 5000);

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

  const handleConfirmDeposit = async () => {
    if (depositCents <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a deposit amount greater than $0." });
      return;
    }

    setIsProcessing(true);
    sounds.playClick();

    if (isTestnet) {
      const { success, error } = await claimBonus();
      if (!success) {
        setIsProcessing(false);
        toast.error("Deposit Failed", { description: error || "Could not complete testnet deposit." });
        return;
      }
      refetchTestnetBalance();
    } else {
      // 1.5s simulated loading for Demo mode
      await new Promise((r) => setTimeout(r, 1500));
      // Symmetrically mutate both demo balance stores
      addSettledPayout(depositCents);
      topUpVirtualBalance(depositCents);
    }

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
        title: isTestnet ? "Testnet Deposit Received" : "Deposit Received",
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
    setCurrentStep("success");

    if (onSuccess) {
      onSuccess(depositCents);
    }
  };

  const handleClose = () => {
    setCurrentStep("select");
    setIsProcessing(false);
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} size="4xl">
      <div className="p-6 md:p-8 flex flex-col items-center bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        <AnimatePresence mode="wait">
          {/* ALLOCATION ALREADY ACTIVE (TESTNET 1-TIME LIMIT ENFORCED) */}
          {isAlreadyAllocated && currentStep !== "success" ? (
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
                <span>Monad Testnet • 1-Time Allocation</span>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Allocation Active
              </h3>
              <p className="text-slate-500 dark:text-white/60 text-sm mb-6 leading-relaxed">
                Your wallet has already received the 1-time <strong className="text-slate-900 dark:text-white font-semibold">$5,000.00 Testnet Welcome Allocation</strong>. To prevent faucet exhaustion, each wallet address is provisioned once on Monad Testnet.
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
                  <span className="font-semibold text-slate-900 dark:text-white">Agora AUSD (ERC-20)</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
                  <span>Network:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">Monad Testnet (10143)</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
                  <span>Gas Policy:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Pimlico Paymaster (Sponsored)</span>
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
                  {isTestnet ? "Testnet Welcome Allocation" : "Add Funds"}
                </h2>
                <p className="text-slate-500 dark:text-white/60 text-sm max-w-sm mx-auto">
                  {isTestnet 
                    ? "Claim your initial $5,000.00 Agora AUSD testnet balance to test shared tabs."
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
                        value={isTestnet ? "5000.00" : amountStr}
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
                        <span>Monad Testnet 1-Time Allocation ($5,000.00)</span>
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
                      <span>{isTestnet ? "Current Monad AUSD:" : "Current Account Cash:"}</span>
                      <span className="font-semibold text-slate-800 dark:text-white font-mono">
                        {formatCurrency(currentActiveBalance)}
                      </span>
                    </div>
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
                    <span>0% Deposit Fee • Sponsored by Pimlico Paymaster</span>
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
                            Visa / Mastercard via Privy
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
                            Bank transfer via Bridge ACH
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
                  Review your demo funding details before confirming.
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
                      <span>Demo Card Pre-Filled by Privy • Read Only</span>
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
                      <span>Verified Bank Account via Bridge • Read Only</span>
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
                      <span>Fast Device Wallet • Read Only</span>
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
                    <span className="font-semibold text-slate-800 dark:text-white">Agora AUSD (1:1 USD)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-white/50">Estimated Arrival:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Instant</span>
                  </div>
                </div>

                {/* Confirm CTA Button */}
                <Button
                  onClick={handleConfirmDeposit}
                  isLoading={isProcessing}
                  variant="primary"
                  size="lg"
                  className="w-full h-14 font-bold text-base shadow-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
                >
                  {isProcessing 
                    ? (isTestnet ? "Securing allocation via Monad & Pimlico..." : "Securing deposit via Privy...") 
                    : (isTestnet ? "Confirm $5,000.00 Allocation" : `Confirm ${formatCurrency(depositCents)} Deposit`)}
                </Button>
              </div>

              {/* Partner Footer */}
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
            </motion.div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION RECEIPT */}
          {currentStep === "success" && (
            <motion.div 
              key="success-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="py-6 flex flex-col items-center max-w-md mx-auto text-center"
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
                    {isTestnet
                      ? "Monad Testnet AUSD Allocation"
                      : (selectedMethod === "card" ? "Visa Platinum Debit (Instant)" :
                         selectedMethod === "bank" ? "Direct Bank (FedNow)" : 
                         "Google Pay")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>New Available Balance</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {formatCurrency(isTestnet ? Math.round(testnetBalance * 100) : settledBalance)}
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
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
