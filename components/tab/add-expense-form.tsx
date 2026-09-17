"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { TransactionOverlay, TransactionState } from "../ui/transaction-overlay";
import Image from "next/image";
import { Check, ChevronDown } from "lucide-react";

interface AddExpenseFormProps {
  onSuccess?: () => void;
  members?: string[];
}

export function AddExpenseForm({ onSuccess, members = ["Sarah"] }: AddExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percent'>('equal');
  const [txState, setTxState] = useState<TransactionState>("idle");
  
  // New UI states for splitting
  const [paidBy, setPaidBy] = useState(members[members.length - 1] || "Sarah"); // Default to current user (Sarah)
  const [splitBetween, setSplitBetween] = useState<string[]>(members); // Default to everyone
  const [showPaidByDropdown, setShowPaidByDropdown] = useState(false);

  const toggleSplitMember = (member: string) => {
    if (splitBetween.includes(member)) {
      if (splitBetween.length === 1) return; // Prevent deselecting everyone
      setSplitBetween(splitBetween.filter(m => m !== member));
    } else {
      setSplitBetween([...splitBetween, member]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !desc) return;
    
    // 1. Mock Passkey Prompt (Browser Native equivalent)
    setTxState("authenticating");
    await new Promise(r => setTimeout(r, 1500));
    
    // 2. Mock Paymaster/Bundler Processing
    setTxState("processing");
    await new Promise(r => setTimeout(r, 2000));
    
    // 3. Success
    setTxState("success");
    await new Promise(r => setTimeout(r, 1000));
    
    setTxState("idle");
    if (onSuccess) onSuccess();
  };

  return (
    <>
      <TransactionOverlay 
        state={txState} 
        messages={{
          authenticating: "Please confirm with Passkey/FaceID to log this expense securely.",
          processing: "Syncing your ledger...",
          success: "Expense added!"
        }}
      />
      <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col h-full relative z-0 bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Add Expense</h2>
          <p className="text-slate-500 dark:text-white/60 text-sm">Log a new expense to the shared group ledger.</p>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Amount (AUSD)</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 text-xl font-bold">$</span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-2xl tabular-nums font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Description</label>
            <input
              type="text"
              required
              placeholder="What was this for?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-base font-medium"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Paid By Dropdown */}
            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Paid By</label>
              <div 
                onClick={() => setShowPaidByDropdown(!showPaidByDropdown)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                    {paidBy[0]}
                  </div>
                  <span className="text-sm font-semibold">{paidBy === "Sarah" ? "You" : paidBy}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/50" />
              </div>
              
              {showPaidByDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                  {members.map(member => (
                    <div 
                      key={member}
                      onClick={() => { setPaidBy(member); setShowPaidByDropdown(false); }}
                      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-sm font-medium text-slate-800 dark:text-white/80 flex items-center gap-2 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                        {member[0]}
                      </div>
                      {member === "Sarah" ? "You (Sarah)" : member}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Split Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Split Method</label>
              <div className="flex p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-[50px]">
                <button 
                  type="button" 
                  onClick={() => setSplitType('equal')}
                  className={`flex-1 rounded-xl font-semibold text-xs transition-colors ${splitType === 'equal' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Equal
                </button>
                <button 
                  type="button" 
                  onClick={() => setSplitType('exact')}
                  className={`flex-1 rounded-xl font-semibold text-xs transition-colors ${splitType === 'exact' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Exact
                </button>
              </div>
            </div>
          </div>

          {/* Split Between */}
          <div className="space-y-2 pt-2">
             <div className="flex items-center justify-between ml-1 mb-2">
               <label className="text-sm font-semibold text-slate-700 dark:text-white/80">Split Between</label>
               <span className="text-xs text-slate-500 dark:text-white/40">{splitBetween.length} selected</span>
             </div>
             
             <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-2 space-y-1">
               {members.map(member => {
                 const isSelected = splitBetween.includes(member);
                 return (
                   <div 
                     key={member}
                     onClick={() => toggleSplitMember(member)}
                     className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                         {member[0]}
                       </div>
                       <span className={`font-semibold text-sm ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-white/40'}`}>
                         {member === "Sarah" ? "You" : member}
                       </span>
                     </div>
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-slate-300 dark:border-white/20'}`}>
                       {isSelected && <Check className="w-3 h-3 text-white" />}
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        <div className="mt-4 pt-6 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full relative overflow-hidden"
            disabled={txState !== "idle"}
          >
            Log Expense
          </Button>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 dark:text-white/30 text-[11px] font-medium">
            <span>Zero-fee sync via</span>
            <div className="opacity-70 dark:opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
              <Image src="/logos/pimlico.svg" alt="Pimlico" width={50} height={16} />
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
