"use client";

import { useState } from "react";
import { ArrowDownToLine, CheckCircle2, Building2, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import Image from "next/image";
import { AgoraLogo } from "../ui/partner-logo";

import { DEFAULT_USER_NAME, useSettledPayoutBalance, useWorkspaceMode } from "../../lib/user";
import { useAvailableBalance } from "../../lib/balance";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import { fireSettlementConfetti } from "../../lib/confetti";
import { addNotification } from "../../lib/notifications";
import { TransactionOverlay, TransactionState } from "../ui/transaction-overlay";

interface CashOutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
}

export function CashOutDrawer({
  isOpen,
  onClose,
  currentUserName = DEFAULT_USER_NAME
}: CashOutDrawerProps) {
  const { withdrawPayout } = useSettledPayoutBalance();
  const { totalCents, heldCents, availableCents } = useAvailableBalance(currentUserName);
  const settledBalance = totalCents;
  const totalOutstandingDebt = heldCents;
  const withdrawableAmount = availableCents;

  const { mode: workspaceMode } = useWorkspaceMode();
  const [method, setMethod] = useState<"card" | "bank">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);

  const handleCashOut = async () => {
    setIsProcessing(true);
    setWithdrawnAmount(withdrawableAmount);
    
    // Passkey Authentication Flow
    setTxState("authenticating");
    await new Promise((r) => setTimeout(r, 1500));
    setTxState("processing");
    await new Promise((r) => setTimeout(r, 2000));
    
    if (workspaceMode === "testnet") {
      setTxState("idle");
      setIsProcessing(false);
      setIsSuccess(true);
      return;
    }

    withdrawPayout(withdrawableAmount);
    sounds.playSuccessChime();
    fireSettlementConfetti();
    toast.success("Cash Out Initiated!", {
      description: `Sent ${formatCurrency(withdrawableAmount)} via ${method === "card" ? "Visa Direct (Instant)" : "ACH Bank Transfer"}.`
    });

    try {
      addNotification({
        type: "cashout",
        title: "Cash Out to Bank",
        desc: `Transferred ${formatCurrency(withdrawableAmount)} via ${method === "card" ? "Visa Direct" : "ACH Bank Transfer"} to your bank account.`,
        actor: "You",
        amount: withdrawableAmount,
        link: "/home"
      });
    } catch (e) {}

    setTxState("success");
    await new Promise((r) => setTimeout(r, 1000));
    setTxState("idle");
    
    setIsProcessing(false);
    setIsSuccess(true);
  };

  const handleClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <>
    <Sheet isOpen={isOpen} onClose={handleClose} size="4xl">
      <div className="p-6 md:p-8 flex flex-col items-center bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        {!isSuccess ? (
          <div className="w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20 mx-auto">
                <ArrowDownToLine className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Cash Out to Bank</h2>
              <p className="text-slate-500 dark:text-white/60 text-sm max-w-sm mx-auto">
                Transfer your received group settlements from Agora AUSD directly into your personal bank account.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Left Column: Balances */}
              <div>

            {/* Available Amount Card */}
            <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 mb-6 shadow-sm">
              
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="text-left">
                  <span className="text-slate-500 dark:text-white/60 font-semibold text-xs uppercase tracking-wider block">Total Settled</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(settledBalance)}</span>
                </div>
                <div className="text-right">
                  <span className="text-rose-500 font-semibold text-xs uppercase tracking-wider block">Active Debts</span>
                  <span className="text-xl font-bold text-rose-500 tabular-nums">-{formatCurrency(totalOutstandingDebt)}</span>
                </div>
              </div>

              <span className="text-slate-500 dark:text-white/40 font-semibold text-xs uppercase tracking-wider block text-left">
                Available to Withdraw
              </span>
              <div className="text-left text-5xl font-bold text-emerald-600 dark:text-emerald-400 my-2 tabular-nums tracking-tight">
                {formatCurrency(withdrawableAmount)}
              </div>
              
              {totalOutstandingDebt > 0 && (
                <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium text-left">
                  You must settle your active debts in other groups to unlock the remaining {formatCurrency(totalOutstandingDebt)}.
                </div>
              )}
            </div>
              </div>
              {/* Right Column: Methods & Actions */}
              <div>
                {/* Payout Method Selection */}
                <div className="w-full space-y-3 mb-6 text-left">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">
                    Select Payout Destination
                  </label>

                  <button
                    type="button"
                    onClick={() => setMethod("card")}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      method === "card"
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-sm"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                          Instant Debit Card Payout
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-white/50">
                          Visa Direct / Mastercard • Arrives in ~2 mins
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        method === "card"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 dark:border-white/30"
                      }`}
                    >
                      {method === "card" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("bank")}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      method === "bank"
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-sm"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                          Direct Checking Account
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-white/50">
                          ACH / SEPA / Faster Payments • 1 business day
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        method === "bank"
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 dark:border-white/30"
                      }`}
                    >
                      {method === "bank" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                </div>

                {/* Security Guarantee */}
                <div className="w-full flex items-center gap-2 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 mb-6 text-xs text-slate-600 dark:text-white/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Institutional 1:1 reserve cashout backed by Agora.</span>
                </div>

                <Button
                  onClick={handleCashOut}
                  variant="primary"
                  size="lg"
                  className="w-full h-14 font-bold text-base shadow-xl hover:-translate-y-0.5 transition-all"
                  disabled={isProcessing || withdrawableAmount <= 0}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Transferring to Bank...
                    </span>
                  ) : withdrawableAmount > 0 ? (
                    `Transfer ${formatCurrency(withdrawableAmount)} to Bank`
                  ) : (
                    "Settle debts to unlock funds"
                  )}
                </Button>

                {/* Off-ramp Partner Badge */}
                <div className="mt-6 flex items-center justify-center gap-3 text-slate-500 dark:text-white/50 text-xs font-medium">
                  <span>Off-ramp powered by</span>
                  <div className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity text-slate-800 dark:text-white">
                    <AgoraLogo className="h-4 w-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : workspaceMode === "testnet" ? (
          <div className="py-8 flex flex-col items-center max-w-md mx-auto text-center animate-in fade-in zoom-in duration-500">
            <div className="w-full relative aspect-square max-w-[280px] mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
              <Image 
                src="/haha-meme.jpg" 
                alt="Chog Security Guard - Testnet Money Stays On Testnet" 
                fill 
                className="object-cover"
              />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Nice try 😏
            </h3>
            <p className="text-slate-500 dark:text-white/60 text-sm mb-8 leading-relaxed">
              Withdrawals to real bank accounts will go live at launch. Don't worry, your balance is safe and sound!
            </p>

            <Button
              onClick={handleClose}
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-lg"
            >
              Got it
            </Button>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Transfer Initiated!
            </h3>
            <p className="text-slate-500 dark:text-white/60 text-sm max-w-xs mb-6 leading-relaxed text-center">
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(withdrawnAmount)}
              </span>{" "}
              is on its way to your {method === "card" ? "Debit Card" : "Bank Account"}.
            </p>

            <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 text-xs text-slate-500 dark:text-white/60 space-y-2 text-left">
              <div className="flex justify-between">
                <span>Payout Method</span>
                <span className="font-semibold text-slate-800 dark:text-white">
                  {method === "card" ? "Visa Direct (Instant)" : "ACH Bank Transfer"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Settlement Asset</span>
                <span className="font-semibold text-slate-800 dark:text-white">Agora AUSD</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Arrival</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {method === "card" ? "Within 2 minutes" : "Next business day"}
                </span>
              </div>
            </div>

            <Button onClick={handleClose} variant="primary" className="w-full h-12 font-semibold">
              Done
            </Button>
          </div>
        )}
      </div>
    </Sheet>
    <TransactionOverlay 
      state={txState} 
      messages={{
        authenticating: "Awaiting biometric authentication to authorize withdrawal...",
        processing: "Processing off-ramp transfer...",
        success: "Transfer initiated!"
      }}
    />
    </>
  );
}
