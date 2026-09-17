"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, QrCode, Share, ExternalLink, Check } from "lucide-react";

export function ReceiptView({ isOpen, onClose, amount }: { isOpen: boolean, onClose: () => void, amount: number }) {
  const [copied, setCopied] = useState(false);
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleShare = () => {
    const text = `Settled ${formatCurrency(amount)} AUSD via MeshTab on Monad: 0x8f2...9a1`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 dark:bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white dark:bg-gradient-to-b dark:from-[#1c1c1e] dark:to-[#0a0a0b] border border-slate-200 dark:border-white/10 rounded-[32px] p-8 flex flex-col items-center relative overflow-hidden shadow-2xl text-slate-900 dark:text-white"
          >
            {/* Success Glow */}
            <div className="absolute top-0 w-full h-32 bg-emerald-500/10 dark:bg-emerald-500/20 blur-[50px] -z-10" />

            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settled</h2>
            <p className="text-slate-500 dark:text-white/60 mb-8 text-center text-sm">Your debt to Aisha has been netted and paid successfully.</p>

            <div className="w-full space-y-4 mb-8">
              <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/50 text-sm">Amount Paid</span>
                <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(amount)} AUSD</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/50 text-sm">Network</span>
                <span className="text-slate-800 dark:text-white font-medium">Monad Mainnet</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/50 text-sm">Block Height</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm font-semibold">#4891029</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/50 text-sm">Tx Hash</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm flex items-center gap-1 font-semibold">0x8f2...9a1 <ExternalLink className="w-3 h-3" /></span>
              </div>
            </div>

            <div className="w-32 h-32 bg-slate-50 dark:bg-white rounded-2xl flex items-center justify-center mb-8 p-2 border border-slate-200 shadow-sm">
              <QrCode className="w-full h-full text-slate-900 dark:text-black" />
            </div>

            <div className="flex w-full gap-3">
              <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 font-semibold transition-colors">
                Done
              </button>
              <button onClick={handleShare} className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-md shadow-indigo-500/20">
                {copied ? <Check className="w-4 h-4" /> : <Share className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Share"}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
