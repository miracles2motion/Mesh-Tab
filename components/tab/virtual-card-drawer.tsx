"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  Snowflake, 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  AlertCircle,
  Wifi,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  Fingerprint,
  RotateCcw,
  Zap
} from "lucide-react";
import { 
  getVirtualCard, 
  saveVirtualCard, 
  toggleCardFreeze, 
  issueVirtualCard,
  resetVirtualCard,
  VirtualCard 
} from "@/lib/card";
import { 
  useUserProfile, 
  useWorkspaceMode, 
} from "@/lib/user";
import { useAvailableBalance } from "@/lib/balance";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { formatCurrency } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { AddFundsDrawer } from "./add-funds-drawer";

interface VirtualCardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tabId?: string;
  tabName?: string;
}

export function VirtualCardDrawer({
  isOpen,
  onClose,
  tabId,
  tabName
}: VirtualCardDrawerProps) {
  const profile = useUserProfile();
  const { mode: workspaceMode } = useWorkspaceMode();
  const isTestnet = workspaceMode === "testnet";

  const { client } = useSmartWallets();
  
  // Use unified cross-tab available balance (total funds minus held debt)
  const { availableCents, totalCents, heldCents } = useAvailableBalance(profile.name || "David");
  const effectiveBalanceCents = availableCents;

  // Card state
  const [card, setCard] = useState<VirtualCard>(() => getVirtualCard(workspaceMode, profile.name));
  const [showDetails, setShowDetails] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);

  // 2-Step Issuance Flow State
  const [issuanceStep, setIssuanceStep] = useState<"preferences" | "authenticating" | "countdown">("preferences");
  const [cardholderInput, setCardholderInput] = useState<string>(profile.name || "David Reed");
  const [limitChoice, setLimitChoice] = useState<"unlimited" | "custom">("unlimited");
  const [customLimitDollars, setCustomLimitDollars] = useState<string>("500");
  const [countdown, setCountdown] = useState<number>(3);
  const [countdownText, setCountdownText] = useState<string>("Minting on Stripe Issuing rails...");

  // Sync card state when mode changes or on storage event
  useEffect(() => {
    const syncCard = () => {
      setCard(getVirtualCard(workspaceMode, profile.name));
    };
    syncCard();
    window.addEventListener("meshTab-card-update", syncCard);
    window.addEventListener("meshTab-workspace-update", syncCard);
    return () => {
      window.removeEventListener("meshTab-card-update", syncCard);
      window.removeEventListener("meshTab-workspace-update", syncCard);
    };
  }, [workspaceMode, profile.name]);

  useEffect(() => {
    if (profile.name) {
      setCardholderInput(profile.name);
    }
  }, [profile.name]);

  const handleToggleFreeze = () => {
    sounds.playClick();
    const nextState = toggleCardFreeze(workspaceMode);
    toast.info(nextState ? "Card Frozen" : "Card Active", {
      description: nextState
        ? "Card payments are temporarily blocked."
        : "Card is unlocked and ready for in-store payments.",
    });
  };

  const handleResetCard = () => {
    sounds.playClick();
    resetVirtualCard(workspaceMode);
    setCard(getVirtualCard(workspaceMode, profile.name));
    setIssuanceStep("preferences");
    toast.info("Card Reset", {
      description: "You can now test the 2-step personal card issuance flow again.",
    });
  };

  // -------------------------------------------------------------
  // 2-Step Issuance Flow with 3-Second Live Countdown
  // -------------------------------------------------------------
  const handleStartIssuance = async () => {
    sounds.playClick();
    setIssuanceStep("authenticating");

    // Testnet Mode: Real biometric passkey signing via Smart Wallet client
    if (isTestnet) {
      if (!client) {
        toast.error("Smart Account Not Ready", {
          description: "Please ensure your Privy embedded wallet is connected.",
        });
        setIssuanceStep("preferences");
        return;
      }

      try {
        const messageToSign = `Authorize MeshTab Personal Visa Card Issuance\nCardholder: ${cardholderInput.toUpperCase()}\nSmart Account: ${client.account.address}\nNetwork: Monad Testnet\nTimestamp: ${new Date().toISOString()}`;
        
        await client.signMessage({
          message: messageToSign,
        });

        sounds.playSuccessChime();
        toast.success("Biometrics Verified via Passkey", {
          description: "Smart Account authenticated successfully.",
        });
      } catch (err: any) {
        setIssuanceStep("preferences");
        toast.error("Passkey Authentication Cancelled", {
          description: "Biometric approval is required to issue your on-chain card.",
        });
        return;
      }
    } else {
      // Demo Mode: Fast simulated biometric auth
      await new Promise((r) => setTimeout(r, 600));
      sounds.playSuccessChime();
    }

    // Step 2: 3-Second Live Countdown
    setIssuanceStep("countdown");
    setCountdown(3);
    setCountdownText("Minting on Stripe Issuing rails...");

    const timer1 = setTimeout(() => {
      setCountdown(2);
      setCountdownText("Encrypting CVV & personal PAN...");
      sounds.playClick();
    }, 1000);

    const timer2 = setTimeout(() => {
      setCountdown(1);
      setCountdownText("Binding to Monad Smart Account...");
      sounds.playClick();
    }, 2000);

    const timer3 = setTimeout(() => {
      const dailyCap = limitChoice === "custom" ? Math.max(1000, (parseFloat(customLimitDollars) || 500) * 100) : -1;
      
      const newCard = issueVirtualCard(workspaceMode, {
        cardholderName: cardholderInput,
        dailyLimitCents: dailyCap,
      });
      setCard(newCard);

      sounds.playSuccessChime();
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.55 },
        });
      } catch {}

      toast.success("🎉 Personal Visa Card Issued!", {
        description: "Your card is active and ready for in-store tap-to-pay and group tab splits.",
      });
      setIssuanceStep("preferences");
    }, 3000);
  };

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} size="md">
        <div className="space-y-6 p-4 sm:p-6 pb-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Personal MeshTab Visa Card
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50">
                {card.isIssued ? "Active & Ready for Tap-to-Pay" : "Instant Issuance via Privy × Stripe"}
              </p>
            </div>
            {card.isIssued && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            )}
          </div>

          {/* ========================================================= */}
          {/* FLOW A: UNISSUED CARD (2-STEP ONBOARDING & 3S COUNTDOWN) */}
          {/* ========================================================= */}
          {!card.isIssued ? (
            <div className="space-y-6">
              {/* 3-Second Celebratory Countdown Mode */}
              {issuanceStep === "countdown" ? (
                <div className="relative w-full aspect-[1.58/1] rounded-2xl p-6 text-white overflow-hidden shadow-2xl border border-indigo-500/40 bg-gradient-to-br from-[#0f172a] via-[#09090b] to-[#1e1b4b] flex flex-col items-center justify-center text-center">
                  <div className="absolute inset-0 bg-radial from-indigo-500/20 via-transparent to-transparent animate-pulse pointer-events-none" />
                  
                  <motion.div
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="w-16 h-16 rounded-full bg-indigo-600/30 border-2 border-indigo-400 flex items-center justify-center text-3xl font-black font-mono text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] mb-3"
                  >
                    {countdown}
                  </motion.div>

                  <p className="text-sm font-bold text-white tracking-wide">
                    {countdownText}
                  </p>
                  <p className="text-[11px] text-indigo-300/80 mt-1">
                    Provisioning personal debit credentials on Visa network...
                  </p>
                </div>
              ) : (
                /* Card Preview Before Issuance */
                <div className="space-y-4">
                  <div className="relative w-full aspect-[1.58/1] rounded-2xl p-6 text-white overflow-hidden shadow-xl border border-white/10 bg-gradient-to-br from-[#18181b] via-[#111113] to-[#27272a] opacity-90">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-7 rounded bg-amber-400/80 border border-amber-300/40 shadow-inner" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">
                        {isTestnet ? "Monad Testnet Visa" : "Virtual Visa Preview"}
                      </span>
                    </div>

                    <div className="my-5">
                      <p className="font-mono text-lg font-bold tracking-widest text-white/60">
                        4242 •••• •••• 9812
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs font-mono">
                        <span className="text-white/80 font-bold uppercase tracking-wide">
                          {cardholderInput || "YOUR NAME"}
                        </span>
                        <span className="text-white/40">EXP: 08/29</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/60">
                      <span>● privy × stripe</span>
                      <span className="italic font-bold">VISA</span>
                    </div>
                  </div>

                  {/* Form Step 1: Cardholder Name & Spending Limit */}
                  <div className="space-y-4 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block mb-1.5">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={cardholderInput}
                        onChange={(e) => setCardholderInput(e.target.value)}
                        placeholder="e.g. DAVID REED"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/15 text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                          Daily Spending Limit
                        </label>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Adjustable Anytime
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLimitChoice("unlimited")}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                            limitChoice === "unlimited"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white dark:bg-white/5 text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                          }`}
                        >
                          Unlimited (Recommended)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLimitChoice("custom")}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                            limitChoice === "custom"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white dark:bg-white/5 text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                          }`}
                        >
                          Custom Daily Cap
                        </button>
                      </div>

                      {limitChoice === "custom" && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-500 dark:text-white/50">$</span>
                          <input
                            type="number"
                            value={customLimitDollars}
                            onChange={(e) => setCustomLimitDollars(e.target.value)}
                            placeholder="500"
                            className="w-32 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/15 text-sm font-bold font-mono focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-xs text-slate-400">USD per 24 hours</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Highlights Bullet points */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span><strong>100% Personal Card:</strong> Spend in-store or online anywhere Visa is accepted.</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                      <span><strong>Just-In-Time Balance:</strong> Debits directly from your available tab cash reserves.</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span><strong>Zero Card Fees:</strong> Minting and maintenance covered on Monad rails.</span>
                    </div>
                  </div>

                  {/* Step 2 Authentication Trigger */}
                  <Button
                    onClick={handleStartIssuance}
                    isLoading={issuanceStep === "authenticating"}
                    className="w-full py-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Fingerprint className="w-5 h-5" />
                    {isTestnet
                      ? "Authenticate Passkey & Issue Card (Free)"
                      : "Issue Personal Visa Card (Free)"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* FLOW B: ACTIVE PERSONAL CARD VIEW & CREDENTIAL CONTROLS  */
            /* ========================================================= */
            <div className="space-y-6">
              {/* 1. The Obsidian-Glass Virtual Card */}
              <div className="relative w-full aspect-[1.58/1] rounded-2xl p-6 text-white overflow-hidden shadow-2xl transition-all duration-300 border border-white/20 bg-gradient-to-br from-[#18181b] via-[#09090b] to-[#1e1b4b]">
                {/* Holographic foil glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/15 to-emerald-500/10 pointer-events-none" />

                {/* Frozen card visual filter */}
                {card.isFrozen && (
                  <div className="absolute inset-0 bg-sky-950/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                    <div className="flex items-center gap-2 bg-sky-500/20 text-sky-200 border border-sky-400/40 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <Snowflake className="w-3.5 h-3.5 animate-spin" /> Card Frozen
                    </div>
                  </div>
                )}

                {/* Card Header: Chip, Contactless & Tab Context */}
                <div className="relative z-10 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    {/* Gold EMV Chip */}
                    <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 shadow-inner flex items-center justify-center border border-amber-200/50">
                      <div className="w-6 h-4 border border-black/20 rounded-xs grid grid-cols-2 gap-0.5 p-0.5">
                        <div className="border-r border-black/20" />
                        <div />
                      </div>
                    </div>
                    {/* Contactless waves */}
                    <Wifi className="w-4 h-4 text-white/70 rotate-90" />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/90">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Personal Card</span>
                  </div>
                </div>

                {/* 16-Digit Card Number */}
                <div className="relative z-10 my-3">
                  <p className="font-mono text-lg sm:text-xl font-bold tracking-widest text-white/95 drop-shadow-sm select-all">
                    {showDetails ? card.fullNumber : card.cardNumber}
                  </p>
                </div>

                {/* Card Details: Holder, Expiry, CVV & Smart Account */}
                <div className="relative z-10 flex items-end justify-between text-xs mt-2">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-white/50 font-semibold">Cardholder</p>
                    <p className="font-bold tracking-wide text-white truncate max-w-[170px] uppercase">
                      {card.cardholderName || profile.name}
                    </p>
                    {isTestnet && client?.account?.address && (
                      <p className="text-[9px] font-mono text-indigo-300/80 mt-0.5">
                        Smart: {client.account.address.slice(0, 6)}...{client.account.address.slice(-4)}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-white/50 font-semibold">
                      {showDetails ? "Exp / CVV" : "Expires"}
                    </p>
                    <p className="text-xs font-mono font-bold tracking-wide text-white">
                      {showDetails ? `${card.expDate} • ${card.cvv}` : card.expDate}
                    </p>
                  </div>
                </div>

                {/* Partner Attribution Footer */}
                <div className="relative z-10 mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider text-white/70">
                    ● privy × stripe
                  </span>
                  <span className="text-xs italic font-black tracking-widest text-indigo-200">
                    VISA
                  </span>
                </div>
              </div>

              {/* 2. Interactive Card Controls */}
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                >
                  {showDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showDetails ? "Hide Details" : "Show Details"}
                </button>

                <button
                  onClick={handleToggleFreeze}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    card.isFrozen
                      ? "bg-sky-500 text-white hover:bg-sky-600"
                      : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10"
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  {card.isFrozen ? "Unfreeze" : "Freeze Card"}
                </button>
              </div>

              {/* 3. Live Card Balance Display (Mirrors Net Available Balance) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-white/50 font-medium">Available Card Balance</span>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                    {formatCurrency(effectiveBalanceCents)}
                    {isTestnet && <span className="text-xs text-indigo-500 font-sans ml-1 font-bold">AUSD</span>}
                  </p>
                  {heldCents > 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                      <span>{formatCurrency(heldCents)} reserved for tab debt</span>
                    </p>
                  )}
                </div>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setIsAddFundsOpen(true)}
                  className="text-xs border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Top Up Card
                </Button>
              </div>

              {/* 4. Card Details & Limits Specification Box */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Daily Spend Limit</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {card.dailyLimitCents > 0 ? formatCurrency(card.dailyLimitCents) : "Unlimited"}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Issuing Rails</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Stripe × Visa</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Custody</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Non-Custodial</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">In-Store Payments</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Select in Add Expense</p>
                </div>
              </div>

              {/* Re-Issue / Reset Demo Card Link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleResetCard}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white/70 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Card to Test Issuance Flow
                </button>
              </div>
            </div>
          )}
        </div>
      </Sheet>

      {/* Top-up Drawer Loop */}
      <AddFundsDrawer
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        onSuccess={() => {
          setIsAddFundsOpen(false);
        }}
      />
    </>
  );
}
