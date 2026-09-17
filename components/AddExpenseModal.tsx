"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Mic, SplitSquareHorizontal, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { useUserProfile } from "../lib/user";

export function AddExpenseModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const profile = useUserProfile();
  const currentUserName = profile.name || "David";
  const [tab, setTab] = useState<"manual" | "ai">("ai");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDraft, setShowDraft] = useState(false);

  const handleAIUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowDraft(true);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
        >
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-[#0a0a0b] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <div className="flex gap-4">
                <button 
                  onClick={() => setTab("ai")}
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${tab === "ai" ? "text-indigo-400" : "text-white/40 hover:text-white/70"}`}
                >
                  <Sparkles className="w-4 h-4" /> AI Concierge
                </button>
                <button 
                  onClick={() => setTab("manual")}
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${tab === "manual" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                >
                  Manual Entry
                </button>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {tab === "ai" && !showDraft && (
                <div className="space-y-6">
                  <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors cursor-pointer group" onClick={handleAIUpload}>
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-indigo-500/20">
                      {isProcessing ? (
                        <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                      ) : (
                        <Camera className="w-8 h-8 text-white/50 group-hover:text-indigo-400" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-white font-medium">{isProcessing ? "Extracting Data..." : "Snap Receipt"}</p>
                      <p className="text-sm text-white/40">{isProcessing ? "Identifying line items & totals" : "or upload from gallery"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-white/30 text-sm">
                    <div className="flex-1 h-px bg-white/10" /> OR <div className="flex-1 h-px bg-white/10" />
                  </div>

                  <button className="w-full p-6 glass-panel flex flex-col items-center gap-3 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <Mic className="w-6 h-6 text-rose-400" />
                    </div>
                    <p className="text-white font-medium">"I paid $120 for the vans for everyone"</p>
                  </button>
                </div>
              )}

              {tab === "ai" && showDraft && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="glass-panel p-5 border-indigo-500/30 bg-indigo-500/5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-white font-semibold">Lisbon Vans & Logistics</h4>
                        <p className="text-sm text-white/50">Extracted from Voice Note</p>
                      </div>
                      <div className="text-2xl font-bold text-white">$120.00</div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60">Paid By</span>
                        <span className="text-white font-medium bg-white/10 px-2 py-1 rounded-md">{currentUserName}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60">Split Method</span>
                        <span className="text-white font-medium flex items-center gap-1"><SplitSquareHorizontal className="w-4 h-4"/> Equal (4 ways)</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={onClose} className="w-full py-4 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> Commit to Ledger
                  </button>
                </motion.div>
              )}

              {/* Manual mode could go here, omitting for brevity to focus on AI wow factor */}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
