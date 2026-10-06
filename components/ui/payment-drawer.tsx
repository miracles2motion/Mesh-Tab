"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Fingerprint, ArrowRight } from "lucide-react";

interface PaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: () => void;
  debtor: string;
  creditor: string;
  amount: number;
}

export function PaymentDrawer({ isOpen, onClose, onPay, debtor, creditor, amount }: PaymentDrawerProps) {
  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Glassmorphism Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
          />

          {/* Slide-up Drawer (Mobile) / Floating Modal (Desktop) */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-w-sm z-50 bg-white dark:bg-zinc-950 rounded-t-[32px] md:rounded-[32px] p-6 shadow-[0_-8px_40px_-15px_rgba(0,0,0,0.3)] border-t md:border border-zinc-200 dark:border-zinc-800"
          >
            {/* Drag Handle (Mobile Only) */}
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-6 md:hidden" />

            <div className="absolute top-5 right-5">
              <button 
                onClick={onClose} 
                className="p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            <div className="text-center mb-6 mt-2 md:mt-4">
              <p className="text-[10px] font-bold text-purple-600 mb-1.5 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                Optimized Settlement
              </p>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Pay {creditor}</h2>
              <div className="text-4xl font-black mt-2 text-zinc-900 dark:text-white tracking-tighter">
                ${(amount / 100).toFixed(2)}
                <span className="text-lg text-zinc-400 ml-1 font-semibold tracking-normal">AUSD</span>
              </div>
            </div>

            {/* Transaction Path Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 mb-6 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-6 md:gap-10 mx-auto max-w-[280px]">
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

            {/* Big Action Button */}
            <button 
              onClick={onPay}
              className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg mb-4"
            >
              <Fingerprint className="w-5 h-5" />
              <span className="text-base">Settle</span>
            </button>
            
            <div className="flex flex-col items-center gap-1.5 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
              <p className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1 font-medium">
                <Fingerprint className="w-3 h-3" /> Passkeys powered by <span className="font-bold text-zinc-900 dark:text-zinc-100">Privy</span>
              </p>
              <p className="text-center text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                Network fees sponsored by <span className="font-semibold text-zinc-600 dark:text-zinc-300">Privy</span>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
