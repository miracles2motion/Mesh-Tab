"use client";

import { useState } from "react";
import { Zap, AlertCircle, Coins, CreditCard, Sparkles, Check } from "lucide-react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import { ReceiptView } from "../ReceiptView";
import { MonadLogo, AgoraLogo, DynamicLogo, PythLogo } from "../ui/partner-logo";

import { useUserProfile, settleTab, useVirtualBalance, useStoredTabMembers, useWorkspaceMode } from "../../lib/user";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireSettlementConfetti, fireFaucetConfetti } from "../../lib/confetti";
import { SUPPORTED_CURRENCIES, usePythRate } from "../../lib/pyth";

interface SettlementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debtAmount: number; // in cents
  tabId?: string;
  currentUserName?: string;
}

export function SettlementDrawer({ isOpen, onClose, debtAmount, tabId = "lisbon-24", currentUserName }: SettlementDrawerProps) {
  const profile = useUserProfile();
  const { mode: workspaceMode } = useWorkspaceMode();
  const { balance: virtualBalance, deduct, topUp } = useVirtualBalance();
  const activeUser = currentUserName || profile.name || "David";
  const { members: tabMembers } = useStoredTabMembers(tabId, activeUser);

  // Dynamically identify who paid for the expenses (creditor with positive balance)
  const primaryCreditor = tabMembers.find(m => m.balance > 0)?.name || (workspaceMode === "sample" && tabId === "lisbon-24" ? "Aisha" : undefined);

  const [paymentMethod, setPaymentMethod] = useState<"ausd" | "apple-pay">("ausd");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [justToppedUp, setJustToppedUp] = useState(false);

  const defaultPayCurrency = tabId.includes("lisbon") ? "EUR" : "USD";
  const [payCurrency, setPayCurrency] = useState<string>(defaultPayCurrency);
  const { rate: pythRate, config: pythConfig } = usePythRate(payCurrency);

  const debtInUsd = debtAmount / 100;
  const convertedAmount = pythRate > 0 ? (debtInUsd / pythRate) : debtInUsd;
  const formattedConverted = payCurrency === "JPY" 
    ? Math.round(convertedAmount).toLocaleString() 
    : convertedAmount.toFixed(2);

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
        amount={debtAmount > 0 ? debtAmount : (workspaceMode === "sample" && tabId === "lisbon-24" ? 18000 : 0)} 
        recipient={primaryCreditor}
      />
    );
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} size="full">
      <div className="p-6 md:p-8 flex flex-col items-center bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        <div className="w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20 mx-auto">
              <Zap className="w-8 h-8 text-rose-500 dark:text-rose-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Settle Your Debt</h2>
            <p className="text-slate-500 dark:text-white/60 text-sm max-w-sm mx-auto">
              {primaryCreditor 
                ? `Paying off your netted residual balance directly to ${primaryCreditor} via Agora AUSD.`
                : "Paying off your netted residual balance via Agora AUSD on Monad."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Left Column: Total Due */}
            <div>
              {/* Total Due Card */}
              <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 mb-6 shadow-sm text-center md:text-left">
                <span className="text-slate-500 dark:text-white/40 font-semibold text-xs uppercase tracking-wider">Total Due</span>
                <div className="text-5xl font-bold text-slate-900 dark:text-white my-2 tabular-nums tracking-tight">
                  {formatCurrency(debtAmount)}
                </div>
                <span className="text-slate-500 dark:text-white/60 font-semibold text-sm">Agora AUSD (Digital Dollars)</span>
              </div>
            </div>

            {/* Right Column: Payment Method */}
            <div>
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
                      : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
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
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
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
                      : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center shrink-0">
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
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
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
                <div className="w-full space-y-3 mb-6 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">
                      Card Billing Currency
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      0% Bank FX Markup
                    </span>
                  </div>

                  {/* Currency Selector Chips */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {SUPPORTED_CURRENCIES.slice(0, 5).map(curr => (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => setPayCurrency(curr.code)}
                        className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer hover:-translate-y-0.5 ${
                          payCurrency === curr.code
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-sm">{curr.flag}</span>
                        <span className="text-[10px] font-mono">{curr.code}</span>
                      </button>
                    ))}
                  </div>

                  {/* Live Pyth Mid-Market Rate Box */}
                  <div className="p-3.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-500 dark:text-white/60 text-[11px]">Dynamic Card Charge:</span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {pythConfig?.symbol || "$"}{formattedConverted} {payCurrency}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      <PythLogo className="h-3.5 w-auto" />
                      <span>Live Mid-Market</span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSettle}
                disabled={paymentMethod === "ausd" && !hasEnoughVirtual}
                variant="primary" 
                size="lg" 
                className="w-full h-14 font-bold text-base shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
                isLoading={isProcessing}
              >
                {paymentMethod === "ausd"
                  ? `Confirm ${formatCurrency(debtAmount)} with Virtual AUSD`
                  : `Pay ${pythConfig?.symbol || "$"}${formattedConverted} ${payCurrency} with Apple Pay`}
              </Button>
            </div>
          </div>
          
          {/* Partner Branding */}
        <div className="mt-6 flex items-center justify-center gap-2.5 text-slate-500 dark:text-white/50 text-xs font-medium">
           <span>Powered by</span>
           <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-all text-slate-700 dark:text-white/80">
             <MonadLogo className="h-3.5 w-auto" />
             <span className="text-slate-300 dark:text-white/20">×</span>
             <AgoraLogo className="h-3.5 w-auto" />
             <span className="text-slate-300 dark:text-white/20">×</span>
             <DynamicLogo className="h-3.5 w-auto" />
             <span className="text-slate-300 dark:text-white/20">×</span>
             <PythLogo className="h-3.5 w-auto" />
           </div>
        </div>
      </div>
      </div>
    </Sheet>
  );
}
