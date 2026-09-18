"use client";

import { useState } from "react";
import { Zap, AlertCircle, Coins, CreditCard, Sparkles, Check } from "lucide-react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import Image from "next/image";
import { ReceiptView } from "../ReceiptView";

import { useUserProfile, settleTab, useVirtualBalance } from "../../lib/user";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireSettlementConfetti, fireFaucetConfetti } from "../../lib/confetti";

interface SettlementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debtAmount: number; // in cents
  tabId?: string;
  currentUserName?: string;
}

export function SettlementDrawer({ isOpen, onClose, debtAmount, tabId = "lisbon-24", currentUserName }: SettlementDrawerProps) {
  const profile = useUserProfile();
  const { balance: virtualBalance, deduct, topUp } = useVirtualBalance();
  const activeUser = currentUserName || profile.name || "David";

  const [paymentMethod, setPaymentMethod] = useState<"ausd" | "apple-pay">("ausd");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [justToppedUp, setJustToppedUp] = useState(false);

  const hasEnoughVirtual = virtualBalance >= debtAmount;

  const handleSettle = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1800));

    if (paymentMethod === "ausd" && hasEnoughVirtual) {
      deduct(debtAmount);
    }

    settleTab(tabId, activeUser, debtAmount);
    setIsProcessing(false);
    setIsSuccess(true);
    
    // Smooth celebrations
    sounds.playSuccessChime();
    fireSettlementConfetti();
    toast.success("Debt Settled Successfully!", {
      description: `Your balance of ${formatCurrency(debtAmount)} has been cleared on Monad.`
    });
  };

  const handleQuickFaucet = () => {
    topUp(50000);
    sounds.playCoinClink();
    fireFaucetConfetti();
    toast.success("+$500.00 Test AUSD Added!", {
      description: "Virtual sandbox balance topped up."
    });
    setJustToppedUp(true);
    setTimeout(() => setJustToppedUp(false), 2500);
  };

  if (isSuccess) {
    return (
      <ReceiptView 
        isOpen={true} 
        onClose={() => { 
          setIsSuccess(false); 
          onClose(); 
        }} 
        amount={debtAmount} 
        recipient={tabId === "lisbon-24" ? "Aisha" : undefined}
      />
    );
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 md:p-8 flex flex-col items-center text-center bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20">
          <Zap className="w-8 h-8 text-rose-500 dark:text-rose-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Settle Your Debt</h2>
        <p className="text-slate-500 dark:text-white/60 text-sm mb-6">You are paying off your netted residual balance on Monad via Agora AUSD.</p>

        {/* Total Due Card */}
        <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 mb-6 shadow-sm">
          <span className="text-slate-500 dark:text-white/40 font-semibold text-xs uppercase tracking-wider">Total Due</span>
          <div className="text-5xl font-bold text-slate-900 dark:text-white my-2 tabular-nums tracking-tight">
            {formatCurrency(debtAmount)}
          </div>
          <span className="text-slate-500 dark:text-white/60 font-semibold text-sm">Agora AUSD (Digital Dollars)</span>
        </div>

        {/* Payment Method Selector */}
        <div className="w-full space-y-3 mb-6 text-left">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">
            Select Payment Method
          </label>

          {/* Option A: Virtual AUSD Balance */}
          <button
            type="button"
            onClick={() => setPaymentMethod("ausd")}
            className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
              paymentMethod === "ausd"
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-sm"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                    Virtual AUSD Balance
                  </h4>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                    Sandbox
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 font-mono">
                  {formatCurrency(virtualBalance)} Available
                </p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === "ausd"
                  ? "border-indigo-600 bg-indigo-600"
                  : "border-slate-300 dark:border-white/30"
              }`}
            >
              {paymentMethod === "ausd" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>

          {/* Option B: Apple Pay / Debit Card (Dynamic) */}
          <button
            type="button"
            onClick={() => setPaymentMethod("apple-pay")}
            className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
              paymentMethod === "apple-pay"
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-sm"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Apple Pay / Card (Dynamic)
                </h4>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                  Instant card checkout with 0 FX fees
                </p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === "apple-pay"
                  ? "border-indigo-600 bg-indigo-600"
                  : "border-slate-300 dark:border-white/30"
              }`}
            >
              {paymentMethod === "apple-pay" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        {/* Faucet Top-up if balance is low or on demand */}
        {paymentMethod === "ausd" && !hasEnoughVirtual && (
          <div className="w-full p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl mb-6 text-left">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Insufficient Virtual Balance
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                  Claim test dollars from the sandbox faucet.
                </p>
              </div>
              <Button onClick={handleQuickFaucet} variant="secondary" size="sm" className="gap-1.5 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>+ $500 Faucet</span>
              </Button>
            </div>
          </div>
        )}

        {justToppedUp && (
          <div className="w-full p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 mb-4 animate-in fade-in">
            <Check className="w-4 h-4" /> Added +$500.00 Test AUSD!
          </div>
        )}

        {paymentMethod === "apple-pay" && (
          <div className="w-full flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl mb-6 text-left">
            <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <p className="text-xs text-indigo-800 dark:text-indigo-200">
              Purchases AUSD at 1:1 parity with Apple Pay or Debit card via Dynamic checkout.
            </p>
          </div>
        )}

        <Button 
          onClick={handleSettle}
          disabled={paymentMethod === "ausd" && !hasEnoughVirtual}
          variant="primary" 
          size="lg" 
          className="w-full h-14 font-bold text-base shadow-md shadow-indigo-500/20"
          isLoading={isProcessing}
        >
          {paymentMethod === "ausd"
            ? `Confirm ${formatCurrency(debtAmount)} with Virtual AUSD`
            : "Pay with Apple Pay"}
        </Button>
        
        {/* Partner Branding */}
        <div className="mt-6 flex items-center justify-center gap-3 text-slate-400 dark:text-white/30 text-xs font-medium">
           <span>Powered by</span>
           <div className="flex gap-2 opacity-70 dark:opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
             <Image src="/logos/dynamic.svg" alt="Dynamic" width={56} height={18} />
             <Image src="/logos/monad.svg" alt="Monad" width={56} height={18} />
             <Image src="/logos/agora.svg" alt="Agora" width={36} height={18} />
           </div>
        </div>
      </div>
    </Sheet>
  );
}
