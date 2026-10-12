"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Sparkles, Fingerprint, ArrowRight, ArrowLeft, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getStoredTabMembers, saveStoredTabMembers, type TabMember, saveNewTab, saveStoredUser, getWorkspaceMode, setWorkspaceMode, getStoredTabs, getStoredUser, useDeveloperMode } from "../../../../lib/user";
import { isEffectivelyOnline } from "../../../../lib/network";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { sounds } from "../../../../lib/sounds";
import confetti from "canvas-confetti";
import { isPasskeyEnrolled } from "@/components/ui/passkey-prompt-modal";

export default function JoinTabPage() {
  const params = useParams();
  const tabId = typeof params?.id === "string" ? params.id : "";
  const searchParams = useSearchParams();
  const paramName = searchParams?.get("n");
  const tabName = paramName || tabId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const router = useRouter();
  const { isDeveloperMode } = useDeveloperMode();
  const { ready, getAccessToken, authenticated, user, login, linkPasskey } = usePrivy();
  const { client } = useSmartWallets();
  const smartWalletAddress = client?.account?.address || user?.wallet?.address;
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      const explicitName = localStorage.getItem("meshTab_displayName");
      // Only prefill if user previously set an explicit display name (ignore empty or demo fallback)
      if (explicitName && explicitName.trim()) {
        return explicitName.trim();
      }
    }
    return "";
  });
  const [step, setStep] = useState<"name" | "passkey" | "auth" | "success">("name");
  const [isJoining, setIsJoining] = useState(false);

  // Auto-passthrough: If current user is already an active member of this tab, bypass join screen
  useEffect(() => {
    if (typeof window === "undefined" || !tabId || !ready) return;

    if (authenticated && step === "name" && !isJoining) {
      const localTabs = getStoredTabs();
      const isTabInDashboard = localTabs.some(t => t.id === tabId);

      const explicitName = (localStorage.getItem("meshTab_displayName") || "").trim().toLowerCase();
      const members = getStoredTabMembers(tabId);
      const isMemberLocally = members.some(m => 
        (smartWalletAddress && m.walletAddress && m.walletAddress.toLowerCase() === smartWalletAddress.toLowerCase()) ||
        (explicitName && m.name.toLowerCase() === explicitName)
      );

      if (isTabInDashboard || isMemberLocally) {
        toast.info(`Already in ${tabName}`, {
          description: "Opening your shared ledger..."
        });
        router.replace(`/tab/${tabId}`);
      }
    }
  }, [ready, authenticated, tabId, tabName, smartWalletAddress, step, isJoining, router]);

  // Resume pending join if returning from OAuth / Privy authentication redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const pendingRaw = sessionStorage.getItem("mesh_pending_join");
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending.tabId === tabId && pending.name) {
          setName(pending.name);
          if (authenticated && !isJoining) {
            executeJoin(pending.name);
          }
        }
      }
    } catch {}
  }, [authenticated, tabId]);

  useLogin({
    onComplete: ({ user: loggedInUser }) => {
      let targetName = name.trim();
      try {
        const pendingRaw = sessionStorage.getItem("mesh_pending_join");
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          if (pending.tabId === tabId && pending.name) {
            targetName = pending.name;
          }
        }
      } catch {}

      if (targetName) {
        const mode = getWorkspaceMode() === "sample" ? "testnet" : getWorkspaceMode();
        if (mode === "testnet" && !isPasskeyEnrolled(loggedInUser)) {
          setStep("passkey");
          return;
        }
        executeJoin(targetName, loggedInUser);
      }
    }
  });

  const handleJoin = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter your name");
      return;
    }
    
    sounds.playClick();
    
    if (!authenticated) {
      try {
        sessionStorage.setItem("mesh_pending_join", JSON.stringify({ tabId, tabName, name: trimmedName }));
      } catch {}
      login();
      return;
    }

    const mode = getWorkspaceMode() === "sample" ? "testnet" : getWorkspaceMode();
    if (mode === "testnet" && !isPasskeyEnrolled(user)) {
      setStep("passkey");
      return;
    }
    
    await executeJoin(trimmedName);
  };

  const executeJoin = async (targetName: string, overrideUser?: any) => {
    if (isJoining) return;
    setIsJoining(true);
    setStep("auth");

    // Prioritize the Smart Wallet address (ERC-4337)
    let effectiveWallet: string | undefined = client?.account?.address;

    // If Privy Smart Wallet is still initializing, wait up to 3 seconds for it to settle
    if (!effectiveWallet) {
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 200));
        if (client?.account?.address) {
          effectiveWallet = client.account.address;
          break;
        }
      }
    }

    // Fall back to stored wallet if available
    if (!effectiveWallet && typeof window !== "undefined") {
      const stored = localStorage.getItem("meshTab_walletAddress");
      if (stored && /^0x[a-fA-F0-9]{40}$/.test(stored)) {
        effectiveWallet = stored;
      }
    }

    // Fall back to embedded EOA if smart wallet is unavailable
    if (!effectiveWallet) {
      effectiveWallet = overrideUser?.wallet?.address || user?.wallet?.address;
      if (!effectiveWallet) {
        const accounts = (overrideUser?.linkedAccounts || user?.linkedAccounts) as any[] | undefined;
        if (Array.isArray(accounts)) {
          const w = accounts.find(a => a.type === "wallet" && a.address);
          if (w?.address) effectiveWallet = w.address;
        }
      }
    }

    let token = "";
    try {
      token = (await getAccessToken()) || "";
    } catch (e) {}

    const mode = getWorkspaceMode() === "sample" ? "testnet" : getWorkspaceMode();
    setWorkspaceMode("testnet");

    // Save profile locally and sync to Redis
    await saveStoredUser(targetName, 0, effectiveWallet, token || undefined);

    let isAlreadyMemberOnServer = false;
    if (isEffectivelyOnline() && mode === "testnet") {
      try {
        const extractedJoinCode = tabId.includes("-") ? tabId.split("-").pop() : tabId.slice(-8);
        const res = await fetch("/api/tab/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({ 
            tabId, 
            joinCode: extractedJoinCode,
            name: targetName, 
            mode: "testnet",
            walletAddress: effectiveWallet && /^0x[a-fA-F0-9]{40}$/.test(effectiveWallet) ? effectiveWallet : undefined
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("Server join response:", errData);
          setIsJoining(false);
          setStep("name");

          if (res.status === 404 || errData.error === "NOT_FOUND") {
            toast.error(isDeveloperMode ? "Tab Not Found on Testnet" : "Tab Not Found", { 
              description: isDeveloperMode 
                ? "This tab does not exist on Monad Testnet. Demo tabs are stored only on their local device." 
                : "This tab does not exist on the server. Please verify the link or invite code."
            });
            try {
              sessionStorage.removeItem("mesh_pending_join");
            } catch {}
            router.replace("/home");
            return;
          }

          toast.error("Join Failed", { description: errData.error || "Unable to join tab on server." });
          return;
        }

        const serverData = await res.json().catch(() => ({}));
        if (serverData?.message === "Already a member") {
          isAlreadyMemberOnServer = true;
        }
      } catch (e) {
        console.error("Failed to push join to server:", e);
        setIsJoining(false);
        setStep("name");
        toast.error("Network Error", { 
          description: isDeveloperMode 
            ? "Could not reach Monad Testnet server. Please check your connection." 
            : "Could not connect to server. Please check your internet connection."
        });
        return;
      }
    }

    // Server confirmed or verified: save locally so UI immediately reflects it
    const members = getStoredTabMembers(tabId);
    const existing = members.find(m => m.name.toLowerCase() === targetName.toLowerCase());
    let updatedMembers = members;
    
    if (!existing) {
      const newMember: TabMember = {
        name: targetName,
        balance: 0,
        type: "settled",
        role: "member",
        walletAddress: effectiveWallet || undefined
      };
      updatedMembers = [...members, newMember];
    } else if (effectiveWallet && !existing.walletAddress) {
      updatedMembers = members.map(m => 
        m.name.toLowerCase() === targetName.toLowerCase() 
          ? { ...m, walletAddress: effectiveWallet }
          : m
      );
    }
    
    saveStoredTabMembers(tabId, updatedMembers);
    
    // Save to dashboard so it doesn't disappear when they close the app
    const currentTabs = getStoredTabs();
    const existingTab = currentTabs.find(t => t.id === tabId);
    const now = Date.now();
    const tabCreatedAt = existingTab?.createdAt || now;
    const tabLastActivity = existingTab?.lastActivityAt || tabCreatedAt;

    saveNewTab({
      id: tabId,
      name: tabName,
      role: existingTab?.role || "Member",
      balance: existingTab?.balance || 0,
      memberCount: updatedMembers.length > 0 ? updatedMembers.length : (existingTab?.memberCount || 2),
      createdAt: tabCreatedAt,
      lastActivityAt: tabLastActivity,
      lastActivityKind: existingTab?.lastActivityKind || "joined"
    });

    try {
      sessionStorage.removeItem("mesh_pending_join");
    } catch {}

    if (isAlreadyMemberOnServer) {
      toast.info(`Already in ${tabName}`, {
        description: `Opening your shared ledger...`
      });
      router.replace(`/tab/${tabId}`);
      return;
    }

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
      description: `Welcome to ${tabName}, ${targetName}!`
    });

    setTimeout(() => {
      router.replace(`/tab/${tabId}`);
    }, 1200);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-full px-4 md:px-12 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl p-8 md:p-16 lg:p-24 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden flex-1 flex flex-col items-center justify-center m-4 md:m-8">
        
        {/* Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        {/* Smart Escape Navigation */}
        <div className="w-full flex items-center justify-start mb-2">
          {authenticated ? (
            <Link
              replace
              href="/home"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          ) : (
            <Link
              replace
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          )}
        </div>

        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
            <UserPlus className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Join {tabName}</h1>
            <p className="text-sm text-slate-500 dark:text-white/60 mt-2">
              {isDeveloperMode 
                ? "You've been invited to join the split on Monad Testnet. Enter your name to access the ledger."
                : "You've been invited to join the split on MeshTab. Enter your name to access the tab."}
            </p>
          </div>

          <div className="space-y-4">
            {step === "name" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                {authenticated && name ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg border-2 border-white/20">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">Joining as</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{name}</div>
                    </div>
                    <button
                      onClick={handleJoin}
                      disabled={isJoining}
                      className="w-full mt-2 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98] cursor-pointer"
                    >
                      Confirm & Join <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/onboarding?invite=true&tab=${tabId}&n=${encodeURIComponent(tabName)}`)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors py-1 cursor-pointer"
                    >
                      Switch Profile / Change Name
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Your Name (e.g. Liam, Sarah)"
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
                      className="w-full mt-4 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98] cursor-pointer"
                    >
                      Continue <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === "passkey" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4 max-w-sm mx-auto">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Fingerprint className="w-8 h-8 animate-pulse" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isDeveloperMode ? "Register Passkey Signer" : "Enable 1-Tap Biometrics"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/60 mt-1 leading-relaxed">
                    {isDeveloperMode
                      ? "Bind a WebAuthn P-256 passkey to your smart account for gas-sponsored transactions on Monad Testnet."
                      : "Secure your account with Face ID, Touch ID, or Windows Hello for instant 1-tap gasless settlements."}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={async () => {
                      sounds.playClick();
                      try {
                        if (linkPasskey) {
                          await linkPasskey();
                          sounds.playSuccessChime();
                          if (typeof window !== "undefined") {
                            localStorage.setItem("mesh_last_passkey_status", "true");
                          }
                          toast.success("Passkey Linked!");
                        }
                      } catch (e: any) {
                        console.warn("Passkey link skipped/cancelled", e);
                      }
                      await executeJoin(name.trim());
                    }}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-[0.98] cursor-pointer"
                  >
                    <Fingerprint className="w-5 h-5" />
                    {isDeveloperMode ? "Register Passkey" : "Set Up Face ID / Touch ID"}
                  </button>

                  <button
                    type="button"
                    onClick={() => executeJoin(name.trim())}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors py-2 cursor-pointer"
                  >
                    Skip and continue without passkey
                  </button>
                </div>
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

        </div>
      </div>
    </div>
  );
}
