"use client";

import { useState, useEffect, useRef } from "react";
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
  Bot
} from "lucide-react";
import { 
  useBuddySettings, 
  useUserProfile, 
  useWorkspaceMode, 
  useVirtualBalance,
  AVATAR_COLORS
} from "../../lib/user";
import { formatCurrency } from "../../lib/utils";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireFaucetConfetti } from "../../lib/confetti";

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

  const [isOpen, setIsOpen] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [inputQuestion, setInputQuestion] = useState("");
  const [customName, setCustomName] = useState(buddySettings.name);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sound synthesis helper
  const speakText = (text: string) => {
    if (buddySettings.voice === "mute" || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (buddySettings.voice === "deep-male") {
      utterance.pitch = 0.7;
      utterance.rate = 0.95;
    } else if (buddySettings.voice === "warm-female") {
      utterance.pitch = 1.2;
      utterance.rate = 1.0;
    }
    window.speechSynthesis.speak(utterance);
  };

  // Route-based dynamic greetings & tips
  useEffect(() => {
    let tip = "";
    if (pathname === "/home") {
      tip = workspaceMode === "blank" 
        ? "Clean Slate Active! Tap + to create your first tab, or ask me to restore the Lisbon demo."
        : "Hi! I'm your Tab Co-Pilot. Tap me to learn about Tangle Netting or claim sandbox test funds!";
    } else if (pathname?.includes("/tab/") && pathname?.includes("/expense/new")) {
      tip = "Tip: You can snap a receipt photo with your camera or dictate your expense with your mic!";
    } else if (pathname?.includes("/tab/")) {
      tip = "In this trip, Aisha paid for the villa. Tap Run Tangle Netting to cancel mutual debt loops!";
    } else if (pathname === "/settings") {
      tip = "You can customize my name, voice, or test your hardware passkey here.";
    }

    if (tip) {
      setSpeechBubble(tip);
      const timer = setTimeout(() => setSpeechBubble(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [pathname, workspaceMode]);

  // Initial greeting when opening chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome: ChatMessage = {
        id: "msg-welcome",
        sender: "buddy",
        text: `Hey ${profile.name || "there"}! I'm ${buddySettings.name}. How can I assist you with your group tab today?`,
        actions: [
          { label: "🚰 Claim +$500 Test AUSD", action: handleClaimFaucet },
          { label: "❓ How does Netting work?", action: () => handleAskQuestion("How does netting work?") },
          { label: "💸 How do I Cash Out to Bank?", action: () => handleAskQuestion("How do I cash out to bank?") },
          { label: workspaceMode === "blank" ? "🏖️ Restore Lisbon Demo" : "🧹 Switch to Blank Slate", action: handleToggleWorkspace }
        ]
      };
      setMessages([welcome]);
      speakText(welcome.text);
    }
  }, [isOpen]);

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
      text: `Done! Credited +$500.00 in Virtual AUSD to your sandbox wallet. Current balance: ${formatCurrency(virtualBalance + 50000)}. You can use this to settle debts in the settlement drawer!`
    };
    setMessages((prev) => [...prev, reply]);
    speakText(reply.text);
  }

  function handleToggleWorkspace() {
    const nextMode = workspaceMode === "blank" ? "sample" : "blank";
    setWorkspaceMode(nextMode);
    sounds.playClick();
    toast.info(nextMode === "blank" ? "Switched to Blank Slate" : "Restored Sample Trip");

    const reply: ChatMessage = {
      id: `mode-${Date.now()}`,
      sender: "buddy",
      text: nextMode === "blank"
        ? "Switched to Blank Slate! All sample tabs are hidden so you can test creating groups and logging expenses from scratch."
        : "Restored Sample Trip! Lisbon Weekend is back with full mock data and the netting graph."
    };
    setMessages((prev) => [...prev, reply]);
    speakText(reply.text);
  }

  function handleAskQuestion(query: string) {
    const q = query.toLowerCase();
    let replyText = "";
    let actionItems: { label: string; action: () => void }[] | undefined = undefined;

    if (q.includes("netting") || q.includes("tangle")) {
      replyText = "Multilateral Netting simplifies group debts by finding circular payment loops (A owes B, B owes C, C owes A) and canceling them out. In the Lisbon trip, this cuts 12 international wire transfers down to just 3 payments, saving 75% in total money moved!";
      actionItems = [
        { label: "Take me to Lisbon Tab", action: () => router.push("/tab/lisbon-24") }
      ];
    } else if (q.includes("cash out") || q.includes("withdraw") || q.includes("bank")) {
      replyText = "When your friends settle up and you are owed money, your balance turns green (+). You can tap 'Cash Out to Bank' on your balance card to transfer your Agora AUSD directly to your debit card (Visa Direct) or bank account via Dynamic off-ramp!";
    } else if (q.includes("receipt") || q.includes("camera") || q.includes("ocr")) {
      replyText = "On the 'Add Expense' screen, tap Receipt OCR to snap a photo or upload a receipt. The smart scanner extracts the items and total into an editable staging card before you sign with your passkey.";
      actionItems = [
        { label: "Open Add Expense", action: () => router.push("/tab/lisbon-24/expense/new") }
      ];
    } else if (q.includes("gas") || q.includes("fee") || q.includes("pimlico")) {
      replyText = "You never pay network gas fees in MeshTab! Routine actions like logging expenses are permanently sponsored by Pimlico Verifying Paymasters. Real settlements use an ERC-20 paymaster to deduct a sub-cent fee in AUSD.";
    } else if (q.includes("passkey") || q.includes("login") || q.includes("mera")) {
      replyText = "MeshTab uses Mera Passkeys. Instead of seed phrases or extensions, your account is bound directly to your device's TouchID, FaceID, or PIN via hardware WebAuthn (P-256).";
    } else {
      replyText = `I heard you ask: "${query}". MeshTab is designed to make group travel expenses zero-friction. You can log expenses with camera OCR, simplify mutual debts with Tangle Netting, and settle instantly in digital dollars.`;
      actionItems = [
        { label: "🚰 Top Up Faucet", action: handleClaimFaucet },
        { label: "Explore Lisbon Demo", action: () => router.push("/tab/lisbon-24") }
      ];
    }

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text: query };
    const botMsg: ChatMessage = { id: `bot-${Date.now()}`, sender: "buddy", text: replyText, actions: actionItems };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    speakText(replyText);
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
          className="group relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer focus:outline-none transition-transform active:scale-95"
          title={`${buddySettings.name} (Tab Co-Pilot)`}
          aria-label="Open Tab Co-Pilot"
        >
          {/* Ambient Glow Aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 opacity-70 blur-md group-hover:opacity-100 transition-opacity animate-pulse" />

          {/* Orb Surface */}
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-indigo-900 via-slate-900 to-black border border-white/30 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
            {/* Minimalist Luminous Eyes */}
            <div className="flex gap-1.5 items-center mb-0.5">
              <div className="w-1.5 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-ping" />
              <div className="w-1.5 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
            </div>
            {/* Living Wave Line */}
            <div className="w-5 h-0.5 bg-gradient-to-r from-emerald-400 via-indigo-300 to-purple-400 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
          </div>

          {/* Voice status indicator */}
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center text-[8px] text-white">
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                      <span>{buddySettings.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                        Co-Pilot
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-white/40">
                      Sandbox Assistant • Instant Monad Guide
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

              {/* Drawer Content */}
              {!isConfiguring ? (
                <>
                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.sender === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-indigo-600 text-white rounded-br-xs shadow-sm"
                              : "bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white rounded-bl-xs shadow-sm border border-slate-200/50 dark:border-white/5"
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>

                        {/* Action Chips */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                            {msg.actions.map((act, i) => (
                              <button
                                key={i}
                                onClick={act.action}
                                className="px-2.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition-transform active:scale-95 text-left"
                              >
                                {act.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={handleClaimFaucet}
                      className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Coins className="w-3 h-3" /> Faucet (+$500)
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
                    <button
                      onClick={() => handleAskQuestion("How does receipt OCR work?")}
                      className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-white/80 text-[10px] font-semibold"
                    >
                      Receipt OCR
                    </button>
                  </div>

                  {/* Message Input Form */}
                  <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 bg-slate-50 dark:bg-white/5">
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
                      className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </>
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
                        {workspaceMode === "blank" ? "Blank Slate" : "Sample Trip"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50">
                      {workspaceMode === "blank"
                        ? "You are testing with clean data. Tap below to reload the Lisbon demo."
                        : "You are currently viewing the Lisbon trip demo data."}
                    </p>
                    <button
                      onClick={handleToggleWorkspace}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {workspaceMode === "blank" ? "Restore Lisbon Demo" : "Switch to Blank Slate"}
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
