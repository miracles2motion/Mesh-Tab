"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { User, Users, Receipt, Plus, ArrowRight, Bell, QrCode, Settings, Search, Filter, Crown, CheckCircle2, TrendingDown, TrendingUp, ArrowDownToLine, Coins, Sparkles, Award, Fingerprint, Copy, CreditCard, Clock, ArrowDownLeft, ArrowUpRight, Activity, ExternalLink } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { TransactionOverlay, TransactionState } from "../../components/ui/transaction-overlay";
import { formatCurrency, formatDistanceToNow } from "../../lib/utils";
import { ThemeToggle } from "../../components/theme-toggle";
import { useUserProfile, useStoredTabs, useVirtualBalance, useWorkspaceMode, getStoredTabMembers, useDeveloperMode, getStoredSettlements, getStoredExpenses, resolveExpenseTimestamp, getStoredTabs } from "../../lib/user";
import { storageKey } from "../../lib/storage-keys";
import { useAvailableBalance, computeCrossTabPosition } from "../../lib/balance";
import { useNotifications } from "../../lib/notifications";
import { CashOutDrawer } from "../../components/tab/cash-out-drawer";
import { AddFundsDrawer } from "../../components/tab/add-funds-drawer";
import { VirtualCardDrawer } from "../../components/tab/virtual-card-drawer";
import { EarnTicker } from "../../components/tab/earn-ticker";
import { PitchModal } from "../../components/home/pitch-modal";
import { MeshBuddy } from "../../components/ui/mesh-buddy";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { AnimatedCounter } from "../../components/ui/animated-counter";
import { NetworkStatusBadge } from "../../components/ui/network-status-badge";
import { GlobalNav } from "../../components/ui/global-nav";
import { LiveTime } from "@/components/ui/live-time";
import { ReceiptView } from "../../components/ReceiptView";
import { getStoredClaimHistory } from "../../lib/claims";
import { Modal } from "../../components/ui/modal";

import { useWallets, usePrivy } from "@privy-io/react-auth";
import { AuthGuard } from "../../components/providers/auth-guard";
import { useRealAusdBalance, useFaucetCooldown } from "../../lib/onchain";
import { FaucetModal } from "../../components/tab/faucet-modal";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { HomeRootHistoryGuard } from "../../components/providers/home-history-guard";


export default function GlobalHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const profile = useUserProfile();
  const { tabs: mockTabs, saveTab } = useStoredTabs();
  const { balance: virtualBalance } = useVirtualBalance();
  const { mode: workspaceMode, setMode: setWorkspaceMode } = useWorkspaceMode();
  const { totalCents, heldCents, availableCents, isStale, asOf, isLoading: isBalanceAvailableLoading } = useAvailableBalance(profile.name || "David");
  const { unreadCount } = useNotifications();

  // Use workspaceMode as the source of truth, not the URL
  const isTestnetMode = workspaceMode === "testnet";

  const { wallets } = useWallets();
  const { client } = useSmartWallets();
  const { user, linkPasskey, getAccessToken } = usePrivy();
  const { balance: testnetBalance, isLoading: isFetchingBalance } = useRealAusdBalance(workspaceMode);
  const hasPasskey = user?.linkedAccounts?.some(account => account.type === 'passkey') || false;

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showVirtualCardModal, setShowVirtualCardModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "owe" | "owed">("all");
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const { showAddress, isDeveloperMode } = useDeveloperMode();
  const { isCooldownActive, secondsRemaining } = useFaucetCooldown();
  const fullAddress = client?.account?.address;
  
  const activeAddress = isTestnetMode ? fullAddress : "0x7F5A4b2...3b9A";
  const displayAddress = isTestnetMode 
    ? (fullAddress ? `${fullAddress.slice(0, 6)}...${fullAddress.slice(-4)}` : "Initializing...")
    : "0x7F5...3b9A";

  const handleCopyAddress = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    sounds.playClick();
    toast.success("Ledger Address Copied", { description: `${displayAddress} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isTestnetMode) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isTestnetMode]);

  // Check if wallet had previously recorded funds or claims
  const hasClaimedBefore = mounted && Boolean(
    typeof window !== "undefined" && (
      localStorage.getItem("meshTab_testnet_lastFaucetClaim") ||
      localStorage.getItem("meshTab_testnet_hasClaimed") === "true" ||
      (() => {
        try {
          const raw = localStorage.getItem("meshTab_testnet_agoraWalletSnapshot");
          return raw ? JSON.parse(raw).cents > 0 : false;
        } catch { return false; }
      })()
    )
  );

  // Loading state during initial unlock or page transition while testnet RPC resolves
  const isBalanceLoading = !loadingTimeout && (
    !mounted || 
    (isTestnetMode && testnetBalance === 0 && !hasClaimedBefore && (!fullAddress || isFetchingBalance || isBalanceAvailableLoading))
  );

  const currentUserName = profile.name || "David";

  // Read archived tab IDs from localStorage
  const archivedTabIds: string[] = (() => {
    if (typeof window === "undefined") return [];
    try {
      const key = storageKey("archived", workspaceMode);
      const raw = localStorage.getItem(key) || (workspaceMode === "sample" ? localStorage.getItem("meshTab_archived") : null);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();

  const activeTabsList = !mounted
    ? ([] as typeof mockTabs)
    : (workspaceMode === "blank" 
        ? mockTabs.filter(t => t.id !== "lisbon-24") 
        : mockTabs
      ).filter(t => !archivedTabIds.includes(t.id));

  const syncedTabs: any[] = !mounted
    ? []
    : activeTabsList.map(tab => {
        const members = getStoredTabMembers(tab.id, currentUserName);
        const userWallet = (typeof window !== "undefined" ? (localStorage.getItem("meshTab_walletAddress") || "") : "");
        const userMember = members.find((m: any) => 
          (userWallet && m.walletAddress && m.walletAddress.toLowerCase() === userWallet.toLowerCase()) ||
          m.name.toLowerCase() === currentUserName.toLowerCase()
        );
        const isUserCreator = tab.role === "Creator" || 
          Boolean(tab.creator && currentUserName && tab.creator.trim().toLowerCase() === currentUserName.trim().toLowerCase());
        return {
          ...tab,
          role: isUserCreator ? "Creator" : tab.role,
          balance: userMember !== undefined ? userMember.balance : tab.balance,
          memberCount: members.length > 0 ? members.length : tab.memberCount
        };
      });

  const crossTab = computeCrossTabPosition(currentUserName);
  const totalYouOwe = crossTab.totalOwe;
  const totalOwedToYou = crossTab.totalOwedToYou;

  // The user's mental model for "Total Net Balance":
  // If they have withdrawable cash, show it (e.g. +230).
  // If they have withdrawn it all, their liquid net is just their active debt (e.g. -270).
  const netBalance = availableCents > 0 ? availableCents : -totalYouOwe;

  const [selectedReceipt, setSelectedReceipt] = useState<{
    amount: number;
    recipient?: string;
    txHash?: string;
    type?: "settlement" | "topup";
  } | null>(null);
  const [activityFilter, setActivityFilter] = useState<"all" | "settlement" | "topup">("all");
  const [showAllActivityModal, setShowAllActivityModal] = useState(false);
  const [activityNonce, setActivityNonce] = useState(0);

  // Real-time listener for settlements, tab expenses, faucet claims, and withdrawals
  useEffect(() => {
    const handleUpdate = () => setActivityNonce(n => n + 1);
    window.addEventListener("meshTab-expenses-update", handleUpdate);
    window.addEventListener("meshTab-settlement-update", handleUpdate);
    window.addEventListener("meshTab-tabs-update", handleUpdate);
    window.addEventListener("meshTab-claims-update", handleUpdate);
    window.addEventListener("meshtab:claims:updated", handleUpdate);
    window.addEventListener("meshTab-payout-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("meshTab-expenses-update", handleUpdate);
      window.removeEventListener("meshTab-settlement-update", handleUpdate);
      window.removeEventListener("meshTab-tabs-update", handleUpdate);
      window.removeEventListener("meshTab-claims-update", handleUpdate);
      window.removeEventListener("meshtab:claims:updated", handleUpdate);
      window.removeEventListener("meshTab-payout-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const recentActivities = useMemo(() => {
    if (!mounted) return [];
    const items: Array<{
      id: string;
      title: string;
      type: "topup" | "settlement";
      direction: "in" | "out";
      amount: number;
      timestamp: number;
      txHash?: string;
      recipient?: string;
      status: string;
    }> = [];

    const seenItemKeys = new Set<string>();

    const candidateTabs = [...activeTabsList];
    try {
      const storedTabsList = getStoredTabs();
      storedTabsList.forEach(st => {
        if (!candidateTabs.some(ct => ct.id === st.id)) {
          candidateTabs.push(st as any);
        }
      });
    } catch {}

    const userWallets = [
      client?.account?.address?.toLowerCase(),
      user?.wallet?.address?.toLowerCase(),
      (typeof window !== "undefined" ? localStorage.getItem("meshTab_walletAddress")?.toLowerCase() : null)
    ].filter(Boolean) as string[];

    const userAliases = new Set<string>([
      "you",
      currentUserName.trim().toLowerCase()
    ]);
    candidateTabs.forEach(tab => {
      try {
        const members = getStoredTabMembers(tab.id, currentUserName);
        members.forEach(m => {
          if (m.walletAddress && userWallets.includes(m.walletAddress.toLowerCase())) {
            userAliases.add(m.name.trim().toLowerCase());
          }
        });
      } catch {}
    });

    const isUserMatch = (nameOrAddress?: string): boolean => {
      if (!nameOrAddress) return false;
      const clean = nameOrAddress.trim().toLowerCase();
      if (userAliases.has(clean)) return true;
      if (userWallets.some(w => clean === w || clean.startsWith(w.slice(0, 6)))) return true;
      return false;
    };

    const recordItem = (item: {
      id: string;
      title: string;
      type: "topup" | "settlement";
      direction: "in" | "out";
      amount: number;
      timestamp: number;
      txHash?: string;
      recipient?: string;
      status: string;
    }) => {
      // Deduplicate safely by type, direction, base id, and amount (never blanket-drop on shared batch txHash)
      const baseId = item.id.replace(/^settle-(in|out)-/, "").replace(new RegExp(`-${currentUserName}$`), "");
      const dedupeKey = `${item.type}-${item.direction}-${baseId}-${item.amount}`;
      if (seenItemKeys.has(dedupeKey)) return;
      seenItemKeys.add(dedupeKey);
      items.push(item);
    };

    // 1. Faucet claims / Top-Ups from local storage (Money Coming In)
    const claims = getStoredClaimHistory(client?.account?.address || user?.wallet?.address || undefined, workspaceMode);
    claims.forEach((c, idx) => {
      const claimAmountCents = c.amount * 100;
      recordItem({
        id: c.id || `claim-${idx}`,
        title: isDeveloperMode ? `+${formatCurrency(claimAmountCents)} Agora AUSD Top-Up` : `+${formatCurrency(claimAmountCents)} Top-Up`,
        type: "topup",
        direction: "in",
        amount: claimAmountCents,
        timestamp: c.timestamp,
        txHash: c.txHash,
        recipient: isDeveloperMode ? "Agora Testnet Reserve" : "Account Top-Up",
        status: "Confirmed"
      });
    });

    // 2. Explicit Stored Settlements (from getStoredSettlements)
    const storedSettlements = getStoredSettlements(workspaceMode);
    storedSettlements.forEach(s => {
      const isOutbound = s.direction === "out" || isUserMatch(s.payer);

      if (isOutbound) {
        // Money leaving
        const displayRecipient = s.recipient || s.tabName || "Group Members";
        recordItem({
          id: `settle-out-${s.id}`,
          title: isDeveloperMode
            ? `-${formatCurrency(s.amount)} Agora AUSD • Settled to ${displayRecipient}`
            : `-${formatCurrency(s.amount)} • Settled to ${displayRecipient}`,
          type: "settlement",
          direction: "out",
          amount: s.amount,
          timestamp: s.timestamp,
          txHash: s.txHash,
          recipient: displayRecipient,
          status: "Settled"
        });
      } else {
        // Money coming in
        if (s.creditors && Array.isArray(s.creditors) && s.creditors.length > 0) {
          const matchedCreditor = s.creditors.find(c => isUserMatch(c.name));
          if (matchedCreditor) {
            recordItem({
              id: `settle-in-${s.id}-${matchedCreditor.name}`,
              title: isDeveloperMode
                ? `+${formatCurrency(matchedCreditor.amount)} Agora AUSD • Settled by ${s.payer}`
                : `+${formatCurrency(matchedCreditor.amount)} • Settled by ${s.payer}`,
              type: "settlement",
              direction: "in",
              amount: matchedCreditor.amount,
              timestamp: s.timestamp,
              txHash: s.txHash,
              recipient: "You",
              status: "Received"
            });
          }
        } else {
          const isRecipient = !s.recipient || isUserMatch(s.recipient) || s.recipient.toLowerCase() === "you";
          if (isRecipient) {
            recordItem({
              id: `settle-in-${s.id}`,
              title: isDeveloperMode
                ? `+${formatCurrency(s.amount)} Agora AUSD • Settled by ${s.payer}`
                : `+${formatCurrency(s.amount)} • Settled by ${s.payer}`,
              type: "settlement",
              direction: "in",
              amount: s.amount,
              timestamp: s.timestamp,
              txHash: s.txHash,
              recipient: "You",
              status: "Received"
            });
          }
        }
      }
    });

    // 3. Scan all stored tabs & active tabs for settlement expenses
    candidateTabs.forEach(tab => {
      const tabExpenses = getStoredExpenses(tab.id);
      tabExpenses.forEach(exp => {
        const isSettle = Boolean(
          exp.isSettlement ||
          exp.id.startsWith("settle-") ||
          exp.desc?.toLowerCase().includes("settled balance") ||
          exp.desc?.toLowerCase().includes("settled up") ||
          exp.desc?.toLowerCase().includes("debt settled")
        );
        if (!isSettle) return;

        const ts = resolveExpenseTimestamp(exp) || exp.createdAt || Date.now();
        const isUserPayer = isUserMatch(exp.payer);

        if (isUserPayer) {
          // Outbound money: user settled their debt in this tab
          const recipientName = exp.participants?.filter(p => !isUserMatch(p)).join(", ") || tab.name;

          recordItem({
            id: `settle-out-${exp.id}`,
            title: isDeveloperMode
              ? `-${formatCurrency(exp.amount)} Agora AUSD • ${tab.name} Settlement`
              : `-${formatCurrency(exp.amount)} • ${tab.name} Settlement`,
            type: "settlement",
            direction: "out",
            amount: exp.amount,
            timestamp: ts,
            txHash: exp.txHash,
            recipient: recipientName,
            status: "Settled"
          });
        } else {
          // Inbound money: another user settled debt that pays current user
          let userShare = 0;
          if (exp.splits && Object.keys(exp.splits).length > 0) {
            const splitKey = Object.keys(exp.splits).find(k => isUserMatch(k));
            if (splitKey) {
              userShare = exp.splits[splitKey];
            }
          }
          if (!userShare && exp.borrowers && Array.isArray(exp.borrowers)) {
            const bMatch = exp.borrowers.find((b: any) => isUserMatch(b.name));
            if (bMatch) {
              userShare = bMatch.amount || 0;
            }
          }
          if (!userShare) {
            const matchStored = storedSettlements.find(s => s.id === exp.id || (s.txHash && exp.txHash && s.txHash === exp.txHash));
            if (matchStored && matchStored.creditors) {
              const cMatch = matchStored.creditors.find(c => isUserMatch(c.name));
              if (cMatch) {
                userShare = cMatch.amount || 0;
              }
            }
          }
          if (!userShare && (!exp.splits || Object.keys(exp.splits).length === 0)) {
            // ONLY assign full exp.amount if this is a single 1:1 settlement, never on batch multi-creditor settlement!
            const creditors = (exp.participants || []).filter(p => !isUserMatch(p) && p.toLowerCase() !== exp.payer.toLowerCase());
            const isParticipant = !exp.participants || exp.participants.length === 0 || 
              exp.participants.some(p => isUserMatch(p));
            if (isParticipant && creditors.length === 1 && isUserMatch(creditors[0])) {
              userShare = exp.amount;
            }
          }

          if (userShare > 0) {
            recordItem({
              id: `settle-in-${exp.id}-${currentUserName}`,
              title: isDeveloperMode
                ? `+${formatCurrency(userShare)} Agora AUSD • Received from ${exp.payer}`
                : `+${formatCurrency(userShare)} • Received from ${exp.payer}`,
              type: "settlement",
              direction: "in",
              amount: userShare,
              timestamp: ts,
              txHash: exp.txHash,
              recipient: "You",
              status: "Received"
            });
          }
        }
      });
    });

    // 4. Sample mode fallback Lisbon item strictly if in sample mode
    if (workspaceMode === "sample") {
      recordItem({
        id: "sample-settle-lisbon",
        title: "-$180.00 • Lisbon Trip Settlement",
        type: "settlement",
        direction: "out",
        amount: 18000,
        timestamp: Date.now() - 3600000 * 4,
        recipient: "Elena Vance",
        txHash: "0xafd413d0ebd3e9da42b92fe61a3f737a3a437108cf367c159d6861712bc829f0",
        status: "Settled"
      });
    }

    // Chronological order: newest transactions first down to oldest
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [
    mounted, 
    workspaceMode, 
    isDeveloperMode, 
    currentUserName,
    client?.account?.address, 
    user?.wallet?.address, 
    testnetBalance, 
    virtualBalance, 
    activeTabsList,
    activityNonce
  ]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return recentActivities;
    return recentActivities.filter(a => a.type === activityFilter);
  }, [recentActivities, activityFilter]);

  // Dynamic Greeting Logic
  const hour = new Date().getHours();
  let greeting = "Good evening";
  let emoji = "🌙";
  if (hour < 12) {
    greeting = "Good morning";
    emoji = "☕";
  } else if (hour < 18) {
    greeting = "Good afternoon";
    emoji = "☀️";
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    
    // Testnet Mode: 8-character cryptographic suffix
    if (workspaceMode === "testnet") {
      if (joinCode.length !== 8) {
        toast.error("Invalid Code", { description: "Testnet join codes must be exactly 8 characters long." });
        return;
      }

      const activeName = profile.name?.trim();
      if (!activeName) {
        toast.error("Profile Setup Required", { description: "Please set up your profile name before joining a tab." });
        router.push("/onboarding?intent=testnet");
        return;
      }
      
      setShowJoinModal(false);
      setTxState("processing");
      
      try {
        const token = await getAccessToken();
        const smartWalletAddress = client?.account?.address || user?.wallet?.address;
        
        const res = await fetch("/api/tab/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            joinCode: joinCode.toLowerCase(),
            name: activeName,
            mode: "testnet",
            walletAddress: smartWalletAddress
          })
        });

        const data = await res.json();
        
        if (data.success && data.tabId) {
          setTxState("success");
          sounds.playSuccessChime();
          setJoinCode("");
          
          // Persist joined tab locally so it's in dashboard immediately
          saveTab({
            id: data.tabId,
            name: data.tabName || `Group #${joinCode.toUpperCase()}`,
            role: "Member",
            balance: 0,
            memberCount: 2,
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
            lastActivityKind: "joined"
          });
          
          // Trigger the sync provider to pull the newly joined tab
          window.dispatchEvent(new Event("meshtab:outbox:updated"));
          
          // Route immediately to the tab
          router.push(`/tab/${data.tabId}`);
        } else {
          setTxState("idle");
          toast.error("Join Failed", { 
            description: data.error === "NOT_FOUND" 
              ? "No tab found on Monad Testnet matching this code. Demo tabs are stored locally on their device." 
              : data.error || data.message || "Failed to join tab." 
          });
        }
      } catch (err) {
        setTxState("idle");
        toast.error("Connection Error", { description: "Failed to connect to server. Please check your network and try again." });
      }
      return;
    }

    // Demo/Clean Slate Mode: 8-character mock
    if (joinCode.length !== 8) return;
    setShowJoinModal(false);
    setTxState("authenticating");
    await new Promise(r => setTimeout(r, 1500));
    setTxState("processing");
    await new Promise(r => setTimeout(r, 2000));
    setTxState("success");
    await new Promise(r => setTimeout(r, 1000));
    setTxState("idle");
    
    // Check if code matches an existing local tab suffix
    const existingTab = syncedTabs.find(t => 
      t.id.toLowerCase().endsWith(joinCode.toLowerCase()) || 
      t.id.toLowerCase() === joinCode.toLowerCase()
    );
    const joinedId = existingTab ? existingTab.id : `joined-${joinCode.toLowerCase()}`;
    
    // Persist joined tab locally for mock modes if new
    if (!existingTab) {
      saveTab({
        id: joinedId,
        name: `Group #${joinCode}`,
        role: "Member",
        balance: 0,
        memberCount: 3,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        lastActivityKind: "joined"
      });
    }

    setJoinCode("");
    router.push(`/tab/${joinedId}`);
  };

  // Filter, search, and sort tabs newest first
  const filteredTabs = syncedTabs
    .filter(tab => {
      const matchesSearch = tab.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilter === "owe") return tab.balance < 0;
      if (activeFilter === "owed") return tab.balance > 0;
      return true;
    })
    .sort((a, b) => (b.lastActivityAt || b.createdAt || 0) - (a.lastActivityAt || a.createdAt || 0));

  return (
    <AuthGuard>
    <HomeRootHistoryGuard />
    <TransactionOverlay 
      state={txState} 
      messages={{
        authenticating: "Please confirm with Passkey to join via code.",
        processing: "Adding you to the ledger...",
        success: "Joined successfully!"
      }}
    />
    <FaucetModal 
      isOpen={showFaucetModal} 
      onClose={() => setShowFaucetModal(false)} 
    />
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300 pb-36 lg:pb-36">
      <GlobalNav />
      

      {/* Passkey Link Prompt removed to reduce noise - moved to settings */}

      {/* Header */}
      <header className="px-6 md:px-12 pt-10 pb-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div>
          <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4 mb-1">
            <div className="flex items-center gap-2 flex-wrap order-2 md:order-1">
              {!mounted ? (
                <div className="h-9 w-52 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
              ) : (
                <>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{greeting}, {profile.name} {emoji}</h1>
                  {workspaceMode === "sample" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20" title="Exploring Lisbon Trip Demo as David">
                      🏖️ Lisbon Demo Persona
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap order-1 md:order-2 md:pb-1">
              <NetworkStatusBadge compact />
              {isDeveloperMode ? (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${isTestnetMode ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isTestnetMode ? "bg-purple-500" : "bg-emerald-500"}`} />
                  {isTestnetMode ? "Monad Testnet" : "Demo Sandbox"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Synced
                </span>
              )}
              {isDeveloperMode && showAddress && (
                <button
                  onClick={handleCopyAddress}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20 shrink-0 cursor-pointer"
                  title="Copy Ledger Address"
                >
                  {displayAddress}
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
              {isDeveloperMode && !isTestnetMode && (
                <>
                  <Link 
                    replace
                    href="/demo?from=/home"
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    title="Open Demo Mode Selection"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Change Mode</span>
                  </Link>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowPitchModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
                    title="Open Monad Metropolis Pitch Mode"
                  >
                    <Award className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>Pitch Mode</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-slate-500 dark:text-white/60 mt-0.5 text-sm">
            {!mounted ? (
              <span className="inline-block h-4 w-72 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse" />
            ) : workspaceMode === "sample" ? (
              "Exploring Lisbon '24 benchmark data. Ready to settle up or test netting?"
            ) : (
              "Your personal shared tabs and real settlement ledger."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link 
            href="/notifications?from=/home" 
            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80"
            title={`Notifications ${mounted && unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
          >
            <Bell className="w-5 h-5" />
            {mounted && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0a0a0a] shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

        </div>
      </header>

      <main className="px-6 md:px-12 max-w-5xl mx-auto w-full space-y-10">
        {/* Unified Overall Balance & Payout Hub */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-indigo-500/15 dark:from-indigo-500/20 dark:to-purple-500/10 border border-indigo-200/80 dark:border-indigo-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-slate-600 dark:text-white/70 font-semibold text-xs uppercase tracking-wider">
                {isTestnetMode ? "Total Balance" : "Total Net Balance"}
              </span>
              {isBalanceLoading ? (
                <div className="h-10 sm:h-12 w-52 bg-slate-200 dark:bg-white/10 rounded-2xl animate-pulse mt-1 mb-2" />
              ) : (
                <div className={`text-3xl sm:text-4xl md:text-5xl font-bold mt-1 tracking-tight break-words min-w-0 ${isTestnetMode ? "text-slate-900 dark:text-white" : netBalance < 0 ? "text-rose-600 dark:text-rose-400" : netBalance > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                  {!isTestnetMode && netBalance < 0 ? "-" : !isTestnetMode && netBalance > 0 ? "+" : ""}<AnimatedCounter value={isTestnetMode ? (totalCents / 100) : (Math.abs(netBalance) / 100)} prefix="$" decimals={2} />
                </div>
              )}
              <p className="text-slate-500 dark:text-white/50 text-xs mt-2 font-medium">
                {isBalanceLoading ? (
                  <span className="inline-block h-3.5 w-36 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                ) : (
                  `Across ${syncedTabs.length} active shared ${syncedTabs.length === 1 ? "group" : "groups"}`
                )}
              </p>

              {mounted && (
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      if (isBalanceLoading || isCooldownActive) return;
                      sounds.playClick();
                      setShowAddFundsModal(true);
                    }}
                    disabled={isBalanceLoading || isCooldownActive}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-bold shadow-md transition-all ${
                      isCooldownActive
                        ? "bg-amber-500/80 cursor-not-allowed opacity-90 shadow-amber-500/20"
                        : isBalanceLoading
                        ? "bg-indigo-600/60 cursor-wait opacity-80"
                        : isTestnetMode && testnetBalance === 0 && !hasClaimedBefore
                        ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 shadow-purple-500/25 hover:scale-105 active:scale-95 cursor-pointer"
                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25 hover:scale-105 active:scale-95 cursor-pointer"
                    }`}
                  >
                    {isBalanceLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Loading Ledger...</span>
                      </>
                    ) : isCooldownActive ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>{isDeveloperMode ? `Agora Cooldown (${secondsRemaining}s)` : `Next bonus in ${secondsRemaining}s`}</span>
                      </>
                    ) : isTestnetMode && testnetBalance === 0 && !hasClaimedBefore ? (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{isDeveloperMode ? "Claim $10,000 Agora AUSD" : "Claim $10,000 Welcome Bonus"}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Funds</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      if (isBalanceLoading) return;
                      if (availableCents > 0) {
                        sounds.playClick();
                        setShowCashOutModal(true);
                      }
                    }}
                    disabled={isBalanceLoading || availableCents <= 0}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-bold shadow-md transition-all ${
                      !isBalanceLoading && availableCents > 0 
                        ? "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-500/25 cursor-pointer" 
                        : "bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/40 shadow-none cursor-not-allowed"
                    }`}
                    title={isBalanceLoading ? "Loading balance..." : availableCents > 0 ? "Cash Out" : heldCents > 0 ? "Settle what you owe to unlock" : "Needs connection"}
                  >
                    <ArrowDownToLine className="w-4 h-4" /> {availableCents > 0 ? "Cash Out" : "Cash Out to Bank"}
                  </button>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowVirtualCardModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-black text-white text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="MeshTab Virtual Visa Card"
                  >
                    <CreditCard className="w-4 h-4 text-indigo-400 dark:text-indigo-600" /> Virtual Card
                  </button>
                  <EarnTicker className="hidden sm:inline-flex" />
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition-all ${
                    !isBalanceLoading && availableCents > 0 
                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                      : "text-slate-500 dark:text-white/50 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                  }`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${!isBalanceLoading && availableCents > 0 ? "text-emerald-500" : "text-slate-400"}`} />
                    {isBalanceLoading ? (
                      <span className="inline-block h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded animate-pulse align-middle" />
                    ) : (
                      <span><AnimatedCounter value={availableCents / 100} prefix="$" decimals={2} /> available</span>
                    )}
                  </span>
                  {heldCents > 0 && (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border text-slate-500 dark:text-white/50 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" title="Held for what you owe">
                      <span className="w-3 h-3 flex items-center justify-center bg-slate-400 text-white rounded-full text-[8px]">i</span>
                      <span>{isBalanceLoading ? <span className="inline-block h-3.5 w-16 bg-slate-200 dark:bg-white/10 rounded animate-pulse align-middle" /> : `${formatCurrency(heldCents)} held for what you owe`}</span>
                    </span>
                  )}
                </div>
              )}

            </div>

            {/* Split Breakdown */}
            <div className="flex items-center gap-4 bg-white/70 dark:bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 text-xs shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>You Owe</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  {isBalanceLoading ? <span className="inline-block h-4 w-14 bg-slate-200 dark:bg-white/10 rounded animate-pulse" /> : formatCurrency(totalYouOwe)}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>You're Owed</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  {isBalanceLoading ? <span className="inline-block h-4 w-14 bg-slate-200 dark:bg-white/10 rounded animate-pulse" /> : formatCurrency(totalOwedToYou)}
                </div>
              </div>
              {mounted && (
                <>
                  <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                  <div className="space-y-0.5">
                    <div className={`flex items-center gap-1 font-semibold ${totalCents > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-white/50"}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isTestnetMode ? "Wallet Balance" : "Settled Payouts"}</span>
                    </div>
                    <div className={`font-bold text-base ${totalCents > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-white/40"}`}>
                      {isBalanceLoading ? (
                        <span className="inline-block h-4 w-16 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                      ) : (
                        <AnimatedCounter value={totalCents / 100} prefix="$" decimals={2} />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Decorative Mesh */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/30 blur-[80px] rounded-full pointer-events-none" />
        </div>



        {/* Active Tabs with Search & Filter Chips */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="w-5 h-5 text-slate-400 dark:text-white/50" /> Active Tabs
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search tabs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter chips */}
              <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs">
                <button 
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${activeFilter === "all" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setActiveFilter("owe")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${activeFilter === "owe" ? "bg-white dark:bg-white/10 text-rose-600 dark:text-rose-400 shadow-sm" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  You Owe
                </button>
                <button 
                  onClick={() => setActiveFilter("owed")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${activeFilter === "owed" ? "bg-white dark:bg-white/10 text-amber-500 dark:text-amber-400 shadow-sm" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  Owed
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!mounted ? (
              // Themed ash skeleton cards while client storage and workspace mode initialize
              [1, 2, 3].map((n) => (
                <div 
                  key={n} 
                  className="bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 flex flex-col h-[220px] animate-pulse"
                >
                  <div className="flex justify-between items-start mb-auto gap-3">
                    <div className="flex-1 space-y-2.5">
                      <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-lg" />
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-16 bg-slate-200 dark:bg-white/10 rounded-md" />
                        <div className="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded-md" />
                      </div>
                    </div>
                    <div className="h-7 w-16 bg-slate-200 dark:bg-white/10 rounded-xl shrink-0" />
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/10 pt-4 mt-4 flex items-center justify-between">
                    <div className="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded-md" />
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10" />
                  </div>
                </div>
              ))
            ) : (
              filteredTabs.map(tab => (
              <Link 
                href={`/tab/${tab.id}`}
                key={tab.id} 
                className="bg-white dark:bg-white/5 hover:bg-[#f5f5f7] dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 transition-all hover:scale-[1.02] shadow-sm hover:shadow-md cursor-pointer group flex flex-col h-[220px]"
              >
                <div className="flex justify-between items-start mb-auto gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white/90 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors truncate mb-1.5">
                      {tab.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 dark:text-white/50 text-xs font-medium whitespace-nowrap flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-white/40" />
                        <span>{tab.memberCount} {tab.memberCount === 1 ? "member" : "members"}</span>
                      </span>
                      <span className="text-slate-300 dark:text-white/20 text-xs select-none">•</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 shrink-0 ${
                        tab.role === "Creator" 
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/20" 
                          : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10"
                      }`}>
                        {tab.role === "Creator" ? (
                          <>
                            <Crown className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                            <span>Creator (You)</span>
                          </>
                        ) : (
                          <>
                            <User className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                            <span>Member (You)</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums shrink-0 whitespace-nowrap ${tab.balance > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : tab.balance < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'}`}>
                    {tab.balance > 0 ? '+' : ''}{formatCurrency(tab.balance)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4 mt-4">
                  <div className="flex items-center text-xs font-medium">
                    <LiveTime ts={tab.lastActivityAt} kind={tab.lastActivityKind} variant="activity" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-400 dark:text-white/30 shadow-sm">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            )))}

            {mounted && filteredTabs.length === 0 && (
              <div className="col-span-full py-12 px-6 text-center bg-white dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                {workspaceMode === "blank" ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Clean Slate Workspace</h3>
                    <p className="text-xs text-slate-500 dark:text-white/60 max-w-sm mx-auto mt-1 mb-6">
                      Pristine workspace with zero pre-loaded tabs. Tap Create Tab to start a fresh shared group.
                    </p>
                    <div className="flex items-center justify-center">
                      <Link
                        href="/tab/new"
                        className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Create Custom Tab
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <Users className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-white/70">No tabs match your filter</p>
                    <button onClick={() => { setActiveFilter("all"); setSearchQuery(""); }} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                      Reset filters
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Ledger Card (Placed Below Active Tabs, Capped to 3 Items) */}
        <div className="bg-white dark:bg-[#111] border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                <p className="text-[11px] text-slate-500 dark:text-white/50">
                  {isDeveloperMode ? "Cryptographic ledger transactions & settlements" : "Your recent settlements and balance receipts"}
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs self-start sm:self-auto">
              <button
                onClick={() => setActivityFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activityFilter === "all" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
              >
                All
              </button>
              <button
                onClick={() => setActivityFilter("settlement")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activityFilter === "settlement" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
              >
                Settlements
              </button>
              <button
                onClick={() => setActivityFilter("topup")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activityFilter === "topup" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
              >
                Top-Ups
              </button>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400 dark:text-white/40">
              No recent payments yet. Add funds or settle a tab to see receipts here.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActivities.slice(0, 3).map((act) => (
                <div
                  key={act.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedReceipt({
                      amount: act.amount,
                      recipient: act.recipient,
                      txHash: act.txHash,
                      type: act.type === "topup" ? "topup" : "settlement"
                    });
                  }}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      act.direction === "out"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    }`}>
                      {act.direction === "out" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-white/40 flex items-center gap-1.5 mt-0.5">
                        <LiveTime ts={act.timestamp} variant="compact" />
                        <span>•</span>
                        <span>{act.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDeveloperMode && act.txHash && (
                      <a
                        href={`https://testnet.monadvision.com/tx/${act.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-mono font-bold border border-purple-500/20 flex items-center gap-1 transition-all"
                        title="View on MonadVision Explorer"
                      >
                        <span>Monad Tx</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <span>{isDeveloperMode ? "Receipt" : "View Receipt"}</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              ))}

              {/* View All Button if more than 3 activities */}
              {filteredActivities.length > 3 && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowAllActivityModal(true);
                  }}
                  className="w-full mt-3 py-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-white/60 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View All Activity ({filteredActivities.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop floating dock was moved */}
      </main>

      {/* Modern Web2 Sticky Bottom Action Dock on Mobile & Desktop */}
      <div className="fixed bottom-6 lg:bottom-10 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
        <div className="bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 rounded-full p-2 flex items-center justify-between gap-2 shadow-2xl w-full max-w-sm md:max-w-lg lg:max-w-xl mx-auto pointer-events-auto">
          <Link 
            href="/tab/new" 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>New Tab</span>
          </Link>

          <button 
            onClick={() => setShowJoinModal(true)}
            className="flex-1 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white py-3 px-4 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
          >
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Join Code</span>
          </button>
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowJoinModal(false); }}
        >
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl text-slate-900 dark:text-white my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Join Group via Code</h3>
                <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                  {workspaceMode === "testnet" 
                    ? "Enter the 8-character invite code to join this Monad Testnet tab." 
                    : "Enter an 8-character code to join the shared group."}
                </p>
              </div>
              <button 
                onClick={() => setShowJoinModal(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider">
                    8-Character Code
                  </label>
                  <span className={`text-[11px] font-mono font-medium ${joinCode.length === 8 ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-white/40"}`}>
                    {joinCode.length}/8
                  </span>
                </div>
                <input 
                  type="text" 
                  maxLength={8}
                  autoFocus
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                  placeholder="e.g. 9A42F1B0" 
                  className="w-full bg-[#f5f5f7] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-center tracking-widest text-2xl font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
              <button 
                type="submit"
                disabled={joinCode.length !== 8}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Join Group
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Add Funds Drawer */}
      <AddFundsDrawer 
        isOpen={showAddFundsModal} 
        onClose={() => setShowAddFundsModal(false)} 
      />

      {/* Cash Out Drawer */}
      <CashOutDrawer 
        isOpen={showCashOutModal} 
        onClose={() => setShowCashOutModal(false)} 
        currentUserName={profile.name} 
      />

      {/* Virtual Visa Card Drawer */}
      <VirtualCardDrawer 
        isOpen={showVirtualCardModal} 
        onClose={() => setShowVirtualCardModal(false)}
        tabId={activeTabsList[0]?.id || "lisbon-24"}
        tabName={activeTabsList[0]?.name || "Lisbon Weekend"}
      />


      {/* Monad Metropolis Pitch Presentation Modal */}
      <PitchModal 
        isOpen={showPitchModal}
        onClose={() => setShowPitchModal(false)}
      />

      {/* Global In-App Receipt Modal */}
      <ReceiptView
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        amount={selectedReceipt?.amount || 0}
        recipient={selectedReceipt?.recipient}
        txHash={selectedReceipt?.txHash}
        type={selectedReceipt?.type}
      />

      {/* All Activity History Modal */}
      {showAllActivityModal && (
        <Modal onClose={() => setShowAllActivityModal(false)} size="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Activity History</h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    {filteredActivities.length} total receipts & settlements recorded
                  </p>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs">
                <button
                  onClick={() => setActivityFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activityFilter === "all" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-white/50"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActivityFilter("settlement")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activityFilter === "settlement" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-white/50"}`}
                >
                  Settled
                </button>
                <button
                  onClick={() => setActivityFilter("topup")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${activityFilter === "topup" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-white/50"}`}
                >
                  Top-Ups
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredActivities.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No activity found for this filter.
                </div>
              ) : (
                filteredActivities.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedReceipt({
                        amount: act.amount,
                        recipient: act.recipient,
                        txHash: act.txHash,
                        type: act.type === "topup" ? "topup" : "settlement"
                      });
                    }}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        act.direction === "out"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      }`}>
                        {act.direction === "out" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {act.title}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-white/40 flex items-center gap-1.5 mt-0.5">
                          <LiveTime ts={act.timestamp} variant="compact" />
                          <span>•</span>
                          <span>{act.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDeveloperMode && act.txHash && (
                        <a
                          href={`https://testnet.monadvision.com/tx/${act.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-mono font-bold border border-purple-500/20 flex items-center gap-1 transition-all"
                          title="View on MonadVision Explorer"
                        >
                          <span>Monad Tx</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <span>{isDeveloperMode ? "Receipt" : "View Receipt"}</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MeshBuddy Tab Co-Pilot */}
      <MeshBuddy />
    </div>
    </AuthGuard>
  );
}
