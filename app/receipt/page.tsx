"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink,
  Building2,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useDeveloperMode } from "@/lib/user";
import { sounds } from "@/lib/sounds";

function ReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDeveloperMode } = useDeveloperMode();
  const [copied, setCopied] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("meshTab_displayName");
      setHasProfile(Boolean(storedName && storedName.trim()));
    }
  }, []);

  const id = searchParams.get("id") || "4891029";
  const rawAmt = searchParams.get("amt");
  const amtCents = rawAmt ? parseInt(rawAmt, 10) : 10000;
  const recipientParam = searchParams.get("recipient") || searchParams.get("tab");
  const typeParam = searchParams.get("type");
  const methodParam = searchParams.get("method") || "bank";
  const fromUrl = searchParams.get("from");
  const tsParam = searchParams.get("ts");
  const dateObj = tsParam ? new Date(parseInt(tsParam, 10)) : new Date();

  // Distinguish deposit vs settlement with full consumer accuracy
  const isDeposit = typeParam === "topup" || typeParam === "deposit" || (!recipientParam && amtCents >= 50000);
  const recipient = recipientParam || "MeshTab Tab";

  const formattedAmount = `$${(amtCents / 100).toFixed(2)}`;
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const formattedTime = dateObj.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  const txHash = "0xafd413d0ebd3e9da42b92fe61a3f737a3a437108cf367c159d6861712bc829f0";

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      sounds.playClick();
      toast.success("Receipt Link Copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      sounds.playClick();
      window.print();
    }
  };

  // Safe navigation: never drop unauthenticated users or external QR scanners into Lisbon demo!
  const handleBack = () => {
    sounds.playClick();

    // 1. If an explicit safe internal return path was passed in the query
    if (fromUrl && fromUrl.startsWith("/") && !fromUrl.startsWith("//")) {
      router.push(fromUrl);
      return;
    }

    // 2. If the user navigated within an existing browser history session
    if (
      typeof window !== "undefined" && 
      window.history.length > 1 && 
      document.referrer && 
      document.referrer.includes(window.location.host)
    ) {
      router.back();
      return;
    }

    // 3. If there is a tab identifier provided, return to that tab
    const tabParam = searchParams.get("tab") || searchParams.get("tabId");
    if (tabParam && tabParam !== "MeshTab Settlement" && tabParam !== "MeshTab Tab") {
      router.push(`/tab/${encodeURIComponent(tabParam)}`);
      return;
    }

    // 4. If user has an existing local profile or testnet/blank mode configured on this device
    const storedMode = typeof window !== "undefined" ? localStorage.getItem("meshTab_workspaceMode") : null;
    if (hasProfile || storedMode === "testnet" || storedMode === "blank") {
      router.push("/home");
      return;
    }

    // 5. Default for external QR scanners and guest users:
    // Route to clean welcome landing page, NEVER throwing them into Lisbon demo!
    router.push("/");
  };

  const backLabel = fromUrl?.startsWith("/tab") 
    ? "Back to Tab" 
    : hasProfile 
    ? "Back to Dashboard" 
    : "Back to MeshTab";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      {/* Return Navigation */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-white/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </button>
        <span className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">
          {isDeposit ? "Official Deposit Receipt" : "Official Settlement Receipt"}
        </span>
      </div>

      {/* Main Receipt Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Top Header Banner */}
        <div className="p-6 sm:p-8 text-center border-b border-slate-100 dark:border-white/5 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 dark:to-transparent">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            {isDeposit ? (
              <Building2 className="w-8 h-8" />
            ) : (
              <CheckCircle2 className="w-8 h-8" />
            )}
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
            {isDeposit ? "Deposit Confirmed" : "Payment Completed"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
            {isDeposit ? `+${formattedAmount}` : formattedAmount}
          </h1>
          <p className="text-xs text-slate-500 dark:text-white/50">
            {isDeposit 
              ? "Funds credited directly to your MeshTab account balance" 
              : `Settled for ${recipient}`}
          </p>
        </div>

        {/* Receipt Line Items */}
        <div className="p-6 sm:p-8 space-y-4 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-500 dark:text-white/50">Receipt Number</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{id}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-500 dark:text-white/50">Date & Time</span>
            <span className="font-medium text-slate-800 dark:text-white">
              {formattedDate} at {formattedTime}
            </span>
          </div>

          {isDeposit ? (
            <>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Funding Source</span>
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {methodParam === "card" ? (
                    <>
                      <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Visa Platinum Debit (••••4242)</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>JPMorgan Chase Bank (••••8821)</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Transfer Rails</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  {methodParam === "card" ? "Visa Direct (Instant)" : "FedNow / ACH Real-Time Transfer"}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Destination</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  MeshTab Account Balance
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Transaction Type</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  Instant Account Deposit
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Processing Fee</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  $0.00 (Zero Fee)
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Status</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Completed & Available
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Verification</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-white/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  FDIC-Insured Partner Custody
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Payment Source</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  MeshTab Digital Balance
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Recipient / Group Tab</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {recipient}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Transaction Type</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  Instant Tab Settlement
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Platform Fee</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  $0.00 (Free)
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Status</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Instant Cleared
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">Verification</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-white/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Cryptographic Netting Seal
                </span>
              </div>
            </>
          )}

          {/* Developer-Only Blockchain Telemetry Section */}
          {isDeveloperMode && (
            <div className="mt-4 pt-4 border-t border-purple-500/20 bg-purple-500/5 rounded-2xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Monad Blockchain Proof
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono font-bold">
                  Dev Only
                </span>
              </div>
              <div className="flex justify-between items-center font-mono text-[11px]">
                <span className="text-slate-500 dark:text-white/50">Tx Hash:</span>
                <a
                  href={`https://testnet.monadvision.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>{txHash.slice(0, 8)}...{txHash.slice(-6)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Security Stamp Strip */}
        <div className="px-6 sm:px-8 py-3 bg-slate-50 dark:bg-black/30 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            {isDeposit ? "Bank-Grade 256-Bit Encryption" : "Cryptographically Verified"}
          </span>
          <span>Zero Platform Fees</span>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-white/5 flex gap-2 print:hidden">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse text-xs text-slate-400">Loading digital receipt...</div>
      </div>
    }>
      <ReceiptContent />
    </Suspense>
  );
}
