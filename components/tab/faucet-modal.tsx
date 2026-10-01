"use client";

import { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Coins, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { useVirtualBalance, useWorkspaceMode } from "../../lib/user";
import { useClaimWelcomeBonus } from "../../lib/alchemy";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireFaucetConfetti } from "../../lib/confetti";
import { AnimatedCounter } from "../ui/animated-counter";

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FaucetModal({ isOpen, onClose }: FaucetModalProps) {
  const { mode: workspaceMode } = useWorkspaceMode();
  const { balance, topUp } = useVirtualBalance();
  const { claimBonus, isClaiming: isTestnetClaiming } = useClaimWelcomeBonus();
  const [isLocalClaiming, setIsLocalClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  const isClaiming = workspaceMode === "testnet" ? isTestnetClaiming : isLocalClaiming;

  if (!isOpen) return null;

  const handleClaim = async () => {
    if (workspaceMode === "testnet") {
      const { success, error } = await claimBonus();
      if (success) {
        setJustClaimed(true);
        sounds.playCoinClink();
        fireFaucetConfetti();
        toast.success("Welcome bonus claimed!", {
          description: "$5,000 added to your balance."
        });
        setTimeout(() => setJustClaimed(false), 2500);
      } else {
        toast.info(error || "You've already received your one-time welcome bonus!");
      }
      return;
    }

    setIsLocalClaiming(true);
    await new Promise((r) => setTimeout(r, 600));
    topUp(50000); // +$500.00
    setIsLocalClaiming(false);
    setJustClaimed(true);

    // Audio + Confetti + Toast
    sounds.playCoinClink();
    fireFaucetConfetti();
    toast.success("+$500.00 Test AUSD Minted!", {
      description: "Added to your sandbox balance."
    });

    setTimeout(() => setJustClaimed(false), 2500);
  };

  return (
    <Modal onClose={onClose} className="max-w-md p-6 md:p-8 text-center text-slate-900 dark:text-white">
      <div className="flex flex-col items-center">
        {/* Faucet Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 shadow-sm">
          <Coins className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h3 className="text-2xl font-bold mb-1">Sandbox AUSD Faucet</h3>
        <p className="text-slate-500 dark:text-white/60 text-xs mb-6 max-w-xs leading-relaxed">
          Need test dollars? Top up free play money to test paying tab debts and cashing out on Monad.
        </p>

        {/* Current Balance Display */}
        <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-6">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-white/40">
            Current Virtual Balance
          </span>
          <div className="text-4xl font-bold my-1 text-slate-900 dark:text-white tabular-nums">
            <AnimatedCounter value={balance / 100} prefix="$" decimals={2} />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <Zap className="w-3 h-3" /> Ready for Instant Settlement
          </span>
        </div>

        {justClaimed && (
          <div className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 mb-4 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Successfully added +$500.00 Test AUSD!</span>
          </div>
        )}

        <Button
          onClick={handleClaim}
          disabled={isClaiming}
          variant="primary"
          size="lg"
          className="w-full h-13 font-bold gap-2 shadow-md shadow-indigo-500/20"
        >
          <Sparkles className="w-4 h-4" />
          {isClaiming ? "Minting Test Funds..." : "Claim +$500 Test AUSD"}
        </Button>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-white/40">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Demo Sandbox Only • No real credit card or bank funds charged.</span>
        </div>
      </div>
    </Modal>
  );
}
