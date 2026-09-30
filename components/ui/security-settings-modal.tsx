"use client";

import { useState } from "react";
import { Settings, Shield, Lock, X, Fingerprint } from "lucide-react";
import { useSecurity } from "../providers/security-provider";
import { sounds } from "../../lib/sounds";
import { usePrivy } from "@privy-io/react-auth";

export function SecuritySettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { lockTimer, setLockTimer } = useSecurity();
  const { linkPasskey, user } = usePrivy();
  
  const hasPasskey = user?.linkedAccounts?.some(account => account.type === 'passkey') || false;

  const options = [
    { label: "Immediately (On tab close)", value: 0 },
    { label: "2 Minutes", value: 120000 },
    { label: "5 Minutes", value: 300000 },
    { label: "10 Minutes", value: 600000 },
    { label: "15 Minutes", value: 900000 },
    { label: "Never", value: -1 }
  ];

  return (
    <>
      <button
        onClick={() => {
          sounds.playClick();
          setIsOpen(true);
        }}
        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80"
        title="Security Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white dark:bg-[#111] rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Security Settings</h2>
                  <p className="text-xs text-slate-500 dark:text-white/50">Manage your auto-lock timer</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-white/70">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" /> Auto-Lock App
              </label>
              <div className="space-y-2">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      sounds.playClick();
                      setLockTimer(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-sm font-medium ${
                      lockTimer === opt.value 
                        ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-sm" 
                        : "bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-[#222]"
                    }`}
                  >
                    {opt.label}
                    {lockTimer === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </button>
                ))}
              </div>
              
              {!hasPasskey && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/10">
                  <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-slate-400" /> Device Passkey
                  </label>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      linkPasskey();
                    }}
                    className="w-full flex items-center justify-center p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-sm transition-all shadow-sm"
                  >
                    Set Up Passkey Now
                  </button>
                  <p className="text-[11px] text-slate-500 dark:text-white/50 mt-2 text-center leading-relaxed">
                    Link your device's biometric security (Face ID, Touch ID) for secure, passwordless access.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-white/50 mt-6 text-center leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                When auto-lock is active, your session is automatically destroyed for security. You will need to authenticate again to regain access.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
