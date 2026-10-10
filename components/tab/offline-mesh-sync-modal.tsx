"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "../ui/modal";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Camera, Download, RefreshCw, X, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { getStoredExpenses, getStoredTabMembers, useWorkspaceMode, StoredExpense, TabMember, saveStoredExpense, saveStoredTabMembers } from "../../lib/user";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import confetti from "canvas-confetti";
import { z } from "zod";

interface OfflineMeshSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabId: string;
}

// [OVERSEER MANDATE - Baseline 19]: Strict Payload Schema Validation
const meshSyncPayloadSchema = z.object({
  tabId: z.string().max(100),
  type: z.literal("mesh-sync"),
  expenses: z.array(z.object({
    id: z.string().max(100),
    p: z.string().max(60),
    a: z.number().int().positive().max(100_000_000), // in cents (up to $1,000,000)
    d: z.string().max(100),
    tm: z.string().max(50).optional(),
    st: z.string().max(20).optional(),
    sp: z.record(z.string(), z.number()).optional(),
    cat: z.string().max(30).optional(),
    oc: z.string().max(10).optional(),
    oa: z.number().optional(),
    pa: z.array(z.string().max(60)).optional()
  })).max(30),
  members: z.array(z.object({
    n: z.string().max(60),
    b: z.number().int().min(-100_000_000).max(100_000_000),
    t: z.enum(["creditor", "debtor", "settled"]).optional(),
    r: z.enum(["admin", "member"]).optional()
  })).max(30).optional()
});

export function OfflineMeshSyncModal({ isOpen, onClose, tabId }: OfflineMeshSyncModalProps) {
  const { mode: workspaceMode } = useWorkspaceMode();
  const [activeTab, setActiveTab] = useState<"share" | "scan">("share");
  const [pendingExpenses, setPendingExpenses] = useState<StoredExpense[]>([]);
  const [payload, setPayload] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [mergeReceipt, setMergeReceipt] = useState<{ expenses: number, members: number } | null>(null);
  
  // Camera scanning states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const expenses = getStoredExpenses(tabId);
      const pending = expenses.filter(e => e.syncStatus === "pending");
      
      // Limit to 15 to keep QR code easily scannable by mobile cameras
      const capped = pending.slice(0, 15);
      setPendingExpenses(capped);
      
      const localMembers = getStoredTabMembers(tabId, "System");

      // Compress expenses
      const compExp = capped.map(e => ({
        id: e.id,
        p: e.payer,
        a: e.amount,
        d: e.desc,
        tm: e.time,
        st: e.splitType,
        sp: e.splits,
        cat: e.category,
        oc: e.originalCurrency,
        oa: e.originalAmount,
        ss: e.syncStatus
      }));

      // Compress members
      const compMem = localMembers.map(m => ({
        n: m.name,
        b: m.balance,
        t: m.type,
        r: m.role
      }));

      if (capped.length > 0) {
        const dataPayload = JSON.stringify({
          tabId,
          type: "mesh-sync",
          expenses: compExp,
          members: compMem
        });
        setPayload(btoa(dataPayload));
      } else {
        setPayload("");
      }
      setPasteData("");
    }
  }, [isOpen, tabId]);

  const handleCopy = () => {
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const processSyncPayload = (rawString: string) => {
    if (!rawString || !rawString.trim()) return false;
    setIsSyncing(true);
    
    try {
      const decoded = atob(rawString.trim());
      const rawJson = JSON.parse(decoded);
      
      // Strict Zod schema validation
      const parseResult = meshSyncPayloadSchema.safeParse(rawJson);
      if (!parseResult.success) {
        toast.error("Invalid Sync Data", { description: "Payload format does not match the offline mesh schema." });
        setIsSyncing(false);
        return false;
      }

      const data = parseResult.data;
      if (data.tabId !== tabId) {
        toast.error("Tab ID Mismatch", { description: "This sync QR code belongs to a different tab." });
        setIsSyncing(false);
        return false;
      }

      let expCount = 0;
      let memCount = 0;
      const currentExpenses = getStoredExpenses(tabId);
      const currentMembers = getStoredTabMembers(tabId, "System");
      
      // Decompress and merge expenses
      (data.expenses || []).forEach((c) => {
        if (!currentExpenses.some((e: StoredExpense) => e.id === c.id)) {
          const remoteCreatedAt = typeof (c as any).ca === "number"
            ? (c as any).ca
            : c.tm
              ? (Date.parse(c.tm) || Date.now())
              : Date.now();

          const remoteExp: StoredExpense = {
            id: c.id, 
            payer: c.p, 
            amount: c.a, 
            desc: c.d, 
            createdAt: remoteCreatedAt,
            time: "Just now",
            splitType: (c.st as any) || "equal", 
            splits: c.sp || {}, 
            category: (c.cat as any) || "other", 
            originalCurrency: c.oc, 
            originalAmount: c.oa, 
            syncStatus: "pending",
            participants: c.pa
          };
          saveStoredExpense(tabId, remoteExp);
          expCount++;
        }
      });

      // Decompress and merge members
      const newMembers: TabMember[] = [];
      (data.members || []).forEach((c) => {
        if (!currentMembers.some((m: TabMember) => m.name.toLowerCase() === c.n.toLowerCase())) {
          newMembers.push({ 
            name: c.n, 
            balance: c.b, 
            type: c.t || "settled", 
            role: c.r || "member" 
          });
          memCount++;
        }
      });
      
      if (newMembers.length > 0) {
        saveStoredTabMembers(tabId, [...currentMembers, ...newMembers]);
        window.dispatchEvent(new CustomEvent("meshTab-members-update"));
      }
      
      sounds.playSuccessChime();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      
      setMergeReceipt({ expenses: expCount, members: memCount });
      setIsSyncing(false);
      return true;
      
    } catch (e) {
      toast.error("Sync Failed", { description: "The sync data is corrupted or unreadable." });
      setIsSyncing(false);
      return false;
    }
  };

  const handleStartCamera = async () => {
    sounds.playClick();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Camera Not Supported", { description: "Your browser does not permit direct camera access. Use manual input." });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Check for native BarcodeDetector API
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const qrValue = barcodes[0].rawValue;
                stopCamera();
                processSyncPayload(qrValue);
              }
            } catch (err) {}
          }
        }, 400);
      } else {
        toast.info("Point Camera at QR Code", { 
          description: "Align your friend's screen in view. If your browser restricts live detection, use the photo capture below." 
        });
      }
    } catch (err) {
      toast.error("Camera Access Denied", { description: "Please allow camera permissions to scan your friend's offline QR code." });
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const bitmap = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (barcodes && barcodes.length > 0) {
          processSyncPayload(barcodes[0].rawValue);
          return;
        }
        toast.error("No QR Code Detected", { description: "Please make sure the QR code is clearly visible in the photo." });
      } catch (err) {
        toast.error("Scan Failed", { description: "Could not decode QR code from the captured image." });
      }
    } else {
      toast.error("Barcode Detection Unsupported", { description: "Please use manual payload paste in this browser." });
      setShowManualPaste(true);
    }
  };

  const handleSimulate = () => {
    sounds.playClick();
    const mockPayload = {
      tabId,
      type: "mesh-sync",
      expenses: [
        {
          id: `demo_${Date.now()}`,
          p: "Alice",
          a: 8500,
          d: "Offline Demo Transfer",
          tm: new Date().toISOString(),
          st: "equal",
          cat: "other"
        }
      ],
      members: [
        { n: "Alice", b: 0, t: "settled" as const, r: "member" as const }
      ]
    };
    processSyncPayload(btoa(JSON.stringify(mockPayload)));
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={() => { stopCamera(); onClose(); }}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Offline Mesh Sync</h2>
        
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-6">
          <button
            onClick={() => { stopCamera(); setActiveTab("share"); sounds.playClick(); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "share" 
                ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/5"
            }`}
          >
            Share (Host)
          </button>
          <button
            onClick={() => { setActiveTab("scan"); sounds.playClick(); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "scan" 
                ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/5"
            }`}
          >
            Scan (Join)
          </button>
        </div>

        {activeTab === "share" ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-white/60 text-center px-4 leading-relaxed">
              Show this QR code to a friend to sync your {pendingExpenses.length} pending offline expenses directly device-to-device.
            </p>
            
            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/10">
              {pendingExpenses.length > 0 && payload ? (
                <div className="p-3 bg-white rounded-xl shadow-inner">
                  <QRCodeSVG value={payload} size={200} level="M" includeMargin={false} />
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">All Expenses Synced</p>
                  <p className="text-xs text-slate-500 dark:text-white/50 max-w-xs mt-1">
                    No pending offline expenses queued on this device. When you add expenses offline, your sync QR code will appear here.
                  </p>
                </div>
              )}
            </div>
            
            {pendingExpenses.length > 15 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Large batch:</strong> QR encodes the 15 most recent offline items to maintain camera readability.
                </span>
              </div>
            )}

            <button
              onClick={handleCopy}
              disabled={!payload}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Payload Copied!" : payload ? "Copy Full Payload String" : "No Pending Expenses to Share"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mergeReceipt ? (
              <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 flex flex-col items-center justify-center gap-4 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300">Offline Mesh Sync Success</h3>
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-1">
                    ✅ {mergeReceipt.expenses} new expenses added
                    <br/>
                    ✅ {mergeReceipt.members} new members added
                  </p>
                  <p className="text-emerald-800 dark:text-emerald-200 text-xs font-bold mt-3">
                    Net balances updated instantly in your local vault.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMergeReceipt(null);
                    stopCamera();
                    onClose();
                  }}
                  className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Live Camera Scanner Viewport */}
                {isCameraActive ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500 bg-black aspect-video flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover" 
                      playsInline 
                      muted 
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-white/50 m-6 rounded-xl pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] font-mono text-white/80 bg-black/60 px-2 py-1 rounded">
                        Align QR Code
                      </span>
                    </div>
                    <button
                      onClick={stopCamera}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Point Camera at Friend&apos;s Screen</p>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-xs">
                        Scan their offline mesh QR code to receive pending transactions directly peer-to-peer.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                      <button
                        onClick={handleStartCamera}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Start Camera Scanner</span>
                      </button>

                      <label className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
                        <Download className="w-4 h-4" />
                        <span>Upload QR Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoCapture}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Collapsible Manual Input (Secured with Zod) */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowManualPaste(!showManualPaste)}
                    className="text-[11px] text-slate-500 dark:text-white/50 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{showManualPaste ? "▲ Hide manual input" : "▼ Paste payload string manually (Fallback)"}</span>
                  </button>

                  {showManualPaste && (
                    <div className="mt-2 space-y-2 animate-in fade-in-50">
                      <textarea 
                        placeholder="Paste the offline payload string here..."
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                        className="w-full h-24 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:font-sans"
                      />
                      <button
                        onClick={() => processSyncPayload(pasteData)}
                        disabled={!pasteData || isSyncing}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {isSyncing ? "Validating & Syncing..." : "Sync from String"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Only render demo simulation in non-testnet modes */}
                {workspaceMode !== "testnet" && (
                  <button
                    onClick={handleSimulate}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 text-xs font-bold transition-colors border border-slate-200 dark:border-white/10 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Simulate Receiving Alice&apos;s Expenses
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
