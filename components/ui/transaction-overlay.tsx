"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type TransactionState = "idle" | "authenticating" | "processing" | "success";

interface TransactionOverlayProps {
  state: TransactionState;
  messages?: {
    authenticating?: string;
    processing?: string;
    success?: string;
  };
}

export function TransactionOverlay({ 
  state, 
  messages = {
    authenticating: "Confirm with Passkey...",
    processing: "Securing transaction...",
    success: "Success!"
  }
}: TransactionOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (state === "idle" || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[350] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm w-full text-slate-900 dark:text-white transition-colors"
        >
          <div className="mb-6 relative">
            {state === "authenticating" && (
              <div className="relative">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
                <div className="w-16 h-16 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30 dark:border-indigo-500/40 relative z-10">
                  <Fingerprint className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
              </div>
            )}
            
            {state === "processing" && (
              <div className="relative">
                <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-slate-400 dark:text-white/50" />
                </div>
              </div>
            )}

            {state === "success" && (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 dark:border-emerald-500/40"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </motion.div>
            )}
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {state === "authenticating" && "Verification Required"}
            {state === "processing" && "Processing"}
            {state === "success" && "Confirmed"}
          </h3>
          
          <p className="text-slate-600 dark:text-white/60 text-sm leading-relaxed">
            {state === "authenticating" && messages.authenticating}
            {state === "processing" && messages.processing}
            {state === "success" && messages.success}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
