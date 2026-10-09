"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Settings,
  Volume2,
  VolumeX,
  ArrowRight,
  Coins,
  Send,
  Check,
  HelpCircle,
  Palette,
  RefreshCw,
  Zap,
  Bot,
  BookOpen,
  Search,
  ChevronRight,
  ArrowLeft,
  Trash2
} from "lucide-react";
import {
  useBuddySettings,
  useUserProfile,
  useWorkspaceMode,
  useVirtualBalance,
  useStoredTabs,
  getStoredTabMembers,
  getStoredExpenses,
  getStoredTabs,
  TabMember,
  StoredExpense,
  AVATAR_COLORS
} from "../../lib/user";
import { formatCurrency } from "../../lib/utils";
import { useClaimWelcomeBonus } from "../../lib/onchain";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireFaucetConfetti } from "../../lib/confetti";
import { speak, stopSpeech, VoicePersona } from "../../lib/voice";
import { BuddyAvatar, BuddyMood } from "./buddy-avatar";
import {
  KB_CATEGORIES,
  KB_ARTICLES,
  searchKnowledgeBase,
  getArticlesByCategory,
  getPopularArticles,
  getAllArticles,
  getKBCategories,
  KBArticle,
  KBCategoryId
} from "../../lib/meshbuddy-kb";

interface ChatMessage {
  id: string;
  sender: "buddy" | "user";
  text: string;
  spokenText?: string;
  actions?: { label: string; action: () => void }[];
}

interface LiveTabStats {
  tabName: string;
  totalSpent: number;
  expenses: StoredExpense[];
  members: TabMember[];
  creditors: TabMember[];
  debtors: TabMember[];
  settled: TabMember[];
  userMember?: TabMember;
  totalOutstandingDebt: number;
}

function getLiveTabStats(tabId: string, userName: string, fallbackName?: string): LiveTabStats {
  const members = getStoredTabMembers(tabId, userName);
  const expenses = getStoredExpenses(tabId);
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const creditors = members.filter((m) => m.balance > 0);
  const debtors = members.filter((m) => m.balance < 0);
  const settled = members.filter((m) => m.balance === 0);
  const userMember = members.find((m) => m.name.toLowerCase() === userName.toLowerCase());
  const totalOutstandingDebt = Math.abs(debtors.reduce((sum, d) => sum + d.balance, 0));

  return {
    tabName: fallbackName || tabId,
    totalSpent,
    expenses,
    members,
    creditors,
    debtors,
    settled,
    userMember,
    totalOutstandingDebt,
  };
}

export function MeshBuddy() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useUserProfile();
  const { settings: buddySettings, updateSettings } = useBuddySettings();
  const { mode: workspaceMode, setMode: setWorkspaceMode, resetLisbonDemo } = useWorkspaceMode();
  const { balance: virtualBalance, topUp } = useVirtualBalance();
  const { tabs: storedTabs } = useStoredTabs();
  const { claimBonus, isClaiming: isTestnetClaiming } = useClaimWelcomeBonus(workspaceMode);
  const [isLocalClaiming, setIsLocalClaiming] = useState(false);
  
  const isClaiming = workspaceMode === "testnet" ? isTestnetClaiming : isLocalClaiming;

  const [isOpen, setIsOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"chat" | "kb">("chat");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [isBubbleHovered, setIsBubbleHovered] = useState(false);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [inputQuestion, setInputQuestion] = useState("");
  const [customName, setCustomName] = useState(buddySettings.name);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isRippling, setIsRippling] = useState(false);
  const [buddyMood, setBuddyMood] = useState<BuddyMood>("happy");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Knowledge Base view state
  const [selectedCategory, setSelectedCategory] = useState<KBCategoryId | "all">("all");
  const [kbSearchQuery, setKbSearchQuery] = useState("");
  const [activeArticle, setActiveArticle] = useState<KBArticle | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Context awareness: detect current route, tab, and app mode
  const pathSegments = pathname ? pathname.split("/").filter(Boolean) : [];
  const currentTabId = (pathSegments[0] === "tab" && pathSegments[1] && pathSegments[1] !== "new")
    ? pathSegments[1]
    : null;
  const isDemoTab = currentTabId === "lisbon-24" && workspaceMode === "sample";
  const isCustomTab = currentTabId !== null && !isDemoTab;
  const isCleanMode = workspaceMode === "blank" || workspaceMode === "testnet";
  const activeTab = storedTabs.find((t) => t.id === currentTabId);
  const tabDisplayName = activeTab?.name || (currentTabId ? currentTabId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Custom Group Tab");

  const currentContextKey = `${workspaceMode}_${currentTabId || "none"}_${pathname}`;
  const lastContextRef = useRef<string>("");

  // Filtered/searched articles for Knowledge Base explorer
  const displayedArticles = useMemo(() => {
    if (kbSearchQuery.trim()) {
      const scored = searchKnowledgeBase(kbSearchQuery, {
        currentTabId,
        isDemoTab,
        isCustomTab,
        workspaceMode,
        tabDisplayName
      });
      if (selectedCategory !== "all") {
        return scored.filter((s) => s.article.categoryId === selectedCategory).map((s) => s.article);
      }
      return scored.map((s) => s.article);
    }
    if (selectedCategory !== "all") {
      return getArticlesByCategory(selectedCategory, workspaceMode);
    }
    return getAllArticles(workspaceMode);
  }, [kbSearchQuery, selectedCategory, currentTabId, isDemoTab, isCustomTab, workspaceMode, tabDisplayName]);

  // Sound synthesis helper using high-fidelity natural neural voice engine
  const speakText = (text: string, customSpokenText?: string) => {
    speak(customSpokenText || text, buddySettings.voice, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  // Route-based tips are silenced to prevent unprompted floating bubble spam on navigation.
  // Context-aware guidance remains available when opening MeshBuddy or asking questions.
  useEffect(() => {
    // Route tips remain unprompted; speech bubbles are only triggered by explicit actions.
  }, [pathname, workspaceMode, isDemoTab, isCustomTab, tabDisplayName]);

  // Bubble auto-hide timer: 20 seconds duration, freezes when hovered!
  useEffect(() => {
    if (!speechBubble || isBubbleHovered || isOpen) {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      return;
    }

    bubbleTimerRef.current = setTimeout(() => {
      setSpeechBubble(null);
    }, 20000); // 20s generous window to read

    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, [speechBubble, isBubbleHovered, isOpen]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("meshTab_buddy_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch { }
  }, []);

  // Save chat history to localStorage on message updates
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const toSave = messages.map(({ id, sender, text }) => ({
          id,
          sender,
          text
        }));
        localStorage.setItem("meshTab_buddy_chat_history", JSON.stringify(toSave.slice(-30)));
      } catch { }
    }
  }, [messages]);

  // Opening drawer from floating speech bubble ensures the tip is preserved in conversation!
  const handleOpenFromBubble = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tipText = speechBubble;
    setIsOpen(true);
    setSpeechBubble(null);

    if (tipText) {
      const tipMsg: ChatMessage = {
        id: `tip-${Date.now()}`,
        sender: "buddy",
        text: tipText,
        actions: [
          { label: "💡 Explain More", action: () => handleAskQuestion(`tell me more about: ${tipText}`) },
          { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
          { label: "📊 Tab Recap", action: () => handleAskQuestion("give me a recap of what is going on here") }
        ]
      };
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1]?.text === tipText) return prev;
        return [...prev, tipMsg];
      });
      speakText(tipText);
    }
  };

  // Clear conversation history
  const handleClearChat = () => {
    sounds.playPop();
    const freshWelcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      sender: "buddy",
      text: `Chat history cleared. How can I assist you with ${isDemoTab ? "the Lisbon benchmark" : isCustomTab ? tabDisplayName : "your group tabs"}?`,
      actions: [
        { label: "📊 Tab Recap", action: () => handleAskQuestion("give me a recap of what is going on here") },
        { label: "❓ How does Netting work?", action: () => handleAskQuestion("how does netting work") },
        { label: "🚰 Top Up +$500", action: handleClaimFaucet }
      ]
    };
    setMessages([freshWelcome]);
    try {
      localStorage.removeItem("meshTab_buddy_chat_history");
    } catch { }
    toast.info("Conversation history cleared");
  };

  // Initial greeting when opening chat (Adaptive to demo vs custom tab vs blank slate, preserving history)
  useEffect(() => {
    if (isOpen) {
      const contextChanged = lastContextRef.current !== currentContextKey;
      lastContextRef.current = currentContextKey;

      let welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. How can I assist you with your group tab today?`;
      let welcomeActions: { label: string; action: () => void }[] = [];

      if (isDemoTab) {
        welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. You're viewing the Lisbon '24 demo trip ($1,499.10 across 3 currencies). Ready to test netting or settlements?`;
        welcomeActions = [
          { label: "❓ How does Netting work?", action: () => handleAskQuestion("How does netting work?") },
          { label: "📸 Smart Scan Receipt", action: () => router.push("/tab/lisbon-24/expense/new") },
          { label: "🚰 Claim Bonus", action: handleClaimFaucet },
          { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace }
        ];
      } else if (isCustomTab) {
        welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. You're on your custom group tab "${tabDisplayName}". You can log shared expenses, invite friends with passkeys, or run netting once costs accumulate.`;
        welcomeActions = [
          { label: "➕ Add Expense", action: () => router.push(`/tab/${currentTabId}/expense/new`) },
          { label: "👥 Invite Members", action: () => router.push(`/tab/${currentTabId}/members`) },
          { label: "❓ How does Netting work?", action: () => handleAskQuestion("How does netting work on custom tabs?") },
          { label: "🚰 Claim Bonus", action: handleClaimFaucet }
        ];
      } else if (isCleanMode) {
        welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. You're in Clean Slate mode with a fresh workspace. Ready to create your first tab?`;
        welcomeActions = [
          { label: "➕ Create New Tab", action: () => router.push("/tab/new") },
          { label: "🚰 Claim Bonus", action: handleClaimFaucet },
          { label: "❓ How to Split Bills?", action: () => handleAskQuestion("How do I create and split a bill?") }
        ];
      } else {
        welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. You're in Sample Trip Mode. Tap Lisbon Weekend to test netting, or explore your settings.`;
        welcomeActions = [
          { label: "🏖️ Open Lisbon Demo", action: () => router.push("/tab/lisbon-24") },
          { label: "🚰 Claim Bonus", action: handleClaimFaucet },
          { label: "❓ How does Netting work?", action: () => handleAskQuestion("How does netting work?") },
          { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace }
        ];
      }

      const spokenWelcome = isDemoTab
        ? `Hey ${profile.name || "there"}, ready to explore the Lisbon tab.`
        : isCustomTab
          ? `Hey ${profile.name || "there"}, ready to check ${tabDisplayName}.`
          : isCleanMode
            ? `Hey ${profile.name || "there"}, ready to create your new tab.`
            : `Hey ${profile.name || "there"}, ready to assist you.`;

      const welcome: ChatMessage = {
        id: `msg-welcome-${Date.now()}`,
        sender: "buddy",
        text: welcomeText,
        actions: welcomeActions,
        spokenText: spokenWelcome
      };

      setMessages((prev) => {
        if (prev.length === 0) {
          speakText(welcome.text, spokenWelcome);
          return [welcome];
        }
        if (contextChanged && prev[prev.length - 1]?.text !== welcomeText) {
          speakText(welcome.text, spokenWelcome);
          return [...prev, welcome];
        }
        return prev;
      });
    }
  }, [isOpen, isDemoTab, isCustomTab, workspaceMode, profile.name, buddySettings.name, currentTabId, tabDisplayName, currentContextKey]);

  useEffect(() => {
    setCustomName(buddySettings.name);
  }, [buddySettings.name]);

  // Keyboard accessibility: Escape closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Mobile viewport: lock background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isConfiguring, isThinking]);

  async function handleClaimFaucet() {
    if (isClaiming) return;

    if (workspaceMode === "testnet") {
      const { success, error } = await claimBonus();
      if (success) {
        sounds.playCoinClink();
        fireFaucetConfetti();
        setBuddyMood("excited");
        setTimeout(() => setBuddyMood("happy"), 4000);
        
        const reply: ChatMessage = {
          id: `faucet-${Date.now()}`,
          sender: "buddy",
          text: `Done! Credited +$10,000.00 Agora AUSD to your account balance. You can use this to settle debts in the settlement drawer!`,
          spokenText: "Added 10000 Agora AUSD to your account."
        };
        setMessages((prev) => [...prev, reply]);
        speakText(reply.text, "Added 10000 Agora AUSD to your account.");
      } else {
        toast.info(error || "Bonus already claimed");
      }
      return;
    }

    setIsLocalClaiming(true);
    await new Promise((r) => setTimeout(r, 600));
    topUp(50000);
    setIsLocalClaiming(false);
    
    sounds.playCoinClink();
    fireFaucetConfetti();
    setBuddyMood("excited");
    setTimeout(() => setBuddyMood("happy"), 4000);
    toast.success("+$500.00 Bonus Added!", {
      description: "Credited to sandbox balance via MeshBuddy."
    });

    const reply: ChatMessage = {
      id: `faucet-${Date.now()}`,
      sender: "buddy",
      text: `Done! Credited +$500.00 to your sandbox account. Current balance: ${formatCurrency(virtualBalance + 50000)}. You can use this to settle debts in the settlement drawer!`,
      spokenText: "Added 500 dollars to your sandbox account."
    };
    setMessages((prev) => [...prev, reply]);
    speakText(reply.text, "Added 500 dollars to your sandbox account.");
  }

  function handleToggleWorkspace() {
    const nextMode = workspaceMode === "blank" ? "sample" : "blank";
    if (nextMode === "sample") {
      resetLisbonDemo();
    } else {
      setWorkspaceMode("blank");
    }
    sounds.playClick();
    toast.info(nextMode === "blank" ? "Switched to Clean Slate" : "Restored Lisbon Demo Trip");

    const modeSpeech = nextMode === "blank" ? "Switched to Clean Slate mode." : "Restored the Lisbon demo trip.";
    const reply: ChatMessage = {
      id: `mode-${Date.now()}`,
      sender: "buddy",
      text: nextMode === "blank"
        ? "Switched to Clean Slate! All sample tabs are hidden. You are now in the Main App fresh workspace to test creating custom groups from scratch."
        : "Restored Sample Trip! The Lisbon '24 benchmark is back with full mock data and the netting graph.",
      spokenText: modeSpeech
    };
    setMessages((prev) => [...prev, reply]);
    speakText(reply.text, modeSpeech);
  }

  function handleAskQuestion(query: string) {
    const q = query.toLowerCase().trim();
    const userName = profile.name || "friend";
    let replyText = "";
    let spokenPunchline: string | undefined = undefined;
    let actionItems: { label: string; action: () => void }[] | undefined = undefined;

    // Immediately append user message and trigger thinking animation
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // 1. Core Intent: "Tell me about this app" / What is MeshTab?
    if (
      /(tell me about (this|the) app|what is (this|the) app|what is meshtab|what is mesh tab|explain (this|the) app|explain meshtab|explain mesh tab|how does (this|the) app work|what does (this|the) app do|about (this|the) app|pitch me (this|the) app|app overview|what are we doing here|what is the purpose of (this|the) app|why meshtab|tell me about meshtab)/i.test(q)
    ) {
      spokenPunchline = "MeshTab simplifies group expenses by netting out debts so you make fewer payments.";
      replyText =
        `**MeshTab** is a modern group expense tracker and instant debt-clearing app designed for group trips, housemates, and shared events! 🚀\n\n` +
        `Here is what makes MeshTab so simple and fast:\n\n` +
        `1. 🌀 **Smart Debt Netting (Fewer Payments)**:\n` +
        `In multi-currency trips, friends end up with messy crisscrossing transfers. MeshTab calculates net positions and collapses multilateral debts into minimal direct payments (at most N-1 payments), clearing debts without unnecessary back-and-forth wires!\n\n` +
        `2. ⚡ **Instant, Simultaneous Updates**:\n` +
        `Everyone in the group can snap receipts, split dinners, and confirm payments at the exact same instant without lag, waiting, or delays.\n\n` +
        `3. 🔑 **Touch ID & Face ID Sign-In**:\n` +
        `No passwords to remember. You join tabs and approve payments with your thumbprint or Face ID in a single tap. There are zero network transfer fees.\n\n` +
        `4. 💵 **Digital Dollars (AUSD)**:\n` +
        `All tabs use 1:1 digital dollars ($1 AUSD = $1.00 USD) that never lose value. When friends pay you back, you can cash out directly to your debit card or bank account in seconds.`;

      actionItems = [
        currentTabId
          ? { label: `📊 Recap "${tabDisplayName}"`, action: () => handleAskQuestion("give me a recap of this tab") }
          : { label: "🏖️ Open Lisbon Demo Trip", action: () => router.push("/tab/lisbon-24") },
        { label: "🌀 How Netting Works", action: () => handleAskQuestion("how does netting work") },
        { label: "➕ Create New Tab", action: () => router.push("/tab/new") },
        { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
      ];
    } else if (
      // 2. Core Intent: "Give me a recap of what's going on here" / Live Screen & Tab Recap
      /(give me a recap|recap of what'?s going on|what'?s going on here|what is going on here|what is happening here|where am i|recap|status update|summary of (this|the) tab|tab recap|tab summary|screen recap|screen summary|overview of what'?s happening|give me a summary|what is this screen|what are we looking at)/i.test(q)
    ) {
      if (currentTabId) {
        const stats = getLiveTabStats(currentTabId, userName, tabDisplayName);
        const userBal = stats.userMember?.balance ?? 0;
        const creditorsList = stats.creditors.map((c) => `${c.name} (+${formatCurrency(c.balance)})`).join(", ");
        const debtorsList = stats.debtors.map((d) => `${d.name} (${formatCurrency(d.balance)})`).join(", ");

        replyText =
          `Here is the live recap for **"${tabDisplayName}"**:\n\n` +
          `📊 **Ledger Overview**:\n` +
          `• Total Volume: **${formatCurrency(stats.totalSpent)}** logged across **${stats.expenses.length}** expense${stats.expenses.length === 1 ? "" : "s"}.\n` +
          `• Members (${stats.members.length}): ${stats.members.map((m) => m.name).join(", ")}.\n\n` +
          `💰 **Debt & Balance Breakdown**:\n` +
          `• **Owed Money** (${stats.creditors.length}): ${creditorsList || "None"}\n` +
          `• **In Debt** (${stats.debtors.length}): ${debtorsList || "All members are fully settled!"}\n` +
          `• **Your Position**: ${userBal < 0
            ? `🔴 You owe **${formatCurrency(Math.abs(userBal))}** to the tab.`
            : userBal > 0
              ? `🟢 You are owed **+${formatCurrency(userBal)}**.`
              : "⚪ You are fully settled ($0.00)."
          }\n\n` +
          `🌀 **Netting State**:\n` +
          (isDemoTab
            ? `Smart Netting collapses 9 cross-border transfers down to 3 direct payments in AUSD ($391.54 net liquidity).`
            : stats.expenses.length >= 2
              ? `Smart debt netting is active and ready to calculate minimal direct settlements whenever members settle.`
              : `Only ${stats.expenses.length} expense logged so far. Add more shared expenses to form netting connections.`);

        spokenPunchline = userBal < 0
          ? `Here is your live recap for ${tabDisplayName}. You have an outstanding debt to settle.`
          : `Here is your live recap for ${tabDisplayName}. All balances and netting status are on screen.`;

        actionItems = [
          { label: "🔴 Who is in Debt?", action: () => handleAskQuestion("who is currently in debt and has not settled") },
          { label: "➕ Add Expense", action: () => router.push(`/tab/${currentTabId}/expense/new`) },
          { label: "👥 Invite Members", action: () => router.push(`/tab/${currentTabId}/members`) },
          { label: "🚰 Top Up Faucet (+$500)", action: handleClaimFaucet },
        ];
      } else if (pathname === "/home") {
        const tabs = getStoredTabs();
        const totalTabs = tabs.length;
        const totalNetBalance = tabs.reduce((sum, t) => sum + (t.balance || 0), 0);

        spokenPunchline = "Here is an overview of your active group tabs.";

        replyText =
          `Here is a recap of your **Main Hub**:\n\n` +
          `🏢 **Workspace Mode**: ${workspaceMode === "testnet" ? "Live Web3 Testnet" : workspaceMode === "blank" ? "Clean Slate (Main App)" : "Sample Trip (Demo Mode)"}\n` +
          `📁 **Active Tabs (${totalTabs})**:\n` +
          (totalTabs > 0
            ? tabs.map((t) => `• **${t.name}**: ${t.balance < 0 ? `You owe ${formatCurrency(Math.abs(t.balance))}` : t.balance > 0 ? `You are owed +${formatCurrency(t.balance)}` : "Settled ($0.00)"} (${t.memberCount} members)`).join("\n") + "\n\n"
            : "• You currently have 0 active tabs.\n\n") +
          `💵 **Net Position Across All Tabs**: ${totalNetBalance < 0
            ? `🔴 Net Debt: ${formatCurrency(Math.abs(totalNetBalance))}`
            : totalNetBalance > 0
              ? `🟢 Net Owed to You: +${formatCurrency(totalNetBalance)}`
              : "⚪ Even ($0.00)"
          }\n` +
          `💳 **Account Balance**: ${formatCurrency(virtualBalance)}`;

        actionItems = [
          totalTabs > 0 ? { label: `🏖️ Open ${tabs[0].name}`, action: () => router.push(`/tab/${tabs[0].id}`) } : { label: "➕ Create New Tab", action: () => router.push("/tab/new") },
          { label: "🚰 Claim Bonus (+$500)", action: handleClaimFaucet },
          ...(workspaceMode === "sample" ? [{ label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace }] : [])
        ];
      } else if (pathname === "/demo") {
        spokenPunchline = "You are in the demo sandbox selector.";
        replyText =
          `You are currently in the **Evaluation Sandbox**.\n\n` +
          `Here you can choose between two environments:\n` +
          `1. **Sample Trip (Lisbon '24)**: Pre-loaded with 4 friends, $1,499.10 across EUR, GBP, and USD, demonstrating a collapse of 9 transfers into 3 direct AUSD payments ($391.54 net liquidity).\n` +
          `2. **Clean Slate Mode**: Resets the workspace to a fresh blank slate with 0 tabs, allowing you to test tab creation, member invitations, and live receipt scans from scratch.`;

        actionItems = [
          { label: "🏖️ Open Lisbon Demo", action: () => router.push("/tab/lisbon-24") },
          { label: "➕ Create New Tab", action: () => router.push("/tab/new") },
          { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace },
        ];
      } else if (pathname?.includes("/expense/new")) {
        spokenPunchline = "You're on the Add Expense screen. You can snap a receipt or type costs manually.";
        replyText =
          `You are on the **Add Expense** screen for ${isCustomTab ? `"${tabDisplayName}"` : isDemoTab ? "the Lisbon Demo trip" : "your group tab"}.\n\n` +
          `You can log shared costs using three simple methods:\n` +
          `• 📸 **Smart Scan**: Take a photo or upload a receipt to automatically extract merchant, total, and line items.\n` +
          `• 🎙️ **Voice Dictate**: Tap the microphone icon to dictate expense details naturally.\n` +
          `• ⌨️ **Manual Entry**: Type the amount, description, and select who paid and how to split.`;

        actionItems = [
          { label: "Back to Tab", action: () => router.push(currentTabId ? `/tab/${currentTabId}` : isCleanMode ? "/home" : "/tab/lisbon-24") },
        ];
      } else if (pathname?.includes("/members")) {
        const stats = currentTabId ? getLiveTabStats(currentTabId, userName, tabDisplayName) : null;
        spokenPunchline = "You're on the Group Members screen. Share the invite code to add friends.";
        const rosterText = stats
          ? stats.members.map((m) => m.name).join(", ")
          : isDemoTab
            ? "Aisha, Kemi, Ben, " + userName
            : userName + " (Organizer)";
        const memberCount = stats ? stats.members.length : (isDemoTab ? 4 : 1);
        replyText =
          `You are on the **Group Members & Invitations** screen.\n\n` +
          `• Current Roster (${memberCount}): ${rosterText}\n` +
          `• Friends join instantly by scanning the QR code or tapping your invite link.\n` +
          `• They sign in with Face ID or Touch ID in seconds—no passwords or app downloads needed!`;

        actionItems = [
          { label: "Back to Tab", action: () => router.push(currentTabId ? `/tab/${currentTabId}` : isCleanMode ? "/home" : "/tab/lisbon-24") },
        ];
      } else if (pathname === "/settings") {
        spokenPunchline = "Here are your account and security settings.";
        replyText =
          `You are on your **Settings & Account** screen.\n\n` +
          `Here you can:\n` +
          `• 🏦 Link your debit card or bank account for instant cash-outs.\n` +
          `• 🔑 Manage your Touch ID / Face ID sign-in security and display settings.\n` +
          `• 🤖 Customize my Co-Pilot voice persona, name, and audio settings.\n` +
          `• 🎮 Switch workspace modes between Clean Slate and Sample Trip.`;

        actionItems = [
          { label: "Go to Hub", action: () => router.push("/home") },
          { label: "🚰 Claim Faucet (+$500)", action: handleClaimFaucet },
        ];
      } else if (pathname === "/notifications") {
        spokenPunchline = "Here are your live group notifications.";
        replyText =
          `You are on your **Notifications** activity feed.\n\n` +
          `• 🔔 **Live Activity**: Real-time alerts when friends log expenses, settle debts, or complete netting.\n` +
          `• ⚡ **Direct Access**: Tap any notification card to jump straight to the relevant group tab.\n` +
          `• 🧹 **Stay Organized**: Filter by unread, expenses, or settlements, or clear all anytime.`;

        actionItems = [
          { label: "🏠 Return to Hub", action: () => router.push("/home") },
          { label: "⚙️ Manage Settings", action: () => router.push(pathname ? `/settings?from=${encodeURIComponent(pathname)}` : "/settings") },
        ];
      } else if (pathname === "/error") {
        spokenPunchline = "You are on the recovery screen. Your tabs are safe.";
        replyText =
          `You are on the **Safe Recovery Screen**.\n\n` +
          `An unexpected screen error was intercepted, but all your group tabs and account balances are safely preserved in your browser. You can reload the route or return to the hub safely.`;

        actionItems = [
          { label: "🏠 Return to Hub", action: () => router.push("/home") },
          { label: "🎮 Open Demo Sandbox", action: () => router.push(pathname ? `/demo?from=${encodeURIComponent(pathname)}` : "/demo") },
        ];
      } else {
        spokenPunchline = "I'm monitoring your group tabs and ready to assist.";
        replyText =
          `You are currently viewing MeshTab at **${pathname || "/home"}**.\n\n` +
          `I am monitoring your local ledger. You can ask me for a tab recap, who owes money, how debt netting works, or how to cash out to your bank!`;

        actionItems = [
          { label: "💡 Tell Me About This App", action: () => handleAskQuestion("tell me about this app") },
          { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
          { label: "🚰 Top Up Faucet", action: handleClaimFaucet },
        ];
      }
    } else if (
      // 3. Core Intent: "Who is currently in debt and has not settled" / Debt & Unsettled Balances
      /(who (is|are)( currently)? in debt|who owes( money)?|who has not settled|who hasn'?t settled|who owes who|who is in debt|unsettled( debt| balance| member| people)|who needs to pay|debt breakdown|who is owed( money)?|who are the creditors|who are the debtors|list (of )?debts|show (me )?debts|show (me )?balances|unsettled debts|has everyone settled|did everyone pay)/i.test(q)
    ) {
      if (currentTabId) {
        const stats = getLiveTabStats(currentTabId, userName, tabDisplayName);

        spokenPunchline = stats.debtors.length > 0
          ? "Here are the group members with pending balances."
          : `All members in ${tabDisplayName} are fully settled up.`;

        replyText =
          `Here is the exact debt & settlement breakdown for **"${tabDisplayName}"**:\n\n` +
          `🔴 **Currently in Debt (Has Not Settled — ${stats.debtors.length})**:\n` +
          (stats.debtors.length > 0
            ? stats.debtors.map((d) => `• **${d.name}**: owes **${formatCurrency(Math.abs(d.balance))}**`).join("\n") + "\n\n"
            : "• No one is currently in debt! All members are settled.\n\n") +
          `🟢 **Owed Money (Creditors — ${stats.creditors.length})**:\n` +
          (stats.creditors.length > 0
            ? stats.creditors.map((c) => `• **${c.name}**: is owed **+${formatCurrency(c.balance)}**`).join("\n") + "\n\n"
            : "• No outstanding balances to collect.\n\n") +
          (stats.settled.length > 0
            ? `⚪ **Fully Settled ($0.00 — ${stats.settled.length})**:\n${stats.settled.map((s) => `• ${s.name}`).join(", ")}\n\n`
            : "") +
          `📌 **Total Outstanding Debt**: **${formatCurrency(stats.totalOutstandingDebt)}**\n\n` +
          `💡 **How to Settle**:\n` +
          `Any debtor can tap the green **"Settle Debts"** or **"Pay Share"** button on the tab page to transfer their share in Digital Dollars (AUSD). If testing, you can tap **Claim +$500 Faucet** below to fund your account!`;

        actionItems = [
          { label: "🚰 Claim +$500 Test AUSD", action: handleClaimFaucet },
          { label: "🌀 How Netting Minimizes This", action: () => handleAskQuestion("how does netting work") },
          { label: "➕ Add Another Expense", action: () => router.push(`/tab/${currentTabId}/expense/new`) },
        ];
      } else {
        const tabs = getStoredTabs();
        const tabsWithDebt = tabs.filter((t) => t.balance < 0);
        const tabsWithCredit = tabs.filter((t) => t.balance > 0);
        const tabsSettled = tabs.filter((t) => t.balance === 0);

        replyText =
          `Here is your debt & balance status across all active tabs:\n\n` +
          (tabs.length === 0
            ? `You are currently in Clean Slate mode with 0 tabs. No debts exist right now!\n\n`
            : `📁 **Tabs Where You Owe Money (${tabsWithDebt.length})**:\n` +
            (tabsWithDebt.length > 0
              ? tabsWithDebt.map((t) => `• **${t.name}**: you owe **${formatCurrency(Math.abs(t.balance))}**`).join("\n") + "\n\n"
              : "• None! You have no outstanding debts on any tab.\n\n") +
            `🟢 **Tabs Where You Are Owed Money (${tabsWithCredit.length})**:\n` +
            (tabsWithCredit.length > 0
              ? tabsWithCredit.map((t) => `• **${t.name}**: you are owed **+${formatCurrency(t.balance)}**`).join("\n") + "\n\n"
              : "• None.\n\n") +
            (tabsSettled.length > 0
              ? `⚪ **Settled Tabs**: ${tabsSettled.map((t) => t.name).join(", ")}\n\n`
              : "")) +
          `💡 Tap any tab below to inspect individual member balances and debts!`;

        actionItems = tabs.map((t) => ({
          label: `Open ${t.name}`,
          action: () => router.push(`/tab/${t.id}`),
        }));
        if (actionItems.length === 0) {
          actionItems = [
            { label: "➕ Create a Tab", action: () => router.push("/tab/new") },
            { label: "🏖️ Restore Lisbon Demo", action: handleToggleWorkspace },
          ];
        }
      }
    } else if (
      // 4. Core Intent: "What expenses were logged?" / Expense History Breakdown
      /(what expenses( were| have been)? logged|expense (history|breakdown|list)|recent (expenses|purchases)|who paid for what|show (me )?expenses|list expenses|what did we buy|what was bought|cost breakdown)/i.test(q)
    ) {
      if (!currentTabId && isCleanMode) {
        replyText = "You are in Clean Slate mode with no tab selected. Create or open a tab to view its expense ledger!";
        actionItems = [
          { label: "➕ Create New Tab", action: () => router.push("/tab/new") },
          { label: "🏠 Go to Hub", action: () => router.push("/home") },
        ];
      } else {
        const activeTabKey = currentTabId || (isCleanMode ? "" : "lisbon-24");
        const expenses = activeTabKey ? getStoredExpenses(activeTabKey) : [];
        const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

        replyText =
          `Here are the recorded expenses for **"${tabDisplayName}"**:\n\n` +
          (expenses.length > 0
            ? expenses.map((e) => `• **${e.desc}**: **${formatCurrency(e.amount)}** (Paid by ${e.payer}, ${e.time})`).join("\n") + "\n\n"
            : "• No expenses logged yet on this tab.\n\n") +
          `💰 **Total Tab Volume**: **${formatCurrency(total)}** across **${expenses.length}** item${expenses.length === 1 ? "" : "s"}.\n\n` +
          `Every expense is split equally among tab members unless custom splits are selected.`;

        actionItems = [
          activeTabKey
            ? { label: "➕ Add New Expense", action: () => router.push(`/tab/${activeTabKey}/expense/new`) }
            : { label: "➕ Create Tab", action: () => router.push("/tab/new") },
          { label: "🔴 Who is in Debt?", action: () => handleAskQuestion("who is currently in debt and has not settled") },
          { label: "🌀 How Netting Works", action: () => handleAskQuestion("how does netting work") },
        ];
      }
    } else if (
      /^(hi|hello|hey|sup|what's up|howdy|yo|good morning|good afternoon|good evening|hiya|hello buddy|hey buddy|hi buddy)\b/i.test(q) ||
      q === "hi" || q === "hello" || q === "hey" || q === "hello buddy" || q === "hey buddy"
    ) {
      if (isCustomTab) {
        replyText = `Hey ${userName}! 👋 Great to see you! I'm ${buddySettings.name}, your co-pilot on "${tabDisplayName}".\n\nReady to log some expenses, invite your friends with 1-click links, or run debt netting once bills roll in? What's on your mind?`;
        actionItems = [
          { label: `➕ Add Expense to ${tabDisplayName}`, action: () => router.push(`/tab/${currentTabId}/expense/new`) },
          { label: "👥 Invite Members via QR", action: () => router.push(`/tab/${currentTabId}/members`) },
          { label: "🚰 Top Up Faucet (+$500)", action: handleClaimFaucet },
        ];
      } else if (isDemoTab) {
        replyText = `Hey ${userName}! 👋 I'm ${buddySettings.name}, your financial wingman!\n\nWe're hanging out in the Lisbon '24 trip benchmark. 4 travelers, $1,499.10 across EUR, GBP, and USD, and 9 cross-border transfers collapsed into 3 direct AUSD payments. How can I help you explore?`;
        actionItems = [
          { label: "🌀 Test Smart Netting (9 → 3 Payments)", action: () => handleAskQuestion("How does netting work?") },
          { label: "📸 Test Smart Scan Receipt", action: () => router.push("/tab/lisbon-24/expense/new") },
          { label: "🚰 Claim Sandbox Faucet", action: handleClaimFaucet },
        ];
      } else if (workspaceMode === "blank") {
        replyText = `Hey ${userName}! 👋 Welcome to your clean workspace! I'm ${buddySettings.name}, your co-pilot for group expenses.\n\nYou have a blank canvas right now. Ready to create your first shared tab, snap receipts, and invite friends?`;
        actionItems = [
          { label: "➕ Create First Tab", action: () => router.push("/tab/new") },
          { label: "❓ How to Split Bills?", action: () => handleAskQuestion("how do i split a bill?") },
          { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
        ];
      } else {
        replyText = `Hey ${userName}! 👋 Always a pleasure! I'm ${buddySettings.name}—your co-pilot for group trips and split bills.\n\nWhether you need to split dinner, test instant settlements, or check how debt netting saves money, I've got your back. What would you like to do?`;
        actionItems = [
          { label: "🏖️ Open Lisbon Trip", action: () => router.push("/tab/lisbon-24") },
          { label: "🌀 How does Netting work?", action: () => handleAskQuestion("How does netting work?") },
          { label: "🚰 Faucet (+$500 AUSD)", action: handleClaimFaucet },
        ];
      }
    } else if (/who are you|what are you|what is buddy|introduce yourself|tell me about yourself|your name/i.test(q)) {
      replyText = `I'm ${buddySettings.name}! 🤖✨ Think of me as that one hyper-organized friend in the group chat who actually makes sure everyone gets paid back!\n\nI handle the math, simplify crisscrossing debts, check receipts with OCR, and make sure nobody has to deal with awkward "you owe me $14.50" conversations. Plus, I don't sleep and I never spill drinks!`;
      actionItems = [
        { label: "🌀 How Netting Works", action: () => handleAskQuestion("How does netting work?") },
        { label: "📚 Browse Knowledge Base", action: () => setDrawerTab("kb") },
      ];
    } else if (/how are you|how's it going|how are things|feeling|how you doing|what's good/i.test(q)) {
      replyText = `Running with sub-second speed, zero transfer fees, and feeling electric! ⚡ The ledger is balanced, and nobody in the group is fighting over the bill.\n\nHow is your day going, ${userName}?`;
      actionItems = [
        { label: "🚰 Top Up Faucet (+$500)", action: handleClaimFaucet },
        { label: "📚 Explore Topics", action: () => setDrawerTab("kb") },
      ];
    } else if (/joke|funny|laugh|tell me a joke/i.test(q)) {
      const jokes = [
        "Why did the restaurant bill go to therapy? Because it had unresolved circular debt loops! 🛋️ (Lucky for you, my netting math resolved it in milliseconds).",
        "What's a group traveler's favorite magic trick? Turning 9 messy multi-currency transfers into 3 simple taps!",
        "Why was everyone smiling at the end of the vacation? Because with MeshTab, no one spent their flight home doing spreadsheet math! 🏖️",
        "How do foodies split 10 pizzas? In one tap, so everyone eats while it's still hot! 🍕"
      ];
      replyText = jokes[Math.floor(Math.random() * jokes.length)];
      actionItems = [
        { label: "😂 Tell Another Joke", action: () => handleAskQuestion("tell me a joke") },
        { label: "🌀 How Netting Works", action: () => handleAskQuestion("how does netting work") },
      ];
    } else if (/thank you|thanks|thx|awesome|good job|great job|love you|you're great|appreciate it/i.test(q)) {
      setBuddyMood("excited");
      setTimeout(() => setBuddyMood("happy"), 3500);
      replyText = `Aww, shucks! You're making my aura glow! 🥰 Keeping group money drama-free is my true calling. What can we tackle next, ${userName}?`;
      actionItems = [
        { label: "🚰 Top Up Faucet", action: handleClaimFaucet },
        { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
      ];
    } else if (/what can you do|help me|commands|features|powers|guide me/i.test(q)) {
      replyText = `Here's what I can do for you and your crew:\n\n` +
        `🌀 **Smart Debt Netting**: Turn 9 multi-currency group transfers into 3 direct AUSD payments ($391.54 net liquidity).\n\n` +
        `📸 **Smart Scan OCR**: Snap receipt photos or dictate expenses with your mic.\n\n` +
        `🔑 **Face ID / Touch ID**: Confirm payments with your fingerprint or face (zero passwords needed).\n\n` +
        `🏦 **Instant Cash Out**: Withdraw settled funds directly to your debit card or bank.\n\n` +
        `🚰 **Sandbox Faucet**: Claim +$500 test funds anytime to test settlements!`;
      actionItems = [
        { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
        { label: "🚰 Top Up $500 AUSD", action: handleClaimFaucet },
      ];
    } else if (/why monad|what is monad|parallel evm|10000 tps|tps|blockchain/i.test(q)) {
      replyText = `MeshTab runs on an ultra-fast modern transaction network! 🚀 Traditional payment apps process things one-by-one and can lag or lock up during busy weekends. Our payment engine processes thousands of transactions per second with instant 400ms blocks and ~800ms consensus finality.\n\nThat means 20 people on a group trip can log drinks, split dinners, and confirm payments at the exact same instant without waiting or transfer delays!`;
      actionItems = [
        { label: "🏆 Open Pitch Presentation", action: () => router.push("/home") },
        { label: "🌀 Learn About Netting", action: () => handleAskQuestion("how does netting work") },
      ];
    } else if (/passkey|passkeys|privy|biometric|webauthn|touch id|face id/i.test(q)) {
      replyText = `MeshTab uses Touch ID and Face ID passkeys built right into your phone or laptop. You approve group expenses with your fingerprint or face in one tap—no passwords to forget, no 2FA text codes, and no account setup hassle!`;
      actionItems = [
        { label: "🔑 Test Passkey in Settings", action: () => router.push(pathname ? `/settings?from=${encodeURIComponent(pathname)}` : "/settings") },
        { label: "👥 Manage Group Members", action: () => router.push(currentTabId ? `/tab/${currentTabId}/members` : "/home") },
      ];
    } else if (/ausd|agora|currency|digital dollar|stablecoin/i.test(q)) {
      replyText = `AUSD is a digital dollar that is always worth exactly $1.00 USD, backed 1:1 by cash reserves. Your group tab balances stay steady and reliable—$50 owed is always $50. When friends settle up, you can transfer your balance straight to your debit card or bank in seconds!`;
      actionItems = [
        { label: "🚰 Claim +$500 Test AUSD", action: handleClaimFaucet },
        { label: "🏦 How to Cash Out", action: () => handleAskQuestion("how do i cash out?") },
      ];
    } else if (/offline|internet|wifi|pwa|airplane mode|install|download/i.test(q)) {
      replyText = `Yes! MeshTab automatically caches your tabs for offline use. You can log expenses while on airplane mode or deep in the mountains, and they will sync to the group ledger once you reconnect.\n\nYou can also install MeshTab directly to your phone's home screen as a PWA (Progressive Web App) for a full-screen, native app experience!`;
      actionItems = [
        { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
      ];
    } else if (
      q.includes("mode") ||
      q.includes("demo") ||
      q.includes("mock") ||
      q.includes("clean") ||
      q.includes("slate") ||
      q.includes("blank") ||
      q.includes("main app") ||
      q.includes("which mode")
    ) {
      if (isDemoTab) {
        replyText = `You are currently viewing the Lisbon '24 Demo Trip (Sample Trip Mode). 4 international members and $1,499.10 across 3 currencies are pre-loaded to evaluate Netting. If you want to test the main app with a fresh ledger, you can switch to Clean Slate!`;
        actionItems = [
          { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace },
          { label: "🎮 Open Demo Selector", action: () => router.push(pathname ? `/demo?from=${encodeURIComponent(pathname)}` : "/demo") }
        ];
      } else if (isCustomTab) {
        replyText = `You are currently in the Main App, viewing your custom group tab "${tabDisplayName}". This is an independent ledger for your group — mock data from the Lisbon demo is not mixed in here!`;
        actionItems = [
          { label: "➕ Add Expense", action: () => router.push(`/tab/${currentTabId}/expense/new`) },
          { label: "👥 Manage Members", action: () => router.push(`/tab/${currentTabId}/members`) }
        ];
      } else if (workspaceMode === "blank") {
        replyText = "You are in Clean Slate Mode. Your workspace is completely clean with zero mock tabs so you can create custom shared tabs and invite members from scratch.";
        actionItems = [
          { label: "➕ Create New Tab", action: () => router.push("/tab/new") }
        ];
      } else {
        replyText = "You are currently in Sample Trip Mode. The Lisbon '24 benchmark is loaded so anyone can explore netting and off-ramps with pre-populated data. You can switch to Clean Slate to test a fresh setup.";
        actionItems = [
          { label: "🏖️ Open Lisbon Demo", action: () => router.push("/tab/lisbon-24") },
          { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace }
        ];
      }
    } else if ((q.includes("aisha") || q.includes("lisbon") || q.includes("villa")) && isCustomTab) {
      spokenPunchline = "That is part of the Lisbon demo benchmark, separate from your custom tab.";
      replyText = `Aisha and the villa booking are part of the Lisbon '24 Demo benchmark. You are currently viewing your own custom group tab "${tabDisplayName}", which has its own independent members and expenses!`;
      actionItems = [
        { label: "➕ Add Expense to this Tab", action: () => router.push(`/tab/${currentTabId}/expense/new`) },
        { label: "👥 View Members", action: () => router.push(`/tab/${currentTabId}/members`) }
      ];
    } else if (q.includes("netting") || q.includes("tangle")) {
      spokenPunchline = "Netting eliminates circular debts across your group so nobody pays each other back and forth.";
      if (isDemoTab) {
        replyText = "Smart Netting simplifies group debts by computing each member's net position and matching debtors directly to creditors. In this Lisbon trip, it collapses 9 cross-border transfers down to 3 direct payments in AUSD ($391.54 net liquidity), without moving unnecessary money!";
        actionItems = [
          { label: "Stay on Lisbon Tab", action: () => router.push("/tab/lisbon-24") }
        ];
      } else if (isCustomTab) {
        replyText = `Smart Netting mathematically simplifies your group debts. Once members of "${tabDisplayName}" log crisscrossing expenses, tapping 'Run Netting' calculates the direct payments needed to settle the entire tab with zero-sum fairness!`;
        actionItems = [
          { label: "Add Expense to Tab", action: () => router.push(`/tab/${currentTabId}/expense/new`) }
        ];
      } else if (workspaceMode === "blank") {
        replyText = "Smart Netting cancels circular debt loops across group members. Once you create a tab and log crisscrossing expenses, our graph algorithm computes the minimal direct payments so nobody pays each other back and forth!";
        actionItems = [
          { label: "➕ Create First Tab", action: () => router.push("/tab/new") },
          { label: "📚 Netting Guide", action: () => setDrawerTab("kb") },
        ];
      } else {
        replyText = "Smart Netting simplifies group debts across members. In the Lisbon benchmark, 9 cross-border transfers collapse into just 3 direct AUSD payments, moving $391.54 in net liquidity!";
        actionItems = [
          { label: "Explore Lisbon Demo", action: () => router.push("/tab/lisbon-24") },
          { label: "🎮 View Demo Selector", action: () => router.push(pathname ? `/demo?from=${encodeURIComponent(pathname)}` : "/demo") }
        ];
      }
    } else if (q.includes("cash out") || q.includes("withdraw") || q.includes("bank") || q.includes("off-ramp") || q.includes("offramp")) {
      spokenPunchline = "You can cash out your digital dollars directly to your debit card or bank account from your tab.";
      replyText = "When friends settle up and you are owed money, your balance turns green (+). You can tap 'Cash Out to Bank' on your balance card to transfer your Digital Dollars directly to your debit card (Visa Direct) or bank account in seconds!";
      actionItems = [
        { label: "🏦 Open Bank Settings", action: () => router.push(pathname ? `/settings?from=${encodeURIComponent(pathname)}` : "/settings") },
        { label: "Go to Hub", action: () => router.push("/home") },
      ];
    } else if (q.includes("receipt") || q.includes("camera") || q.includes("ocr") || q.includes("scan")) {
      spokenPunchline = "Tap Smart Scan to photograph a receipt, and the line items will be extracted automatically.";
      replyText = "On the 'Add Expense' screen, tap 'Smart Scan' to snap a photo or upload a receipt. The smart scanner automatically extracts the merchant, line items, and total into an editable preview before you confirm!";
      actionItems = [
        { label: currentTabId ? `Open Add Expense (${tabDisplayName})` : "Go to Add Expense", action: () => router.push(currentTabId ? `/tab/${currentTabId}/expense/new` : workspaceMode === "blank" ? "/tab/new" : "/tab/lisbon-24/expense/new") }
      ];
    } else if (q.includes("member") || q.includes("invite") || q.includes("share")) {
      spokenPunchline = "Share the group QR code or link. Friends can claim seats with Face ID or Touch ID.";
      if (currentTabId) {
        replyText = `You can invite friends to join "${tabDisplayName}" by sharing the QR code or invitation link. Members join with Face ID or Touch ID in seconds without downloading an app or setting a password!`;
        actionItems = [
          { label: "Open Member Invite Screen", action: () => router.push(`/tab/${currentTabId}/members`) }
        ];
      } else {
        replyText = "Group members join tabs through simple QR codes or links. They sign in with Face ID or Touch ID in seconds without complicated passwords or forms.";
        actionItems = [
          { label: "Go to Hub", action: () => router.push("/home") }
        ];
      }
    } else if (q.includes("fee") || q.includes("privy") || q.includes("gas")) {
      spokenPunchline = "Routine group actions and settlements in MeshTab are sponsored with zero network fees.";
      replyText = "You never pay transaction fees in MeshTab! Routine group actions—logging expenses, creating tabs, and claiming seats—are 100% free and sponsored by the platform. You never have to pay transfer fees to split a bill with friends.";
      actionItems = [
        { label: "📚 Read Guides", action: () => setDrawerTab("kb") },
        { label: "🚰 Top Up Faucet", action: handleClaimFaucet },
      ];
    } else {
      // 5. Knowledge Base Search
      const kbMatches = searchKnowledgeBase(query, {
        currentTabId,
        isDemoTab,
        isCustomTab,
        workspaceMode,
        tabDisplayName
      });

      if (kbMatches.length > 0 && kbMatches[0].score >= 18) {
        const top = kbMatches[0];
        spokenPunchline = `Here is what our guide says about ${top.article.title}. Full details are on screen.`;
        replyText = `That's a great question, ${userName}! Here's how that works:\n\n${top.article.detailedContent}`;
        if (top.contextAdviceText) {
          replyText += `\n\n💡 Current Context: ${top.contextAdviceText}`;
        }

        actionItems = top.article.actions.map((act) => {
          if (act.type === "navigate") {
            let dest = act.destination || "/home";
            if (isCustomTab && dest.includes("/tab/lisbon-24/expense/new")) {
              dest = `/tab/${currentTabId}/expense/new`;
            } else if (isCustomTab && dest.includes("/tab/lisbon-24/members")) {
              dest = `/tab/${currentTabId}/members`;
            }
            return { label: act.label, action: () => router.push(dest) };
          } else if (act.type === "faucet") {
            return { label: act.label, action: handleClaimFaucet };
          } else if (act.type === "toggle-mode") {
            return { label: act.label, action: handleToggleWorkspace };
          }
          return { label: act.label, action: () => router.push(act.destination || "/home") };
        });
      } else {
        // 6. Disciplined, grounded fallback: Admit limit honestly and guide user directly
        const screenLabel = currentTabId
          ? `the "${tabDisplayName}" group tab`
          : pathname === "/home"
            ? "the Main Hub"
            : pathname === "/demo"
              ? "the Sandbox selector"
              : pathname === "/settings"
                ? "Settings & Passkeys"
                : pathname?.includes("/expense/new")
                  ? "Add Expense screen"
                  : pathname?.includes("/members")
                    ? "Group Members screen"
                    : "MeshTab";

        spokenPunchline = "I've pulled up verified actions for you on screen.";
        replyText =
          `I want to make sure I only give you accurate, verified information, ${userName}! 💡\n\n` +
          `I don't have a direct answer for "${query.slice(0, 60)}" in our local ledger or technical guides. As your MeshTab financial co-pilot, I specialize strictly in your group tabs, live expense splits, debt netting, and settlements.\n\n` +
          `You are currently on **${screenLabel}**. Here are specific, verified actions we can run together right now:`;

        actionItems = [
          currentTabId
            ? { label: `📊 Recap "${tabDisplayName}"`, action: () => handleAskQuestion("give me a recap of this tab") }
            : { label: "📊 Recap Current Screen", action: () => handleAskQuestion("give me a recap of what is going on here") },
          currentTabId
            ? { label: "🔴 Who is in Debt?", action: () => handleAskQuestion("who is currently in debt and has not settled") }
            : { label: "💡 Tell Me About This App", action: () => handleAskQuestion("tell me about this app") },
          { label: "🌀 How Netting Works", action: () => handleAskQuestion("how does netting work") },
          { label: "📚 Open Knowledge Base (20 Guides)", action: () => setDrawerTab("kb") },
          { label: "🚰 Top Up Balance", action: handleClaimFaucet },
        ];
      }
    }

    // Deliver response with natural conversational timing and voice animation
    setTimeout(() => {
      setIsThinking(false);
      
      const finalActions = actionItems?.filter(a => {
        if (workspaceMode === "testnet" || workspaceMode === "blank") {
          return !a.label.toLowerCase().includes("faucet");
        }
        return true;
      });

      const botMsg: ChatMessage = { id: `bot-${Date.now()}`, sender: "buddy", text: replyText, actions: finalActions, spokenText: spokenPunchline };
      setMessages((prev) => [...prev, botMsg]);
      speakText(replyText, spokenPunchline);
    }, 320);
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;
    const q = inputQuestion.trim();
    setInputQuestion("");
    handleAskQuestion(q);
  };

  if (!mounted || !buddySettings.enabled) return null;

  return (
    <>
      {/* Floating Living Avatar Orb (Non-intrusive bottom-right position above mobile dock) */}
      <div className="fixed bottom-24 right-5 z-40 md:bottom-8 md:right-8 flex flex-col items-end">
        {/* Subtle Idle Speech Bubble (20s reading window, pauses on hover) */}
        <AnimatePresence>
          {mounted && speechBubble && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.92 }}
              onMouseEnter={() => setIsBubbleHovered(true)}
              onMouseLeave={() => setIsBubbleHovered(false)}
              onClick={handleOpenFromBubble}
              className="mb-3 max-w-[260px] sm:max-w-sm bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl border border-indigo-200 dark:border-indigo-500/30 text-slate-800 dark:text-white p-4 rounded-3xl shadow-2xl text-xs font-medium cursor-pointer transition-all hover:border-indigo-400 select-none relative overflow-hidden group"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[12px] font-normal">{speechBubble}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpeechBubble(null);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 -mt-1 -mr-1 cursor-pointer"
                  title="Dismiss tip"
                  aria-label="Dismiss tip"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/10 text-[10.5px]">
                <span className="text-slate-400 dark:text-white/40">
                  {isBubbleHovered ? "Paused • Click to open" : "Hover to pause"}
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Open Chat <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              {/* Remaining Time Progress Bar (Pauses on Hover) */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/10 dark:bg-indigo-500/20 overflow-hidden rounded-b-3xl">
                <motion.div
                  key={speechBubble}
                  initial={{ width: "100%" }}
                  animate={{ width: isBubbleHovered ? undefined : "0%" }}
                  transition={{ duration: 20, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Living Avatar Button */}
        <button
          suppressHydrationWarning
          onClick={() => {
            if (!isOpen) {
              sounds.playPop();
              setIsRippling(true);
              setTimeout(() => setIsRippling(false), 500);
            }
            setIsOpen(!isOpen);
            setSpeechBubble(null);
          }}
          className="group relative flex items-center justify-center cursor-pointer focus:outline-none transition-transform active:scale-95 min-w-[48px] min-h-[48px]"
          title={mounted ? `${buddySettings.name} (Tab Co-Pilot)` : "Demo Buddy (Tab Co-Pilot)"}
          aria-label="Open Tab Co-Pilot"
        >
          {/* Subtle tactile tap ripple on summon */}
          <AnimatePresence>
            {isRippling && (
              <motion.span
                initial={{ scale: 0.9, opacity: 0.7 }}
                animate={{ scale: 1.45, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2 border-indigo-500/60 dark:border-indigo-400/70 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <BuddyAvatar
            size="lg"
            mood={isSpeaking ? "talking" : buddyMood !== "happy" ? buddyMood : speechBubble ? "wink" : "happy"}
            isSpeaking={isSpeaking}
          />

          {/* Quick Voice Mute/Unmute Toggle Button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (buddySettings.voice === "mute") {
                updateSettings({ voice: "warm-female" });
                toast.success("Voice unmuted (Warm Female)");
                setTimeout(() => speakText("Voice activated! Ready to guide you."), 150);
              } else {
                stopSpeech();
                setIsSpeaking(false);
                updateSettings({ voice: "mute" });
                toast.info("Voice muted");
              }
            }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 dark:bg-black border border-white/30 flex items-center justify-center text-white z-20 hover:scale-115 active:scale-95 transition-transform shadow-md cursor-pointer"
            title={buddySettings.voice === "mute" ? "Click to unmute voice" : "Click to mute voice"}
            aria-label="Toggle voice mute"
          >
            {buddySettings.voice === "mute" ? (
              <VolumeX className="w-2.5 h-2.5 text-rose-400" />
            ) : (
              <Volume2 className="w-2.5 h-2.5 text-emerald-400" />
            )}
          </div>
        </button>
      </div>

      {/* Interactive Co-Pilot Conversation Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 pointer-events-none flex justify-end">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
            />

            {/* Slide-in Window */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative w-full max-w-sm h-full bg-white dark:bg-[#101014] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col pointer-events-auto text-slate-900 dark:text-white"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <BuddyAvatar
                    size="sm"
                    mood={isThinking ? "thinking" : isSpeaking ? "talking" : buddyMood}
                    isSpeaking={isSpeaking}
                  />
                  <div>
                    <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                      <span>{buddySettings.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                        Co-Pilot
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 truncate max-w-[180px]">
                      {isDemoTab
                        ? "Demo Benchmark • Lisbon '24"
                        : isCustomTab
                          ? `Main App • ${tabDisplayName}`
                          : workspaceMode === "blank"
                            ? "Main App • Clean Slate Workspace"
                            : "Sample Trip Mode • Monad Guide"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClearChat}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    title="Clear conversation history"
                    aria-label="Clear chat history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsConfiguring(!isConfiguring)}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
                    title="Customize Buddy"
                    aria-label="Customize Buddy Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
                    title="Close"
                    aria-label="Close Co-Pilot Drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View Mode Segmented Tab Bar */}
              <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] p-1.5 gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setDrawerTab("chat");
                    setIsConfiguring(false);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${drawerTab === "chat" && !isConfiguring
                      ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-white/10 font-bold"
                      : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Co-Pilot Chat</span>
                </button>
                <button
                  onClick={() => {
                    setDrawerTab("kb");
                    setIsConfiguring(false);
                    setActiveArticle(null);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${drawerTab === "kb" && !isConfiguring
                      ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-white/10 font-bold"
                      : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Knowledge Base</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold">
                    {KB_ARTICLES.length}
                  </span>
                </button>
              </div>

              {/* Drawer Content */}
              {!isConfiguring ? (
                drawerTab === "chat" ? (
                  <>
                    {/* Mode & Context Environment Banner */}
                    <div className="px-4 py-2 border-b border-slate-200/70 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.03] flex items-center justify-between text-[11px] shrink-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isDemoTab
                            ? "bg-amber-400 animate-pulse"
                            : isCustomTab
                              ? "bg-emerald-400"
                              : workspaceMode === "blank"
                                ? "bg-blue-400"
                                : "bg-purple-400"
                          }`} />
                        <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                          {isDemoTab
                            ? "Demo Mode: Lisbon '24 Trip"
                            : isCustomTab
                              ? `Main App: ${tabDisplayName}`
                              : workspaceMode === "blank"
                                ? "Main App: Clean Slate Mode"
                                : "Sample Trip Mode"}
                        </span>
                      </div>
                      {workspaceMode === "sample" && (
                        <button
                          onClick={handleToggleWorkspace}
                          className="shrink-0 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 ml-2 cursor-pointer"
                          title="Switch to Clean Slate"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Clean Slate</span>
                        </button>
                      )}
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start items-start gap-2"
                            }`}
                        >
                          {msg.sender === "buddy" && (
                            <div className="shrink-0 mt-0.5">
                              <BuddyAvatar size="xs" mood="happy" glow={false} />
                            </div>
                          )}

                          <div className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                            <div
                              className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-line ${msg.sender === "user"
                                  ? "bg-indigo-600 text-white rounded-br-xs shadow-sm"
                                  : "bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white rounded-bl-xs shadow-sm border border-slate-200/50 dark:border-white/5"
                                }`}
                            >
                              <p>{msg.text}</p>
                            </div>

                            {/* Action Chips */}
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {msg.actions.map((act, i) => (
                                  <button
                                    key={i}
                                    onClick={act.action}
                                    className="px-2.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition-transform active:scale-95 text-left cursor-pointer"
                                  >
                                    {act.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      {/* Thinking / Typing Pulse */}
                      {isThinking && (
                        <div className="flex items-center gap-2 text-slate-400 dark:text-white/40 text-xs">
                          <BuddyAvatar size="xs" mood="thinking" glow={false} />
                          <span className="flex gap-1.5 items-center bg-slate-100 dark:bg-white/10 px-3.5 py-2.5 rounded-2xl">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                          </span>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>

                    {/* Contextual Quick Preset Buttons */}
                    <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide border-t border-slate-100 dark:border-white/5 shrink-0">
                      <button
                        onClick={() => handleAskQuestion("give me a recap of what is going on here")}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        📊 Recap
                      </button>
                      <button
                        onClick={() => handleAskQuestion("who is currently in debt and has not settled")}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        🔴 Who Owes?
                      </button>
                      <button
                        onClick={() => handleAskQuestion("tell me about this app")}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        💡 About App
                      </button>
                      {workspaceMode === "sample" && (
                        <button
                          onClick={handleClaimFaucet}
                          className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Coins className="w-3 h-3" /> Faucet (+$500)
                        </button>
                      )}
                      <button
                        onClick={() => setDrawerTab("kb")}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <BookOpen className="w-3 h-3" /> Guides ({getAllArticles(workspaceMode).length})
                      </button>
                      {isCustomTab ? (
                        <>
                          <button
                            onClick={() => router.push(`/tab/${currentTabId}/expense/new`)}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            ➕ Add Expense
                          </button>
                          <button
                            onClick={() => router.push(`/tab/${currentTabId}/members`)}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            👥 Invite
                          </button>
                          <button
                            onClick={() => handleAskQuestion("how does netting work on this tab?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            🌀 Netting
                          </button>
                        </>
                      ) : isDemoTab ? (
                        <>
                          <button
                            onClick={() => handleAskQuestion("how does netting work?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            🌀 Netting (9 → 3 Payments)
                          </button>
                          <button
                            onClick={() => router.push("/tab/lisbon-24/expense/new")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            📸 Smart Scan
                          </button>
                          <button
                            onClick={() => handleAskQuestion("how do i cash out?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            Cash Out
                          </button>
                        </>
                      ) : workspaceMode === "blank" ? (
                        <>
                          <button
                            onClick={() => router.push("/tab/new")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            ➕ New Tab
                          </button>
                          <button
                            onClick={() => handleAskQuestion("how do i split a bill?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            ❓ Split Bills
                          </button>
                          <button
                            onClick={() => handleAskQuestion("how does netting work?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            🌀 Netting
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => router.push("/tab/lisbon-24")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            🏖️ Lisbon Demo
                          </button>
                          <button
                            onClick={() => handleAskQuestion("how does netting work?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            🌀 Netting
                          </button>
                          <button
                            onClick={() => handleAskQuestion("how do i cash out?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold cursor-pointer"
                          >
                            Cash Out
                          </button>
                        </>
                      )}
                    </div>

                    {/* Message Input Form */}
                    <form onSubmit={handleSend} className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/10 flex items-center gap-2 bg-slate-50 dark:bg-white/5 shrink-0">
                      <input
                        type="text"
                        value={inputQuestion}
                        onChange={(e) => setInputQuestion(e.target.value)}
                        placeholder={`Ask ${buddySettings.name}...`}
                        className="flex-1 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 min-h-[40px]"
                      />
                      <button
                        type="submit"
                        disabled={!inputQuestion.trim()}
                        className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer shrink-0"
                        aria-label="Send question"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  /* Knowledge Base Explorer Sub-View */
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-black/20">
                    {/* KB Search input & Category filter */}
                    <div className="p-3 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] shrink-0 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={kbSearchQuery}
                          onChange={(e) => {
                            setKbSearchQuery(e.target.value);
                            setActiveArticle(null);
                          }}
                          placeholder="Search 20+ topics, netting, Monad..."
                          className="w-full pl-8 pr-7 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        {kbSearchQuery && (
                          <button
                            onClick={() => setKbSearchQuery("")}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category filter pills */}
                      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                        <button
                          onClick={() => {
                            setSelectedCategory("all");
                            setActiveArticle(null);
                          }}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${selectedCategory === "all"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200"
                            }`}
                        >
                          All ({getAllArticles(workspaceMode).length})
                        </button>
                        {getKBCategories(workspaceMode).map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setActiveArticle(null);
                            }}
                            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-colors ${selectedCategory === cat.id
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200"
                              }`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content Area: Article detail or Article list */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
                      {activeArticle ? (
                        <div className="space-y-3.5 p-1 animate-in fade-in duration-150">
                          <button
                            onClick={() => setActiveArticle(null)}
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Topics
                          </button>

                          <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3 shadow-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                                {KB_CATEGORIES.find((c) => c.id === activeArticle.categoryId)?.label}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                              {activeArticle.title}
                            </h3>
                            <p className="text-slate-600 dark:text-white/70 leading-relaxed whitespace-pre-line text-xs">
                              {activeArticle.detailedContent}
                            </p>

                            {/* Contextual Advice banner if relevant */}
                            {activeArticle.contextAdvice && (
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                                <span className="font-bold block mb-0.5">💡 Current Context Advice:</span>
                                {isDemoTab && activeArticle.contextAdvice.demo
                                  ? activeArticle.contextAdvice.demo
                                  : isCustomTab && activeArticle.contextAdvice.customTab
                                    ? activeArticle.contextAdvice.customTab
                                    : workspaceMode === "blank" && activeArticle.contextAdvice.cleanSlate
                                      ? activeArticle.contextAdvice.cleanSlate
                                      : activeArticle.summary}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="pt-2 flex flex-wrap gap-2">
                                {activeArticle.actions
                                  .filter(act => workspaceMode !== "blank" || (act.destination !== "/tab/lisbon-24" && act.destination !== "/demo" && act.type !== "toggle-mode"))
                                  .map((act, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      if (act.type === "navigate") {
                                        let dest = act.destination || "/home";
                                        if (isCustomTab && dest.includes("/tab/lisbon-24/expense/new")) {
                                          dest = `/tab/${currentTabId}/expense/new`;
                                        } else if (isCustomTab && dest.includes("/tab/lisbon-24/members")) {
                                          dest = `/tab/${currentTabId}/members`;
                                        } else if (workspaceMode === "blank" && dest.includes("/tab/lisbon-24")) {
                                          dest = currentTabId ? `/tab/${currentTabId}` : "/home";
                                        }
                                        router.push(dest);
                                        setIsOpen(false);
                                      } else if (act.type === "faucet") {
                                        handleClaimFaucet();
                                      } else if (act.type === "toggle-mode") {
                                        handleToggleWorkspace();
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                  >
                                    <span>{act.label}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                ))}
                              <button
                                onClick={() => {
                                  setDrawerTab("chat");
                                  handleAskQuestion(activeArticle.title);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-white font-semibold text-[11px] cursor-pointer"
                              >
                                💬 Ask in Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* List of Articles */
                        displayedArticles.length > 0 ? (
                          displayedArticles.map((art) => {
                            const cat = KB_CATEGORIES.find((c) => c.id === art.categoryId);
                            return (
                              <div
                                key={art.id}
                                onClick={() => setActiveArticle(art)}
                                className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 cursor-pointer transition-all hover:shadow-xs group"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{cat?.icon}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-white/40">
                                      {cat?.label}
                                    </span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-white/20 group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">
                                  {art.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-white/50 line-clamp-2 leading-relaxed">
                                  {art.summary}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-10 space-y-2">
                            <p className="text-slate-400 dark:text-white/40 font-medium">
                              No topics matching "{kbSearchQuery}"
                            </p>
                            <button
                              onClick={() => {
                                setKbSearchQuery("");
                                setSelectedCategory("all");
                              }}
                              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                            >
                              Reset filters
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              ) : (
                /* Customization Sub-View */
                <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs animate-in fade-in duration-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm">Customize Co-Pilot</h4>
                    <button
                      onClick={() => setIsConfiguring(false)}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold"
                    >
                      Done
                    </button>
                  </div>

                  {/* Name Setting */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-white/70">
                      Co-Pilot Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g. Demo Buddy"
                        className="flex-1 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs"
                      />
                      <button
                        onClick={() => updateSettings({ name: customName.trim() || "Demo Buddy" })}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Voice Selector */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-white/70">
                      Voice Persona
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "mute", label: "🔇 Muted" },
                        { id: "deep-male", label: "🎙️ Deep Male" },
                        { id: "warm-female", label: "✨ Warm Female" }
                      ].map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            if (v.id === "mute") {
                              stopSpeech();
                              setIsSpeaking(false);
                              updateSettings({ voice: "mute" });
                              toast.info("MeshBuddy voice muted");
                            } else {
                              updateSettings({ voice: v.id as VoicePersona });
                              toast.success(v.id === "deep-male" ? "Switched to Deep Male" : "Switched to Warm Female");
                              setTimeout(() => {
                                speak(
                                  v.id === "deep-male"
                                    ? "Deep Male voice activated. Ready to guide you."
                                    : "Warm Female voice activated. Ready to guide you.",
                                  v.id as VoicePersona,
                                  {
                                    onStart: () => setIsSpeaking(true),
                                    onEnd: () => setIsSpeaking(false)
                                  }
                                );
                              }, 150);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all font-medium text-[11px] ${buddySettings.voice === v.id
                              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-bold"
                              : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
                            }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-white/40 mt-1">
                      Muted by default to avoid unexpected audio during presentations.
                    </p>
                  </div>

                  {workspaceMode === "sample" && (
                    <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Workspace Mode</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                          Sample Trip (Demo Mode)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-white/50">
                        You are currently viewing the Lisbon &apos;24 trip benchmark with 4 pre-loaded members.
                      </p>
                      <button
                        onClick={handleToggleWorkspace}
                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Switch to Clean Slate</span>
                      </button>
                    </div>
                  )}

                  {/* Quick Faucet Top-up */}
                  {workspaceMode === "sample" && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">Sandbox Faucet</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(virtualBalance)}
                        </span>
                      </div>
                      <button
                        onClick={handleClaimFaucet}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                      >
                        + Top Up $500 Test AUSD
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
