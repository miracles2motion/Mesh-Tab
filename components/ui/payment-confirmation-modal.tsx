"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  KeyRound, 
  Sparkles, 
  SlidersHorizontal,
  Check,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { sounds } from "../../lib/sounds";
import { useDeveloperMode } from "../../lib/user";

export interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amountCents: number;
  title?: string;
  subtitle?: string;
  recipient?: string;
  paymentMethodLabel?: string;
  feeLabel?: string;
  actionLabel?: string;
  currency?: string;
}

/**
 * Normalizes user typed amount string into integer cents.
 * Handles: "10000", "10,000", "$10000", "$10,000.00", "10000.00", etc.
 */
function parseInputToCents(raw: string): number | null {
  const sanitized = raw.replace(/[^0-9.]/g, "");
  if (!sanitized) return null;
  const num = parseFloat(sanitized);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

export function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  amountCents,
  title = "Confirm Authorization",
  subtitle = "Review and confirm this transaction before signing.",
  recipient = "Account Balance",
  paymentMethodLabel = "Connected Account",
  feeLabel = "$0.00 (Gas Covered)",
  actionLabel = "Confirm",
  currency = "AUSD"
}: PaymentConfirmationModalProps) {
  const { isDeveloperMode } = useDeveloperMode();

  // Mode: "slide" | "type"
  const [confirmMode, setConfirmMode] = useState<"slide" | "type">("slide");
  const [typedValue, setTypedValue] = useState("");
  const [isSliding, setIsSliding] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0); // 0 to 1
  const [isConfirmed, setIsConfirmed] = useState(false);

  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Load saved confirmation preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mesh_confirm_pref");
      if (saved === "type" || saved === "slide") {
        setConfirmMode(saved);
      }
    }
  }, []);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setTypedValue("");
      setSlideProgress(0);
      setIsConfirmed(false);
    }
  }, [isOpen]);

  const handleToggleMode = (mode: "slide" | "type") => {
    sounds.playClick();
    setConfirmMode(mode);
    setSlideProgress(0);
    setTypedValue("");
    if (typeof window !== "undefined") {
      localStorage.setItem("mesh_confirm_pref", mode);
    }
  };

  const handleExecute = useCallback(() => {
    if (isConfirmed) return;
    setIsConfirmed(true);
    sounds.playSuccessChime();
    setTimeout(() => {
      onConfirm();
    }, 280);
  }, [isConfirmed, onConfirm]);

  // Handle typing validation
  const parsedCents = parseInputToCents(typedValue);
  const isTypeMatched = parsedCents !== null && parsedCents === amountCents;

  // Slider Touch / Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isConfirmed) return;
    isDraggingRef.current = true;
    setIsSliding(true);
    dragStartXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !sliderTrackRef.current || isConfirmed) return;
    const track = sliderTrackRef.current;
    const maxDrag = track.clientWidth - 56; // 56px handle width
    if (maxDrag <= 0) return;

    const deltaX = e.clientX - dragStartXRef.current;
    const clamped = Math.max(0, Math.min(deltaX, maxDrag));
    const progress = clamped / maxDrag;
    setSlideProgress(progress);

    // Auto-trigger when reaching 88% threshold
    if (progress >= 0.88) {
      isDraggingRef.current = false;
      setIsSliding(false);
      setSlideProgress(1);
      handleExecute();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsSliding(false);

    // If released before threshold, spring back to 0
    if (slideProgress < 0.88) {
      setSlideProgress(0);
    }
  };

  if (!isOpen) return null;

  const formattedTarget = formatCurrency(amountCents);

  return (
    <Modal onClose={onClose} size="md" zIndexClassName="z-[350]">
      <div className="p-6 sm:p-7 flex flex-col text-slate-900 dark:text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-white/50">{subtitle}</p>
            </div>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px]">
            <button
              type="button"
              onClick={() => handleToggleMode("slide")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                confirmMode === "slide"
                  ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Slide
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode("type")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                confirmMode === "type"
                  ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Type
            </button>
          </div>
        </div>

        {/* Hero Amount Display */}
        <div className="my-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 text-center relative overflow-hidden">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-white/40 block mb-1">
            Amount to Authorize
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
            {formattedTarget}
          </div>
          <div className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>{isDeveloperMode ? `Monad Testnet • ${currency}` : "Zero Slippage • Immediate Finality"}</span>
          </div>
        </div>

        {/* Transaction Summary Specs */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 mb-5 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
            <span className="text-slate-400 dark:text-white/40">From:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{paymentMethodLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
            <span className="text-slate-400 dark:text-white/40">To:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{recipient}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-white/70">
            <span className="text-slate-400 dark:text-white/40">Network Fee:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{feeLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-white/70 border-t border-slate-100 dark:border-white/5 pt-2">
            <span className="text-slate-400 dark:text-white/40">Signer Type:</span>
            <span className="font-mono text-[11px] text-slate-700 dark:text-white/80 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-indigo-500" />
              {isDeveloperMode ? "Privy Cloud Smart Wallet" : "Encrypted Cloud Account"}
            </span>
          </div>
        </div>

        {/* INTERACTION 1: SLIDE TO CONFIRM */}
        {confirmMode === "slide" && (
          <div className="space-y-3">
            <div
              ref={sliderTrackRef}
              className="relative h-14 w-full rounded-2xl bg-slate-100 dark:bg-white/10 border border-slate-200/90 dark:border-white/15 p-1 select-none overflow-hidden touch-none"
            >
              {/* Fill Track */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/30 to-indigo-600/60 rounded-2xl transition-all duration-75"
                style={{ width: `${Math.max(12, slideProgress * 100)}%` }}
              />

              {/* Shimmering Center Label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs sm:text-sm font-bold text-slate-500 dark:text-white/50">
                {isConfirmed ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 className="w-4 h-4" /> Authorized!
                  </span>
                ) : (
                  <span>Slide to {actionLabel} {formattedTarget}</span>
                )}
              </div>

              {/* Draggable Thumb */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`absolute top-1 bottom-1 w-12 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-transform duration-75 z-10 ${
                  isConfirmed 
                    ? "bg-emerald-500 text-white" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95"
                }`}
                style={{
                  transform: `translateX(${
                    sliderTrackRef.current 
                      ? slideProgress * (sliderTrackRef.current.clientWidth - 56) 
                      : 0
                  }px)`
                }}
              >
                {isConfirmed ? (
                  <Check className="w-5 h-5 animate-scale-up" />
                ) : (
                  <ArrowRight className="w-5 h-5 animate-pulse" />
                )}
              </div>
            </div>

            <p className="text-center text-[11px] text-slate-400 dark:text-white/40">
              Drag the slider completely to the right to execute.
            </p>
          </div>
        )}

        {/* INTERACTION 2: TYPE AMOUNT TO CONFIRM */}
        {confirmMode === "type" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-white/60 flex items-center justify-between">
                <span>Type <strong className="text-slate-900 dark:text-white font-mono">{(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong> to confirm:</span>
                {isTypeMatched && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Amount Matched
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  placeholder={`e.g. ${(amountCents / 100).toLocaleString()}`}
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  className={`w-full h-12 px-4 rounded-xl text-lg font-bold font-mono tracking-wide bg-white dark:bg-white/5 border transition-all outline-none ${
                    isTypeMatched
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                      : typedValue && !isTypeMatched
                        ? "border-amber-400 dark:border-amber-500/40 text-slate-900 dark:text-white"
                        : "border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-indigo-500"
                  }`}
                />
                {isTypeMatched && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>

            <Button
              type="button"
              disabled={!isTypeMatched || isConfirmed}
              onClick={handleExecute}
              variant="primary"
              size="lg"
              className={`w-full h-12 font-bold shadow-md cursor-pointer transition-all ${
                isTypeMatched
                  ? "bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white"
                  : "bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30 cursor-not-allowed"
              }`}
            >
              {isConfirmed ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 animate-spin" /> Authorizing...
                </span>
              ) : isTypeMatched ? (
                `Authorize ${formattedTarget}`
              ) : (
                `Enter ${formattedTarget} to Enable`
              )}
            </Button>
          </div>
        )}

        {/* Footer Dismiss Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-center">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="text-xs text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors py-1 cursor-pointer"
          >
            Cancel and return
          </button>
        </div>
      </div>
    </Modal>
  );
}
