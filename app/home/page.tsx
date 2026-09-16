"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Users, Receipt, Plus, ArrowRight, Bell, QrCode } from "lucide-react";
import { useState } from "react";
import { TransactionOverlay, TransactionState } from "../../components/ui/transaction-overlay";
import { formatCurrency } from "../../lib/utils";

// Mock Data for the Hub
const mockTabs = [
  { id: "lisbon-24", name: "Lisbon Weekend", role: "Creator", balance: -18000 },
  { id: "house-groceries", name: "House Groceries", role: "Member", balance: 4500 },
];

export default function GlobalHub() {
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [txState, setTxState] = useState<TransactionState>("idle");

  const netBalance = mockTabs.reduce((acc, tab) => acc + tab.balance, 0);

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
    setJoinCode("");
    router.push(`/tab/joined-${joinCode}`);
  };

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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="px-6 md:px-12 pt-10 pb-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}, David {emoji}</h1>
          <p className="text-white/60 mt-1">Ready to settle up?</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/notifications" className="relative w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-white/80" />
            <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0a0a0a]" />
          </Link>
          <Link href="/settings" className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-[#0a0a0a] shadow-[0_0_0_2px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform text-xl font-bold">
            D
          </Link>
        </div>
      </header>

      <main className="px-6 md:px-12 max-w-5xl mx-auto w-full space-y-10 pb-32">
        {/* Overall Balance Summary */}
        <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-8 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-white/70 font-medium text-sm uppercase tracking-wider">Total Net Balance</span>
            <div className={`text-5xl md:text-6xl font-bold mt-2 tracking-tight ${netBalance < 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {netBalance < 0 ? "-" : "+"}{formatCurrency(Math.abs(netBalance))}
            </div>
            <p className="text-white/50 text-sm mt-3">Across {mockTabs.length} active groups</p>
          </div>
          {/* Decorative Mesh */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/30 blur-[80px] rounded-full pointer-events-none" />
        </div>

        {/* Active Tabs */}
        <div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-white/50" /> Active Tabs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTabs.map(tab => (
              <Link 
                href={`/tab/${tab.id}`}
                key={tab.id} 
                className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 transition-all hover:scale-[1.02] cursor-pointer group flex flex-col h-[220px]"
              >
                <div className="flex justify-between items-start mb-auto">
                  <div>
                    <h3 className="font-bold text-lg text-white/90 group-hover:text-white transition-colors">{tab.name}</h3>
                    <p className="text-white/40 text-sm mt-1">{tab.memberCount} members</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${tab.balance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {tab.balance > 0 ? '+' : ''}{formatCurrency(tab.balance)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <Receipt className="w-4 h-4" />
                    <span>{tab.lastActivity}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all text-white/30">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link 
            href="/tab/new" 
            className="flex-1 bg-white hover:bg-white/90 text-black px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Create New Tab</span>
            <span className="sm:hidden">New Tab</span>
          </Link>
          <button 
            onClick={() => setShowJoinModal(true)}
            className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <QrCode className="w-5 h-5" />
            <span className="hidden sm:inline">Join via Code</span>
            <span className="sm:hidden">Join Tab</span>
          </button>
        </div>
      </main>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Join Group via Code</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-white/40 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">6-Digit Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A3F9K2" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center tracking-widest text-2xl font-mono uppercase text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                type="submit"
                disabled={joinCode.length !== 6}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-all"
              >
                Join Group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
