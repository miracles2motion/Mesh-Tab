"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Users, Receipt, Plus, ArrowRight, Bell, QrCode, Settings, Search, Filter, Crown, CheckCircle2, TrendingDown, TrendingUp, ArrowDownToLine, Coins, Sparkles, Award } from "lucide-react";
import { useState } from "react";
import { TransactionOverlay, TransactionState } from "../../components/ui/transaction-overlay";
import { formatCurrency } from "../../lib/utils";
import { ThemeToggle } from "../../components/theme-toggle";
import { useUserProfile, useStoredTabs, useVirtualBalance, useWorkspaceMode } from "../../lib/user";
import { CashOutDrawer } from "../../components/tab/cash-out-drawer";
import { FaucetModal } from "../../components/tab/faucet-modal";
import { PitchModal } from "../../components/home/pitch-modal";
import { MeshBuddy } from "../../components/ui/mesh-buddy";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { AnimatedCounter } from "../../components/ui/animated-counter";

export default function GlobalHub() {
  const router = useRouter();
  const profile = useUserProfile();
  const { tabs: mockTabs, saveTab } = useStoredTabs();
  const { balance: virtualBalance } = useVirtualBalance();
  const { mode: workspaceMode, setMode: setWorkspaceMode } = useWorkspaceMode();

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "owe" | "owed">("all");

  const netBalance = mockTabs.reduce((acc, tab) => acc + tab.balance, 0);
  const totalYouOwe = mockTabs.filter(t => t.balance < 0).reduce((acc, t) => acc + Math.abs(t.balance), 0);
  const totalOwedToYou = mockTabs.filter(t => t.balance > 0).reduce((acc, t) => acc + t.balance, 0);

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
  const filteredTabs = mockTabs.filter(tab => {
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
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300 pb-28 md:pb-16">
      {/* Header */}
      <header className="px-6 md:px-12 pt-10 pb-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Demo Sandbox (Monad Testnet)
            </span>
            <Link 
              href="/demo"
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              title="Open Judge Mode Selection"
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{greeting}, {profile.name} {emoji}</h1>
          <p className="text-slate-500 dark:text-white/60 mt-0.5 text-sm">Ready to settle up?</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowFaucetModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors shadow-sm"
            title="Sandbox Virtual Faucet"
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              <AnimatedCounter value={virtualBalance / 100} prefix="$" decimals={2} />
            </span>
          </button>
          <ThemeToggle />
          <Link 
            href="/notifications" 
            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0a0a0a]" />
          </Link>
          <Link 
            href="/settings" 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <Link 
            href="/settings" 
            className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${profile.avatarColor} text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform text-lg font-bold`}
            title={`Profile (${profile.name})`}
          >
            {profile.name ? profile.name[0].toUpperCase() : "U"}
          </Link>
        </div>
      </header>

      <main className="px-6 md:px-12 max-w-5xl mx-auto w-full space-y-10">
        {/* Overall Balance Summary Card with Web2 Financial Breakdown */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-indigo-500/15 dark:from-indigo-500/20 dark:to-purple-500/10 border border-indigo-200/80 dark:border-indigo-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-slate-600 dark:text-white/70 font-semibold text-xs uppercase tracking-wider">Total Net Balance</span>
              <div className={`text-4xl md:text-5xl font-bold mt-1 tracking-tight ${netBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {netBalance < 0 ? "-" : "+"}<AnimatedCounter value={Math.abs(netBalance) / 100} prefix="$" decimals={2} />
              </div>
              <p className="text-slate-500 dark:text-white/50 text-xs mt-2 font-medium">Across {mockTabs.length} active shared groups</p>
              {totalOwedToYou > 0 && (
                <button 
                  onClick={() => setShowCashOutModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer"
                  title="Withdraw settled funds to your bank account"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Cash Out to Bank
                </button>
              )}
            </div>

            {/* Split Breakdown */}
            <div className="flex items-center gap-4 bg-white/70 dark:bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>You Owe</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(totalYouOwe)}</div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>You're Owed</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(totalOwedToYou)}</div>
              </div>
            </div>
          </div>
          {/* Decorative Mesh */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/30 blur-[80px] rounded-full pointer-events-none" />
        </div>

        {/* Active Tabs with Search & Filter Chips */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="w-5 h-5 text-slate-400 dark:text-white/50" /> Active Tabs
              </h2>

              {/* Workspace Sandbox Mode Toggle */}
              <div className="flex p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMode("sample");
                    sounds.playClick();
                    toast.info("Switched to Sample Trip Mode", {
                      description: "Loaded Lisbon '24 and Lake Tahoe demo tabs."
                    });
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    workspaceMode === "sample"
                      ? "bg-white dark:bg-white/15 text-indigo-600 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
                  }`}
                >
                  🏖️ Sample Trip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMode("blank");
                    sounds.playClick();
                    toast.info("Switched to Blank Slate Mode", {
                      description: "Workspace cleared for custom tab testing."
                    });
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    workspaceMode === "blank"
                      ? "bg-white dark:bg-white/15 text-indigo-600 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
                  }`}
                >
                  ✨ Blank Slate
                </button>
              </div>
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
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${activeFilter === "owed" ? "bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  Owed
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTabs.map(tab => (
              <Link 
                href={`/tab/${tab.id}`}
                key={tab.id} 
                className="bg-white dark:bg-white/5 hover:bg-[#f5f5f7] dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 transition-all hover:scale-[1.02] shadow-sm hover:shadow-md cursor-pointer group flex flex-col h-[220px]"
              >
                <div className="flex justify-between items-start mb-auto">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">{tab.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-white/40 text-xs">{tab.memberCount} members</span>
                      <span className="text-slate-300 dark:text-white/20">•</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tab.role === "Creator" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50"}`}>
                        {tab.role === "Creator" ? "Creator (Admin)" : "Member"}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums ${tab.balance >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
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
            ))}

            {filteredTabs.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                <Users className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-white/70">No tabs match your filter</p>
                <button onClick={() => { setActiveFilter("all"); setSearchQuery(""); }} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex gap-4">
          <Link 
            href="/tab/new" 
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Tab</span>
          </Link>
          <button 
            onClick={() => setShowJoinModal(true)}
            className="flex-1 bg-white dark:bg-indigo-500/10 hover:bg-slate-100 dark:hover:bg-indigo-500/20 border border-slate-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <QrCode className="w-5 h-5" />
            <span>Join via Code</span>
          </button>
        </div>
      </main>

      {/* Modern Web2 Sticky Bottom Action Dock on Mobile */}
      <div className="md:hidden fixed bottom-6 inset-x-4 z-40">
        <div className="bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 rounded-full p-2 flex items-center justify-between gap-2 shadow-2xl max-w-sm mx-auto">
          <Link 
            href="/tab/new" 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>New Tab</span>
          </Link>

          <button 
            onClick={() => setShowJoinModal(true)}
            className="flex-1 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white py-3 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Join Code</span>
          </button>

          <Link 
            href="/settings"
            className="p-3 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl text-slate-900 dark:text-white">
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
        availableAmount={totalOwedToYou > 0 ? totalOwedToYou : 30000} 
        currentUserName={profile.name} 
      />

      {/* Faucet Modal */}
      <FaucetModal
        isOpen={showFaucetModal}
        onClose={() => setShowFaucetModal(false)}
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
