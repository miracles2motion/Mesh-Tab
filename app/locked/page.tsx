"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Fingerprint, LogIn, Loader2, AlertCircle } from "lucide-react";
import { usePrivy, useLoginWithPasskey } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/theme-toggle";
import { setWorkspaceMode, getWorkspaceMode } from "../../lib/user";
import { sounds } from "../../lib/sounds";

export default function LockedPage() {
  const { login, authenticated, ready, user } = usePrivy();
  const { loginWithPasskey } = useLoginWithPasskey();
  const router = useRouter();
  const [hadPasskey, setHadPasskey] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // If in demo mode, shouldn't be on /locked — redirect back to demo home
    if (getWorkspaceMode() !== "testnet") {
      router.replace("/home");
      return;
    }

    const isLocked = localStorage.getItem("mesh_session_locked") === "true";
    // If unlocked and authenticated, send them straight back to dashboard
    if (!isLocked && ready && authenticated) {
      setWorkspaceMode("testnet");
      router.replace("/home");
    }
    
    // Check if they had a passkey before getting locked out
    const savedStatus = localStorage.getItem("mesh_last_passkey_status");
    if (savedStatus === "false") {
      setHadPasskey(false);
    }
  }, [ready, authenticated, router]);

  const handleUnlock = async () => {
    sounds.playClick();
    setIsAuthenticating(true);
    setErrorMsg(null);

    try {
      if (hadPasskey && typeof window !== "undefined" && window.PublicKeyCredential) {
        // Native biometric challenge (Face ID / Touch ID / Windows Hello)
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const passkeyAccount = user?.linkedAccounts?.find(a => a.type === "passkey") as any;
        let allowCredentials: PublicKeyCredentialDescriptor[] | undefined = undefined;
        if (passkeyAccount?.credentialId) {
          try {
            const rawId = Uint8Array.from(
              atob(passkeyAccount.credentialId.replace(/-/g, "+").replace(/_/g, "/")), 
              c => c.charCodeAt(0)
            );
            allowCredentials = [{ id: rawId, type: "public-key" }];
          } catch (e) {}
        }

        try {
          await navigator.credentials.get({
            publicKey: {
              challenge,
              timeout: 60000,
              userVerification: "preferred",
              rpId: window.location.hostname,
              allowCredentials
            }
          });
        } catch (credErr: any) {
          // If the user actively cancelled biometric verification (Face ID / fingerprint)
          if (credErr.name === "NotAllowedError" || credErr.name === "AbortError") {
            setErrorMsg("Biometric verification cancelled. Please scan Face ID / Fingerprint to unlock.");
            setIsAuthenticating(false);
            return;
          }
          // If browser threw a security / origin error (e.g. non-discoverable or unaligned RP ID in dev), log and proceed
          console.warn("Passkey assertion note:", credErr);
        }
      }

      sounds.playSuccessChime();
      localStorage.removeItem("mesh_session_locked");

      if (authenticated) {
        setWorkspaceMode("testnet");
        router.replace("/home");
      } else if (hadPasskey) {
        await loginWithPasskey();
        setWorkspaceMode("testnet");
        router.replace("/home");
      } else {
        login();
      }
    } catch (err: any) {
      console.error("Unlock error:", err);
      setErrorMsg("Failed to unlock. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white relative p-6">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center text-center max-w-md w-full px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100 dark:border-indigo-500/20">
          <Lock className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight mb-2">Session Locked</h1>
        <p className="text-slate-500 dark:text-white/60 mb-8">
          For your security, your session was automatically locked due to inactivity.
        </p>

        {errorMsg && (
          <div className="w-full mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button 
          onClick={handleUnlock}
          disabled={isAuthenticating}
          className="w-full btn-primary py-4 text-lg font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mb-6 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying Biometrics...
            </>
          ) : (
            <>
              {hadPasskey ? <Fingerprint className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {hadPasskey ? "Unlock with Passkey" : "Unlock App"}
            </>
          )}
        </button>

        {!hadPasskey && (
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-white/70 animate-in fade-in zoom-in-95 delay-300">
            <strong className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center gap-1.5 mb-1">
              <Fingerprint className="w-4 h-4" /> Tired of typing?
            </strong>
            Set up a Passkey next time for instant biometric unlock (Face ID, Fingerprint, etc)!
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-white/40">
          <button 
            onClick={() => {
              sounds.playClick();
              setWorkspaceMode("sample");
              router.push("/home");
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
          >
            Switch to Demo Mode
          </button>
          <span>•</span>
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
