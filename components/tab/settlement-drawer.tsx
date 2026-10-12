"use client";

import { useState, useMemo } from "react";
import { Zap, AlertCircle, Coins, CreditCard, Sparkles, Check, Plus } from "lucide-react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import { ReceiptView } from "../ReceiptView";
import { MonadLogo, AgoraLogo, PythLogo } from "../ui/partner-logo";
import { AddFundsDrawer } from "./add-funds-drawer";

import { useUserProfile, settleTab, useVirtualBalance, deductSettledPayout, useStoredTabMembers, useWorkspaceMode, useDeveloperMode } from "../../lib/user";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireSettlementConfetti, fireFaucetConfetti } from "../../lib/confetti";
import { SUPPORTED_CURRENCIES, usePythRate } from "../../lib/pyth";
import { erc20Abi, encodeFunctionData, createPublicClient, http, isAddress } from "viem";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { usePrivy } from "@privy-io/react-auth";
import { useRealAusdBalance } from "../../lib/onchain";
import { monadTestnet } from "../../lib/chains";
import { authenticateWithBiometrics } from "../../lib/biometrics";
import { PasskeyPromptModal, isPasskeyEnrolled } from "../ui/passkey-prompt-modal";
import { PaymentConfirmationModal } from "../ui/payment-confirmation-modal";

const MeshTabLedgerABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "groupId", "type": "string" },
      { "internalType": "address", "name": "creditor", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "payNettedDebt",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export interface CreditorSettlementShare {
  creditorName: string;
  creditorAddress?: `0x${string}`;
  amountCents: number;
}

/**
 * Computes deterministic greedy bipartite matching shares for this debtor
 * against all group creditors with positive net balances.
 */
export function computeDebtorCreditorSettlements(
  members: Array<{ name: string; balance?: number; walletAddress?: string }>,
  debtorName: string,
  totalDebtCents: number
): CreditorSettlementShare[] {
  if (totalDebtCents <= 0) return [];

  const credPool = members
    .filter(m => (m.balance ?? 0) > 0)
    .map(c => ({
      name: c.name,
      walletAddress: c.walletAddress,
      remaining: c.balance ?? 0
    }));

  const debtPool = members
    .filter(m => (m.balance ?? 0) < 0)
    .map(d => ({
      name: d.name,
      remaining: Math.abs(d.balance ?? 0)
    }));

  let cIdx = 0;
  let dIdx = 0;
  const userTransfers: CreditorSettlementShare[] = [];

  while (cIdx < credPool.length && dIdx < debtPool.length) {
    const cred = credPool[cIdx];
    const debt = debtPool[dIdx];

    if (cred.remaining <= 0) {
      cIdx++;
      continue;
    }
    if (debt.remaining <= 0) {
      dIdx++;
      continue;
    }

    const settleAmount = Math.min(cred.remaining, debt.remaining);
    if (settleAmount > 0) {
      cred.remaining -= settleAmount;
      debt.remaining -= settleAmount;

      if (debt.name.toLowerCase() === debtorName.toLowerCase()) {
        userTransfers.push({
          creditorName: cred.name,
          creditorAddress: cred.walletAddress as `0x${string}` | undefined,
          amountCents: settleAmount
        });
      }
    }
  }

  // Fallback 1: If debtor was not found in debtPool or debtPool was empty, match against creditors directly
  if (userTransfers.length === 0 && credPool.length > 0) {
    let remDebt = totalDebtCents;
    const initialCreditors = members.filter(m => (m.balance ?? 0) > 0);
    for (const cred of initialCreditors) {
      if (remDebt <= 0) break;
      const share = Math.min(cred.balance ?? 0, remDebt);
      if (share > 0) {
        userTransfers.push({
          creditorName: cred.name,
          creditorAddress: cred.walletAddress as `0x${string}` | undefined,
          amountCents: share
        });
        remDebt -= share;
      }
    }
  }

  // Fallback 2: If no creditors had positive balance recorded yet, fallback to first non-debtor member
  if (userTransfers.length === 0) {
    const candidate = members.find(m => m.name.toLowerCase() !== debtorName.toLowerCase());
    if (candidate) {
      userTransfers.push({
        creditorName: candidate.name,
        creditorAddress: candidate.walletAddress as `0x${string}` | undefined,
        amountCents: totalDebtCents
      });
    }
  }

  return userTransfers;
}

interface SettlementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debtAmount: number; // in cents
  tabId?: string;
  currentUserName?: string;
  onConfirmPayment?: () => void;
}

export function SettlementDrawer({ isOpen, onClose, debtAmount, tabId = "lisbon-24", currentUserName, onConfirmPayment }: SettlementDrawerProps) {
  const profile = useUserProfile();
  const { isDeveloperMode } = useDeveloperMode();
  const { mode: workspaceMode } = useWorkspaceMode();
  const { client } = useSmartWallets();
  const { user } = usePrivy();
  const { balance: testnetBalance, refetch: refetchTestnetBalance } = useRealAusdBalance(workspaceMode);
  const { balance: virtualBalance, deduct, topUp } = useVirtualBalance();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const activeUser = currentUserName || profile.name || "David";
  const { members: tabMembers } = useStoredTabMembers(tabId, activeUser);
  
  // Compute exact multi-creditor settlement shares via greedy bipartite matching
  const creditorTransfers = useMemo(() => {
    return computeDebtorCreditorSettlements(tabMembers, activeUser, debtAmount);
  }, [tabMembers, activeUser, debtAmount]);

  // Primary creditor fallback for legacy or single-recipient labels
  const primaryCreditor = creditorTransfers[0]?.creditorName || tabMembers.find(m => m.balance > 0)?.name || (workspaceMode === "sample" && tabId === "lisbon-24" ? "Aisha" : undefined);
  
  const recipientDisplay = creditorTransfers.length > 1
    ? creditorTransfers.map(t => t.creditorName).join(", ")
    : primaryCreditor || "creditor";

  const [paymentMethod, setPaymentMethod] = useState<"ausd" | "card">("ausd");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>(undefined);
  const [justToppedUp, setJustToppedUp] = useState(false);

  const defaultPayCurrency = tabId.includes("lisbon") ? "EUR" : "USD";
  const [payCurrency, setPayCurrency] = useState<string>(defaultPayCurrency);
  const { rate: pythRate, config: pythConfig } = usePythRate(payCurrency);

  const debtInUsd = debtAmount / 100;
  const convertedAmount = pythRate > 0 ? (debtInUsd / pythRate) : debtInUsd;
  const formattedConverted = payCurrency === "JPY" 
    ? Math.round(convertedAmount).toLocaleString() 
    : convertedAmount.toFixed(2);

  const activeBalance = workspaceMode === "testnet" ? testnetBalance * 100 : virtualBalance; // convert testnet balance to cents for comparison
  const hasEnoughVirtual = activeBalance >= debtAmount;

  const handleSettle = async (opts?: { confirmed?: boolean; bypassBiometrics?: boolean } | React.MouseEvent) => {
    const isConfirmedByUser = Boolean(opts && "confirmed" in opts && opts.confirmed);
    const bypassBiometrics = Boolean(opts && "bypassBiometrics" in opts && opts.bypassBiometrics);

    if (onConfirmPayment) {
      onConfirmPayment();
      return;
    }

    // Passkey Gate: on Testnet with AUSD, verify user has an enrolled passkey unless snoozed or confirmed
    const isSnoozed = typeof window !== "undefined" && localStorage.getItem("mesh_snooze_passkey_prompt") === "true";
    if (workspaceMode === "testnet" && paymentMethod === "ausd" && !isPasskeyEnrolled(user) && !isConfirmedByUser) {
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
      const authRes = await authenticateWithBiometrics("Authorize Settlement Payment");
      if (authRes.canceled) {
        toast.info("Payment Canceled", { description: "Biometric authentication was canceled." });
        return;
      }
    }

    setIsProcessing(true);

    let confirmedTxHash: string | undefined = undefined;
    if (workspaceMode === "testnet" && paymentMethod === "ausd") {
      try {
        if (!client) throw new Error("Could not find connected embedded wallet.");

        if (creditorTransfers.length === 0) {
          toast.error("No creditors identified to settle with.");
          setIsProcessing(false);
          return;
        }

        // [OVERSEER MANDATE - Baseline 3 & 10]: Strict EVM verification on testnet (Zero Mock Fallback)
        const unlinked = creditorTransfers.filter(
          t => !t.creditorAddress || !isAddress(t.creditorAddress)
        );

        if (unlinked.length > 0) {
          const names = unlinked.map(u => u.creditorName).join(", ");
          toast.error("Account not linked", {
            description: `${names} ${unlinked.length > 1 ? "have" : "has"} not connected their account to this tab yet. Please ask them to open and sync the tab.`
          });
          setIsProcessing(false);
          return;
        }

        const ausdAddress = (process.env.NEXT_PUBLIC_AGORA_AUSD_ADDRESS || "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC") as `0x${string}`;
        const ledgerAddress = (process.env.NEXT_PUBLIC_MESH_TAB_LEDGER_ADDRESS || "0x54f02333ea8D80C175A1C8Bdb71ef709cF424C83") as `0x${string}`;
        
        // debtAmount is in cents. AUSD has 6 decimals (1 cent = 10,000 wei).
        const totalAmountWei = BigInt(debtAmount) * BigInt(10 ** 4); 

        toast.loading(
          creditorTransfers.length > 1
            ? `Processing atomic settlement across ${creditorTransfers.length} creditors...`
            : `Processing settlement with ${creditorTransfers[0]?.creditorName || "creditor"}...`,
          { id: "tx-toast" }
        );

        // [ATOMIC ERC-4337 BATCHING]: Single approve for total amount + individual payNettedDebt per creditor in 1 UserOp
        const calls: Array<{ to: `0x${string}`; data: `0x${string}` }> = [
          {
            to: ausdAddress,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [ledgerAddress, totalAmountWei]
            })
          }
        ];

        for (const transfer of creditorTransfers) {
          const creditorWei = BigInt(transfer.amountCents) * BigInt(10 ** 4);
          calls.push({
            to: ledgerAddress,
            data: encodeFunctionData({
              abi: MeshTabLedgerABI,
              functionName: "payNettedDebt",
              args: [tabId, transfer.creditorAddress as `0x${string}`, creditorWei]
            })
          });
        }

        const txHash = await (client as any).sendTransaction({
          calls,
          uiOptions: {
            showWalletUIs: isDeveloperMode
          }
        });

        const publicClient = createPublicClient({
            chain: monadTestnet,
            transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        
        toast.dismiss("tx-toast");
        confirmedTxHash = txHash;
        setLastTxHash(txHash);

      } catch (err: any) {
        toast.dismiss("tx-toast");
        console.error("Testnet Settlement Error:", err);
        toast.error("Payment failed", { description: err.message || "We couldn't process your payment at this time. Please try again." });
        setIsProcessing(false);
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 1800));
    }
    settleTab(tabId, activeUser, debtAmount, confirmedTxHash);
    setIsProcessing(false);
    setIsSuccess(true);
    
    // Smooth celebrations
    sounds.playSuccessChime();
    fireSettlementConfetti();
    toast.success("Payment Successful!", {
      description: `Your balance of ${formatCurrency(debtAmount)} has been cleared.`
    });
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
        recipient={recipientDisplay}
        txHash={lastTxHash}
      />
    );
  }

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} size="4xl">
      <div className="p-6 md:p-8 flex flex-col items-center bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        <div className="w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20 mx-auto">
              <Zap className="w-8 h-8 text-rose-500 dark:text-rose-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Settle Your Debt</h2>
            <p className="text-slate-500 dark:text-white/60 text-sm max-w-sm mx-auto">
              {creditorTransfers.length > 1
                ? `Paying off your netted residual balance across ${creditorTransfers.length} group members.`
                : primaryCreditor 
                  ? `Paying off your netted residual balance directly to ${primaryCreditor}.`
                  : "Paying off your netted residual balance."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Left Column: Total Due & Multi-Creditor Breakdown */}
            <div>
              {/* Total Due Card */}
              <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 mb-4 shadow-sm text-center md:text-left">
                <span className="text-slate-500 dark:text-white/40 font-semibold text-xs uppercase tracking-wider">Total Due</span>
                <div className="text-5xl font-bold text-slate-900 dark:text-white my-2 tabular-nums tracking-tight">
                  {formatCurrency(debtAmount)}
                </div>
                <span className="text-slate-500 dark:text-white/60 font-semibold text-sm">Mesh Balance</span>
              </div>

              {/* Netted Multi-Creditor Breakdown */}
              {creditorTransfers.length > 1 && (
                <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 text-left">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                      Netted Creditor Breakdown
                    </span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                      1 Atomic Tap
                    </span>
                  </div>
                  <div className="space-y-2">
                    {creditorTransfers.map((t) => (
                      <div key={t.creditorName} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[11px]">
                            {t.creditorName.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-white/90">{t.creditorName}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(t.amountCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                          {workspaceMode === "testnet" ? "Mesh Balance" : "Account Balance"}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 font-mono">
                        {formatCurrency(activeBalance)} Available
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

                {/* Option B: Debit / Credit Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    paymentMethod === "card"
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
                        Debit / Credit Card
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                        Instant card checkout with 0 FX fees
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === "card"
                        ? "border-indigo-600 bg-indigo-600"
                        : "border-slate-300 dark:border-white/30"
                    }`}
                  >
                    {paymentMethod === "card" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              </div>



              {paymentMethod === "card" && (
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
                      <span className="text-slate-500 dark:text-white/60 text-[11px]">Card Charge:</span>
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

              {paymentMethod === "ausd" && !hasEnoughVirtual ? (
                <div className="space-y-3 w-full">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                    <span>Account Balance: <strong>{formatCurrency(activeBalance)}</strong></span>
                    <span>Required: <strong>{formatCurrency(debtAmount)}</strong></span>
                  </div>
                  <Button 
                    onClick={() => {
                      sounds.playClick();
                      setShowAddFunds(true);
                    }}
                    variant="primary" 
                    size="lg" 
                    className="w-full h-14 font-bold text-base shadow-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-white"
                  >
                    <Plus className="w-5 h-5" /> Add Funds to Settle
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => handleSettle()}
                  disabled={paymentMethod === "ausd" && !hasEnoughVirtual}
                  variant="primary" 
                  size="lg" 
                  className="w-full h-14 font-bold text-base shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
                  isLoading={isProcessing}
                >
                  {paymentMethod === "ausd"
                    ? (workspaceMode === "testnet" ? `Confirm ${formatCurrency(debtAmount)} with Mesh Balance` : `Confirm ${formatCurrency(debtAmount)} with Account Balance`)
                    : `Pay ${pythConfig?.symbol || "$"}${formattedConverted} ${payCurrency} with Card`}
                </Button>
              )}
            </div>
          </div>
          
          {/* Partner Branding */}
          {isDeveloperMode ? (
            <div className="mt-6 flex items-center justify-center gap-2.5 text-slate-500 dark:text-white/50 text-xs font-medium">
               <span>Powered by</span>
               <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-all text-slate-700 dark:text-white/80">
                 <MonadLogo className="h-3.5 w-auto" />
                 <span className="text-slate-300 dark:text-white/20">×</span>
                 <AgoraLogo className="h-3.5 w-auto" />
                 <span className="text-slate-300 dark:text-white/20">×</span>
                 <PythLogo className="h-3.5 w-auto" />
               </div>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 dark:text-white/40 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Encrypted Instant Settlement • Zero Bank Fees</span>
            </div>
          )}
      </div>
      </div>
    </Sheet>

    <AddFundsDrawer 
      isOpen={showAddFunds} 
      suggestedAmountCents={Math.max(0, debtAmount - activeBalance) || debtAmount}
      reason="Settle Tab Debt"
      onClose={() => setShowAddFunds(false)} 
      onSuccess={() => {
        if (workspaceMode === "testnet") {
          refetchTestnetBalance();
        }
      }} 
    />

    <PasskeyPromptModal
      isOpen={showPasskeyPrompt}
      onClose={() => setShowPasskeyPrompt(false)}
      onSuccess={() => {
        setShowPasskeyPrompt(false);
        handleSettle();
      }}
      onContinueWithoutPasskey={() => {
        setShowPasskeyPrompt(false);
        setShowConfirmModal(true);
      }}
      actionTitle="settle your netted debt"
    />

    <PaymentConfirmationModal
      isOpen={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      onConfirm={() => {
        setShowConfirmModal(false);
        handleSettle({ confirmed: true, bypassBiometrics: true });
      }}
      amountCents={debtAmount}
      title="Confirm Debt Settlement"
      subtitle={`Settle balance with ${recipientDisplay}`}
      recipient={recipientDisplay}
      paymentMethodLabel={
        paymentMethod === "ausd"
          ? "Agora AUSD Balance"
          : "Visa Platinum Debit"
      }
      feeLabel="$0.00 (Gas Covered)"
      actionLabel="Settle"
      currency="AUSD"
    />
  </>
  );
}
