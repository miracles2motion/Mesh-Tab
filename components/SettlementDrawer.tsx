"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Wallet, ChevronDown, CheckCircle2, Apple } from "lucide-react";
import { useState } from "react";
import { ReceiptView } from "./ReceiptView";

export function SettlementDrawer({ 
  isOpen, 
  onClose, 
  amount = 18000,
  recipient
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  amount?: number;
  recipient?: string;
}) {
  const [method, setMethod] = useState<"ausd" | "apple">("apple");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleSettle = () => {
    setIsAuthenticating(true);
    setTimeout(() => {
      setIsAuthenticating(false);
      setIsSuccess(true);
    }, 2000);
  };

  if (isSuccess) {
    return <ReceiptView isOpen={true} onClose={() => { setIsSuccess(false); onClose(); }} amount={amount > 0 ? amount : (recipient === "Aisha" ? 18000 : 0)} recipient={recipient} />;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end justify-center p-0 sm:p-6 overflow-y-auto"
        >
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-[#121214] border border-white/10 sm:rounded-[32px] rounded-t-[32px] shadow-2xl p-6 flex flex-col max-h-[92vh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 cursor-pointer" onClick={onClose} />
            
            <div className="text-center mb-8">
              <p className="text-white/60 mb-2">Residual Obligation</p>
              <h2 className="text-5xl font-bold text-white tracking-tight">{formatCurrency(amount)}</h2>
              <p className="text-emerald-400 text-sm mt-3 font-medium bg-emerald-500/10 inline-block px-3 py-1 rounded-full">
                {recipient ? `Pays ${recipient} directly` : "Settles net balance directly"}
              </p>
            </div>

            <div className="space-y-3 mb-8">
              <button 
                onClick={() => setMethod("apple")}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${method === "apple" ? "bg-white/10 border-white/30" : "bg-black/20 border-white/5 hover:border-white/10"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
                    <Apple className="w-5 h-5 fill-current" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-lg leading-tight">Apple Pay</p>
                    <p className="text-white/40 text-sm">Powered by Dynamic</p>
                  </div>
                </div>
                {method === "apple" && <CheckCircle2 className="w-5 h-5 text-white" />}
              </button>

              <button 
                onClick={() => setMethod("ausd")}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${method === "ausd" ? "bg-indigo-500/20 border-indigo-500/50" : "bg-black/20 border-white/5 hover:border-white/10"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-lg leading-tight">Agora AUSD</p>
                    <p className="text-white/40 text-sm">Balance: $0.00</p>
                  </div>
                </div>
                {method === "ausd" && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
              </button>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-6">
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-white/50">Exchange Fee (One-time)</span>
                 <span className="text-white">$0.00 <span className="text-white/30 line-through ml-1">$12.50</span></span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-white/50">Transfer Fee (Sponsored)</span>
                 <span className="text-emerald-400">Free</span>
               </div>
            </div>

            <button 
              onClick={handleSettle}
              disabled={isAuthenticating}
              className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isAuthenticating ? <Fingerprint className="w-6 h-6 animate-pulse text-black" /> : `Pay ${formatCurrency(amount)}`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
