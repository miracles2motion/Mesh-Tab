"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Activity, Plus, Clock, Receipt, UserCircle2, ShieldCheck, Zap, X } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AddExpenseModal } from "../../../components/AddExpenseModal";
import { NettingCanvas } from "../../../components/NettingCanvas";
import { SettlementDrawer } from "../../../components/SettlementDrawer";

// Mock Data matching the Lisbon Trip baseline
const members = [
  { name: "Aisha", balance: 30000, type: "creditor" },
  { name: "Kemi", balance: -4000, type: "debtor" },
  { name: "Ben", balance: -8000, type: "debtor" },
  { name: "Sarah", balance: -18000, type: "debtor" }
];

const feed = [
  { id: 1, payer: "Aisha", amount: 60000, desc: "Villa booking", time: "Just now", status: "confirmed" },
  { id: 2, payer: "Kemi", amount: 26000, desc: "Dinners & wine", time: "5h ago", status: "confirmed" },
  { id: 3, payer: "Ben", amount: 22000, desc: "Excursions", time: "1d ago", status: "confirmed" },
  { id: 4, payer: "Sarah", amount: 12000, desc: "Vans & logistics", time: "2d ago", status: "confirmed" }
];

export default function TabDashboard() {
  const [currentUser] = useState("Sarah"); // Assuming we logged in as Sarah for the demo
  const currentUserData = members.find(m => m.name === currentUser);
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showNetting, setShowNetting] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);

  const formatCurrency = (cents: number) => `$${(Math.abs(cents) / 100).toFixed(2)}`;

  return (
    <div className="flex flex-col h-full bg-black/40">
      
      {/* Header */}
      <header className="px-6 md:px-12 pt-10 pb-4 flex items-center justify-between sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-white">Lisbon Weekend</h1>
          <div className="flex items-center gap-1.5 text-xs md:text-sm text-emerald-400 mt-1">
            <Activity className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
            <span>Monad Mainnet • 0.3s</span>
          </div>
        </div>
        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors">
          <UserCircle2 className="w-6 h-6 md:w-7 md:h-7 text-white/70" />
        </button>
      </header>

      <div className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 pb-32">
        
        {/* Left Column (Stats & Actions) */}
        <div className="lg:col-span-4 space-y-8">
          {/* Personal Balance Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-panel p-6 md:p-8 relative overflow-hidden ${
              currentUserData?.type === 'debtor' ? 'shadow-rose-500/10' : 'shadow-emerald-500/10'
            }`}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <p className="text-sm md:text-base text-white/60 mb-1">Your Net Balance</p>
            <div className="flex items-end gap-3">
              <h2 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                {currentUserData?.type === 'debtor' ? '-' : '+'}{formatCurrency(currentUserData?.balance || 0)}
              </h2>
            </div>
            
            <div className="mt-8 flex gap-3">
               {currentUserData?.type === 'debtor' ? (
                  <button onClick={() => setShowSettlement(true)} className="flex-1 bg-white text-black font-semibold py-4 rounded-xl hover:bg-white/90 transition-colors flex justify-center items-center gap-2 text-lg">
                    <Zap className="w-5 h-5" /> Settle Debt
                  </button>
               ) : (
                  <button className="flex-1 bg-indigo-500 text-white font-semibold py-4 rounded-xl hover:bg-indigo-600 transition-colors text-lg">
                    Remind Group
                  </button>
               )}
            </div>
          </motion.div>
          
          {/* Desktop Actions (Hidden on mobile) */}
          <div className="hidden lg:flex flex-col gap-4">
            <button onClick={() => setShowNetting(true)} className="glass-button w-full py-5 text-white font-semibold gap-3 border-indigo-500/30 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 text-lg rounded-2xl">
              <Activity className="w-6 h-6" /> Run Tangle Netting
            </button>
            <button onClick={() => setShowAddExpense(true)} className="w-full py-5 rounded-2xl bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg">
              <Plus className="w-6 h-6" /> Add New Expense
            </button>
          </div>
        </div>

        {/* Right Column (Roster & Feed) */}
        <div className="lg:col-span-8 space-y-10">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white/80">Group Roster</h3>
            <span className="text-xs text-white/40">Gross Volume: $1,200.00</span>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
            {members.map((member, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={member.name}
                className="flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 w-32"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-white text-sm">{member.name}</span>
                  {member.type === 'creditor' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div className={`text-lg font-semibold ${member.type === 'creditor' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(member.balance)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Expense Feed */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white/80">Live Ledger</h3>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          
          <div className="space-y-3">
            {feed.map((item, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (i * 0.1) }}
                key={item.id}
                className="glass-panel p-4 flex gap-4 items-center"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5 text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-white truncate">{item.desc}</p>
                    <span className="font-bold text-white ml-2">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/50">Paid by {item.payer}</span>
                    <span className="text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Gasless
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Bar (Hidden on Desktop) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-40">
        <div className="flex gap-4 pointer-events-auto max-w-7xl mx-auto w-full">
          <button onClick={() => setShowNetting(true)} className="glass-button flex-1 py-4 text-white font-medium gap-2 border-indigo-500/30 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 rounded-2xl">
            <Activity className="w-5 h-5" /> Tangle Netting
          </button>
          <button onClick={() => setShowAddExpense(true)} className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform active:scale-95 flex-shrink-0">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <AddExpenseModal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} />
      <SettlementDrawer isOpen={showSettlement} onClose={() => setShowSettlement(false)} amount={Math.abs(currentUserData?.balance || 0)} />
      
      <AnimatePresence>
        {showNetting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-md relative">
              <button onClick={() => setShowNetting(false)} className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20"><X className="w-5 h-5 text-white/70" /></button>
              <NettingCanvas />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
