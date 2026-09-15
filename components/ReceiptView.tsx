"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, QrCode, Share, ExternalLink } from "lucide-react";

export function ReceiptView({ isOpen, onClose, amount }: { isOpen: boolean, onClose: () => void, amount: number }) {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0b] border border-white/10 rounded-[32px] p-8 flex flex-col items-center relative overflow-hidden"
          >
            {/* Success Glow */}
            <div className="absolute top-0 w-full h-32 bg-emerald-500/20 blur-[50px] -z-10" />

            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">Settled</h2>
            <p className="text-white/60 mb-8 text-center">Your debt to Aisha has been netted and paid successfully.</p>

            <div className="w-full space-y-4 mb-8">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/50 text-sm">Amount Paid</span>
                <span className="text-white font-bold">{formatCurrency(amount)} AUSD</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/50 text-sm">Network</span>
                <span className="text-white font-medium">Monad Mainnet</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/50 text-sm">Block Height</span>
                <span className="text-indigo-400 font-mono text-sm">#4891029</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/50 text-sm">Tx Hash</span>
                <span className="text-indigo-400 font-mono text-sm flex items-center gap-1">0x8f2...9a1 <ExternalLink className="w-3 h-3" /></span>
              </div>
            </div>

            <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center mb-8 p-2">
              <QrCode className="w-full h-full text-black" />
            </div>

            <div className="flex w-full gap-3">
              <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">
                Done
              </button>
              <button className="flex-1 py-3.5 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2">
                <Share className="w-4 h-4" /> Share
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
