"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { User, Users, Receipt, Plus, ArrowRight, Bell, QrCode, Settings, Search, Filter, Crown, CheckCircle2, TrendingDown, TrendingUp, ArrowDownToLine, Coins, Sparkles, Award, Fingerprint } from "lucide-react";
import { useState, useEffect } from "react";
import { TransactionOverlay, TransactionState } from "../../components/ui/transaction-overlay";
import { formatCurrency } from "../../lib/utils";
import { ThemeToggle } from "../../components/theme-toggle";
import { useUserProfile, useStoredTabs, useVirtualBalance, useWorkspaceMode, useSettledPayoutBalance, getStoredTabMembers } from "../../lib/user";
import { useNotifications } from "../../lib/notifications";
import { CashOutDrawer } from "../../components/tab/cash-out-drawer";
import { PitchModal } from "../../components/home/pitch-modal";
import { MeshBuddy } from "../../components/ui/mesh-buddy";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { AnimatedCounter } from "../../components/ui/animated-counter";
import { NetworkStatusBadge } from "../../components/ui/network-status-badge";
import { GlobalNav } from "../../components/ui/global-nav";
import { createPublicClient, http, formatUnits, erc20Abi } from "viem";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { SecuritySettingsModal } from "../../components/ui/security-settings-modal";

export default function GlobalHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTestnetMode = searchParams.get("mode") === "testnet";
  
  const profile = useUserProfile();
  const { tabs: mockTabs, saveTab } = useStoredTabs();
  const { balance: virtualBalance } = useVirtualBalance();
  const { mode: workspaceMode, setMode: setWorkspaceMode } = useWorkspaceMode();
  const { settledBalance, totalOutstandingDebt, withdrawableAmount } = useSettledPayoutBalance();
  const { unreadCount } = useNotifications();

  const { wallets } = useWallets();
  const { user, linkPasskey } = usePrivy();
  const [testnetBalance, setTestnetBalance] = useState<number>(0);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [dismissPasskeyPrompt, setDismissPasskeyPrompt] = useState(false);

  const hasPasskey = user?.linkedAccounts?.some(account => account.type === 'passkey') || false;

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "owe" | "owed">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync URL testnet mode to workspace storage mode
  useEffect(() => {
    if (isTestnetMode && workspaceMode !== "testnet") {
      setWorkspaceMode("testnet");
    } else if (!isTestnetMode && workspaceMode === "testnet") {
      setWorkspaceMode("blank"); // default fallback if they remove the param
    }
  }, [isTestnetMode, workspaceMode, setWorkspaceMode]);

  useEffect(() => {
    async function fetchBalance() {
      if (!isTestnetMode) return;
      
      const primaryWallet = wallets.find(w => w.chainId?.includes("eip155")) || wallets[0];
      if (!primaryWallet || !primaryWallet.address) return;

      setIsFetchingBalance(true);
      try {
        const client = createPublicClient({
          transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz")
        });

        const balance = await client.readContract({
          address: (process.env.NEXT_PUBLIC_MOCK_AUSD_ADDRESS as `0x${string}`) || "0xF9bA02Cd0aFc210e0867852eEb0E994B07d9957F",
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [primaryWallet.address as `0x${string}`],
        });

        const formatted = parseFloat(formatUnits(balance as bigint, 6));
        setTestnetBalance(formatted);
      } catch (err) {
        console.error("Error fetching Monad AUSD balance:", err);
      } finally {
        setIsFetchingBalance(false);
      }
    }

    fetchBalance();
    
    // Poll every 5 seconds for live updates
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [isTestnetMode, wallets]);

  const currentUserName = profile.name || "David";

  // Read archived tab IDs from localStorage
  const archivedTabIds: string[] = (() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("meshTab_archived");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();

  const activeTabsList = !mounted
    ? []
    : (workspaceMode === "blank" 
        ? mockTabs.filter(t => t.id !== "lisbon-24") 
        : mockTabs
      ).filter(t => !archivedTabIds.includes(t.id));

  const syncedTabs = !mounted
    ? []
    : activeTabsList.map(tab => {
        const members = getStoredTabMembers(tab.id, currentUserName);
        const userMember = members.find(m => m.name.toLowerCase() === currentUserName.toLowerCase());
        return {
          ...tab,
          balance: userMember !== undefined ? userMember.balance : tab.balance,
          memberCount: members.length > 0 ? members.length : tab.memberCount
        };
      });

  const totalYouOwe = syncedTabs.filter(t => t.balance < 0).reduce((acc, t) => acc + Math.abs(t.balance), 0);
  const totalOwedToYou = syncedTabs.filter(t => t.balance > 0).reduce((acc, t) => acc + t.balance, 0);

  // The user's mental model for "Total Net Balance":
  // If they have withdrawable cash, show it (e.g. +230).
  // If they have withdrawn it all, their liquid net is just their active debt (e.g. -270).
  const netBalance = withdrawableAmount > 0 ? withdrawableAmount : -totalYouOwe;

  // Dynamic Greeting Logic
  const hour = new Date().getHours();
  let greeting = "Good evening";
  let emoji = "🌙";
  if (hour < 12) {
    greeting = "Good morning";
    emoji = "☕";
  } else if (hour < 18) {
    greeting = "Good afternoon";
    emoji = "☀️";
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6) return;
    setShowJoinModal(false);
    setTxState("authenticating");
    await new Promise(r => setTimeout(r, 1500));
    setTxState("processing");
    await new Promise(r => setTimeout(r, 2000));
    setTxState("success");
    await new Promise(r => setTimeout(r, 1000));
    setTxState("idle");
    
    // Persist joined tab
    const joinedId = `joined-${joinCode.toLowerCase()}`;
    saveTab({
      id: joinedId,
      name: `Group #${joinCode}`,
      role: "Member",
      balance: 0,
      memberCount: 3,
      lastActivity: "Just joined"
    });

    setJoinCode("");
    router.push(`/tab/${joinedId}`);
  };

  // Filter and search tabs
  const filteredTabs = syncedTabs.filter(tab => {
    const matchesSearch = tab.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "owe") return tab.balance < 0;
    if (activeFilter === "owed") return tab.balance > 0;
    return true;
  });

  return (
    <>
    <TransactionOverlay 
      state={txState} 
      messages={{
        authenticating: "Please confirm with Passkey to join via code.",
        processing: "Adding you to the ledger...",
        success: "Joined successfully!"
      }}
    />
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300 pb-36 lg:pb-36">
      <GlobalNav />
      
      {/* Passkey Link Prompt */}
      {mounted && user && !hasPasskey && !dismissPasskeyPrompt && (
        <div className="bg-indigo-600 dark:bg-indigo-500/10 text-white dark:text-indigo-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-indigo-700 dark:border-indigo-500/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-5 h-5 text-indigo-200 dark:text-indigo-400" />
            <span className="text-sm font-medium">Secure your account with device biometrics (Face ID, Fingerprint) for frictionless access.</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => {
                sounds.playClick();
                linkPasskey();
              }}
              className="bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform whitespace-nowrap shadow-sm"
            >
              Link Passkey
            </button>
            <button 
              onClick={() => setDismissPasskeyPrompt(true)}
              className="text-indigo-200 dark:text-indigo-400 hover:text-white text-xs font-medium px-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 md:px-12 pt-10 pb-6 flex items-center justify-between max-w-[1600px] mx-auto w-full">
        <div>
          <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4 mb-1">
            <div className="flex items-center gap-2 flex-wrap order-2 md:order-1">
              {!mounted ? (
                <div className="h-9 w-52 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
              ) : (
                <>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{greeting}, {profile.name} {emoji}</h1>
                  {workspaceMode === "sample" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20" title="Exploring Lisbon Trip Demo as David">
                      🏖️ Lisbon Demo Persona
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap order-1 md:order-2 md:pb-1">
              <NetworkStatusBadge compact />
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${isTestnetMode ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isTestnetMode ? "bg-purple-500" : "bg-emerald-500"}`} />
                {isTestnetMode ? "Monad Testnet" : "Demo Sandbox"}
              </span>
              <Link 
                href="/demo?from=/home"
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                title="Open Demo Mode Selection"
              >
                <Sparkles className="w-3 h-3" />
                <span>Change Mode</span>
              </Link>
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowPitchModal(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
                title="Open Monad Metropolis Pitch Mode"
              >
                <Award className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>Pitch Mode</span>
              </button>
            </div>
          </div>
          <p className="text-slate-500 dark:text-white/60 mt-0.5 text-sm">
            {!mounted ? (
              <span className="inline-block h-4 w-72 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse" />
            ) : workspaceMode === "sample" ? (
              "Exploring Lisbon '24 benchmark data. Ready to settle up or test netting?"
            ) : (
              "Your personal shared tabs and real settlement ledger."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!mounted ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse" />
          ) : (
            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border font-bold text-xs shadow-sm transition-colors ${
                isTestnetMode 
                  ? "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300" 
                  : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              }`}
              title={isTestnetMode ? "Monad Testnet AUSD Balance" : "Sandbox Virtual Balance"}
            >
              <Coins className="w-3.5 h-3.5" />
              <span className="tabular-nums">
                {isTestnetMode && isFetchingBalance && testnetBalance === 0 ? (
                  <span className="w-8 h-3 bg-purple-200 dark:bg-purple-500/20 rounded animate-pulse inline-block" />
                ) : (
                  <AnimatedCounter value={isTestnetMode ? testnetBalance : virtualBalance / 100} prefix="$" decimals={2} />
                )}
              </span>
            </div>
          )}
          <Link 
            href="/notifications?from=/home" 
            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80"
            title={`Notifications ${mounted && unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
          >
            <Bell className="w-5 h-5" />
            {mounted && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0a0a0a] shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <SecuritySettingsModal />
        </div>
      </header>

      <main className="px-6 md:px-12 max-w-[1600px] mx-auto w-full space-y-10">
        {/* Unified Overall Balance & Payout Hub */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-indigo-500/15 dark:from-indigo-500/20 dark:to-purple-500/10 border border-indigo-200/80 dark:border-indigo-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-slate-600 dark:text-white/70 font-semibold text-xs uppercase tracking-wider">
                Total Net Balance
              </span>
              {!mounted ? (
                <div className="h-10 w-44 bg-slate-200 dark:bg-white/10 rounded-2xl animate-pulse mt-1 mb-2" />
              ) : (
                <div className={`text-3xl sm:text-4xl md:text-5xl font-bold mt-1 tracking-tight break-words min-w-0 ${netBalance < 0 ? "text-rose-600 dark:text-rose-400" : netBalance > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                  {netBalance < 0 ? "-" : netBalance > 0 ? "+" : ""}<AnimatedCounter value={Math.abs(netBalance) / 100} prefix="$" decimals={2} />
                </div>
              )}
              <p className="text-slate-500 dark:text-white/50 text-xs mt-2 font-medium">
                {!mounted ? (
                  <span className="inline-block h-3.5 w-36 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                ) : (
                  `Across ${syncedTabs.length} active shared ${syncedTabs.length === 1 ? "group" : "groups"}`
                )}
              </p>

              {mounted && (
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <button 
                    onClick={() => {
                      if (withdrawableAmount > 0) {
                        sounds.playClick();
                        setShowCashOutModal(true);
                      }
                    }}
                    disabled={withdrawableAmount <= 0}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-bold shadow-md transition-all ${
                      withdrawableAmount > 0 
                        ? "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-500/25 cursor-pointer" 
                        : "bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/40 shadow-none cursor-not-allowed"
                    }`}
                    title={withdrawableAmount > 0 ? "Withdraw settled funds to your bank account" : "You need a positive settled balance to withdraw"}
                  >
                    <ArrowDownToLine className="w-4 h-4" /> Cash Out to Bank
                  </button>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
                    withdrawableAmount > 0 
                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                      : "text-slate-500 dark:text-white/50 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${withdrawableAmount > 0 ? "text-emerald-500" : "text-slate-400"}`} />
                    <span>{formatCurrency(withdrawableAmount)} Ready for Transfer</span>
                  </span>
                </div>
              )}

            </div>

            {/* Split Breakdown */}
            <div className="flex items-center gap-4 bg-white/70 dark:bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 text-xs shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>You Owe</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  {!mounted ? <span className="inline-block h-4 w-14 bg-slate-200 dark:bg-white/10 rounded animate-pulse" /> : formatCurrency(totalYouOwe)}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>You're Owed</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  {!mounted ? <span className="inline-block h-4 w-14 bg-slate-200 dark:bg-white/10 rounded animate-pulse" /> : formatCurrency(totalOwedToYou)}
                </div>
              </div>
              {mounted && (
                <>
                  <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                  <div className="space-y-0.5">
                    <div className={`flex items-center gap-1 font-semibold ${settledBalance > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-white/50"}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settled Payouts</span>
                    </div>
                    <div className={`font-bold text-base ${settledBalance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-white/40"}`}>
                      {formatCurrency(settledBalance)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Decorative Mesh */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/30 blur-[80px] rounded-full pointer-events-none" />
        </div>

        {/* Active Tabs with Search & Filter Chips */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="w-5 h-5 text-slate-400 dark:text-white/50" /> Active Tabs
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search tabs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter chips */}
              <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs">
                <button 
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${activeFilter === "all" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setActiveFilter("owe")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${activeFilter === "owe" ? "bg-white dark:bg-white/10 text-rose-600 dark:text-rose-400 shadow-sm" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  You Owe
                </button>
                <button 
                  onClick={() => setActiveFilter("owed")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${activeFilter === "owed" ? "bg-white dark:bg-white/10 text-amber-500 dark:text-amber-400 shadow-sm" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  Owed
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!mounted ? (
              // Themed ash skeleton cards while client storage and workspace mode initialize
              [1, 2, 3].map((n) => (
                <div 
                  key={n} 
                  className="bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 flex flex-col h-[220px] animate-pulse"
                >
                  <div className="flex justify-between items-start mb-auto gap-3">
                    <div className="flex-1 space-y-2.5">
                      <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-lg" />
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-16 bg-slate-200 dark:bg-white/10 rounded-md" />
                        <div className="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded-md" />
                      </div>
                    </div>
                    <div className="h-7 w-16 bg-slate-200 dark:bg-white/10 rounded-xl shrink-0" />
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/10 pt-4 mt-4 flex items-center justify-between">
                    <div className="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded-md" />
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10" />
                  </div>
                </div>
              ))
            ) : (
              filteredTabs.map(tab => (
              <Link 
                href={`/tab/${tab.id}`}
                key={tab.id} 
                className="bg-white dark:bg-white/5 hover:bg-[#f5f5f7] dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 transition-all hover:scale-[1.02] shadow-sm hover:shadow-md cursor-pointer group flex flex-col h-[220px]"
              >
                <div className="flex justify-between items-start mb-auto gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors truncate mb-1.5">
                      {tab.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 dark:text-white/50 text-xs font-medium whitespace-nowrap flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-white/40" />
                        <span>{tab.memberCount} {tab.memberCount === 1 ? "member" : "members"}</span>
                      </span>
                      <span className="text-slate-300 dark:text-white/20 text-xs select-none">•</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 shrink-0 ${
                        tab.role === "Creator" 
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/20" 
                          : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 border border-slate-200/60 dark:border-white/5"
                      }`}>
                        {tab.role === "Creator" ? (
                          <>
                            <Crown className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                            <span>Creator (You)</span>
                          </>
                        ) : (
                          <span>Member (Host: {tab.creator || "Organizer"})</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums shrink-0 whitespace-nowrap ${tab.balance > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : tab.balance < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'}`}>
                    {tab.balance > 0 ? '+' : ''}{formatCurrency(tab.balance)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-white/50 text-xs font-medium">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{tab.lastActivity}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-400 dark:text-white/30 shadow-sm">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            )))}

            {mounted && filteredTabs.length === 0 && (
              <div className="col-span-full py-12 px-6 text-center bg-white dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                {workspaceMode === "blank" ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Clean Slate Workspace</h3>
                    <p className="text-xs text-slate-500 dark:text-white/60 max-w-sm mx-auto mt-1 mb-6">
                      Pristine workspace with zero pre-loaded tabs. Tap Create Tab to start a fresh shared group.
                    </p>
                    <div className="flex items-center justify-center">
                      <Link
                        href="/tab/new"
                        className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Create Custom Tab
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <Users className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-white/70">No tabs match your filter</p>
                    <button onClick={() => { setActiveFilter("all"); setSearchQuery(""); }} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                      Reset filters
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop floating dock was moved */}
      </main>

      {/* Modern Web2 Sticky Bottom Action Dock on Mobile & Desktop */}
      <div className="fixed bottom-6 lg:bottom-10 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
        <div className="bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 rounded-full p-2 flex items-center justify-between gap-2 shadow-2xl w-full max-w-sm md:max-w-lg lg:max-w-xl mx-auto pointer-events-auto">
          <Link 
            href="/tab/new" 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>New Tab</span>
          </Link>

          <button 
            onClick={() => setShowJoinModal(true)}
            className="flex-1 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white py-3 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
          >
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Join Code</span>
          </button>
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl text-slate-900 dark:text-white my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Join Group via Code</h3>
              <button 
                onClick={() => setShowJoinModal(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-2">6-Digit Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A3F9K2" 
                  className="w-full bg-[#f5f5f7] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-center tracking-widest text-2xl font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                type="submit"
                disabled={joinCode.length !== 6}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-all shadow-md"
              >
                Join Group
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Cash Out Drawer */}
      <CashOutDrawer 
        isOpen={showCashOutModal} 
        onClose={() => setShowCashOutModal(false)} 
        settledBalance={settledBalance}
        totalOutstandingDebt={totalOutstandingDebt}
        withdrawableAmount={withdrawableAmount}
        currentUserName={profile.name} 
      />


      {/* Monad Metropolis Pitch Presentation Modal */}
      <PitchModal 
        isOpen={showPitchModal}
        onClose={() => setShowPitchModal(false)}
      />

      {/* MeshBuddy Tab Co-Pilot */}
      <MeshBuddy />
    </div>
    </>
  );
}
