"use client";

import { useState, useEffect, Suspense } from "react";
import { Activity, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { BalanceCard } from "../../../components/tab/balance-card";
import { SettlementDrawer } from "../../../components/tab/settlement-drawer";
import { RosterCarousel } from "../../../components/tab/roster-carousel";
import { FeedList, ExpenseItem } from "../../../components/tab/feed-list";
import { TransactionOverlay, TransactionState } from "../../../components/ui/transaction-overlay";

// Mock Data
const mockMembers = [
  { name: "Aisha", balance: 30000, type: "creditor" as const },
  { name: "Kemi", balance: -4000, type: "debtor" as const },
  { name: "Ben", balance: -8000, type: "debtor" as const },
  { name: "Sarah", balance: -18000, type: "debtor" as const }
];

const mockFeed: ExpenseItem[] = [
  { id: "1", payer: "Aisha", amount: 60000, desc: "Villa booking", time: "Just now" },
  { id: "2", payer: "Kemi", amount: 26000, desc: "Dinners & wine", time: "5h ago" },
  { id: "3", payer: "Ben", amount: 22000, desc: "Excursions", time: "1d ago" },
];

function DashboardContent() {
  const [currentUser] = useState("Sarah"); 
  const currentUserData = mockMembers.find(m => m.name === currentUser)!;
  const params = useParams();
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [nettingTxState, setNettingTxState] = useState<TransactionState>("idle");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("meshTab_showAddress");
    if (saved === "true") setShowAddress(true);
  }, []);

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
    <div className="flex-1 flex flex-col pb-24 md:pb-12">
      
      {/* Header handled by app/tab/layout.tsx, we just add the dashboard title here */}
      <header className="px-6 md:px-12 pt-8 pb-6 flex items-center justify-between border-b border-white/10 mb-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Link href="/home" className="hidden md:flex w-10 h-10 rounded-full bg-white/5 items-center justify-center hover:bg-white/10 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-white/80" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1 md:hidden">
              <Link href="/home" className="text-white/50 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Lisbon Weekend</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Real-time Sync • 0.3s</span>
              </div>
              {showAddress && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                  0x7F5...3b9A
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/tab/${params?.id || 'default'}/members`} className="text-sm font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full transition-colors hidden md:block">
            Manage Group
          </Link>
          <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors text-white font-medium text-lg">
            {currentUser[0]}
          </button>
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
          />
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex flex-col gap-4">
            <button 
              onClick={handleRunNetting}
              className="w-full py-4 rounded-2xl bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2 text-lg"
            >
              <Activity className="w-5 h-5" /> Run Tangle Netting
            </button>
            <Link href={`/tab/${params?.id || 'default'}/expense/new`} className="w-full py-4 rounded-2xl bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-lg">
              <Plus className="w-5 h-5" /> Add New Expense
            </Link>
          </div>
        </div>

        {/* Right Column (Roster & Feed) */}
        <div className="lg:col-span-8 space-y-10">
          <RosterCarousel members={mockMembers} grossVolume={108000} />
          <FeedList expenses={mockFeed} />
        </div>
      </div>

      {/* Mobile Floating Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40 pointer-events-none pb-[env(safe-area-inset-bottom,24px)]">
        <div className="flex gap-4 pointer-events-auto max-w-md mx-auto w-full">
          <button 
            onClick={handleRunNetting}
            className="flex-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-100 font-semibold py-4 rounded-2xl backdrop-blur-xl flex items-center justify-center gap-2"
          >
            <Activity className="w-5 h-5" /> Netting
          </button>
          <Link href={`/tab/${params?.id || 'default'}/expense/new`} className="w-16 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 transition-transform">
            <Plus className="w-7 h-7" />
          </Link>
        </div>
      </div>

      <SettlementDrawer 
        isOpen={isSettlementOpen} 
        onClose={() => setIsSettlementOpen(false)} 
        debtAmount={Math.abs(currentUserData.balance)} 
      />
    </div>
    </>
  );
}

export default function TabDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <DashboardContent />
    </Suspense>
  );
}
