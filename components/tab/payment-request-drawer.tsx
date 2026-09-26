"use client";

import { useState } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Share2, MessageCircle, ArrowUpRight, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { AgoraLogo, MonadLogo } from "../ui/partner-logo";

interface PaymentRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tabId: string;
  tabName: string;
  debtorName: string;
  amount: number; // in cents
  creditorName?: string;
}

export function PaymentRequestDrawer({
  isOpen,
  onClose,
  tabId,
  tabName,
  debtorName,
  amount,
  creditorName = "You"
}: PaymentRequestDrawerProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const paymentUrl = `${baseUrl}/tab/${tabId}?settle=true&from=${encodeURIComponent(creditorName)}&amount=${amount}`;
  const shareText = `Hey ${debtorName}! Here's your link to settle ${formatCurrency(amount)} on ${tabName} via MeshTab: ${paymentUrl}`;

  const handleCopy = () => {
    sounds.playClick();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      toast.success("Payment Link Copied!", {
        description: `Link to settle ${formatCurrency(amount)} copied to clipboard.`
      });
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleShare = async () => {
    sounds.playClick();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `MeshTab Payment Request - ${tabName}`,
          text: shareText,
          url: paymentUrl
        });
        toast.success("Payment Request Shared!");
      } catch (e) {
        // User cancelled or share failed, fallback to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleWhatsApp = () => {
    sounds.playClick();
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 md:p-8 flex flex-col items-center text-center max-w-md mx-auto w-full bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white relative">


        {/* Debtor Profile Pill */}
        <div className="w-16 h-16 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-2xl mb-4 border border-rose-500/20">
          {debtorName[0] || "D"}
        </div>

        <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-white/60">
          Request Payment from
        </span>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 mb-1">
          {debtorName}
        </h2>
        <p className="text-slate-500 dark:text-white/50 text-xs mb-6">
          Shared expenses for <span className="font-semibold text-slate-700 dark:text-white/70">{tabName}</span>
        </p>

        {/* Amount Badge */}
        <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 mb-6 flex flex-col items-center">
          <span className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {formatCurrency(amount)}
          </span>
          <span className="text-xs text-slate-400 dark:text-white/40 mt-1 font-medium">
            1:1 US Dollar digital balance (AUSD)
          </span>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col items-center">
          <QRCodeSVG 
            value={paymentUrl} 
            size={160} 
            level="M"
            className="w-40 h-40"
          />
          <span className="text-[10px] text-slate-500 font-semibold mt-2.5">
            Scan to settle instantly with Camera
          </span>
        </div>

        {/* Web2 Share Actions */}
        <div className="w-full space-y-2.5">
          <Button
            onClick={handleWhatsApp}
            variant="primary"
            size="lg"
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Send via WhatsApp</span>
          </Button>

          <div className="grid grid-cols-2 gap-2.5 w-full">
            <Button
              onClick={handleShare}
              variant="secondary"
              size="md"
              className="h-11 font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Sheet</span>
            </Button>

            <Button
              onClick={handleCopy}
              variant="secondary"
              size="md"
              className="h-11 font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied Link!" : "Copy Link"}</span>
            </Button>
          </div>
        </div>

        {/* Partner Branding Strip */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 w-full flex items-center justify-between text-xs text-slate-400 dark:text-white/40">
          <span className="text-[11px] font-medium">Instant 0-fee settlement</span>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-all text-slate-700 dark:text-white/80">
              <MonadLogo className="h-3 w-auto" />
              <span>×</span>
              <AgoraLogo className="h-3 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
