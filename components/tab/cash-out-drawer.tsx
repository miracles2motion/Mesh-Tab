"use client";

import { useState } from "react";
import { ArrowDownToLine, CheckCircle2, Building2, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import Image from "next/image";
import { AgoraLogo, PrivyLogo } from "../ui/partner-logo";

import { DEFAULT_USER_NAME, useSettledPayoutBalance, useWorkspaceMode, deductVirtualBalance, useDeveloperMode, saveStoredSettlement } from "../../lib/user";
import { useAvailableBalance } from "../../lib/balance";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import { fireSettlementConfetti } from "../../lib/confetti";
import { addNotification } from "../../lib/notifications";
import { TransactionOverlay, TransactionState } from "../ui/transaction-overlay";
import { authenticateWithBiometrics } from "../../lib/biometrics";
import { usePrivy } from "@privy-io/react-auth";
import { PasskeyPromptModal, isPasskeyEnrolled } from "../ui/passkey-prompt-modal";
import { PaymentConfirmationModal } from "../ui/payment-confirmation-modal";

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
  const { isDeveloperMode } = useDeveloperMode();
  const [method, setMethod] = useState<"card" | "bank">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);
  const { user } = usePrivy();
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleCashOut = async (opts?: { confirmed?: boolean; bypassBiometrics?: boolean } | React.MouseEvent) => {
    const isConfirmedByUser = Boolean(opts && "confirmed" in opts && opts.confirmed);
    const bypassBiometrics = Boolean(opts && "bypassBiometrics" in opts && opts.bypassBiometrics);

    if (withdrawableAmount <= 0) {
      toast.error("No funds available", { description: "You have no withdrawable settled balance to cash out." });
      return;
    }

    // Passkey Gate: on Testnet in Consumer Mode, verify user has an enrolled passkey unless confirmed
    const isSnoozed = typeof window !== "undefined" && localStorage.getItem("mesh_snooze_passkey_prompt") === "true";
    if (!isDeveloperMode && workspaceMode === "testnet" && !isPasskeyEnrolled(user) && !isConfirmedByUser) {
      if (!isSnoozed && !bypassBiometrics) {
        setShowPasskeyPrompt(true);
        return;
      } else {
        setShowConfirmModal(true);
        return;
      }
    }

    // Prompt native device biometrics only if passkey is enrolled and not bypassed
    if (!bypassBiometrics && isPasskeyEnrolled(user)) {
      const authRes = await authenticateWithBiometrics("Authorize Bank Withdrawal");
      if (authRes.canceled) {
        toast.info("Withdrawal Canceled", { description: "Biometric authentication was canceled." });
        return;
      }
    }

    setIsProcessing(true);
    setWithdrawnAmount(withdrawableAmount);
    
    setTxState("processing");
    await new Promise((r) => setTimeout(r, 1200));
    
    if (workspaceMode === "testnet") {
      setTxState("idle");
      setIsProcessing(false);
      setIsSuccess(true);
      toast.info("Testnet Payout Simulated", {
        description: `Off-ramping ${formatCurrency(withdrawableAmount)} to bank is simulated on Monad Testnet.`
      });
      return;
    }

    withdrawPayout(withdrawableAmount);
    deductVirtualBalance(withdrawableAmount);
    sounds.playSuccessChime();
    fireSettlementConfetti();
    toast.success("Cash Out Initiated!", {
      description: `Sent ${formatCurrency(withdrawableAmount)} via ${method === "card" ? "Visa Direct (Instant)" : "ACH Bank Transfer"}.`
    });

    try {
      saveStoredSettlement({
        id: `cashout-${Date.now()}`,
        tabId: "wallet",
        tabName: "Bank Withdrawal",
        payer: "You",
        amount: withdrawableAmount,
        recipient: method === "card" ? "Visa Direct" : "Bank Transfer",
        timestamp: Date.now(),
        type: "settlement",
        direction: "out"
      }, workspaceMode);

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
                {isDeveloperMode 
                  ? "Transfer your received group settlements from Agora AUSD directly into your personal bank account."
                  : "Transfer your settled balance directly to your personal bank account or debit card."}
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
                  <span>
                    {isDeveloperMode 
                      ? "Secured by Privy Smart Accounts • Backed 1:1 by Agora."
                      : "Secured by Hardware Passkeys • Zero bank transfer fees."}
                  </span>
                </div>

                <Button
                  onClick={handleCashOut}
                  variant="primary"
                  size="lg"
                  className="w-full h-14 font-bold text-base shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
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

                {/* Settlement & Payout Partner Badges */}
                {isDeveloperMode ? (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-slate-500 dark:text-white/50 text-xs font-medium">
                    <span>Settlement & Payouts powered by</span>
                    <div className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity text-slate-800 dark:text-white">
                      <PrivyLogo className="h-3.5 w-auto" />
                      <span className="text-slate-400 dark:text-white/30 text-[10px] font-bold">&</span>
                      <AgoraLogo className="h-4 w-auto" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 dark:text-white/40 text-[11px] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Instant Bank Payouts • 0% Platform Fee</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : workspaceMode === "testnet" ? (
          isDeveloperMode ? (
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
            <div className="py-6 flex flex-col items-center max-w-md mx-auto text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 shadow-lg shadow-emerald-500/15">
                <Building2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
                Instant Bank Payouts Preview
              </h3>
              <p className="text-slate-500 dark:text-white/60 text-xs sm:text-sm mb-6 max-w-sm leading-relaxed">
                Transfers settle directly to your bank account via Visa Direct in ~30 seconds.
              </p>

              {/* Linked Account Card */}
              <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-4 text-xs space-y-2.5 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-white/50">Linked Destination</span>
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Chase Checking (••••4821)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-white/50">Transfer Amount</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {formatCurrency(withdrawnAmount || withdrawableAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-white/50">Estimated Arrival</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Instant (~30 seconds)
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 dark:border-white/5">
                  <span className="text-slate-500 dark:text-white/50">Platform Fee</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    $0.00 (Zero Fee)
                  </span>
                </div>
              </div>

              {/* Production Launch Note */}
              <div className="w-full p-3.5 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 mb-6 text-left flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Production bank off-ramps will activate on launch. Your testnet balance remains secure and available for group netting.
                </span>
              </div>

              <Button
                onClick={handleClose}
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-lg"
              >
                Done
              </Button>
            </div>
          )
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
                <span className="font-semibold text-slate-800 dark:text-white">
                  {isDeveloperMode ? "Agora AUSD" : "Digital USD (Instant)"}
                </span>
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

    <PasskeyPromptModal
      isOpen={showPasskeyPrompt}
      onClose={() => setShowPasskeyPrompt(false)}
      onSuccess={() => {
        setShowPasskeyPrompt(false);
        handleCashOut();
      }}
      onContinueWithoutPasskey={() => {
        setShowPasskeyPrompt(false);
        if (!isDeveloperMode) {
          setShowConfirmModal(true);
        } else {
          toast.info("Using Cloud Smart Wallet", {
            description: "Authorizing withdrawal using your secure embedded account."
          });
          handleCashOut({ bypassBiometrics: true });
        }
      }}
      actionTitle="authorize bank withdrawal"
    />

    <PaymentConfirmationModal
      isOpen={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      onConfirm={() => {
        setShowConfirmModal(false);
        handleCashOut({ confirmed: true, bypassBiometrics: true });
      }}
      amountCents={withdrawableAmount}
      title="Confirm Bank Withdrawal"
      subtitle={`Transfer settled funds to your ${method === "card" ? "debit card" : "bank account"}.`}
      recipient={method === "card" ? "Visa Direct (•••• 4242)" : "Chase Checking (•••• 8821)"}
      paymentMethodLabel="Agora AUSD Account Balance"
      feeLabel="$0.00 (Gas Covered)"
      actionLabel="Withdraw"
      currency="AUSD"
    />
    </>
  );
}
