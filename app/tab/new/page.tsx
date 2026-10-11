"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Fingerprint, Loader2, CheckCircle2, ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "../../../components/ui/button";
import Image from "next/image";
import { MonadLogo, AgoraLogo, PythLogo } from "../../../components/ui/partner-logo";

import { saveNewTab, getStoredUser, DEFAULT_USER_NAME, getWorkspaceMode, saveStoredTabMembers, useDeveloperMode } from "../../../lib/user";
import { SUPPORTED_CURRENCIES } from "../../../lib/pyth";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { queueOutboxOp } from "@/lib/outbox";

async function generateSecureSuffix(address: string) {
  const timestamp = Date.now().toString();
  const seed = `${address}-${timestamp}`;
  const encoded = new TextEncoder().encode(seed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex.substring(0, 8);
}

export default function CreateTab() {
  const router = useRouter();
  const { isDeveloperMode } = useDeveloperMode();
  const [step, setStep] = useState<1 | 2>(1);
  const [tabName, setTabName] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  
  const { getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const { client } = useSmartWallets();
  const smartWalletAddress = client?.account?.address || user?.wallet?.address;
  const userAddress = smartWalletAddress || wallets?.[0]?.address || "anonymous";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tabName.trim()) return;
    
    setStep(2);

    const cleanId = tabName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const uniqueSuffix = await generateSecureSuffix(userAddress);
    const newTabId = (cleanId || "custom-tab") + "-" + uniqueSuffix;
    const currentUserName = getStoredUser().name || DEFAULT_USER_NAME;
    
    try {
      const mode = getWorkspaceMode();
      if (mode === "testnet") {
        const resolvedWallet = (smartWalletAddress && /^0x[a-fA-F0-9]{40}$/.test(smartWalletAddress)) 
          ? smartWalletAddress 
          : (wallets?.[0]?.address && /^0x[a-fA-F0-9]{40}$/.test(wallets[0].address)) 
            ? wallets[0].address 
            : (typeof window !== "undefined" ? localStorage.getItem("meshTab_walletAddress") : undefined);

        queueOutboxOp({
          type: "createTab",
          tabId: newTabId,
          ownerWallet: userAddress,
          payload: {
            mode: "testnet",
            tabId: newTabId,
            tabName: tabName.trim(),
            creatorName: currentUserName,
            currency,
            timestamp: Date.now(),
            creatorWallet: resolvedWallet && /^0x[a-fA-F0-9]{40}$/.test(resolvedWallet) ? resolvedWallet : undefined
          }
        });
      }
    } catch (e) {
      console.error("Failed to create tab in outbox", e);
    }
    
    // Seed initial member with verified wallet address
    saveStoredTabMembers(newTabId, [{
      name: currentUserName,
      balance: 0,
      type: "settled",
      role: "admin",
      walletAddress: smartWalletAddress || undefined
    }]);

    saveNewTab({
      id: newTabId,
      name: tabName.trim(),
      creator: currentUserName,
      role: "Creator",
      balance: 0,
      memberCount: 1,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      lastActivityKind: "created"
    });

    router.push(`/tab/${newTabId}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white relative overflow-hidden min-h-screen transition-colors duration-300">
      {/* Background Mesh */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Back to All Tabs */}
      <div className="w-full max-w-full px-4 md:px-12 mb-4 flex items-center justify-start relative z-10">
        <Link 
          replace
          href="/home" 
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-all text-xs font-semibold shadow-sm group"
          title="Return to All Tabs"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-slate-500 dark:text-white/50" />
          <LayoutGrid className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
          <span>All Tabs</span>
        </Link>
      </div>

      <motion.div 
        layout
        className="w-full max-w-xl mx-auto px-4 bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 md:p-8 rounded-2xl relative z-10 shadow-2xl flex flex-col my-auto"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCreate}
              className="space-y-5"
            >
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1.5">Create Group Space</h1>
                <p className="text-slate-500 dark:text-white/60 text-xs">Set up a shared tab for your friends.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-white/80 ml-1">Tab Name</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Lisbon Weekend"
                  value={tabName}
                  onChange={e => setTabName(e.target.value)}
                  className="w-full bg-[#f5f5f7] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-base font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-white/80 ml-1">Trip Currency</label>
                <div className="grid grid-cols-5 gap-2">
                  {SUPPORTED_CURRENCIES.slice(0, 5).map(curr => (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => setCurrency(curr.code)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-row items-center justify-center gap-1.5 cursor-pointer ${
                        currency === curr.code
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20"
                          : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <span className="text-[13px] font-mono leading-none">{curr.code}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-white/40 ml-1 leading-relaxed pt-1">
                  {isDeveloperMode
                    ? "Settlements clear in digital USD (AUSD). Foreign currencies convert automatically with 0% bank markup via Pyth Network mid-market rates."
                    : "Settlements clear instantly with 0% bank markup at live mid-market rates."}
                </p>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full group mt-4">
                Create Tab
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              {/* Partner Branding / Bank Grade Security */}
              {isDeveloperMode ? (
                <div className="pt-2 flex items-center justify-center gap-3 text-slate-500 dark:text-white/50 text-xs font-medium">
                  <span>Powered by</span>
                  <div className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-all text-slate-800 dark:text-white">
                    <MonadLogo className="h-3.5 w-auto" />
                    <span className="text-slate-300 dark:text-white/20">×</span>
                    <AgoraLogo className="h-3.5 w-auto" />
                    <span className="text-slate-300 dark:text-white/20">×</span>
                    <PythLogo className="h-3.5 w-auto" />
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-center gap-2 text-slate-400 dark:text-white/40 text-[11px] font-medium">
                  <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Bank-Grade Passkey Security • 0% Platform Markup</span>
                </div>
              )}
            </motion.form>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-slate-400 dark:text-white/50" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Setting up secure space</h2>
                <p className="text-slate-500 dark:text-white/50 text-sm">Creating your group tab and finalizing settings...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
