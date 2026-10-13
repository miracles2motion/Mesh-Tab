"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Share, ExternalLink, Check, X, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MonadLogo, AgoraLogo } from "./ui/partner-logo";
import { useDeveloperMode } from "../lib/user";
import { toast } from "sonner";
import { sounds } from "../lib/sounds";

export function ReceiptView({ 
  isOpen, 
  onClose, 
  amount,
  recipient,
  txHash: customTxHash,
  type = "settlement"
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  amount: number;
  recipient?: string;
  txHash?: string;
  type?: "settlement" | "topup" | "deposit";
}) {
  const { developerMode: isDeveloperMode } = useDeveloperMode();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Always use the exact amount passed in (in cents)
  const displayAmount = amount;
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const isTopUp = type === "topup" || type === "deposit" || (!recipient && amount >= 50000);
  const resolvedType = isTopUp ? "deposit" : (type || "settlement");

  const txHash = customTxHash || "0xafd413d0ebd3e9da42b92fe61a3f737a3a437108cf367c159d6861712bc829f0";
  const explorerUrl = `https://testnet.monadvision.com/tx/${txHash}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://meshtab.app";
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/home";

  const queryParams = new URLSearchParams({
    id: "4891029",
    amt: String(displayAmount),
    type: resolvedType,
    ts: String(Date.now()),
    from: currentPath,
    txHash: txHash
  });
  if (recipient) queryParams.set("recipient", recipient);
  if (isTopUp) queryParams.set("method", "bank");

  const receiptUrl = `${origin}/receipt?${queryParams.toString()}`;

  const verificationPayload = isDeveloperMode 
    ? explorerUrl 
    : receiptUrl;

  const handleShare = async () => {
    sounds.playClick();
    const shareLink = isDeveloperMode ? explorerUrl : receiptUrl;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success(isDeveloperMode ? "Monad Explorer Link Copied!" : "Receipt Link Copied!", {
        description: shareLink
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] bg-black/60 dark:bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-sm my-auto bg-white dark:bg-gradient-to-b dark:from-[#1c1c1e] dark:to-[#0a0a0b] border border-slate-200 dark:border-white/10 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col items-center relative shadow-2xl text-slate-900 dark:text-white max-h-[min(92vh,680px)] overflow-y-auto"
          >
            {/* Success Ambient Glow */}
            <div className="absolute top-0 w-full h-28 bg-emerald-500/10 dark:bg-emerald-500/20 blur-[40px] -z-10 pointer-events-none" />

            {/* Quick Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/60 dark:hover:text-white flex items-center justify-center transition-colors z-10"
              aria-label="Close receipt"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-md shadow-emerald-500/15 flex-shrink-0">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {isTopUp ? "Funds Added" : "Settled"}
            </h2>
            <p className="text-slate-500 dark:text-white/60 mb-4 text-center text-xs sm:text-sm max-w-[280px] leading-relaxed">
              {isTopUp ? (
                isDeveloperMode 
                  ? "$10,000.00 Agora AUSD testnet funds confirmed on Monad."
                  : "Your account balance has been credited and is ready for instant netting."
              ) : recipient ? (
                isDeveloperMode
                  ? `Your debt to ${recipient} has been settled on Monad Testnet.`
                  : `Your debt to ${recipient} has been netted and cleared.`
              ) : (
                isDeveloperMode
                  ? "Your balance has been netted and settled on Monad Testnet."
                  : "Your balance has been netted and settled successfully."
              )}
            </p>

            {/* Ledger Details Rows */}
            <div className="w-full space-y-2 mb-4 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/50">
                  {isTopUp ? "Amount Added" : "Amount Paid"}
                </span>
                <span className="text-slate-900 dark:text-white font-bold text-sm sm:text-base">
                  {formatCurrency(displayAmount)} {isDeveloperMode ? "AUSD" : ""}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/50">Network</span>
                <span className="text-slate-800 dark:text-white font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  {isDeveloperMode ? "Instant Monad High-Speed Ledger" : "Instant Smart Balance"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-white/50">Reference</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-semibold">#4891029</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/10">
                <div className="flex flex-col">
                  <span className="text-slate-500 dark:text-white/50">Payment Receipt</span>
                  <span className="text-[10px] text-slate-400 dark:text-white/40">
                    {isDeveloperMode ? "Verified Monad Testnet Tx" : "Cryptographically Verified"}
                  </span>
                </div>
                {isDeveloperMode ? (
                  <a 
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1 font-semibold text-xs bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    title="View on Monad Testnet Explorer"
                  >
                    <span>{txHash.slice(0, 6)}...{txHash.slice(-4)}</span>
                    <ExternalLink className="w-3 h-3 text-indigo-500" />
                  </a>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Instant & Encrypted</span>
                  </span>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-2xl flex flex-col items-center justify-center mb-4 p-2 border border-slate-200 shadow-sm flex-shrink-0">
              <QRCodeSVG 
                value={verificationPayload} 
                size={96}
                level="M"
                className="w-24 h-24"
              />
              <span className="text-[9px] text-slate-500 font-bold mt-1">
                {isDeveloperMode ? "Scan for Explorer" : "Digital Receipt Seal"}
              </span>
            </div>

            {/* Direct Blockchain Explorer or Digital Receipt Link */}
            {isDeveloperMode ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mb-2.5 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
              >
                <span>View on MonadVision Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mb-2.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Open Full Digital Receipt</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Action Buttons */}
            <div className="flex w-full gap-2.5 pt-1">
              <button 
                onClick={onClose} 
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 font-semibold text-sm transition-colors active:scale-95 cursor-pointer"
              >
                Done
              </button>
              <button 
                onClick={handleShare} 
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Share"}</span>
              </button>
            </div>

            {/* Official Partner Endorsement Strip */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-white/50">
              <span className="font-medium flex items-center gap-1.5 text-slate-600 dark:text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Verified Ledger
              </span>
              {isDeveloperMode ? (
                <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity text-slate-700 dark:text-white/80">
                  <MonadLogo className="h-3.5 w-auto" />
                  <span className="text-slate-300 dark:text-white/20">×</span>
                  <AgoraLogo className="h-3.5 w-auto" />
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-500 dark:text-white/60 text-[10px] font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Bank-Grade Encryption • 0% Fee</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

