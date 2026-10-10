"use client";

import { useState, useEffect } from "react";
import { Copy, Users, Check, QrCode, Crown, ShieldAlert, AlertCircle, Info, Trash2, Sparkles, UserPlus } from "lucide-react";
import { Button } from "../ui/button";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "../../lib/utils";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";

interface MemberItem {
  name: string;
  balance: number;
  type: "creditor" | "debtor" | "settled";
  role?: "admin" | "member";
}

import { useUserProfile, saveStoredTabMembers, useWorkspaceMode, seedDemoExpenses } from "../../lib/user";
import { isEffectivelyOnline } from "../../lib/network";
import { storageKey, safeSetItem, addDeletedTabTombstone } from "../../lib/storage-keys";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";

export function ManageMembers({ 
  tabId, 
  members,
  tabName,
  currentUser 
}: { 
  tabId: string; 
  members: any[];
  tabName?: string;
  currentUser?: string;
}) {
  const router = useRouter();
  const profile = useUserProfile();
  const { mode: workspaceMode } = useWorkspaceMode();
  const activeUser = currentUser || profile.name;
  const [copied, setCopied] = useState(false);
  
  // Dynamic Creator identification
  const creatorMember = members.find(m => m.role === "admin");
  const creatorName = (workspaceMode === "sample" && tabId === "lisbon-24") ? "Aisha" : (creatorMember ? creatorMember.name : activeUser);
  const isCurrentUserAdmin = activeUser.toLowerCase() === creatorName.toLowerCase();

  // Initialize with members enriched with roles matching actual tab data
  const [memberList, setMemberList] = useState<MemberItem[]>(() => {
    return members.map(m => {
      return {
        ...m,
        name: m.name,
        role: (m.name.toLowerCase() === creatorName.toLowerCase() || m.role === "admin") ? ("admin" as const) : ("member" as const)
      };
    });
  });

  useEffect(() => {
    setMemberList(members.map(m => {
      return {
        ...m,
        name: m.name,
        role: (m.name.toLowerCase() === creatorName.toLowerCase() || m.role === "admin") ? ("admin" as const) : ("member" as const)
      };
    }));
  }, [members, activeUser, creatorName]);

  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [pendingRemovalMember, setPendingRemovalMember] = useState<MemberItem | null>(null);
  const [blockedRemovalMember, setBlockedRemovalMember] = useState<MemberItem | null>(null);

  const [inviteLink, setInviteLink] = useState(`https://mesh-tab.vercel.app/tab/${tabId}/join`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const nameParam = tabName ? `?n=${encodeURIComponent(tabName)}` : "";
      setInviteLink(`${window.location.origin}/tab/${tabId}/join${nameParam}`);
    }
  }, [tabId, tabName]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    sounds.playClick();
    toast.success("Invite Link Copied!", { description: inviteLink });
    setTimeout(() => setCopied(false), 2000);
  };

  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateJoin = async () => {
    if (isSimulating) return;
    if (memberList.length >= 20) {
      toast.error("Maximum Capacity Reached", {
        description: "This tab has reached the maximum capacity of 20 members. To ensure instant settlement speed, additional members cannot join."
      });
      return;
    }
    setIsSimulating(true);
    sounds.playClick();

    const candidateNames = ["Liam", "Zoe", "Marcus", "Elena", "Devon"];
    const existingNames = new Set(memberList.map(m => m.name));
    const nextName = candidateNames.find(n => !existingNames.has(n)) || `Guest_${memberList.length + 1}`;

    toast.info("Simulating QR Scan...", {
      description: `${nextName} is authenticating with WebAuthn passkey...`
    });

    await new Promise(r => setTimeout(r, 1200));

    const newMember: MemberItem = {
      name: nextName,
      balance: 0,
      type: "settled",
      role: "member"
    };

    setMemberList(prev => {
      const updated = [...prev, newMember];
      saveStoredTabMembers(tabId, updated);
      // SyncProvider will handle offline syncing
      return updated;
    });
    setIsSimulating(false);
    sounds.playSuccessChime();

    try {
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    toast.success("🎉 Friend Joined Tab!", {
      description: `${nextName} scanned the QR code & securely joined the active roster.`
    });

    setNotification({
      type: "success",
      message: `${nextName} successfully joined the group via QR code invite!`
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSeedDemo = () => {
    if (memberList.length >= 17) {
      toast.error("Roster Limit Exceeded", {
        description: "Seeding 4 members would exceed the 20-member tab limit. Remove existing members first."
      });
      return;
    }
    sounds.playClick();
    seedDemoExpenses(tabId, activeUser);
    // SyncProvider will handle offline syncing
    sounds.playSuccessChime();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {}
    toast.success("Demo Trip Seeded!", {
      description: "Added 4 group members and 3 realistic expenses for live presentation."
    });
  };

  const handleAttemptRemove = (member: MemberItem) => {
    // 1. Protection: Creator/Admin cannot be removed
    if (member.role === "admin") {
      setNotification({
        type: "error",
        message: `${member.name} is the Tab Creator/Admin and cannot be removed.`
      });
      toast.error("Removal Blocked", { description: `${member.name} is the Tab Creator/Admin.` });
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    // 2. Financial Protection: Member has active unsettled debt/credit
    if (member.balance !== 0) {
      setBlockedRemovalMember(member);
      toast.error("Removal Blocked", { description: `${member.name} has an active unsettled balance.` });
      return;
    }

    // 3. Member is settled (balance === 0): Ask for confirmation explaining ledger preservation
    setPendingRemovalMember(member);
  };

  const confirmRemoval = () => {
    if (!pendingRemovalMember) return;
    const removedName = pendingRemovalMember.name;
    setMemberList(prev => {
      const updated = prev.filter(m => m.name !== removedName);
      saveStoredTabMembers(tabId, updated);
      return updated;
    });
    setPendingRemovalMember(null);
    sounds.playSuccessChime();
    toast.success("Member Removed", {
      description: `${removedName} removed. Historical contributions remain preserved.`
    });
    setNotification({
      type: "success",
      message: `${removedName} removed from active roster. Historical contributions remain preserved in the ledger.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLeaveGroup = () => {
    const me = memberList.find(m => m.name.toLowerCase() === activeUser.toLowerCase());
    if (!me) return;

    if (me.balance !== 0) {
      toast.error("Cannot Leave Group", { description: "You must settle your balance to $0.00 first." });
      setNotification({ type: "error", message: "You must settle your balance to $0.00 before leaving." });
      return;
    }

    // Process Leave
    const updated = memberList.filter(m => m.name.toLowerCase() !== activeUser.toLowerCase());
    saveStoredTabMembers(tabId, updated);
    
    // Remove tab from local dashboard
    try {
      const mode = workspaceMode;
      const tabsKey = storageKey("tabs", mode);
      const saved = localStorage.getItem(tabsKey);
      if (saved) {
        const parsedTabs = JSON.parse(saved);
        const filteredTabs = parsedTabs.filter((t: any) => t.id !== tabId);
        safeSetItem(tabsKey, JSON.stringify(filteredTabs));
        window.dispatchEvent(new Event("meshTab-tabs-update"));
      }
    } catch (e) {}

    sounds.playSuccessChime();
    toast.success("You have left the group.");
    router.replace("/home");
  };

  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDeleteTab = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete this tab? All data will be wiped globally.`)) {
      return;
    }
    
    setIsDeleting(true);
    toast.info("Deleting tab from network...");

    try {
      // Queue deletion op and set tombstone if in testnet mode
      if (workspaceMode === "testnet") {
        addDeletedTabTombstone(tabId);
        const wallet = localStorage.getItem("meshTab_walletAddress") || "";
        const { queueOutboxOp } = await import("../../lib/outbox");
        queueOutboxOp({
          type: "deleteTab",
          tabId,
          ownerWallet: wallet,
          payload: {}
        });
      }

      // Wipe local storage
      const mode = workspaceMode;
      const tabsKey = storageKey("tabs", mode);
      const saved = localStorage.getItem(tabsKey);
      if (saved) {
        const parsedTabs = JSON.parse(saved);
        const filteredTabs = parsedTabs.filter((t: any) => t.id !== tabId);
        safeSetItem(tabsKey, JSON.stringify(filteredTabs));
      }
      
      const membersKey = storageKey("members", mode, tabId);
      const expensesKey = storageKey("expenses", mode, tabId);
      localStorage.removeItem(membersKey);
      localStorage.removeItem(expensesKey);

      window.dispatchEvent(new Event("meshTab-tabs-update"));
      sounds.playSuccessChime();
      toast.success("Tab permanently deleted.");
      router.replace("/home");
    } catch (err) {
      setIsDeleting(false);
      toast.error("Failed to delete tab.");
    }
  };

  return (
    <div className="p-6 md:p-8 flex flex-col h-full bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white min-h-[550px] relative">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-800 dark:text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Group</h2>
            <p className="text-slate-500 dark:text-white/60 text-sm">Members, permissions & invite link.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>Admin: {creatorName}</span>
        </div>
      </div>

      {notification && (
        <div className={`mb-4 px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
          notification.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            : notification.type === "error"
            ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-300"
        }`}>
          {notification.type === "error" ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Invite Section */}
        <div className="space-y-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl flex flex-col items-center text-center">
          <h3 className="text-xs font-bold text-slate-700 dark:text-white/80 uppercase tracking-wider mb-1">Invite Friends via QR Code</h3>
          
          {workspaceMode !== "testnet" ? (
            <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
              <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Device-Only Demo Tab</div>
              <div className="text-[10px] text-amber-600/80 dark:text-amber-300/70 mt-0.5">
                Stored in this browser only. To collaborate across phones in real-time, create a tab in Testnet mode.
              </div>
            </div>
          ) : (
            <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Live Monad Testnet Tab</div>
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-300/70 mt-0.5">
                Friends join in 1 tap by scanning the QR code or entering the 8-character code below.
              </div>
            </div>
          )}

          <div className="bg-white p-3.5 rounded-xl shadow-md border border-slate-200">
            <QRCodeSVG value={inviteLink} size={130} level="H" includeMargin={false} />
          </div>
          
          <div className="w-full pt-2 space-y-3">
             {workspaceMode === "testnet" && tabId.length > 8 && (
               <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-3 flex flex-col items-center">
                 <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">Testnet Join Code</div>
                 <div className="text-xl font-mono font-bold tracking-widest text-indigo-900 dark:text-indigo-100 select-all">
                   {tabId.slice(-8).toUpperCase()}
                 </div>
               </div>
             )}
             
             <div className="text-xs font-semibold text-slate-600 dark:text-white/70 mb-1 text-left ml-1">Or share invite URL</div>
             <div className="flex items-center gap-2">
               <div className="flex-1 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-700 dark:text-white/70 text-xs truncate select-all font-mono">
                 {inviteLink}
               </div>
               <Button onClick={copyToClipboard} variant="primary" className="h-10 px-4 flex-shrink-0">
                 {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
               </Button>
             </div>
          </div>

          {workspaceMode !== "testnet" && (
            <div className="w-full pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-2">
              <button
                onClick={handleSimulateJoin}
                disabled={isSimulating || memberList.length >= 20}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                <span>
                  {memberList.length >= 20
                    ? "Max Tab Capacity Reached (20/20 Members)"
                    : isSimulating
                    ? "Authenticating WebAuthn Passkey..."
                    : "⚡ Simulate Friend Scanning QR & Joining"}
                </span>
              </button>

              <button
                onClick={handleSeedDemo}
                disabled={memberList.length >= 17}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>🏝️ Seed Demo Trip Activity (Villa, Dinners, Excursions)</span>
              </button>
              <p className="text-[10px] text-slate-500 dark:text-white/40 mt-1 text-center">
                Quickly populate this tab with multi-member expenses for live presentation.
              </p>
            </div>
          )}
        </div>

        {/* Current Roster */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-white/80 uppercase tracking-wider">Group Roster ({memberList.length}/20 max)</h3>
            <span className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Only Admin can remove members</span>
          </div>

          <div className="space-y-2">
            {memberList.map((member, i) => {
              const isAdmin = member.role === "admin";
              const isSettled = member.balance === 0;
              const hasDebt = member.balance < 0;
              const isCreditor = member.balance > 0;

              return (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] hover:bg-slate-100/80 dark:hover:bg-white/5 transition-colors border border-slate-200/70 dark:border-white/10 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-sm">
                        {member.name[0]}
                      </div>
                      {isAdmin && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm" title="Tab Admin">
                          <Crown className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 dark:text-white font-bold text-sm">{member.name}</span>
                        {member.name.toLowerCase() === activeUser.toLowerCase() && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold border border-indigo-500/20">
                            You
                          </span>
                        )}
                        {isAdmin && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5" /> {member.name.toLowerCase() === activeUser.toLowerCase() ? "Creator (You)" : "Host / Admin"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-left mt-0.5">
                        {isSettled ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Settled ($0.00)</span>
                        ) : isCreditor ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Owed +{formatCurrency(member.balance)}</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">Owes {formatCurrency(Math.abs(member.balance))}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isAdmin && (
                    <button 
                      onClick={() => handleAttemptRemove(member)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSettled 
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95" 
                          : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:bg-rose-500/10 hover:text-rose-500"
                      }`}
                      title={isSettled ? `Remove ${member.name}` : `Cannot remove: has active balance`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Ledger Integrity Safeguard Note */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/5 border border-indigo-200/70 dark:border-indigo-500/20 flex items-start gap-3 text-xs text-slate-600 dark:text-white/60 leading-relaxed">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-indigo-900 dark:text-indigo-300">Accounting Safeguard: </span>
            Members with active balances cannot be removed until debts are settled to $0.00, protecting the group from unpaid shortfalls. Historical receipts remain permanently in the ledger.
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-4 mt-6 border-t border-slate-200 dark:border-white/10">
          <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-3">Danger Zone</h3>
          
          {!isCurrentUserAdmin ? (
            <div className="flex items-center justify-between p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Leave Group</h4>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">Remove yourself from this room.</p>
              </div>
              <button 
                onClick={handleLeaveGroup}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Leave Group
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete Tab</h4>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">Permanently wipe all data globally.</p>
              </div>
              <button 
                onClick={handleDeleteTab}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Tab"}
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Blocked Removal Modal (Active Debt Protection) */}
      {blockedRemovalMember && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121212] border border-rose-200 dark:border-rose-500/30 rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-5 shadow-2xl text-slate-900 dark:text-white my-auto max-h-[92vh] overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Balance Protection</h3>
              <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
                Cannot remove <span className="font-bold text-slate-900 dark:text-white">{blockedRemovalMember.name}</span> because they have an active balance of{" "}
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {blockedRemovalMember.balance > 0 ? "+" : "-"}{formatCurrency(blockedRemovalMember.balance)}
                </span>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] text-slate-600 dark:text-white/60">
              In accordance with zero-sum debt conservation, all debts must be settled before removing a member, preventing group members from leaving unpaid deficits.
            </div>

            <Button 
              onClick={() => setBlockedRemovalMember(null)}
              variant="secondary"
              className="w-full"
            >
              Understood
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Removal Modal (Historical Data Preserved) */}
      {pendingRemovalMember && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-5 shadow-2xl text-slate-900 dark:text-white my-auto max-h-[92vh] overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Remove {pendingRemovalMember.name}?</h3>
              <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
                <span className="font-bold">{pendingRemovalMember.name}</span> is settled ($0.00) and can be safely removed from future expenses.
              </p>
            </div>

            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl text-[11px] text-indigo-800 dark:text-indigo-200">
              <span className="font-bold">Ledger Preservation:</span> Past receipts, splits, and historical expenses created by {pendingRemovalMember.name} will NOT be deleted; they remain permanently in the ledger history.
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => setPendingRemovalMember(null)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmRemoval}
                variant="destructive"
                className="flex-1"
              >
                Confirm Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
