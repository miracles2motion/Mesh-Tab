"use client";

import React from "react";
import { Sheet } from "./sheet";
import { Fingerprint, ArrowRight } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { useDeveloperMode } from "../../lib/user";

interface PaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: () => void;
  debtor: string;
  creditor: string;
  amount: number;
}

export function PaymentDrawer({ isOpen, onClose, onPay, debtor, creditor, amount }: PaymentDrawerProps) {
  const { isDeveloperMode } = useDeveloperMode();

  return (
    <Sheet isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6 md:p-8 flex flex-col items-center text-zinc-900 dark:text-white">
        <div className="text-center mb-6 mt-1">
          <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-1.5 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            Optimized Settlement
          </p>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Pay {creditor}</h2>
          <div className="text-4xl font-black mt-2 text-zinc-900 dark:text-white tracking-tighter">
            {formatCurrency(amount)}
            {isDeveloperMode && (
              <span className="text-lg text-zinc-400 ml-1 font-semibold tracking-normal">AUSD</span>
            )}
          </div>
        </div>

        {/* Transaction Path Card */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 mb-6 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-6 md:gap-10 mx-auto w-full max-w-[280px]">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-base shadow-inner">
              {debtor.charAt(0)}
            </div>
            <span className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-400">You</span>
          </div>
          
          <div className="flex flex-col items-center justify-center relative w-16">
            <div className="h-px w-full bg-zinc-300 dark:bg-zinc-700 absolute top-1/2 -translate-y-1/2" />
            <ArrowRight className="w-5 h-5 text-purple-500 bg-zinc-50 dark:bg-zinc-900 z-10 p-0.5 relative rounded-full" />
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center font-bold text-purple-600 text-base shadow-inner border border-purple-200 dark:border-purple-800/50">
              {creditor.charAt(0)}
            </div>
            <span className="font-semibold text-[11px] text-zinc-900 dark:text-zinc-300">{creditor}</span>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={onPay}
          className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg mb-4 cursor-pointer"
        >
          <Fingerprint className="w-5 h-5" />
          <span className="text-base">Settle</span>
        </button>
        
        <div className="flex flex-col items-center gap-1.5 border-t border-zinc-100 dark:border-zinc-800/50 pt-4 w-full">
          {isDeveloperMode ? (
            <>
              <p className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1 font-medium">
                <Fingerprint className="w-3 h-3" /> Passkeys powered by <span className="font-bold text-zinc-900 dark:text-zinc-100">Privy</span>
              </p>
              <p className="text-center text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                Network fees sponsored by <span className="font-semibold text-zinc-600 dark:text-zinc-300">Privy</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1 font-medium">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-500" /> Authenticated with <span className="font-semibold text-zinc-900 dark:text-zinc-100">Biometric Passkey</span>
              </p>
              <p className="text-center text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                Zero-fee instant peer-to-peer settlement
              </p>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
