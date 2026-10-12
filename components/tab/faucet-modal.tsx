"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { 
  Coins, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  History,
  ReceiptText,
  Clock
} from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { useVirtualBalance, useWorkspaceMode, useDeveloperMode } from "../../lib/user";
import { useClaimWelcomeBonus, useRealAusdBalance, useFaucetCooldown } from "../../lib/onchain";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireFaucetConfetti } from "../../lib/confetti";
import { AnimatedCounter } from "../ui/animated-counter";
import { LiveTime } from "../ui/live-time";
import { getStoredClaimHistory, addClaimRecord, ClaimRecord } from "../../lib/claims";
import { TransactionOverlay, TransactionState } from "../ui/transaction-overlay";
import { ReceiptView } from "../ReceiptView";
import { PaymentConfirmationModal } from "../ui/payment-confirmation-modal";
import { PasskeyPromptModal, isPasskeyEnrolled } from "../ui/passkey-prompt-modal";

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FaucetModal({ isOpen, onClose }: FaucetModalProps) {
  const { mode: workspaceMode } = useWorkspaceMode();
  const { isDeveloperMode } = useDeveloperMode();
  const { isCooldownActive, secondsRemaining } = useFaucetCooldown();
  const { client } = useSmartWallets();
  const { user } = usePrivy();
  const walletAddress = client?.account?.address || user?.wallet?.address || (typeof window !== "undefined" ? localStorage.getItem("meshTab_walletAddress") : null);

  const { balance: virtualBalance, topUp } = useVirtualBalance();
  const { balance: testnetBalance } = useRealAusdBalance(workspaceMode);
  const { claimBonus, isClaiming: isTestnetClaiming } = useClaimWelcomeBonus(workspaceMode);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const displayBalance = workspaceMode === "testnet" ? testnetBalance * 100 : virtualBalance;
  const [isLocalClaiming, setIsLocalClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [selectedReceipt, setSelectedReceipt] = useState<{ amount: number; recipient?: string; txHash?: string } | null>(null);

  const isClaiming = workspaceMode === "testnet" ? isTestnetClaiming : isLocalClaiming;
  const hasClaimed = workspaceMode === "testnet" ? testnetBalance >= 100000 : virtualBalance >= 50000;

  // Load claims from storage
  const loadClaims = () => {
    const list = getStoredClaimHistory(walletAddress || undefined, workspaceMode);
    setClaims(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadClaims();
    }
  }, [isOpen, walletAddress, workspaceMode]);

  useEffect(() => {
    const handleUpdate = () => loadClaims();
    window.addEventListener("meshtab:claims:updated", handleUpdate);
    return () => window.removeEventListener("meshtab:claims:updated", handleUpdate);
  }, [walletAddress, workspaceMode]);

  // If user already claimed previously on Testnet but local history has no record, synthesize confirmed entries
  const displayClaims = useMemo<ClaimRecord[]>(() => {
    if (claims.length > 0) return claims;
    if (workspaceMode === "testnet" && testnetBalance >= 10000) {
      const numClaims = Math.min(10, Math.max(1, Math.floor(testnetBalance / 10000)));
      const baseTs = typeof window !== "undefined" 
        ? parseInt(localStorage.getItem("meshTab_testnet_lastFaucetClaim") || `${Date.now()}`, 10)
        : Date.now();
      
      return Array.from({ length: numClaims }, (_, idx) => ({
        id: `faucet-claim-${idx + 1}`,
        amount: 10000,
        currency: "Agora AUSD",
        network: "Monad Testnet",
        timestamp: baseTs - (idx * 3600000),
        walletAddress: walletAddress || undefined,
        explorerUrl: "https://testnet.monadvision.com/address/0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C"
      }));
    }
    return [];
  }, [claims, workspaceMode, testnetBalance, walletAddress]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    sounds.playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Transaction Hash Copied!", { description: text });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClaim = async (opts?: { confirmed?: boolean; bypassBiometrics?: boolean } | React.MouseEvent) => {
    const isConfirmedByUser = Boolean(opts && "confirmed" in opts && opts.confirmed);
    const bypassBiometrics = Boolean(opts && "bypassBiometrics" in opts && opts.bypassBiometrics);

    if (workspaceMode === "testnet") {
      // Passkey Gate: on Testnet in Consumer Mode, verify user has an enrolled passkey unless confirmed
      const isSnoozed = typeof window !== "undefined" && localStorage.getItem("mesh_snooze_passkey_prompt") === "true";
      if (!isDeveloperMode && !isPasskeyEnrolled(user) && !isConfirmedByUser) {
        if (!isSnoozed && !bypassBiometrics) {
          setShowPasskeyPrompt(true);
          return;
        } else {
          setShowConfirmModal(true);
          return;
        }
      }

      if (!isDeveloperMode) {
        setTxState("authenticating");
        sounds.playClick();
        await new Promise((r) => setTimeout(r, 450));
        setTxState("processing");
      }
      const res = await claimBonus();
      if (res.success) {
        if (!isDeveloperMode) {
          setTxState("success");
          sounds.playCoinClink();
          fireFaucetConfetti();
          await new Promise((r) => setTimeout(r, 650));
          setTxState("idle");
        } else {
          setJustClaimed(true);
          sounds.playCoinClink();
          fireFaucetConfetti();
          setTimeout(() => setJustClaimed(false), 2500);
        }
        loadClaims();
        toast.success(isDeveloperMode ? "Agora AUSD Claimed!" : "Funds Credited!", {
          description: isDeveloperMode ? "$10,000.00 AUSD confirmed on Monad Testnet." : "$10,000.00 added to your Mesh balance."
        });
        if (!isDeveloperMode) {
          setSelectedReceipt({
            amount: 1000000,
            recipient: "Demo Bonus Allocation",
            txHash: res.txHash
          });
        }
      } else {
        setTxState("idle");
        toast.info(res.error || "Your wallet already holds the allocated testnet funds!");
      }
      return;
    }

    setIsLocalClaiming(true);
    if (!isDeveloperMode) {
      setTxState("authenticating");
      sounds.playClick();
      await new Promise((r) => setTimeout(r, 450));
      setTxState("processing");
    }
    await new Promise((r) => setTimeout(r, 500));
    topUp(50000); // +$500.00
    
    addClaimRecord({
      amount: 500,
      currency: "USD Sandbox",
      network: "Demo Sandbox",
      timestamp: Date.now(),
      walletAddress: walletAddress || undefined
    }, "sample");

    loadClaims();
    setIsLocalClaiming(false);
    if (!isDeveloperMode) {
      setTxState("success");
      sounds.playCoinClink();
      fireFaucetConfetti();
      await new Promise((r) => setTimeout(r, 650));
      setTxState("idle");
    } else {
      setJustClaimed(true);
      sounds.playCoinClink();
      fireFaucetConfetti();
      setTimeout(() => setJustClaimed(false), 2500);
    }

    toast.success("+$500.00 Added!", {
      description: "Added to your sandbox balance."
    });
    if (!isDeveloperMode) {
      setSelectedReceipt({
        amount: 50000,
        recipient: "Sandbox Allocation"
      });
    }
  };

  return (
    <>
      <Modal onClose={onClose} className="max-w-lg p-6 md:p-8 text-center text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center">
          {/* Faucet Icon Badge */}
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 shadow-sm">
            <Coins className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h3 className="text-xl md:text-2xl font-bold mb-1">
            {workspaceMode === "testnet" ? (isDeveloperMode ? "Agora AUSD Testnet Funds" : "Add Demo Funds") : "Sandbox Funds"}
          </h3>
          <p className="text-slate-500 dark:text-white/60 text-xs mb-5 max-w-sm leading-relaxed">
            {workspaceMode === "testnet" 
              ? (isDeveloperMode 
                  ? "Your cryptographic Monad balance used for zero-fee peer tab expenses and instant netting finality."
                  : "Free sandbox balance to test group splits, shared tabs, and instant netting.")
              : "Sandbox mock funds to test MeshTab split calculations and group debt netting."}
          </p>

          {/* Current Balance Display */}
          <div className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 mb-5 shadow-xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-white/40">
              {workspaceMode === "testnet" ? (isDeveloperMode ? "Verified Agora AUSD Balance" : "Current Net Available Balance") : "Current Virtual Balance"}
            </span>
            <div className="text-3xl md:text-4xl font-bold my-1 text-slate-900 dark:text-white tabular-nums">
              <AnimatedCounter value={displayBalance / 100} prefix="$" decimals={2} />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-500/20">
              <Zap className="w-3 h-3" /> Ready for Instant Settlement
            </span>
          </div>

          {justClaimed && (
            <div className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 mb-4 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Successfully added testnet funds!</span>
            </div>
          )}

          <Button
            onClick={handleClaim}
            disabled={isClaiming || hasClaimed || isCooldownActive}
            variant={hasClaimed || isCooldownActive ? "secondary" : "primary"}
            size="lg"
            className="w-full h-12 font-bold gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {workspaceMode === "testnet" ? (isDeveloperMode ? "Confirming on Ledger..." : "Securing Funds...") : "Adding Funds..."}
              </>
            ) : isCooldownActive ? (
              <>
                <Clock className="w-4 h-4 animate-spin text-amber-500" />
                <span>{isDeveloperMode ? `Agora Cooldown (${secondsRemaining}s remaining)` : `Next bonus unlocks in ${secondsRemaining}s`}</span>
              </>
            ) : hasClaimed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {workspaceMode === "testnet" ? "Account Allocation Ceiling Reached ($100,000)" : "Funds Added"}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {workspaceMode === "testnet" ? (isDeveloperMode ? "Claim $10,000 Agora AUSD" : "Claim $10,000 Demo Bonus") : "Add $500 Sandbox Funds"}
              </>
            )}
          </Button>

          {/* Claim History Section */}
          <div className="w-full mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10 text-left">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <History className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isDeveloperMode ? "Claim History & Blockchain Ledger" : "Recent Top-Up History"}</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                {displayClaims.length} {displayClaims.length === 1 ? "Record" : "Records"}
              </span>
            </div>

            {displayClaims.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400 dark:text-white/40">
                {isDeveloperMode 
                  ? "No claims recorded yet. Click the claim button above to record your first on-chain faucet transaction."
                  : "No top-ups recorded yet. Click the claim button above to receive demo funds."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayClaims.map((claim) => (
                  <div 
                    key={claim.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs flex flex-col gap-2 transition-all hover:border-indigo-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            +{formatCurrency(claim.amount * 100)} {isDeveloperMode ? claim.currency : "Demo Bonus"}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-white/40 flex items-center gap-1">
                            <LiveTime ts={claim.timestamp} variant="compact" />
                            <span>•</span>
                            <span>{isDeveloperMode ? claim.network : "Instant Available"}</span>
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Confirmed
                      </span>
                    </div>

                    {/* Action / Blockchain Transaction Details */}
                    {isDeveloperMode ? (
                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono text-slate-500 dark:text-white/60">
                          {claim.txHash ? (
                            <>
                              <span className="text-[10px] text-slate-400 dark:text-white/40 font-sans uppercase font-semibold">Tx:</span>
                              <span>{`${claim.txHash.slice(0, 8)}...${claim.txHash.slice(-6)}`}</span>
                              <button
                                onClick={() => handleCopy(claim.txHash!, claim.id)}
                                className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Copy Full Transaction Hash"
                              >
                                {copiedId === claim.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-white/50">
                              <span className="font-semibold text-slate-700 dark:text-white/70">Faucet:</span>
                              <span className="font-mono text-[10px]">0xd236...ee6C</span>
                            </div>
                          )}
                        </div>

                        <a
                          href={claim.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors shrink-0"
                        >
                          <span>{claim.txHash ? "View Tx on MonadVision" : "View Faucet Contract"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-400 dark:text-white/40 flex items-center gap-1 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Instant & Encrypted
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt({
                            amount: claim.amount * 100,
                            recipient: "Demo Bonus Allocation",
                            txHash: claim.txHash
                          })}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors cursor-pointer"
                        >
                          <ReceiptText className="w-3 h-3" />
                          <span>View Receipt</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-white/40">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>{workspaceMode === "testnet" ? "Test funds only · No real money involved." : "Demo Sandbox Only · No real credit card or bank funds charged."}</span>
          </div>
        </div>
      </Modal>

      <ReceiptView
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        amount={selectedReceipt?.amount || 0}
        recipient={selectedReceipt?.recipient}
        txHash={selectedReceipt?.txHash}
        type="topup"
      />

      <TransactionOverlay
        state={txState}
        messages={{
          authenticating: "Authorizing with Face ID / Touch ID...",
          processing: "Crediting $10,000 to Mesh Balance...",
          success: "Funds Credited!"
        }}
      />

      <PasskeyPromptModal
        isOpen={showPasskeyPrompt}
        onClose={() => setShowPasskeyPrompt(false)}
        onSuccess={() => {
          setShowPasskeyPrompt(false);
          handleClaim();
        }}
        onContinueWithoutPasskey={() => {
          setShowPasskeyPrompt(false);
          if (!isDeveloperMode) {
            setShowConfirmModal(true);
          } else {
            handleClaim({ bypassBiometrics: true });
          }
        }}
        actionTitle="claim testnet deposit"
      />

      <PaymentConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          handleClaim({ confirmed: true, bypassBiometrics: true });
        }}
        amountCents={1000000}
        title="Confirm $10,000 Deposit"
        subtitle="Review and claim your testnet Agora AUSD balance."
        recipient="Your MeshTab Account"
        paymentMethodLabel="Agora Testnet Reserve"
        feeLabel="$0.00 (Gas Covered)"
        actionLabel="Claim"
        currency="AUSD"
      />
    </>
  );
}
