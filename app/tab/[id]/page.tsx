"use client";

import { useState, useEffect, Suspense } from "react";
import { Activity, Plus, ArrowLeft, Settings, SlidersHorizontal, Users, Download, CheckCircle2, LayoutGrid, Sparkles, Crown, Upload, Award } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { BalanceCard } from "../../../components/tab/balance-card";
import { SettlementDrawer } from "../../../components/tab/settlement-drawer";
import { CashOutDrawer } from "../../../components/tab/cash-out-drawer";
import { RosterCarousel } from "../../../components/tab/roster-carousel";
import { MemberDetailsDrawer } from "../../../components/tab/member-details-drawer";
import { PaymentRequestDrawer } from "../../../components/tab/payment-request-drawer";
import { ImportExpensesModal } from "../../../components/tab/import-expenses-modal";
import { SettlementCertificateModal } from "../../../components/tab/settlement-certificate-modal";
import { OfflineMeshSyncModal } from "../../../components/tab/offline-mesh-sync-modal";
import { CategoryAnalytics } from "../../../components/tab/category-analytics";
import { SmartRebalancer } from "../../../components/tab/smart-rebalancer";
import { TabSettingsDrawer } from "../../../components/tab/tab-settings-drawer";
import { FeedList, ExpenseItem } from "../../../components/tab/feed-list";
import { TransactionOverlay, TransactionState } from "../../../components/ui/transaction-overlay";
import { NettingCanvas } from "../../../components/NettingCanvas";
import { Modal } from "../../../components/ui/modal";
import { ThemeToggle } from "../../../components/theme-toggle";
import { toast } from "sonner";
import { sounds } from "../../../lib/sounds";
import { NetworkStatusBadge } from "../../../components/ui/network-status-badge";
import { Wifi, MoreHorizontal } from "lucide-react";
import { GlobalNav } from "../../../components/ui/global-nav";

import { useUserProfile, useDeveloperMode, useStoredTabs, useStoredExpenses, useStoredTabMembers, useWorkspaceMode, useSettledPayoutBalance } from "../../../lib/user";
import { useTabSync } from "../../../lib/sync";

function DashboardContent() {
  const params = useParams();
  const rawTabId = typeof params?.id === "string" ? params.id : "lisbon-24";

  const profile = useUserProfile();
  const { showAddress } = useDeveloperMode();
  const { tabs: storedTabs } = useStoredTabs();
  const { expenses } = useStoredExpenses(rawTabId);
  const { mode: workspaceMode } = useWorkspaceMode();
  const { isSyncing, lastSync, syncError } = useTabSync(rawTabId);
  const { settledBalance, totalOutstandingDebt, withdrawableAmount } = useSettledPayoutBalance();

  const currentUser = profile.name || "David";
  const { members: activeMembers } = useStoredTabMembers(rawTabId, currentUser);

  const isSampleLisbon = workspaceMode === "sample" && rawTabId === "lisbon-24";
  const creatorName = isSampleLisbon 
    ? "Aisha" 
    : (activeMembers.find(m => m.role === "admin")?.name || currentUser);
  const isCurrentUserCreator = currentUser.toLowerCase() === creatorName.toLowerCase();

  const currentTab = storedTabs.find(t => t.id === rawTabId) || {
    id: rawTabId,
    name: isSampleLisbon
      ? "Lisbon Weekend"
      : rawTabId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    balance: isSampleLisbon ? -18000 : 0,
    role: isCurrentUserCreator ? ("Creator" as const) : ("Member" as const),
    creator: creatorName,
    memberCount: activeMembers.length > 0 ? activeMembers.length : 1,
    lastActivity: "Just now"
  };

  // Find user's actual balance from active members or tab summary
  const userMemberRecord = activeMembers.find(m => m.name.toLowerCase() === currentUser.toLowerCase());
  const actualBalance = userMemberRecord ? userMemberRecord.balance : currentTab.balance;
  const userMember = activeMembers.find(m => m.name.toLowerCase() === currentUser.toLowerCase());
  const userBalance = userMember ? userMember.balance : currentTab.balance;
  const userType = userBalance === 0 ? ("settled" as const) : userBalance < 0 ? ("debtor" as const) : ("creditor" as const);

  const currentUserData = {
    name: currentUser,
    balance: userBalance,
    type: userType
  };

  // Calculate gross volume dynamically from group purchases (excluding debt settlement receipts)
  const groupExpenses = expenses.filter(e => !e.id.startsWith("settle-"));
  const grossVolume = groupExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Check whether any member still has an outstanding negative balance to settle
  const hasOutstandingTabDebt = activeMembers.some(m => (m.balance ?? 0) < 0);

  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [isNettingModalOpen, setIsNettingModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isOfflineSyncOpen, setIsOfflineSyncOpen] = useState(false);
  const [isTabSettingsOpen, setIsTabSettingsOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<{ debtorName: string; amount: number } | null>(null);
  const [txState, setTxState] = useState<TransactionState>("idle");

  const [nettingTxState, setNettingTxState] = useState<TransactionState>("idle");
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.more-options-container')) {
        setIsMoreOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("settle") === "true") {
      setIsSettlementOpen(true);
    }
  }, [searchParams]);

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

  if (!mounted) {
    return (
      <div className="flex-1 min-h-[85vh] flex flex-col p-6 items-center justify-center text-slate-900 dark:text-white">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Loading Tab Ledger...</p>
      </div>
    );
  }
  
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
        success: "Netting Complete: Saved $3,400 in redundant transfers! (Includes $2,700 from prior cumulative cycles)"
      }}
    />
    <div className="flex-1 flex flex-col pb-48 lg:pb-48 text-slate-900 dark:text-white transition-colors duration-300">
      <GlobalNav />
      {/* Header */}
      <header className="px-4 sm:px-6 md:px-12 pt-4 sm:pt-6 pb-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10 mb-8 max-w-6xl mx-auto w-full gap-4 sticky top-[64px] z-30 bg-[#f5f5f7]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link 
            href="/home" 
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-all text-xs sm:text-sm font-semibold shadow-sm group shrink-0" 
            title="Return to All Tabs"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-slate-500 dark:text-white/50" />
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span className="hidden xs:inline sm:inline">All Tabs</span>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{currentTab.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {isCurrentUserCreator ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
                  <Crown className="w-3 h-3 text-indigo-500" /> Created by You
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 shrink-0">
                  <Crown className="w-3 h-3 text-amber-500" /> Host: {creatorName}
                </span>
              )}
              <NetworkStatusBadge compact />
              {workspaceMode === "sample" && rawTabId === "lisbon-24" && (
                <Link
                  href={`/demo?from=/tab/${rawTabId}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all shrink-0 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100"
                  title="Switch Sandbox Mode"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Lisbon Demo</span>
                </Link>
              )}
              {showAddress && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20 shrink-0">
                  0x7F5...3b9A
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative more-options-container">
            <button
              onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
              className="p-2 sm:p-2.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-colors shadow-sm cursor-pointer"
              title="More Options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {isMoreOptionsOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden z-50 flex flex-col text-sm font-semibold text-slate-700 dark:text-white/80">
                {!hasOutstandingTabDebt && (
                  <button
                    onClick={() => { setIsMoreOptionsOpen(false); setIsCertificateOpen(true); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                  >
                    <Award className="w-4 h-4" /> Settlement Certificate
                  </button>
                )}
                <button
                  onClick={() => { setIsMoreOptionsOpen(false); setIsOfflineSyncOpen(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <Wifi className="w-4 h-4" /> Offline Sync
                </button>
                <button
                  onClick={() => { setIsMoreOptionsOpen(false); setIsImportModalOpen(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Import Expenses
                </button>
                <button
                  onClick={() => { setIsMoreOptionsOpen(false); exportLedgerCSV(); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export Ledger (CSV)
                </button>
                <Link
                  href={`/tab/${params?.id || 'default'}/members`}
                  onClick={() => setIsMoreOptionsOpen(false)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <Users className="w-4 h-4" /> Manage Group
                </Link>
                <button
                  onClick={() => { setIsMoreOptionsOpen(false); setIsTabSettingsOpen(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 border-t border-slate-100 dark:border-white/5"
                >
                  <SlidersHorizontal className="w-4 h-4" /> Tab Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-6 md:px-12 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-28 sm:pb-32">
        
        {/* Left Column (Stats & Desktop Actions) */}
        <div className="lg:col-span-4 space-y-8">
          <BalanceCard 
            balance={Math.abs(currentUserData.balance)} 
            currency="AUSD"
            type={currentUserData.type}
            onSettle={() => setIsSettlementOpen(true)}
            onCashOut={() => setIsCashOutOpen(true)}
            onRemind={() => {
              sounds.playClick();
              toast.success("Reminders Sent!", {
                description: "Nudged all debtors in the group via push notification."
              });
            }}
          />

          {/* Category Analytics Widget */}
          <CategoryAnalytics expenses={expenses} currentUserName={currentUser} />

          {/* Smart Rebalancer */}
          <SmartRebalancer members={activeMembers} expenses={expenses} currentUserName={currentUser} />
          
          {/* Desktop actions moved to sticky dock */}
        </div>

        {/* Right Column (Roster & Feed) */}
        <div className="lg:col-span-8 space-y-10">
          <RosterCarousel 
            members={activeMembers} 
            grossVolume={grossVolume} 
            currentUserName={currentUser} 
            creatorName={creatorName} 
            onSelectMember={(member) => setSelectedMember(member)}
            onRequestPayment={(debtorName, amount) => setPaymentRequest({ debtorName, amount })}
          />
          <FeedList expenses={expenses} currentUserName={currentUser} />
        </div>
      </div>

      {/* Modern Web2 Sticky Bottom Action Dock on Mobile & Desktop */}
      <div className="fixed bottom-6 lg:bottom-10 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
        <div className="bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 rounded-full p-2 flex items-center justify-between gap-2 shadow-2xl w-full max-w-sm md:max-w-lg lg:max-w-xl mx-auto pointer-events-auto">
          <button 
            onClick={() => setIsNettingModalOpen(true)}
            className={`flex-[1.5] border font-bold py-3 sm:py-3.5 px-4 rounded-full flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 text-xs sm:text-sm ${
              hasOutstandingTabDebt 
                ? "bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30" 
                : "bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
            }`}
          >
            {hasOutstandingTabDebt ? (
              <>
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" /> <span>Run Netting</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" /> <span>Settled</span>
              </>
            )}
          </button>
          <Link 
            href={`/tab/${params?.id || 'default'}/expense/new`} 
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-white/90 py-3 sm:py-3.5 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
            aria-label="Add Expense"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> <span>Expense</span>
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
        settledBalance={settledBalance}
        totalOutstandingDebt={totalOutstandingDebt}
        withdrawableAmount={withdrawableAmount}
        currentUserName={currentUser}
      />

      {/* Member Details Breakdown Drawer */}
      <MemberDetailsDrawer
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        tabId={rawTabId}
        tabName={currentTab.name}
        currentUserName={currentUser}
        expenses={expenses}
        onRequestPayment={(debtorName, amount) => {
          setSelectedMember(null);
          setPaymentRequest({ debtorName, amount });
        }}
        onSettleSelf={() => {
          setSelectedMember(null);
          setIsSettlementOpen(true);
        }}
        memberCount={activeMembers.length || 1}
      />

      {/* Payment Request Drawer */}
      {paymentRequest && (
        <PaymentRequestDrawer
          isOpen={!!paymentRequest}
          onClose={() => setPaymentRequest(null)}
          tabId={rawTabId}
          tabName={currentTab.name}
          debtorName={paymentRequest.debtorName}
          amount={paymentRequest.amount}
          creditorName={currentUser}
        />
      )}

      {isNettingModalOpen && (
        <Modal onClose={() => setIsNettingModalOpen(false)} size="3xl" hideCloseButton className="bg-transparent border-0 shadow-none">
          <NettingCanvas 
            tabId={rawTabId} 
            members={activeMembers} 
            grossVolume={grossVolume} 
            expenseCount={expenses.length}
            currentUserName={currentUser}
            creatorName={creatorName}
          />
        </Modal>
      )}

      {/* Splitwise & CSV Import Modal */}
      <ImportExpensesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        tabId={rawTabId}
        tabName={currentTab.name}
        currentUserName={currentUser}
      />

      {/* Debt Clearance Certificate Modal */}
      <SettlementCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        tabName={currentTab.name}
        tabId={rawTabId}
        grossVolume={grossVolume}
        memberCount={activeMembers.length > 0 ? activeMembers.length : 1}
      />

      <OfflineMeshSyncModal
        isOpen={isOfflineSyncOpen}
        onClose={() => setIsOfflineSyncOpen(false)}
        tabId={rawTabId}
      />

      {/* Tab Settings Drawer */}
      <TabSettingsDrawer
        isOpen={isTabSettingsOpen}
        onClose={() => setIsTabSettingsOpen(false)}
        tabId={rawTabId}
        tabName={currentTab.name}
        tabCurrency={currentTab.currency}
        isCreator={isCurrentUserCreator}
      />
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
