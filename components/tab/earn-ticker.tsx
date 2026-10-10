"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, TrendingUp, CheckCircle2, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { 
  getEarnSettings, 
  calculateLiveYield, 
  harvestEarnYield, 
  EarnSettings 
} from "@/lib/earn";
import { useWorkspaceMode, useSettledPayoutBalance } from "@/lib/user";
import { useRealAusdBalance } from "@/lib/onchain";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PrivyLogo } from "@/components/ui/partner-logo";
import { formatCurrency } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface EarnTickerProps {
  tabId?: string;
  className?: string;
}

export function EarnTicker({ tabId = "lisbon-24", className = "" }: EarnTickerProps) {
  const { mode: workspaceMode } = useWorkspaceMode();
  const isTestnet = workspaceMode === "testnet";
  const { settledBalance } = useSettledPayoutBalance();
  const { balance: testnetAusdBalance } = useRealAusdBalance(workspaceMode);

  // In demo mode, idle balance is the user's settled payout balance
  const idleCents = settledBalance;

  const [settings, setSettings] = useState<EarnSettings>(() => getEarnSettings(workspaceMode));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickerTime, setTickerTime] = useState<number>(Date.now());

  // Listen for earn setting updates
  useEffect(() => {
    const sync = () => setSettings(getEarnSettings(workspaceMode));
    sync();
    window.addEventListener("meshTab-earn-update", sync);
    window.addEventListener("meshTab-workspace-update", sync);
    return () => {
      window.removeEventListener("meshTab-earn-update", sync);
      window.removeEventListener("meshTab-workspace-update", sync);
    };
  }, [workspaceMode]);

  // Demo mode: Pure in-memory tick every 1.5s — Zero storage I/O thrashing
  useEffect(() => {
    if (isTestnet || workspaceMode === "blank" || idleCents <= 0) return; // Zero simulated ticking on Testnet or Clean Slate
    const interval = setInterval(() => {
      setTickerTime(Date.now());
    }, 1500);
    return () => clearInterval(interval);
  }, [isTestnet, workspaceMode, idleCents]);

  const live = useMemo(() => {
    if (isTestnet || workspaceMode === "blank" || idleCents <= 0) {
      return { totalYieldCents: 0, unharvestedCents: 0, displayYieldUsd: "0.00" };
    }
    return calculateLiveYield(idleCents, settings, tickerTime);
  }, [idleCents, settings, tickerTime, isTestnet, workspaceMode]);

  const handleHarvest = () => {
    sounds.playClick();
    const result = harvestEarnYield(tabId, workspaceMode, idleCents);
    if (!result.success || result.harvestedCents <= 0) {
      toast.info("No Yield to Harvest", {
        description: "Let your idle AUSD balance sit to accumulate more interest.",
      });
      return;
    }

    sounds.playSuccessChime();
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch {}

    toast.success("🎉 Yield Harvested!", {
      description: `${formatCurrency(result.harvestedCents)} credited to your available cash balance.`,
    });
    setSettings(getEarnSettings(workspaceMode));
    setIsModalOpen(false);
  };

  // OVERSEER Isolation: Never show false APY yield on clean slate or when no funds exist
  if (workspaceMode === "blank") return null;
  if (!isTestnet && idleCents <= 0) return null;
  if (isTestnet && (!testnetAusdBalance || testnetAusdBalance <= 0)) return null;

  return (
    <>
      {/* ========================================================= */}
      {/* 1. BADGE DISPLAY (TESTNET vs DEMO)                        */}
      {/* ========================================================= */}
      {isTestnet ? (
        /* Testnet: Honest Mainnet Feature Badge (No Fake Cents Ticking) */
        <button
          onClick={() => {
            sounds.playClick();
            setIsModalOpen(true);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-700 dark:text-purple-300 transition-all text-xs font-semibold shadow-sm ${className}`}
          title="Earn Yield on Idle Balances (Mainnet Feature)"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
          <span>Earn Yield</span>
          <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 tracking-wider">
            Mainnet
          </span>
        </button>
      ) : (
        /* Demo Mode: Interactive Preview Micro-Ticker */
        <button
          onClick={() => {
            sounds.playClick();
            setIsModalOpen(true);
          }}
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 transition-all text-xs font-semibold shadow-sm ${className}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono font-bold tracking-tight">4.8% APY</span>
          <span className="text-slate-400 dark:text-white/40">•</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">
            +${live.displayYieldUsd}
          </span>
        </button>
      )}

      {/* ========================================================= */}
      {/* 2. MODAL DISPLAY (TESTNET ROADMAP vs DEMO HARVEST)        */}
      {/* ========================================================= */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)} size="md">
          {isTestnet ? (
            /* Testnet: Official Privy Earn Mainnet Roadmap Card (Zero Fake Balances) */
            <div className="space-y-5 p-5 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-2 pr-10 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Privy Earn Vaults</h3>
                    <p className="text-[11px] text-slate-500 dark:text-white/50">
                      Curated by Gauntlet & Steakhouse Financial
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 uppercase tracking-wide">
                  Mainnet Feature
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Automated Yield on Idle Tab Balances
                </span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                  Earn ~4.8% variable APY on group tab deposits while keeping capital 100% available for instant Visa spending.
                </p>
                <p className="text-xs text-slate-500 dark:text-white/60 leading-relaxed pt-1">
                  On Monad Mainnet, idle Agora AUSD deposited into shared tabs is routed into high-grade lending vaults via Privy Financial Flows. Funds earn daily interest but withdraw just-in-time when members tap to pay.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Underlying Asset</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Agora AUSD (1:1 USD)</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Liquidity Model</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Instant JIT Access</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Risk Management</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Gauntlet Curated</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Custody</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Non-Custodial Smart Account</p>
                </div>
              </div>

              <Button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-black text-white shadow-md cursor-pointer"
              >
                Got it
              </Button>

              {/* Powered by Privy Footer */}
              <div className="pt-2 flex items-center justify-center gap-2 text-slate-400 dark:text-white/40 text-xs font-medium">
                <span className="text-[11px] tracking-wide">Powered by</span>
                <PrivyLogo className="h-3.5 w-auto" />
              </div>
            </div>
          ) : (
            /* Demo Mode: Interactive Preview & Harvest Modal */
            <div className="space-y-5 p-5 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-2 pr-10 border-b border-slate-100 dark:border-white/10">
                <h3 className="text-lg font-bold">Privy Earn Vault Preview</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                  Demo Preview
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {settings.vaultName}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    4.8% Variable APY
                  </span>
                </div>
                <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                  ${live.displayYieldUsd}{" "}
                  <span className="text-xs font-sans text-slate-400 dark:text-white/40 font-normal">accrued</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                  Your idle tab balance ({formatCurrency(idleCents)}) earns automated interest via Privy Earn lending vaults until needed for group expenses or personal card spend.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Underlying Asset</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Agora AUSD</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Liquidity Status</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Instant JIT Access</p>
                </div>
              </div>

              <Button
                onClick={handleHarvest}
                className="w-full py-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> Harvest ${live.displayYieldUsd} to Cash Balance
              </Button>

              {/* Powered by Privy Footer */}
              <div className="pt-2 flex items-center justify-center gap-2 text-slate-400 dark:text-white/40 text-xs font-medium">
                <span className="text-[11px] tracking-wide">Powered by</span>
                <PrivyLogo className="h-3.5 w-auto" />
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
