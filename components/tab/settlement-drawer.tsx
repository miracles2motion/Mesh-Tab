"use client";

import { useState } from "react";
import { Zap, AlertCircle } from "lucide-react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import Image from "next/image";
import { ReceiptView } from "../ReceiptView";

import { useUserProfile, settleTab } from "../../lib/user";

interface SettlementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debtAmount: number; // in cents
  tabId?: string;
  currentUserName?: string;
}

export function SettlementDrawer({ isOpen, onClose, debtAmount, tabId = "lisbon-24", currentUserName }: SettlementDrawerProps) {
  const profile = useUserProfile();
  const activeUser = currentUserName || profile.name || "David";
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSettle = async () => {
    setIsProcessing(true);
    // Simulate Dynamic SDK widget loading + transaction
    await new Promise(r => setTimeout(r, 2000));
    settleTab(tabId, activeUser, debtAmount);
    setIsProcessing(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <ReceiptView 
        isOpen={true} 
        onClose={() => { 
          setIsSuccess(false); 
          onClose(); 
        }} 
        amount={debtAmount} 
      />
    );
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 md:p-8 flex flex-col items-center text-center bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">

        {!isSuccess ? (
          <>
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20">
              <Zap className="w-8 h-8 text-rose-500 dark:text-rose-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Settle Your Debt</h2>
            <p className="text-slate-500 dark:text-white/60 text-sm mb-8">You are paying off your netted residual balance on Monad via Agora AUSD.</p>

            <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 mb-8 shadow-sm">
              <span className="text-slate-500 dark:text-white/40 font-semibold text-xs uppercase tracking-wider">Total Due</span>
              <div className="text-5xl font-bold text-slate-900 dark:text-white my-2 tabular-nums tracking-tight">
                {formatCurrency(debtAmount)}
              </div>
              <span className="text-slate-500 dark:text-white/60 font-semibold text-sm">AUSD</span>
            </div>

            <div className="w-full flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl mb-8 text-left">
              <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <p className="text-sm text-indigo-800 dark:text-indigo-200">
                You will be prompted to purchase AUSD using Apple Pay or your Debit Card via Dynamic.
              </p>
            </div>

            <Button 
              onClick={handleSettle}
              variant="primary" 
              size="lg" 
              className="w-full h-14"
              isLoading={isProcessing}
            >
              Pay with Apple Pay
            </Button>
            
            {/* Dynamic Placeholder Logos */}
            <div className="mt-6 flex items-center justify-center gap-4 text-slate-400 dark:text-white/30 text-xs">
               <span>Powered by</span>
               <div className="flex gap-2 opacity-70 dark:opacity-50">
                 <Image src="/logos/dynamic.svg" alt="Dynamic" width={60} height={20} />
                 <Image src="/logos/monad.svg" alt="Monad" width={60} height={20} />
                 <Image src="/logos/agora.svg" alt="Agora" width={40} height={20} />
               </div>
            </div>
          </>
        ) : (
          <div className="py-12 flex flex-col items-center">
             <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
              <svg className="w-10 h-10 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Debt Settled!</h2>
            <p className="text-slate-500 dark:text-white/60">Your transaction is confirmed on Monad.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
