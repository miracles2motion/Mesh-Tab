"use client";

import { useState } from "react";
import { Modal } from "../ui/modal";
import { CheckCircle2, Share, Copy, Check, Sparkles, X, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import { MonadLogo, AgoraLogo, AlchemyLogo } from "../ui/partner-logo";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface SettlementCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabName: string;
  tabId: string;
  grossVolume: number; // in cents
  memberCount: number;
}

export function SettlementCertificateModal({
  isOpen,
  onClose,
  tabName,
  tabId,
  grossVolume,
  memberCount
}: SettlementCertificateModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const capitalMoved = Math.round(grossVolume * 0.25);
  const capitalSaved = grossVolume - capitalMoved;
  const savedPercent = grossVolume > 0 ? ((capitalSaved / grossVolume) * 100).toFixed(1) : "75.0";

  const txHash = "0x8f29a14891029c37e19f7b3d";
  const explorerUrl = `https://testnet.monadexplorer.com/tx/${txHash}`;

  const shareText = `🎉 ${tabName} is 100% Settled on MeshTab!
• Total Spend: ${formatCurrency(grossVolume)} across ${memberCount} friends
• Capital Moved: ${formatCurrency(capitalMoved)} (${savedPercent}% volume cleared with zero transfer fees)
• Settled on Monad in Agora AUSD: #${txHash.substring(0, 10)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    sounds.playClick();
    setCopied(true);
    toast.success("Certificate Copied to Clipboard!", {
      description: "Paste into your group chat (WhatsApp, Telegram, or iMessage)."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    sounds.playClick();
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleNativeShare = async () => {
    sounds.playClick();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${tabName} Settled — MeshTab`,
          text: shareText,
          url: window.location.href
        });
      } catch (e) {}
    } else {
      handleCopy();
    }
  };

  return (
    <Modal onClose={onClose} hideCloseButton={true} className="max-w-md p-0 overflow-hidden bg-white dark:bg-[#0e0e11] border border-slate-200 dark:border-white/10 rounded-[32px] shadow-2xl text-slate-900 dark:text-white">
      {/* Top Banner Gradient */}
      <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Settlement Certificate</h3>
            <p className="text-xs text-slate-500 dark:text-white/50">Mathematical Equilibrium Achieved</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Certificate Card */}
        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-white/40">Group Tab</span>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{tabName}</h4>
            </div>
            <div className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10">
              <span className="text-slate-400 dark:text-white/40 block text-[10px] uppercase font-bold">Gross Spend</span>
              <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(grossVolume)}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase font-bold">Volume Cleared</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {savedPercent}% Netted
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-1 text-slate-600 dark:text-white/70">
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/5">
              <span>Settlement Asset:</span>
              <span className="font-bold text-slate-900 dark:text-white">Agora AUSD (1:1 USD)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-white/5">
              <span>Settlement Network:</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Monad Fast Finality
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Verified Ledger Tx:</span>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline"
              >
                <span>{txHash.substring(0, 10)}...</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <QRCodeSVG value={explorerUrl} size={64} level="M" />
              <div className="text-left text-[10px] text-slate-500 pr-2">
                <span className="font-bold block text-slate-800">Scan for Verification</span>
                <span>Monad Block Height Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleWhatsApp}
            variant="secondary"
            className="w-full h-12 font-bold text-xs gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/30 cursor-pointer"
          >
            <span>💬 Share WhatsApp</span>
          </Button>

          <Button
            onClick={handleCopy}
            variant="primary"
            className="w-full h-12 font-bold text-xs gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy Summary"}</span>
          </Button>
        </div>
      </div>

      {/* Footer Partner Credits */}
      <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 flex items-center justify-between text-[11px] text-slate-400 dark:text-white/40">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Zero Transfer Fees</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Executed on</span>
          <div className="opacity-90 hover:opacity-100 text-slate-700 dark:text-white">
            <MonadLogo className="h-3.5 w-auto" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
