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
  ArrowLeft
} from "lucide-react";
import { 
  useBuddySettings, 
  useUserProfile, 
  useWorkspaceMode, 
  useVirtualBalance,
  useStoredTabs,
  AVATAR_COLORS
} from "../../lib/user";
import { formatCurrency } from "../../lib/utils";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireFaucetConfetti } from "../../lib/confetti";
import { BuddyAvatar } from "./buddy-avatar";
import {
  KB_CATEGORIES,
  KB_ARTICLES,
  searchKnowledgeBase,
  getArticlesByCategory,
  getPopularArticles,
  KBArticle,
  KBCategoryId
} from "../../lib/meshbuddy-kb";

interface ChatMessage {
  id: string;
  sender: "buddy" | "user";
  text: string;
  actions?: { label: string; action: () => void }[];
}

export function MeshBuddy() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useUserProfile();
  const { settings: buddySettings, updateSettings } = useBuddySettings();
  const { mode: workspaceMode, setMode: setWorkspaceMode } = useWorkspaceMode();
  const { balance: virtualBalance, topUp } = useVirtualBalance();
  const { tabs: storedTabs } = useStoredTabs();

  const [isOpen, setIsOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"chat" | "kb">("chat");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [inputQuestion, setInputQuestion] = useState("");
  const [customName, setCustomName] = useState(buddySettings.name);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

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
  const isDemoTab = (currentTabId === "lisbon-24" || currentTabId === "house-groceries") && workspaceMode === "sample";
  const isCustomTab = currentTabId !== null && !isDemoTab;

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
      return getArticlesByCategory(selectedCategory);
    }
    return KB_ARTICLES;
  }, [kbSearchQuery, selectedCategory, currentTabId, isDemoTab, isCustomTab, workspaceMode, tabDisplayName]);

  // Sound synthesis helper
  const speakText = (text: string) => {
    if (buddySettings.voice === "mute" || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, "").slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (buddySettings.voice === "deep-male") {
      utterance.pitch = 0.7;
      utterance.rate = 0.95;
    } else if (buddySettings.voice === "warm-female") {
      utterance.pitch = 1.2;
      utterance.rate = 1.0;
    }
    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Route-based dynamic greetings & tips (Accurately scoped to context)
  useEffect(() => {
    let tip = "";
    if (pathname === "/demo") {
      tip = "Judge Sandbox: Choose between the pre-loaded Lisbon '24 trip to evaluate netting, or start with a Clean Slate to test a fresh tab!";
    } else if (pathname === "/home") {
      tip = workspaceMode === "blank" 
        ? "Clean Slate Active (Main App): Tap + to create your first tab, or ask me to restore the Lisbon demo."
        : "Sample Trip Mode: Tap Lisbon Weekend to test netting, or tap Change Mode to test a clean slate.";
    } else if (pathname === "/tab/new") {
      tip = "Give your new group tab a name and currency. You'll be able to invite friends via passkeys right after!";
    } else if (pathname?.includes("/expense/new")) {
      tip = isDemoTab
        ? "Tip: Try Smart Scan or Voice OCR to add another expense to the Lisbon benchmark!"
        : isCustomTab
        ? `Tip: Adding an expense to "${tabDisplayName}". Snap a receipt or dictate with your mic!`
        : "Tip: You can snap a receipt photo with your camera or dictate your expense with your mic!";
    } else if (pathname?.includes("/members")) {
      tip = isDemoTab
        ? "Invite additional friends to the Lisbon trip with the QR code. They'll claim seats with biometric passkeys!"
        : isCustomTab
        ? `Invite members to "${tabDisplayName}". Anyone who scans can claim a seat via TouchID / FaceID!`
        : "Invite group members with the shareable QR code or link. Members claim seats with biometric passkeys!";
    } else if (isDemoTab) {
      tip = "In the Lisbon benchmark, Aisha paid $600 for the villa. Tap Run Tangle Netting to see 12 debts collapse into 3 payments!";
    } else if (isCustomTab) {
      tip = `This is your custom group tab "${tabDisplayName}". Tap Add Expense to log shared costs, or invite members to join!`;
    } else if (pathname === "/settings") {
      tip = "You can customize my name, voice persona, or test your hardware passkey here.";
    } else if (pathname === "/notifications") {
      tip = "Here are your group payment and settlement notifications from your Monad smart account.";
    }

    if (tip) {
      setSpeechBubble(tip);
      const timer = setTimeout(() => setSpeechBubble(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [pathname, workspaceMode, isDemoTab, isCustomTab, tabDisplayName]);

  // Initial greeting when opening chat (Adaptive to demo vs custom tab vs blank slate)
  useEffect(() => {
    if (isOpen) {
      const contextChanged = lastContextRef.current !== currentContextKey;
      if (messages.length === 0 || contextChanged) {
        lastContextRef.current = currentContextKey;

        let welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. How can I assist you with your group tab today?`;
        let welcomeActions: { label: string; action: () => void }[] = [];

        if (isDemoTab) {
          welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. You're viewing the Lisbon '24 demo trip ($1,200 spent across 4 members). Ready to run Tangle Netting or test settlements?`;
          welcomeActions = [
            { label: "❓ How does Netting work?", action: () => handleAskQuestion("How does netting work?") },
            { label: "📸 Smart Scan Receipt", action: () => router.push("/tab/lisbon-24/expense/new") },
            { label: "🚰 Claim +$500 Test AUSD", action: handleClaimFaucet },
            { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace }
          ];
        } else if (isCustomTab) {
          welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. You're on your custom group tab "${tabDisplayName}". You can log shared expenses, invite friends with passkeys, or run netting once costs accumulate.`;
          welcomeActions = [
            { label: "➕ Add Expense", action: () => router.push(`/tab/${currentTabId}/expense/new`) },
            { label: "👥 Invite Members", action: () => router.push(`/tab/${currentTabId}/members`) },
            { label: "❓ How does Netting work?", action: () => handleAskQuestion("How does netting work on custom tabs?") },
            { label: "🚰 Claim +$500 Test AUSD", action: handleClaimFaucet }
          ];
        } else if (workspaceMode === "blank") {
          welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. You're in Clean Slate mode (Main App with a fresh workspace). Ready to create your first tab?`;
          welcomeActions = [
            { label: "➕ Create New Tab", action: () => router.push("/tab/new") },
            { label: "🚰 Claim +$500 Test AUSD", action: handleClaimFaucet },
            { label: "🏖️ Restore Lisbon Demo", action: handleToggleWorkspace },
            { label: "🎮 Open Demo Sandbox", action: () => router.push("/demo") }
          ];
        } else {
          welcomeText = `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. You're in Sample Trip Mode. Tap Lisbon Weekend to test netting, or explore your settings.`;
          welcomeActions = [
            { label: "🏖️ Open Lisbon Demo", action: () => router.push("/tab/lisbon-24") },
            { label: "🚰 Claim +$500 Test AUSD", action: handleClaimFaucet },
            { label: "❓ How does Netting work?", action: () => handleAskQuestion("How does netting work?") },
            { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace }
          ];
        }

        const welcome: ChatMessage = {
          id: `msg-welcome-${Date.now()}`,
          sender: "buddy",
          text: welcomeText,
          actions: welcomeActions
        };
        setMessages([welcome]);
        speakText(welcome.text);
      }
    }
  }, [isOpen, isDemoTab, isCustomTab, workspaceMode, profile.name, buddySettings.name, currentTabId, tabDisplayName, currentContextKey]);

  useEffect(() => {
    setCustomName(buddySettings.name);
  }, [buddySettings.name]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isConfiguring]);

  // Actions
  function handleClaimFaucet() {
    topUp(50000);
    sounds.playCoinClink();
    fireFaucetConfetti();
    toast.success("+$500.00 Test AUSD Added!", {
      description: "Credited to sandbox balance via MeshBuddy."
    });

    const reply: ChatMessage = {
      id: `faucet-${Date.now()}`,
      sender: "buddy",
      text: `Done! Credited +$500.00 in Virtual AUSD to your sandbox account. Current balance: ${formatCurrency(virtualBalance + 50000)}. You can use this to settle debts in the settlement drawer!`
    };
    setMessages((prev) => [...prev, reply]);
    speakText(reply.text);
  }

  function handleToggleWorkspace() {
    const nextMode = workspaceMode === "blank" ? "sample" : "blank";
    setWorkspaceMode(nextMode);
    sounds.playClick();
    toast.info(nextMode === "blank" ? "Switched to Clean Slate" : "Restored Lisbon Demo Trip");

    const reply: ChatMessage = {
      id: `mode-${Date.now()}`,
      sender: "buddy",
      text: nextMode === "blank"
        ? "Switched to Clean Slate! All sample tabs are hidden. You are now in the Main App fresh workspace to test creating custom groups from scratch."
        : "Restored Sample Trip! The Lisbon '24 benchmark is back with full mock data and the netting graph."
    };
    setMessages((prev) => [...prev, reply]);
    speakText(reply.text);
  }

  function handleAskQuestion(query: string) {
    const q = query.toLowerCase().trim();
    const userName = profile.name || "friend";
    let replyText = "";
    let actionItems: { label: string; action: () => void }[] | undefined = undefined;

    // Immediately append user message and trigger thinking animation
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // 1. Conversational & Social Greetings
    if (
      /^(hi|hello|hey|sup|what's up|howdy|yo|good morning|good afternoon|good evening|hiya|hello buddy|hey buddy|hi buddy)\b/i.test(q) ||
      q === "hi" || q === "hello" || q === "hey" || q === "hello buddy" || q === "hey buddy"
    ) {
      if (isCustomTab) {
        replyText = `Hey ${userName}! 👋 Great to see you! I'm ${buddySettings.name}, your co-pilot on "${tabDisplayName}".\n\nReady to log some expenses, invite your friends with biometric passkeys, or run graph netting once bills start rolling in? What's on your mind?`;
        actionItems = [
          { label: `➕ Add Expense to ${tabDisplayName}`, action: () => router.push(`/tab/${currentTabId}/expense/new`) },
          { label: "👥 Invite Members via QR", action: () => router.push(`/tab/${currentTabId}/members`) },
          { label: "🚰 Top Up Faucet (+$500)", action: handleClaimFaucet },
        ];
      } else if (isDemoTab) {
        replyText = `Hey ${userName}! 👋 I'm ${buddySettings.name}, your financial wingman!\n\nWe're hanging out in the Lisbon '24 trip benchmark. 4 travelers, $1,200 in shared expenses, and 12 crisscrossing debts ready to collapse. How can I help you explore?`;
        actionItems = [
          { label: "🌀 Test Tangle Netting (75% Saved)", action: () => handleAskQuestion("How does netting work?") },
          { label: "📸 Test Smart Scan Receipt", action: () => router.push("/tab/lisbon-24/expense/new") },
          { label: "🚰 Claim Sandbox Faucet", action: handleClaimFaucet },
        ];
      } else if (workspaceMode === "blank") {
        replyText = `Hey ${userName}! 👋 Welcome to your pristine Clean Slate workspace! I'm ${buddySettings.name}, running on Monad's 10k TPS parallel EVM.\n\nYou have a blank canvas right now. Would you like to create your first group tab, or should I show you around?`;
        actionItems = [
          { label: "➕ Create First Tab", action: () => router.push("/tab/new") },
          { label: "🏖️ Restore Lisbon Demo", action: handleToggleWorkspace },
          { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
        ];
      } else {
        replyText = `Hey ${userName}! 👋 Always a pleasure! I'm ${buddySettings.name}—your high-speed co-pilot on Monad.\n\nWhether you need to split dinner, test zero-fee settlements, or check how graph netting saves money, I've got your back. What would you like to do?`;
        actionItems = [
          { label: "🏖️ Open Lisbon Trip", action: () => router.push("/tab/lisbon-24") },
          { label: "🌀 How does Netting work?", action: () => handleAskQuestion("How does netting work?") },
          { label: "🚰 Faucet (+$500 AUSD)", action: handleClaimFaucet },
        ];
      }
    } else if (/who are you|what are you|what is buddy|introduce yourself|tell me about yourself|your name/i.test(q)) {
      replyText = `I'm ${buddySettings.name}! 🤖✨ Think of me as that one hyper-organized friend in the group chat who actually makes sure everyone gets paid back—except I live inside Monad's parallel EVM!\n\nI handle the math, simplify crisscrossing debts, check receipts with OCR, and make sure nobody has to deal with awkward "you owe me $14.50" conversations. Plus, I don't sleep and I never spill drinks!`;
      actionItems = [
        { label: "🌀 How Netting Works", action: () => handleAskQuestion("How does netting work?") },
        { label: "📚 Browse Knowledge Base", action: () => setDrawerTab("kb") },
      ];
    } else if (/how are you|how's it going|how are things|feeling|how you doing|what's good/i.test(q)) {
      replyText = `Running at sub-400ms latency, zero network fees, and feeling electric! ⚡ The graph is balanced, the ledger is zero-sum, and nobody in the group is fighting over the bill.\n\nHow is your day going, ${userName}?`;
      actionItems = [
        { label: "🚰 Top Up Faucet (+$500)", action: handleClaimFaucet },
        { label: "📚 Explore Topics", action: () => setDrawerTab("kb") },
      ];
    } else if (/joke|funny|laugh|tell me a joke/i.test(q)) {
      const jokes = [
        "Why did the shared restaurant bill go to therapy? Because it had unresolved circular debt loops! 🛋️ (Lucky for you, my Tangle algorithm resolved all its trauma in 300 milliseconds).",
        "Why don't smart accounts ever get lost? Because they always follow the shortest path on the directed graph! 🧭",
        "Why was the crypto traveler smiling on vacation? Because with MeshTab, they didn't have to explain what a 'gwei' was to their roommates! 🏖️",
        "How do Monad developers order pizza? In parallel, so all 10,000 slices arrive in 0.3 seconds! 🍕"
      ];
      replyText = jokes[Math.floor(Math.random() * jokes.length)];
      actionItems = [
        { label: "😂 Tell Another Joke", action: () => handleAskQuestion("tell me a joke") },
        { label: "🌀 How Netting Works", action: () => handleAskQuestion("how does netting work") },
      ];
    } else if (/thank you|thanks|thx|awesome|good job|great job|love you|you're great|appreciate it/i.test(q)) {
      replyText = `Aww, shucks! You're making my antenna glow! 🥰 Keeping group money drama-free is my true calling. What can we tackle next, ${userName}?`;
      actionItems = [
        { label: "🚰 Top Up Faucet", action: handleClaimFaucet },
        { label: "📚 Open Knowledge Base", action: () => setDrawerTab("kb") },
      ];
    } else if (/what can you do|help me|commands|features|powers|guide me/i.test(q)) {
      replyText = `Here's what I can do for you and your crew:\n\n` +
        `🌀 **Tangle Netting**: Turn 12 crisscrossing group debts into 3 direct payments (saving ~75% in capital movement).\n\n` +
        `📸 **Smart Scan OCR**: Snap receipt photos or dictate expenses with your mic.\n\n` +
        `🔑 **Passkey Simplicity**: Sign off with Touch ID or Face ID via Mera (zero seed phrases).\n\n` +
        `🏦 **Instant Cash Out**: Withdraw settled AUSD directly to your debit card or bank.\n\n` +
        `🚰 **Sandbox Faucet**: Claim +$500 play AUSD anytime to test settlements!`;
      actionItems = [
        { label: "📚 Open Knowledge Base (19 Guides)", action: () => setDrawerTab("kb") },
        { label: "🚰 Top Up $500 AUSD", action: handleClaimFaucet },
      ];
    } else if (/why monad|what is monad|parallel evm|10000 tps|tps|blockchain/i.test(q)) {
      replyText = `Monad is the secret sauce behind MeshTab! 🚀 Traditional blockchains process transactions one-by-one like a single cashier at a packed grocery store. Monad executes 10,000 TPS in parallel with 0.3s block times.\n\nThat means 20 people on a trip can log drinks, tap settlements, and scan receipts at the exact same instant without lag or fee spikes!`;
      actionItems = [
        { label: "🏆 Open Pitch Presentation", action: () => router.push("/home") },
        { label: "🌀 Learn About Netting", action: () => handleAskQuestion("how does netting work") },
      ];
    } else if (/passkey|passkeys|mera|biometric|webauthn|touch id|face id/i.test(q)) {
      replyText = `MeshTab uses Mera Passkeys backed by your device's Secure Enclave (P-256 WebAuthn). You sign group transactions with your thumbprint or Face ID just like Apple Pay—no browser extensions, no seed phrases written on napkins, and no crypto friction!`;
      actionItems = [
        { label: "🔑 Test Passkey in Settings", action: () => router.push("/settings") },
        { label: "👥 Manage Group Members", action: () => router.push(currentTabId ? `/tab/${currentTabId}/members` : "/home") },
      ];
    } else if (/ausd|agora|currency|digital dollar|stablecoin/i.test(q)) {
      replyText = `AUSD is the institutional digital dollar issued by Agora, backed 1:1 by ultra-safe cash and overnight US Treasury repos. That means $1 AUSD is always exactly $1.00 USD. Your group tab never fluctuates in price while you're eating dinner!`;
      actionItems = [
        { label: "🚰 Claim +$500 Test AUSD", action: handleClaimFaucet },
        { label: "🏦 How to Cash Out", action: () => handleAskQuestion("how do i cash out?") },
      ];
    } else if (
      q.includes("mode") || 
      q.includes("demo") || 
      q.includes("mock") || 
      q.includes("clean") || 
      q.includes("slate") || 
      q.includes("blank") || 
      q.includes("main app") || 
      q.includes("where am i") ||
      q.includes("which mode")
    ) {
      if (isDemoTab) {
        replyText = `You are currently viewing the Lisbon '24 Demo Trip (Sample Trip Mode). 4 international members and $1,200 in mock expenses are pre-loaded to evaluate Monad Tangle Netting. If you want to test the main app with a fresh ledger, you can switch to Clean Slate!`;
        actionItems = [
          { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace },
          { label: "🎮 Open Demo Selector", action: () => router.push("/demo") }
        ];
      } else if (isCustomTab) {
        replyText = `You are currently in the Main App, viewing your custom group tab "${tabDisplayName}". This is an independent ledger for your group — mock data from the Lisbon demo is not mixed in here!`;
        actionItems = [
          { label: "➕ Add Expense", action: () => router.push(`/tab/${currentTabId}/expense/new`) },
          { label: "👥 Manage Members", action: () => router.push(`/tab/${currentTabId}/members`) }
        ];
      } else if (workspaceMode === "blank") {
        replyText = "You are currently in the Main App using Clean Slate Mode (Fresh Workspace). All sample mock tabs are cleared so you can test creating custom tabs and inviting members from scratch. You can restore the Lisbon demo anytime!";
        actionItems = [
          { label: "➕ Create New Tab", action: () => router.push("/tab/new") },
          { label: "🏖️ Restore Lisbon Demo", action: handleToggleWorkspace }
        ];
      } else {
        replyText = "You are currently in Sample Trip Mode. The Lisbon '24 benchmark is loaded so judges can evaluate netting and off-ramps with pre-populated data. You can switch to Clean Slate to test a fresh setup.";
        actionItems = [
          { label: "🏖️ Open Lisbon Demo", action: () => router.push("/tab/lisbon-24") },
          { label: "🧹 Switch to Clean Slate", action: handleToggleWorkspace }
        ];
      }
    } else if ((q.includes("aisha") || q.includes("lisbon") || q.includes("villa")) && isCustomTab) {
      replyText = `Aisha and the villa booking are part of the Lisbon '24 Demo benchmark. You are currently viewing your own custom group tab "${tabDisplayName}", which has its own independent members and expenses!`;
      actionItems = [
        { label: "➕ Add Expense to this Tab", action: () => router.push(`/tab/${currentTabId}/expense/new`) },
        { label: "Explore Lisbon Demo Trip", action: () => router.push("/tab/lisbon-24") }
      ];
    } else if (q.includes("netting") || q.includes("tangle")) {
      if (isDemoTab) {
        replyText = "Multilateral Netting simplifies group debts by finding circular payment loops (A owes B, B owes C, C owes A) and canceling them out. In this Lisbon trip, it cuts 12 crisscrossing international transfers down to 3 direct payments pointing to Aisha, clearing $900 (75%) without moving capital!";
        actionItems = [
          { label: "Stay on Lisbon Tab", action: () => router.push("/tab/lisbon-24") }
        ];
      } else if (isCustomTab) {
        replyText = `Multilateral Netting mathematically simplifies your group debts. Once members of "${tabDisplayName}" log crisscrossing expenses, tapping 'Run Tangle Netting' calculates the minimum direct payments needed to settle the entire tab with zero-sum conservation!`;
        actionItems = [
          { label: "Add Expense to Tab", action: () => router.push(`/tab/${currentTabId}/expense/new`) }
        ];
      } else {
        replyText = "Multilateral Netting cancels circular debt loops across group members. In the Lisbon benchmark, 12 international wire transfers collapse into just 3 direct payments, saving 75% in total capital movement!";
        actionItems = [
          { label: "Explore Lisbon Demo", action: () => router.push("/tab/lisbon-24") },
          { label: "🎮 View Demo Selector", action: () => router.push("/demo") }
        ];
      }
    } else if (q.includes("cash out") || q.includes("withdraw") || q.includes("bank")) {
      replyText = "When group members settle up and you are owed money, your balance turns green (+). You can tap 'Cash Out to Bank' on your balance card to transfer your Agora AUSD directly to your debit card (Visa Direct) or bank account via the Dynamic off-ramp drawer!";
      actionItems = [
        { label: "🏦 Open Bank Settings", action: () => router.push("/settings") },
        { label: "Go to Hub", action: () => router.push("/home") },
      ];
    } else if (q.includes("receipt") || q.includes("camera") || q.includes("ocr") || q.includes("scan")) {
      replyText = "On the 'Add Expense' screen, tap 'Smart Scan' to snap a photo or upload a receipt. The smart scanner extracts the merchant, line items, and total into an editable staging proposal before you confirm!";
      actionItems = [
        { label: currentTabId ? `Open Add Expense (${tabDisplayName})` : "Go to Add Expense", action: () => router.push(currentTabId ? `/tab/${currentTabId}/expense/new` : "/tab/lisbon-24/expense/new") }
      ];
    } else if (q.includes("member") || q.includes("invite") || q.includes("share")) {
      if (currentTabId) {
        replyText = `You can invite friends to join "${tabDisplayName}" by sharing the QR code or invitation link. Members claim their seat biometrically using TouchID, FaceID, or PIN via Mera passkeys on Monad!`;
        actionItems = [
          { label: "Open Member Invite Screen", action: () => router.push(`/tab/${currentTabId}/members`) }
        ];
      } else {
        replyText = "Group members join tabs via shareable QR codes or links. They claim seats using hardware WebAuthn passkeys (TouchID / FaceID) on Monad without seed phrases or gas fees.";
        actionItems = [
          { label: "Go to Hub", action: () => router.push("/home") }
        ];
      }
    } else if (q.includes("fee") || q.includes("pimlico") || q.includes("gas")) {
      replyText = "You never pay network gas fees in MeshTab! Routine ledger operations (logging expenses, creating tabs, claiming seats) are permanently sponsored by Pimlico Verifying Paymasters. Settlements use an ERC-20 paymaster to deduct a sub-cent fee in AUSD.";
      actionItems = [
        { label: "📚 Read Paymaster Guide", action: () => setDrawerTab("kb") },
        { label: "🚰 Top Up Faucet", action: handleClaimFaucet },
      ];
    } else {
      // 2. Knowledge Base Search
      const kbMatches = searchKnowledgeBase(query, {
        currentTabId,
        isDemoTab,
        isCustomTab,
        workspaceMode,
        tabDisplayName
      });

      if (kbMatches.length > 0 && kbMatches[0].score >= 18) {
        const top = kbMatches[0];
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
        // Conversational Fallback with personality (Never cold "I heard you ask:")
        replyText = `I love your curiosity, ${userName}! 💡 While my neural circuits are tuned for group expense sharing, Monad parallel execution, and passkey settlements, here are a few things we can do together right now:`;
        actionItems = [
          { label: "📚 Search Knowledge Base (19 Guides)", action: () => setDrawerTab("kb") },
          { label: "🚰 Top Up +$500 Faucet", action: handleClaimFaucet },
          { label: "🌀 How Netting Works", action: () => handleAskQuestion("how does netting work") },
          isCustomTab
            ? { label: `➕ Add Expense to ${tabDisplayName}`, action: () => router.push(`/tab/${currentTabId}/expense/new`) }
            : workspaceMode === "blank" 
            ? { label: "➕ Create Tab", action: () => router.push("/tab/new") }
            : { label: "Explore Lisbon Demo", action: () => router.push("/tab/lisbon-24") }
        ];
      }
    }

    // Deliver response with natural conversational timing and voice animation
    setTimeout(() => {
      setIsThinking(false);
      const botMsg: ChatMessage = { id: `bot-${Date.now()}`, sender: "buddy", text: replyText, actions: actionItems };
      setMessages((prev) => [...prev, botMsg]);
      speakText(replyText);
    }, 320);
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;
    const q = inputQuestion.trim();
    setInputQuestion("");
    handleAskQuestion(q);
  };

  if (!buddySettings.enabled) return null;

  return (
    <>
      {/* Floating Living Avatar Orb (Non-intrusive bottom-right position above mobile dock) */}
      <div className="fixed bottom-24 right-5 z-40 md:bottom-8 md:right-8 flex flex-col items-end">
        {/* Subtle Idle Speech Bubble */}
        <AnimatePresence>
          {speechBubble && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              onClick={() => {
                setIsOpen(true);
                setSpeechBubble(null);
              }}
              className="mb-3 max-w-[220px] sm:max-w-xs bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl border border-indigo-200 dark:border-indigo-500/30 text-slate-800 dark:text-white p-3.5 rounded-2xl shadow-xl text-xs font-medium cursor-pointer transition-all hover:scale-105 select-none"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-snug">{speechBubble}</p>
              </div>
              <div className="mt-1.5 flex justify-end">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                  Chat with {buddySettings.name} <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Living Avatar Button */}
        <button
          onClick={() => {
            if (!isOpen) sounds.playPop();
            setIsOpen(!isOpen);
            setSpeechBubble(null);
          }}
          className="group relative flex items-center justify-center cursor-pointer focus:outline-none transition-transform active:scale-95"
          title={`${buddySettings.name} (Tab Co-Pilot)`}
          aria-label="Open Tab Co-Pilot"
        >
          <BuddyAvatar
            size="lg"
            mood={speechBubble ? "wink" : isSpeaking ? "talking" : "happy"}
            isSpeaking={isSpeaking}
          />

          {/* Voice status indicator */}
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center text-[8px] text-white z-20">
            {buddySettings.voice === "mute" ? <VolumeX className="w-2.5 h-2.5 text-slate-400" /> : <Volume2 className="w-2.5 h-2.5 text-emerald-400" />}
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
                    mood={isThinking ? "thinking" : isSpeaking ? "talking" : "happy"}
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
                    onClick={() => setIsConfiguring(!isConfiguring)}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
                    title="Customize Buddy"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 transition-colors"
                    title="Close"
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
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    drawerTab === "chat" && !isConfiguring
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
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    drawerTab === "kb" && !isConfiguring
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
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          isDemoTab 
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
                      <button
                        onClick={handleToggleWorkspace}
                        className="shrink-0 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 ml-2"
                        title={workspaceMode === "blank" ? "Restore Lisbon Demo" : "Switch to Clean Slate"}
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>{workspaceMode === "blank" ? "Restore Demo" : "Clean Slate"}</span>
                      </button>
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.sender === "user" ? "justify-end" : "justify-start items-start gap-2"
                          }`}
                        >
                          {msg.sender === "buddy" && (
                            <div className="shrink-0 mt-0.5">
                              <BuddyAvatar size="xs" mood="happy" showAntenna={false} glow={false} />
                            </div>
                          )}

                          <div className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                            <div
                              className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-line ${
                                msg.sender === "user"
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
                        </div>
                      ))}

                      {/* Thinking / Typing Pulse */}
                      {isThinking && (
                        <div className="flex items-center gap-2 text-slate-400 dark:text-white/40 text-xs">
                          <BuddyAvatar size="xs" mood="thinking" showAntenna={false} glow={false} />
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
                        onClick={handleClaimFaucet}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1"
                      >
                        <Coins className="w-3 h-3" /> Faucet (+$500)
                      </button>
                      <button
                        onClick={() => setDrawerTab("kb")}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" /> Browse Topics ({KB_ARTICLES.length})
                      </button>
                      {isCustomTab ? (
                        <>
                          <button
                            onClick={() => router.push(`/tab/${currentTabId}/expense/new`)}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold flex items-center gap-1"
                          >
                            ➕ Add Expense
                          </button>
                          <button
                            onClick={() => router.push(`/tab/${currentTabId}/members`)}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold flex items-center gap-1"
                          >
                            👥 Invite
                          </button>
                          <button
                            onClick={() => handleAskQuestion("How does netting work on this tab?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            Netting
                          </button>
                        </>
                      ) : isDemoTab ? (
                        <>
                          <button
                            onClick={() => handleAskQuestion("How does netting work?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            🌀 Netting (75% Saved)
                          </button>
                          <button
                            onClick={() => router.push("/tab/lisbon-24/expense/new")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            📸 Smart Scan
                          </button>
                          <button
                            onClick={() => handleAskQuestion("How do I cash out?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            Cash Out
                          </button>
                        </>
                      ) : workspaceMode === "blank" ? (
                        <>
                          <button
                            onClick={() => router.push("/tab/new")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold flex items-center gap-1"
                          >
                            ➕ New Tab
                          </button>
                          <button
                            onClick={handleToggleWorkspace}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            🏖️ Restore Demo
                          </button>
                          <button
                            onClick={() => router.push("/demo")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            🎮 Sandbox
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => router.push("/tab/lisbon-24")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            🏖️ Lisbon Demo
                          </button>
                          <button
                            onClick={() => handleAskQuestion("How does netting work?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            Netting
                          </button>
                          <button
                            onClick={() => handleAskQuestion("How do I cash out?")}
                            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                          >
                            Cash Out
                          </button>
                        </>
                      )}
                    </div>

                    {/* Message Input Form */}
                    <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 bg-slate-50 dark:bg-white/5 shrink-0">
                      <input
                        type="text"
                        value={inputQuestion}
                        onChange={(e) => setInputQuestion(e.target.value)}
                        placeholder={`Ask ${buddySettings.name}...`}
                        className="flex-1 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!inputQuestion.trim()}
                        className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
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
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                            selectedCategory === "all"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200"
                          }`}
                        >
                          All ({KB_ARTICLES.length})
                        </button>
                        {KB_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setActiveArticle(null);
                            }}
                            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                              selectedCategory === cat.id
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
                              {activeArticle.actions.map((act, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    if (act.type === "navigate") {
                                      let dest = act.destination || "/home";
                                      if (isCustomTab && dest.includes("/tab/lisbon-24/expense/new")) {
                                        dest = `/tab/${currentTabId}/expense/new`;
                                      } else if (isCustomTab && dest.includes("/tab/lisbon-24/members")) {
                                        dest = `/tab/${currentTabId}/members`;
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
                            updateSettings({ voice: v.id as "mute" | "deep-male" | "warm-female" });
                            if (v.id !== "mute") {
                              setTimeout(() => speakText("Voice activated! Ready to guide you."), 200);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all font-medium text-[11px] ${
                            buddySettings.voice === v.id
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

                  {/* Workspace Sandbox Mode Shortcut */}
                  <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Workspace Mode</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                        {workspaceMode === "blank" ? "Clean Slate (Main App)" : "Sample Trip (Demo Mode)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50">
                      {workspaceMode === "blank"
                        ? "You are in the Main App with clean data. All sample tabs are hidden. Tap below to reload the Lisbon demo."
                        : "You are currently viewing the Lisbon '24 trip benchmark with 4 pre-loaded members."}
                    </p>
                    <button
                      onClick={handleToggleWorkspace}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {workspaceMode === "blank" ? "Restore Lisbon Demo" : "Switch to Clean Slate"}
                    </button>
                  </div>

                  {/* Quick Faucet Top-up */}
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
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
