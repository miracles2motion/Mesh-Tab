"use client";

import { useEffect, useState } from "react";
import { Lock, Fingerprint, LogIn, ChevronRight } from "lucide-react";
import { usePrivy, useLoginWithPasskey } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/theme-toggle";
import { setWorkspaceMode } from "../../lib/user";
import { sounds } from "../../lib/sounds";

export default function LockedPage() {
  const { login, authenticated, ready } = usePrivy();
  const { loginWithPasskey } = useLoginWithPasskey();
  const router = useRouter();
  const [hadPasskey, setHadPasskey] = useState(true);

  useEffect(() => {
    // If they successfully logged back in, send them straight back to the dashboard
    if (ready && authenticated) {
      setWorkspaceMode("testnet");
      router.replace("/home");
    }
    
    // Check if they had a passkey before getting locked out
    const savedStatus = localStorage.getItem("mesh_last_passkey_status");
    if (savedStatus === "false") {
      setHadPasskey(false);
    }
  }, [ready, authenticated, router]);

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

        <button 
          onClick={() => {
            sounds.playClick();
            if (hadPasskey) {
              loginWithPasskey();
            } else {
              login();
            }
          }}
          className="w-full btn-primary py-4 text-lg font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mb-6 hover:scale-[1.02] transition-transform"
        >
          {hadPasskey ? <Fingerprint className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          Unlock App
        </button>

        {!hadPasskey && (
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-white/70 animate-in fade-in zoom-in-95 delay-300">
            <strong className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center gap-1.5 mb-1">
              <Fingerprint className="w-4 h-4" /> Tired of typing?
            </strong>
            Set up a Passkey next time for instant biometric unlock (Face ID, Fingerprint, etc)!
          </div>
        )}
      </div>
    </div>
  );
}
