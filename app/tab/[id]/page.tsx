"use client";

import { useState, useEffect, Suspense } from "react";
import { Activity, Plus, ArrowLeft, Settings, Users, Download } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { BalanceCard } from "../../../components/tab/balance-card";
import { SettlementDrawer } from "../../../components/tab/settlement-drawer";
import { CashOutDrawer } from "../../../components/tab/cash-out-drawer";
import { RosterCarousel } from "../../../components/tab/roster-carousel";
import { FeedList, ExpenseItem } from "../../../components/tab/feed-list";
import { TransactionOverlay, TransactionState } from "../../../components/ui/transaction-overlay";
import { NettingCanvas } from "../../../components/NettingCanvas";
import { Modal } from "../../../components/ui/modal";
import { toast } from "sonner";
import { sounds } from "../../../lib/sounds";

import { useUserProfile, useDeveloperMode, useStoredTabs, useStoredExpenses, useStoredTabMembers } from "../../../lib/user";

function DashboardContent() {
  const params = useParams();
  const rawTabId = typeof params?.id === "string" ? params.id : "lisbon-24";

  const profile = useUserProfile();
  const { showAddress } = useDeveloperMode();
  const { tabs: storedTabs } = useStoredTabs();
  const { expenses } = useStoredExpenses(rawTabId);

  const currentUser = profile.name || "David";
  const { members: activeMembers } = useStoredTabMembers(rawTabId, currentUser);

  const currentTab = storedTabs.find(t => t.id === rawTabId) || {
    id: rawTabId,
    name: rawTabId === "house-groceries" 
      ? "House Groceries" 
      : rawTabId === "lisbon-24"
      ? "Lisbon Weekend"
      : rawTabId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    balance: rawTabId === "lisbon-24" ? -18000 : 0,
    role: "Creator" as const,
    memberCount: activeMembers.length,
    lastActivity: "Just now"
  };

  // Find user's actual balance from active members or tab summary
  const userMember = activeMembers.find(m => m.name.toLowerCase() === currentUser.toLowerCase());
  const userBalance = userMember ? userMember.balance : currentTab.balance;
  const userType = userBalance === 0 ? ("settled" as const) : userBalance < 0 ? ("debtor" as const) : ("creditor" as const);

  const currentUserData = {
    name: currentUser,
    balance: userBalance,
    type: userType
  };

  // Calculate gross volume dynamically from expenses (in cents)
  const grossVolume = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [isNettingModalOpen, setIsNettingModalOpen] = useState(false);
  const [txState, setTxState] = useState<TransactionState>("idle");

  const [nettingTxState, setNettingTxState] = useState<TransactionState>("idle");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("invite") === "true") {
      const handleJoin = async () => {
        setTxState("authenticating");
        await new Promise(r => setTimeout(r, 1500));
        setTxState("processing");
        await new Promise(r => setTimeout(r, 2000));
        setTxState("success");
        await new Promise(r => setTimeout(r, 1000));
        setTxState("idle");
        router.replace(`/tab/${params?.id}`);
      };
      handleJoin();
    }
  }, [searchParams, params?.id, router]);

  const handleRunNetting = async () => {
    setNettingTxState("authenticating");
    await new Promise(r => setTimeout(r, 1500));
    setNettingTxState("processing");
    await new Promise(r => setTimeout(r, 2000));
    setNettingTxState("success");
    await new Promise(r => setTimeout(r, 2000));
    setNettingTxState("idle");
  };

  const exportLedgerCSV = () => {
    sounds.playClick();
    const rows: (string | number)[][] = [];

    // Tab Information Header
    rows.push(["TAB_NAME", `"${currentTab.name.replace(/"/g, '""')}"`]);
    rows.push(["TAB_ID", currentTab.id]);
    rows.push(["EXPORTED_AT", new Date().toLocaleString()]);
    rows.push(["MEMBER_COUNT", activeMembers.length]);
    rows.push([]);

    // Member Balances Section
    rows.push(["--- MEMBER BALANCES ---"]);
    rows.push(["Member Name", "Net Balance (AUSD)", "Status / Direction"]);
    activeMembers.forEach(m => {
      rows.push([
        m.name,
        (m.balance / 100).toFixed(2),
        m.balance === 0 ? "Settled ($0.00)" : m.balance > 0 ? "Creditor (Owed funds)" : "Debtor (Owes group)"
      ]);
    });
    rows.push([]);

    // Itemized Expenses Section
    rows.push(["--- ITEMIZED EXPENSES & TRANSACTIONS ---"]);
    rows.push(["Expense ID", "Timestamp", "Description", "Paid By", "Amount (AUSD)"]);
    expenses.forEach(exp => {
      rows.push([
        exp.id,
        exp.time || "Recent",
        `"${(exp.desc || "").replace(/"/g, '""')}"`,
        exp.payer,
        (exp.amount / 100).toFixed(2),
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MeshTab-${currentTab.name.replace(/\s+/g, "_")}-Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    sounds.playSuccessChime();
    toast.success("Ledger Exported Successfully", {
      description: `Downloaded MeshTab-${currentTab.name.replace(/\s+/g, "_")}-Ledger.csv`
    });
  };
  
  return (
    <>
    <TransactionOverlay 
      state={txState} 
      messages={{
        authenticating: "Please confirm with Passkey to securely join this Tab.",
        processing: "Adding you to the ledger...",
        success: "Joined successfully!"
      }}
    />
    <TransactionOverlay 
      state={nettingTxState} 
      messages={{
        authenticating: "Please confirm with Passkey to optimize debts.",
        processing: "Running Tangle Netting Graph Optimization...",
        success: "Netting Complete: Saved $3,400 in redundant transfers!"
      }}
    />
    <div className="flex-1 flex flex-col pb-24 md:pb-12 text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* Header */}
      <header className="px-6 md:px-12 pt-8 pb-6 flex items-center justify-between border-b border-slate-200 dark:border-white/10 mb-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Link href="/home" className="hidden md:flex w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shrink-0 text-slate-700 dark:text-white/80 shadow-sm" title="Back to Hub">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1 md:hidden">
              <Link href="/home" className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{currentTab.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Real-time Sync • 0.3s</span>
              </div>
              {showAddress && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                  0x7F5...3b9A
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={exportLedgerCSV}
            className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Export Tab Ledger (CSV)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden text-xs font-bold">CSV</span>
          </button>
          <Link 
            href={`/tab/${params?.id || 'default'}/members`} 
            className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-colors flex items-center gap-1.5 shadow-sm"
            title="Manage Group Members"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manage Group</span>
            <span className="sm:hidden text-xs font-bold">Members</span>
          </Link>
          <Link 
            href="/settings"
            className="p-2.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-colors shadow-sm"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <Link 
            href="/settings"
            className={`w-10 h-10 md:w-11 md:h-11 rounded-full ${profile.avatarColor} text-white flex items-center justify-center font-bold text-base shadow-md hover:scale-105 transition-transform`}
            title={`Profile (${currentUser})`}
          >
            {currentUser ? currentUser[0].toUpperCase() : "U"}
          </Link>
        </div>
      </header>

      <div className="px-6 md:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column (Stats & Desktop Actions) */}
        <div className="lg:col-span-4 space-y-8">
          <BalanceCard 
            balance={Math.abs(currentUserData.balance)} 
            currency="AUSD"
            type={currentUserData.type}
            onSettle={() => setIsSettlementOpen(true)}
            onCashOut={() => setIsCashOutOpen(true)}
            onRemind={async () => {
              setNettingTxState("authenticating");
              await new Promise(r => setTimeout(r, 800));
              setNettingTxState("success");
              await new Promise(r => setTimeout(r, 1200));
              setNettingTxState("idle");
            }}
          />
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex flex-col gap-4">
            <button 
              onClick={() => setIsNettingModalOpen(true)}
              className="w-full py-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2 text-lg shadow-sm"
            >
              <Activity className="w-5 h-5" /> Run Tangle Netting
            </button>
            <Link 
              href={`/tab/${params?.id || 'default'}/expense/new`} 
              className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-lg"
            >
              <Plus className="w-5 h-5" /> Add New Expense
            </Link>
          </div>
        </div>

        {/* Right Column (Roster & Feed) */}
        <div className="lg:col-span-8 space-y-10">
          <RosterCarousel members={activeMembers} grossVolume={grossVolume} />
          <FeedList expenses={expenses} />
        </div>
      </div>

      {/* Mobile Floating Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50/90 dark:from-black dark:via-black/90 to-transparent z-40 pointer-events-none pb-[env(safe-area-inset-bottom,24px)]">
        <div className="flex gap-4 pointer-events-auto max-w-md mx-auto w-full">
          <button 
            onClick={() => setIsNettingModalOpen(true)}
            className="flex-1 bg-white/90 dark:bg-indigo-500/20 border border-slate-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-100 font-bold py-4 rounded-2xl backdrop-blur-xl flex items-center justify-center gap-2 shadow-md"
          >
            <Activity className="w-5 h-5" /> Netting
          </button>
          <Link 
            href={`/tab/${params?.id || 'default'}/expense/new`} 
            className="w-16 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            aria-label="Add Expense"
          >
            <Plus className="w-7 h-7" />
          </Link>
        </div>
      </div>

      <SettlementDrawer 
        isOpen={isSettlementOpen} 
        onClose={() => setIsSettlementOpen(false)} 
        debtAmount={Math.abs(currentUserData.balance)} 
        tabId={rawTabId}
        currentUserName={currentUser}
      />

      <CashOutDrawer 
        isOpen={isCashOutOpen}
        onClose={() => setIsCashOutOpen(false)}
        availableAmount={Math.abs(currentUserData.balance)}
        currentUserName={currentUser}
      />

      {isNettingModalOpen && (
        <Modal onClose={() => setIsNettingModalOpen(false)} className="max-w-xl bg-transparent border-0 shadow-none">
          <NettingCanvas tabId={rawTabId} members={activeMembers} grossVolume={grossVolume} expenseCount={expenses.length} />
        </Modal>
      )}
    </div>
    </>
  );
}

export default function TabDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a]" />}>
      <DashboardContent />
    </Suspense>
  );
}
