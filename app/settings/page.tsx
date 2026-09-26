"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Settings2, 
  Key, 
  Copy, 
  Check, 
  Palette, 
  Smartphone, 
  Sparkles, 
  Bot, 
  Coins, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Plus, 
  Play,
  Sun,
  Moon,
  Laptop
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { ThemeToggle } from "../../components/theme-toggle";
import { 
  useUserProfile, 
  saveStoredUser, 
  AVATAR_COLORS, 
  useDeveloperMode,
  useBuddySettings,
  useVirtualBalance,
  useWorkspaceMode
} from "../../lib/user";
import { MeshBuddy } from "../../components/ui/mesh-buddy";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { fireFaucetConfetti } from "../../lib/confetti";
import { AnimatedCounter } from "../../components/ui/animated-counter";
import { speak, stopSpeech, VoicePersona } from "../../lib/voice";
import { GlobalNav } from "../../components/ui/global-nav";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from");

  const profile = useUserProfile();
  const { showAddress: showAddressOnDashboard, toggleAddress } = useDeveloperMode();
  const { settings: buddySettings, updateSettings: updateBuddySettings } = useBuddySettings();
  const { balance: virtualBalance, topUp: topUpFaucet } = useVirtualBalance();
  const { mode: workspaceMode, setMode: setWorkspaceMode } = useWorkspaceMode();

  const handleBack = () => {
    sounds.playClick();
    if (fromUrl && fromUrl.startsWith("/")) {
      router.push(fromUrl);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const [activeTab, setActiveTab] = useState<"profile" | "copilot" | "advanced">("profile");
  
  const handleTabChange = (tab: "profile" | "copilot" | "advanced") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [copied, setCopied] = useState(false);
  const [displayName, setDisplayName] = useState(profile.name);
  const [avatarColorIndex, setAvatarColorIndex] = useState(profile.avatarColorIndex);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isManagingPasskey, setIsManagingPasskey] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState<string | null>(null);

  // MeshBuddy local form state
  const [buddyNameInput, setBuddyNameInput] = useState(buddySettings.name);
  const [faucetClaimStatus, setFaucetClaimStatus] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const saved = (localStorage.getItem("theme") as "light" | "dark" | "system") || "system";
      setThemeMode(saved);
    };
    syncTheme();
    window.addEventListener("theme-change", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("theme-change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const handleSelectTheme = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    localStorage.setItem("theme", mode);
    
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    
    sounds.playClick();
    window.dispatchEvent(new Event("theme-change"));
    toast.success("Theme Updated", {
      description: mode === "system" ? "Set to Automatic System Mode (reacts to device OS)." : mode === "dark" ? "Set to Sleek Dark Mode." : "Set to Clean Apple White Light Mode."
    });
  };

  useEffect(() => {
    setDisplayName(profile.name);
    setAvatarColorIndex(profile.avatarColorIndex);
  }, [profile.name, profile.avatarColorIndex]);

  useEffect(() => {
    setBuddyNameInput(buddySettings.name);
  }, [buddySettings.name]);

  const fullAddress = "0x7F5c0919245151522A1Bc65261dE3b1111923b9A";

  const copyAddress = () => {
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    toast.success("Monad Address Copied", { description: "0x7F5c...3b9A copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveChanges = () => {
    saveStoredUser(displayName, avatarColorIndex);
    sounds.playSuccessChime();
    toast.success("Profile Updated", { description: "Changes synced across all shared groups." });
  };

  const handleChangeAvatar = () => {
    const nextIdx = (avatarColorIndex + 1) % AVATAR_COLORS.length;
    setAvatarColorIndex(nextIdx);
    saveStoredUser(displayName, nextIdx);
    sounds.playClick();
  };

  const handleSaveBuddyName = () => {
    const trimmed = buddyNameInput.trim() || "Demo Buddy";
    updateBuddySettings({ name: trimmed });
    sounds.playSuccessChime();
    toast.success("Co-Pilot Preferences Saved", { description: `Name set to "${trimmed}".` });
  };

  const handleResetBuddyName = (type: "demo" | "profile") => {
    const nextName = type === "demo" ? "Demo Buddy" : `${profile.name}'s Buddy`;
    setBuddyNameInput(nextName);
    updateBuddySettings({ name: nextName });
    sounds.playClick();
    toast.info("Name Reset", { description: `Co-Pilot named "${nextName}".` });
  };

  const handleTestVoice = (voiceType: VoicePersona) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (voiceType === "mute") {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    speak(
      voiceType === "deep-male"
        ? "Deep Male voice activated. Ready to guide your settlements."
        : "Warm Female voice activated. Ready to guide your settlements.",
      voiceType,
      {
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false)
      }
    );
  };

  const handleClaimFaucet = () => {
    topUpFaucet(50000);
    sounds.playCoinClink();
    fireFaucetConfetti();
    toast.success("+$500.00 Test AUSD Claimed!", { description: "Added to your Monad sandbox balance." });
  };

  const handleManagePasskey = () => {
    setIsManagingPasskey(true);
    setPasskeyNotice("Scanning device Passkeys via WebAuthn...");
    setTimeout(() => {
      setPasskeyNotice("Passkey Verified: iPhone 15 Pro (Hardware P-256 Enclave active)");
      setTimeout(() => {
        setIsManagingPasskey(false);
        setPasskeyNotice(null);
      }, 3500);
    }, 1200);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Loading Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300">
      <GlobalNav />
      <div className="sticky top-16 z-30 bg-[#f5f5f7]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 w-full">
        <header className="px-6 md:px-12 py-3 md:py-4 max-w-[1600px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80 cursor-pointer shrink-0"
              title={fromUrl?.startsWith("/tab") ? "Back to Tab" : "Back to Hub"}
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">Settings</h1>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-0.5 truncate max-w-xs sm:max-w-md md:max-w-xl">Manage your profile, Tab Co-Pilot, and sandbox preferences</p>
            </div>
          </div>
        </header>
      </div>

      <main className="px-6 md:px-12 max-w-[1600px] mx-auto w-full py-8 flex flex-col md:flex-row gap-8 lg:gap-12">
        
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 lg:w-72 shrink-0">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-2.5 shadow-sm space-y-1.5 h-fit sticky top-36">
            <button 
              onClick={() => handleTabChange("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-semibold text-left ${
                activeTab === "profile" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                  : "text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <User className="w-4 h-4 shrink-0" /> Profile & Theme
            </button>
            <button 
              onClick={() => handleTabChange("copilot")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-semibold text-left ${
                activeTab === "copilot" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                  : "text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Bot className="w-4 h-4 shrink-0" /> Tab Co-Pilot & Faucet
            </button>
            <button 
              onClick={() => handleTabChange("advanced")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-semibold text-left ${
                activeTab === "advanced" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                  : "text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Key className="w-4 h-4 shrink-0" /> Web3 Security
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-8 min-w-0">
          
          {/* PROFILE & THEME TAB */}
          {activeTab === "profile" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {saveStatus && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Personal Info */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <User className="w-5 h-5 text-slate-400 dark:text-white/50" /> Personal Info
                </h2>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className={`w-20 h-20 ${AVATAR_COLORS[avatarColorIndex]} text-white rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-[#0a0a0a] shadow-lg transition-colors`}>
                    {displayName[0]?.toUpperCase() || "D"}
                  </div>
                  <div>
                    <Button onClick={handleChangeAvatar} variant="secondary" size="sm" className="gap-2">
                      <Palette className="w-4 h-4" /> Change Color
                    </Button>
                    <p className="text-xs text-slate-400 dark:text-white/40 mt-2">Click to cycle through palette avatars</p>
                  </div>
                </div>
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveChanges();
                  }}
                  className="space-y-4 max-w-lg"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-white/70">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={handleSaveChanges}
                      placeholder="Your name"
                      className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-medium" 
                    />
                  </div>
                  <Button type="submit" variant="primary" className="mt-2">
                    Save Changes
                  </Button>
                </form>
              </div>

              {/* Appearance / Theme preference */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Interface Theme</h2>
                      <p className="text-xs text-slate-500 dark:text-white/50">MeshTab dynamically adapts between Clean Apple White and Sleek Dark.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-white/80">Active Mode</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-white/70">
                      {themeMode === "system" ? "System Auto" : themeMode === "dark" ? "Sleek Dark" : "Apple White Light"}
                    </span>
                  </div>

                  {/* 3-way Segmented Control */}
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-200/60 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => handleSelectTheme("light")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                        themeMode === "light"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Light</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTheme("dark")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                        themeMode === "dark"
                          ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      <span>Dark</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTheme("system")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                        themeMode === "system"
                          ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Laptop className="w-4 h-4 text-emerald-500" />
                      <span>Auto (System)</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40">
                    Auto mode monitors your device&apos;s OS settings in real time and automatically transitions between Apple White and Sleek Dark.
                  </p>
                </div>
              </div>

              {/* Security Card */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Shield className="w-5 h-5 text-slate-400 dark:text-white/50" /> Device Authentication
                </h2>
                <div className="p-4 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                        <Smartphone className="w-4 h-4 text-indigo-500" /> Passkey Hardware Key
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-1">1 active hardware passkey (Apple Secure Enclave P-256)</p>
                    </div>
                    <Button 
                      onClick={handleManagePasskey} 
                      variant="secondary" 
                      size="sm"
                      isLoading={isManagingPasskey}
                    >
                      Verify Passkey
                    </Button>
                  </div>
                  {passkeyNotice && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 animate-in fade-in">
                      {passkeyNotice}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB CO-PILOT & SANDBOX TAB */}
          {activeTab === "copilot" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {saveStatus && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Tab Co-Pilot Customization */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">MeshBuddy Tab Co-Pilot</h2>
                      <p className="text-xs text-slate-500 dark:text-white/50">Personal interactive guide for tab navigation and settlements</p>
                    </div>
                  </div>

                  {/* Enable / Disable Switch */}
                  <button
                    onClick={() => updateBuddySettings({ enabled: !buddySettings.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      buddySettings.enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-white/10"
                    }`}
                    aria-label="Toggle Tab Co-Pilot"
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      buddySettings.enabled ? "translate-x-7" : "translate-x-1"
                    }`} />
                  </button>
                </div>

                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5">
                  {/* Name Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-white/70">Co-Pilot Name</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={buddyNameInput}
                        onChange={(e) => setBuddyNameInput(e.target.value)}
                        onBlur={handleSaveBuddyName}
                        placeholder="Demo Buddy"
                        className="flex-1 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium text-sm" 
                      />
                      <Button onClick={handleSaveBuddyName} variant="secondary" size="sm" className="h-11">
                        Save
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button 
                        type="button" 
                        onClick={() => handleResetBuddyName("demo")}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset to &quot;Demo Buddy&quot;
                      </button>
                      <span className="text-xs text-slate-300 dark:text-white/20">•</span>
                      <button 
                        type="button" 
                        onClick={() => handleResetBuddyName("profile")}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Use &quot;{profile.name}&apos;s Buddy&quot;
                      </button>
                    </div>
                  </div>

                  {/* Voice Persona Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700 dark:text-white/70">Voice Persona</label>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60">
                        Default: Muted
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          updateBuddySettings({ voice: "mute" });
                          handleTestVoice("mute");
                          toast.info("Co-Pilot Voice Muted", { description: "Silent text-only assistance enabled." });
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                          buddySettings.voice === "mute"
                            ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold"
                            : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-700 dark:text-white/70 hover:border-slate-300 dark:hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <VolumeX className="w-4 h-4 text-slate-400" />
                          {buddySettings.voice === "mute" && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <div className="text-sm">Silent Text Only</div>
                        <div className="text-[11px] text-slate-500 dark:text-white/40 font-normal">Muted by default for hackathons</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateBuddySettings({ voice: "deep-male" });
                          handleTestVoice("deep-male");
                          toast.success("Switched to Deep Tech Male", { description: "Speaking in calm, authoritative advisor tone." });
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                          buddySettings.voice === "deep-male"
                            ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold"
                            : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-700 dark:text-white/70 hover:border-slate-300 dark:hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Volume2 className="w-4 h-4 text-indigo-500" />
                          {buddySettings.voice === "deep-male" && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <div className="text-sm flex items-center justify-between">
                          <span>Deep Tech Male</span>
                          <Play className="w-3 h-3 text-indigo-400" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-white/40 font-normal">Calm, authoritative advisor tone</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateBuddySettings({ voice: "warm-female" });
                          handleTestVoice("warm-female");
                          toast.success("Switched to Warm Concierge", { description: "Speaking in friendly, conversational guidance." });
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                          buddySettings.voice === "warm-female"
                            ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold"
                            : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-700 dark:text-white/70 hover:border-slate-300 dark:hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Volume2 className="w-4 h-4 text-purple-500" />
                          {buddySettings.voice === "warm-female" && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <div className="text-sm flex items-center justify-between">
                          <span>Warm Concierge</span>
                          <Play className="w-3 h-3 text-purple-400" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-white/40 font-normal">Friendly, conversational guidance</div>
                      </button>
                    </div>
                  </div>

                  {/* Living Aura Color Swatch */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-white/70">Aura Glow Gradient</label>
                    <div className="flex items-center gap-3">
                      {AVATAR_COLORS.map((col, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => updateBuddySettings({ color: col })}
                          className={`w-9 h-9 rounded-full ${col} border-2 transition-transform ${
                            buddySettings.color === col 
                              ? "scale-110 border-white dark:border-white shadow-lg ring-2 ring-indigo-500" 
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                          title={`Aura Preset ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sandbox Virtual Faucet Card */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sandbox Virtual Faucet</h2>
                      <p className="text-xs text-slate-500 dark:text-white/50">Instant play-money AUSD for simulating debt settlements</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    🟢 Monad Sandbox
                  </span>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-500 dark:text-white/50 mb-1 uppercase tracking-wider">
                      Available Sandbox Balance
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                      <AnimatedCounter value={virtualBalance / 100} prefix="$" decimals={2} />
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-2">Test AUSD</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-1 max-w-sm">
                      Deducted when paying tab debts in demo mode. Top up whenever you want to test more multilateral settlements.
                    </p>
                  </div>

                  <Button 
                    onClick={handleClaimFaucet}
                    variant="primary"
                    className="shrink-0 whitespace-nowrap gap-2 bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto h-12 px-6 shadow-md shadow-emerald-600/20 text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" /> Claim $500.00 AUSD
                  </Button>
                </div>
              </div>

              {/* Workspace Sandbox Mode */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Sandbox Mode</h2>
                    <p className="text-xs text-slate-500 dark:text-white/50">Switch between pre-populated hackathon trip data and a fresh blank state</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMode("sample");
                      sounds.playClick();
                      toast.info("Switched to Sample Trip Mode", {
                        description: "Loaded Lisbon '24 and Lake Tahoe demo tabs."
                      });
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      workspaceMode === "sample"
                        ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-500 shadow-md shadow-indigo-500/10 text-indigo-900 dark:text-indigo-300"
                        : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🏖️</span>
                      {workspaceMode === "sample" && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">Sample Trip Mode</div>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-1 leading-relaxed">
                      Pre-loads the Lisbon &apos;24 and Lake Tahoe tabs with multilateral debts ready to visualize and settle.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMode("blank");
                      sounds.playClick();
                      toast.info("Switched to Blank Slate Mode", {
                        description: "Workspace cleared for custom tab testing."
                      });
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      workspaceMode === "blank"
                        ? "bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10 text-emerald-900 dark:text-emerald-300"
                        : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">✨</span>
                      {workspaceMode === "blank" && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">Clean Slate Mode</div>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-1 leading-relaxed">
                      Clears pre-loaded tabs so you can test creating fresh custom tabs, adding expenses, and inviting members.
                    </p>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* WEB3 ADVANCED SECURITY TAB */}
          {activeTab === "advanced" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Web3 Native Architecture</h2>
                    <p className="text-xs text-slate-500 dark:text-white/50">Monad testnet smart account credentials and biometric security</p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-white/60 text-sm mb-6 mt-3 leading-relaxed">
                  MeshTab abstracts blockchain complexity away for standard users. If you&apos;re verifying contract logic, your Smart Account details on Monad are below.
                </p>
                
                <div className="space-y-4">
                  {/* Wallet Address Card */}
                  <div className="p-5 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">Smart Account Address (Monad)</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-indigo-600 dark:text-indigo-300 text-sm font-mono truncate select-all shadow-xs">
                        {fullAddress}
                      </div>
                      <Button onClick={copyAddress} variant="secondary" className="h-11 px-4">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-2 font-medium">All ledger transactions and multilateral netting have zero fees and are 100% sponsored by the platform.</p>
                  </div>

                  {/* Security Architecture Card */}
                  <div className="p-5 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Biometric Enclave Security</h3>
                      <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed max-w-md">Your account is secured by your device&apos;s biometric Secure Enclave. Passkey credentials never leave physical hardware.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 shrink-0">
                      Hardware Secured
                    </div>
                  </div>

                  {/* Dashboard Toggle Card */}
                  <div className="p-5 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Developer Mode</h3>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">Show smart account address badge in the dashboard header.</p>
                    </div>
                    <button 
                      onClick={toggleAddress}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${showAddressOnDashboard ? "bg-indigo-600" : "bg-slate-300 dark:bg-white/10"}`}
                      aria-label="Toggle Developer Mode"
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${showAddressOnDashboard ? "translate-x-7" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Floating Tab Co-Pilot for instant real-time live preview */}
      <MeshBuddy />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a]" />}>
      <SettingsContent />
    </Suspense>
  );
}
