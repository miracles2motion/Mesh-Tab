"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Fingerprint, ShieldCheck, Zap, Lock, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useDeveloperMode } from "../../lib/user";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { MonadLogo } from "./partner-logo";

export function isPasskeyEnrolled(user: any): boolean {
  if (!user || !user.linkedAccounts) return false;
  return user.linkedAccounts.some((acc: any) => acc.type === "passkey");
}

interface PasskeyPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
}

export function PasskeyPromptModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = "complete your transaction"
}: PasskeyPromptModalProps) {
  const { linkPasskey, user } = usePrivy();
  const { isDeveloperMode } = useDeveloperMode();
  const [isRegistering, setIsRegistering] = useState(false);

  if (!isOpen) return null;

  const handleEnroll = async () => {
    if (isRegistering) return;
    setIsRegistering(true);
    sounds.playClick();

    toast.info("Registering Passkey", {
      description: "Please follow your browser's prompt to scan Face ID, Touch ID, or Windows Hello..."
    });

    try {
      if (linkPasskey) {
        await linkPasskey();
        sounds.playSuccessChime();
        if (typeof window !== "undefined") {
          localStorage.setItem("mesh_last_passkey_status", "true");
        }
        toast.success("Passkey Successfully Linked!", {
          description: "Biometric authentication is now active for instant, gasless transactions."
        });
        setIsRegistering(false);
        onSuccess();
      } else {
        throw new Error("Passkey linking is not available in this environment.");
      }
    } catch (err: any) {
      console.warn("Passkey linking cancelled or failed:", err);
      setIsRegistering(false);
      // User cancelled browser prompt
      if (err?.name === "NotAllowedError" || err?.message?.includes("cancelled") || err?.message?.includes("closed")) {
        toast.info("Passkey Setup Postponed", {
          description: "You can set up a passkey anytime in your profile settings."
        });
      } else {
        toast.error("Could not register passkey", {
          description: err?.message || "Please make sure biometric credentials or hardware keys are enabled on your device."
        });
      }
    }
  };

  return (
    <Modal onClose={onClose} size="md" zIndexClassName="z-[300]">
      <div className="p-6 sm:p-8 flex flex-col items-center text-center text-slate-900 dark:text-white">
        {/* Glow & Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-inner">
            <Fingerprint className="w-10 h-10 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-[#121212]">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Header Copy */}
        {isDeveloperMode ? (
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-semibold mb-3">
              <MonadLogo className="w-3.5 h-3.5" />
              <span>ERC-4337 Passkey Required</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Register WebAuthn Signer
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mb-6 leading-relaxed">
              To {actionTitle} on Monad Testnet, your Smart Account requires an authorized WebAuthn P-256 passkey signer for gas-sponsored UserOperations.
            </p>
          </div>
        ) : (
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Tap Biometric Security</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Enable Face ID / Touch ID
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mb-6 leading-relaxed">
              Set up a secure passkey on this device to {actionTitle} with a single tap—no wallet pop-ups and zero fees.
            </p>
          </div>
        )}

        {/* Feature Highlights Card */}
        <div className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2.5 text-xs">
          <div className="flex items-center gap-3 text-slate-700 dark:text-white/80">
            <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold block">Instant 1-Tap Authorization</span>
              <span className="text-slate-500 dark:text-white/50 text-[11px]">Confirm payments and faucet claims in ~1.3s</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-700 dark:text-white/80">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold block">Hardware Secure Enclave</span>
              <span className="text-slate-500 dark:text-white/50 text-[11px]">Protected by your device biometrics; keys never leave your phone</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-2.5">
          <Button
            onClick={handleEnroll}
            disabled={isRegistering}
            variant="primary"
            size="lg"
            className="w-full h-13 font-bold text-base shadow-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white cursor-pointer flex items-center justify-center gap-2"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Scanning Biometrics...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>{isDeveloperMode ? "Register Passkey Signer" : "Set Up Face ID / Touch ID"}</span>
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white transition-colors py-2 cursor-pointer"
          >
            Cancel and continue without passkey
          </button>
        </div>
      </div>
    </Modal>
  );
}
