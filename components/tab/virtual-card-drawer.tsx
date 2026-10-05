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
  executeCardPayment, 
  issueVirtualCard,
  resetVirtualCard,
  VirtualCard 
} from "@/lib/card";
import { 
  useUserProfile, 
  useWorkspaceMode, 
  useSettledPayoutBalance, 
  getStoredTabs 
} from "@/lib/user";
import { useRealAusdBalance } from "@/lib/onchain";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { erc20Abi, encodeFunctionData } from "viem";
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

const PRESETS = [
  { label: "🍷 Wine Bar & Tapas", merchant: "Wine Bar & Tapas", cents: 6400 },
  { label: "🚕 Airport Van Transfer", merchant: "Airport Van Transfer", cents: 3200 },
  { label: "🥐 Pastéis de Belém", merchant: "Pastéis de Belém Cafe", cents: 1850 },
];

export function VirtualCardDrawer({
  isOpen,
  onClose,
  tabId = "lisbon-24",
  tabName
}: VirtualCardDrawerProps) {
  const profile = useUserProfile();
  const { mode: workspaceMode } = useWorkspaceMode();
  const isTestnet = workspaceMode === "testnet";

  const { client } = useSmartWallets();
  const { settledBalance } = useSettledPayoutBalance();
  const { balance: testnetAusdBalance, refetch: refetchTestnet } = useRealAusdBalance(workspaceMode);

  // Card state
  const [card, setCard] = useState<VirtualCard>(() => getVirtualCard(workspaceMode, profile.name));
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [customAmountStr, setCustomAmountStr] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

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

  // Determine current effective balance in cents
  const effectiveBalanceCents = isTestnet
    ? Math.round(testnetAusdBalance * 100)
    : settledBalance;

  // Determine target amount
  const selectedCents = customAmountStr
    ? Math.round((parseFloat(customAmountStr) || 0) * 100)
    : PRESETS[selectedPresetIndex]?.cents || 6400;

  const selectedMerchant = customAmountStr
    ? "In-Store Purchase"
    : PRESETS[selectedPresetIndex]?.merchant || "Wine Bar & Tapas";

  const isInsufficient = effectiveBalanceCents < selectedCents;

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
    setIssuanceStep("preferences");
    toast.info("Card Reset", {
      description: "You can now experience the 2-step issuance and countdown flow again.",
    });
  };

  // -------------------------------------------------------------
  // Issuance Flow: Authenticate & 3-Second Celebratory Countdown
  // -------------------------------------------------------------
  const handleStartIssuance = async () => {
    sounds.playClick();
    setIssuanceStep("authenticating");

    if (isTestnet) {
      if (!client) {
        toast.error("Smart Wallet Required", {
          description: "Please connect your Privy Smart Account to issue a card on Monad Testnet.",
        });
        setIssuanceStep("preferences");
        return;
      }
      try {
        // Real WebAuthn passkey authentication on Testnet
        await client.signMessage({
          message: `Authorize MeshTab Personal Visa Card Issuance for ${cardholderInput || profile.name} on Monad Testnet (${new Date().toISOString()})`,
        });
      } catch (err: any) {
        toast.error("Authentication Cancelled", {
          description: "Passkey authentication is required. The card will not be issued.",
        });
        setIssuanceStep("preferences");
        return;
      }
    } else {
      // Demo Mode: simulated biometric pulse
      await new Promise((r) => setTimeout(r, 700));
    }

    // Begin 3-Second Celebration Countdown
    setIssuanceStep("countdown");
    setCountdown(3);
    setCountdownText("Minting virtual card on Stripe Issuing rails...");
    sounds.playPing();

    setTimeout(() => {
      setCountdown(2);
      setCountdownText(isTestnet ? "Binding to Privy Smart Account on Monad..." : "Binding to your personal cash reserves...");
      sounds.playPing();
    }, 1000);

    setTimeout(() => {
      setCountdown(1);
      setCountdownText("Activating Monad JIT settlement clearing...");
      sounds.playPing();
    }, 2000);

    setTimeout(() => {
      setCountdown(0);
      const limitCents = limitChoice === "unlimited" ? -1 : Math.round((parseFloat(customLimitDollars) || 500) * 100);
      const issued = issueVirtualCard(workspaceMode, {
        cardholderName: cardholderInput || profile.name,
        dailyLimitCents: limitCents,
      });
      setCard(issued);
      sounds.playSuccessChime();
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {}
      toast.success("🎉 Personal Visa Card Issued!", {
        description: "Your card is active and ready for in-store tap-to-pay and group tab splits.",
      });
      setIssuanceStep("preferences");
    }, 3000);
  };

  // -------------------------------------------------------------
  // Card Payment Execution
  // -------------------------------------------------------------
  const handleAuthorizePayment = async () => {
    if (!card.isIssued) {
      toast.error("Card Not Issued", {
        description: "Please issue and activate your personal card first.",
      });
      return;
    }

    if (card.isFrozen) {
      toast.error("Card is Frozen", {
        description: "Please unfreeze the card above before authorizing a payment.",
      });
      return;
    }

    if (isInsufficient) {
      toast.error("Insufficient Card Balance", {
        description: "Please top up your card to complete this payment.",
      });
      setIsAddFundsOpen(true);
      return;
    }

    // OVERSEER Blank Mode Guard: Ensure active tab exists
    const availableTabs = getStoredTabs();
    const effectiveTabId = tabId || (availableTabs[0]?.id);
    if (!effectiveTabId) {
      toast.error("No Group Tab Found", {
        description: "Please create a group tab first to auto-split this card purchase.",
      });
      return;
    }

    setIsProcessing(true);
    sounds.playClick();

    try {
      // Testnet Onchain Execution: Transfer AUSD to MeshTabLedger
      const onchainTransfer = isTestnet && client ? async () => {
        const ledgerAddress = (process.env.NEXT_PUBLIC_MESH_TAB_LEDGER_ADDRESS || "0x43405B9D8E30ff76910009E79131200c862fCA7d") as `0x${string}`;
        const ausdAddress = (process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS || "0xF9bA02Cd0aFc210e0867852eEb0E994B07d9957F") as `0x${string}`;
        const amountWei = BigInt(selectedCents) * BigInt(10 ** 4); // 6 decimals

        const hash = await client.sendTransaction({
          to: ausdAddress,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [ledgerAddress, amountWei],
          }),
        });

        setLastTxHash(hash);
        return hash;
      } : undefined;

      const result = await executeCardPayment({
        tabId: effectiveTabId,
        tabName,
        amountCents: selectedCents,
        merchantName: selectedMerchant,
        payerName: profile.name || "David",
        mode: workspaceMode,
        onchainTransfer,
      });

      if (!result.success) {
        setIsProcessing(false);
        toast.error("Payment Declined", { description: result.error });
        return;
      }

      // POS Terminal Sound & Confetti feedback
      sounds.playSuccessChime();

      toast.success("💳 Visa Approved!", {
        description: `${formatCurrency(selectedCents)} auto-split across ${tabName || "group tab"}.`,
      });

      if (isTestnet) {
        refetchTestnet();
      }

      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      toast.error("Transaction Failed", {
        description: err?.message || "Could not complete card payment.",
      });
    }
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
                /* Step 1: Preferences & Ghost Card Silhouette */
                <div className="space-y-5">
                  {/* Holographic Ghost Card Silhouette */}
                  <div className="relative w-full aspect-[1.58/1] rounded-2xl p-6 text-white overflow-hidden shadow-lg border-2 border-dashed border-indigo-300 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-950/60 backdrop-blur-md flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-7 rounded bg-amber-400/40 border border-amber-300/50" />
                        <Wifi className="w-4 h-4 text-white/40 rotate-90" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70 tracking-wider uppercase">
                        Not Yet Issued
                      </span>
                    </div>

                    <div>
                      <p className="font-mono text-lg font-bold tracking-widest text-white/50">
                        4242 •••• •••• ••••
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
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/15 text-sm font-semibold text-slate-900 dark:text-white"
                          />
                          <span className="text-xs text-slate-500 dark:text-white/50 shrink-0">USD / day</span>
                        </div>
                      )}
                    </div>

                    {/* Cost & Fee Transparency */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">Issuance Cost: $0.00 Free</span>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                          100% Sponsored by MeshTab • 0% Foreign Transaction Markup
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">FREE</span>
                    </div>
                  </div>

                  {/* Step 2 Authentication Trigger */}
                  <Button
                    onClick={handleStartIssuance}
                    isLoading={issuanceStep === "authenticating"}
                    className="w-full py-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2"
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
            /* FLOW B: ACTIVE PERSONAL CARD VIEW & IN-STORE TRANSACTIONS */
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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all"
                >
                  {showDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showDetails ? "Hide Details" : "Show Details"}
                </button>

                <button
                  onClick={handleToggleFreeze}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    card.isFrozen
                      ? "bg-sky-500 text-white hover:bg-sky-600"
                      : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10"
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  {card.isFrozen ? "Unfreeze" : "Freeze Card"}
                </button>
              </div>

              {/* 3. Live Card Balance Display */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-white/50 font-medium">Available Card Balance</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {formatCurrency(effectiveBalanceCents)}
                    {isTestnet && <span className="text-xs text-indigo-500 font-sans ml-1">AUSD</span>}
                  </p>
                </div>
                {isInsufficient && (
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => setIsAddFundsOpen(true)}
                    className="text-xs border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Top Up Card
                  </Button>
                )}
              </div>

              {/* 4. Insufficient Funds Warning Banner */}
              {isInsufficient && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <strong className="font-semibold">Insufficient Card Balance:</strong> Available balance ({formatCurrency(effectiveBalanceCents)}) cannot cover this purchase ({formatCurrency(selectedCents)}).
                  </div>
                </div>
              )}

              {/* 5. In-Tab Purchase Simulation Presets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Simulate In-Store Tap-to-Pay
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p, idx) => (
                    <button
                      key={p.merchant}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setSelectedPresetIndex(idx);
                        setCustomAmountStr("");
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedPresetIndex === idx && !customAmountStr
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-900 dark:text-white shadow-xs"
                          : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-white/70"
                      }`}
                    >
                      <p className="text-[11px] font-medium truncate">{p.label}</p>
                      <p className="text-xs font-bold font-mono mt-0.5 text-slate-900 dark:text-white">
                        ${(p.cents / 100).toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Custom Amount Input */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-white/50 mb-1 block">
                  Or Enter Custom In-Store Charge (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 font-mono text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={customAmountStr}
                    onChange={(e) => setCustomAmountStr(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 7. Action Button: Authorize & Auto-Split */}
              <Button
                onClick={handleAuthorizePayment}
                disabled={isProcessing || isInsufficient || card.isFrozen}
                className={`w-full py-6 text-sm font-bold shadow-lg transition-all ${
                  isInsufficient
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authorizing Visa Swipe...
                  </span>
                ) : isInsufficient ? (
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Top Up Card to Pay {formatCurrency(selectedCents)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-5 h-5" /> Pay {formatCurrency(selectedCents)} & Split with Tab
                  </span>
                )}
              </Button>

              {/* Testnet Explorer Link if available */}
              {lastTxHash && isTestnet && (
                <div className="text-center pt-2">
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${lastTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:underline"
                  >
                    View Last Card Clearing on MonadExplorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Re-Issue / Reset Demo Card Link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleResetCard}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
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
          if (isTestnet) refetchTestnet();
        }}
      />
    </>
  );
}
