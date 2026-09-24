"use client";

import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Sparkles, Fingerprint, ArrowRight, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getStoredTabMembers, saveStoredTabMembers, type TabMember, saveNewTab, saveStoredUser } from "../../../../lib/user";
import { pushTabStateToRedis } from "../../../../lib/sync";
import { sounds } from "../../../../lib/sounds";
import confetti from "canvas-confetti";
import { DynamicLogo } from "../../../../components/ui/partner-logo";

export default function JoinTabPage() {
  const params = useParams();
  const tabId = typeof params?.id === "string" ? params.id : "";
  const searchParams = useSearchParams();
  const paramName = searchParams?.get("n");
  const tabName = paramName || tabId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const router = useRouter();
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "auth" | "success">("name");

  const handleJoin = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter your name");
      return;
    }
    
    sounds.playClick();
    setStep("auth");
    
    // Set this joining user as the active user profile on this device
    saveStoredUser(trimmedName);
    
    // Simulate biometric authentication delay
    await new Promise(r => setTimeout(r, 1800));
    
    // Fetch live member roster from Redis so cold joiner starts with full group state
    let members = getStoredTabMembers(tabId);
    try {
      const mode = typeof window !== "undefined" ? (localStorage.getItem("meshTab_workspaceMode") || "blank") : "blank";
      const res = await fetch(`/api/sync/${tabId}?mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.members && Array.isArray(data.members) && data.members.length > 0) {
          members = data.members;
        }
      }
    } catch (e) {
      console.error("Failed to fetch server tab members on join:", e);
    }

    const existing = members.find(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    let updatedMembers = members;
    
    if (!existing) {
      const newMember: TabMember = {
        name: trimmedName,
        balance: 0,
        type: "settled",
        role: "member"
      };
      updatedMembers = [...members, newMember];
    }
    
    saveStoredTabMembers(tabId, updatedMembers);
    
    // Save to dashboard so it doesn't disappear when they close the app
    saveNewTab({
      id: tabId,
      name: tabName,
      role: "Member",
      balance: 0,
      memberCount: updatedMembers.length,
      lastActivity: "Just joined"
    });

    // Immediately push joined member state to Redis so creator device sees them right away
    pushTabStateToRedis(tabId);

    sounds.playSuccessChime();
    setStep("success");
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}

    toast.success("Joined Successfully!", {
      description: `Welcome to the group, ${name.trim()}!`
    });

    setTimeout(() => {
      router.push(`/tab/${params.id}`);
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
        
        {/* Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
            <UserPlus className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Join Group Tab</h1>
            <p className="text-sm text-slate-500 dark:text-white/60 mt-2">
              You've been invited to join the split. Enter your name to securely access the ledger.
            </p>
          </div>

          <div className="space-y-4">
            {step === "name" && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <input
                  type="text"
                  placeholder="Your Name (e.g. Liam)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleJoin()}
                  autoFocus
                  maxLength={15}
                  className="w-full h-14 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl px-5 text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                />
                <button
                  onClick={handleJoin}
                  disabled={!name.trim()}
                  className="w-full mt-4 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98]"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {step === "auth" && (
              <div className="py-8 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                  <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-500/30">
                    <Fingerprint className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">Authenticating...</h3>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Confirming with Face ID / Touch ID
                </p>
              </div>
            )}

            {step === "success" && (
              <div className="py-8 flex flex-col items-center animate-in fade-in zoom-in-95">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">You're In!</h3>
                <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                  Redirecting to the group tab...
                </p>
              </div>
            )}
          </div>

          {/* Partner Attribution */}
          <div className="pt-2 flex items-center justify-center gap-2 text-slate-400 dark:text-white/40 text-xs font-medium">
            <span>Protected by</span>
            <div className="opacity-80 hover:opacity-100 transition-opacity text-slate-600 dark:text-white/70">
              <DynamicLogo className="h-3.5 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
