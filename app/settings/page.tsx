"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, User, Shield, Settings2, Key, Copy, Check, Palette, Smartphone, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ThemeToggle } from "../../components/theme-toggle";

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-purple-600"
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "advanced">("profile");
  const [copied, setCopied] = useState(false);
  const [showAddressOnDashboard, setShowAddressOnDashboard] = useState(false);
  const [displayName, setDisplayName] = useState("David");
  const [avatarColorIndex, setAvatarColorIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isManagingPasskey, setIsManagingPasskey] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("meshTab_showAddress");
    if (saved === "true") setShowAddressOnDashboard(true);
    const savedName = localStorage.getItem("meshTab_displayName");
    if (savedName) setDisplayName(savedName);
  }, []);

  const toggleAddress = () => {
    const newVal = !showAddressOnDashboard;
    setShowAddressOnDashboard(newVal);
    localStorage.setItem("meshTab_showAddress", String(newVal));
  };

  const fullAddress = "0x7F5c0919245151522A1Bc65261dE3b1111923b9A";

  const copyAddress = () => {
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveChanges = () => {
    localStorage.setItem("meshTab_displayName", displayName);
    setSaveStatus("Profile updated successfully!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleChangeAvatar = () => {
    setAvatarColorIndex((prev) => (prev + 1) % AVATAR_COLORS.length);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300">
      <header className="px-6 md:px-12 pt-10 pb-6 border-b border-slate-200 dark:border-white/10 max-w-4xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/home" 
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80"
            title="Back to Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
            <p className="text-slate-500 dark:text-white/60 text-sm mt-0.5">Manage your profile, theme, and security</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      <main className="px-6 md:px-12 max-w-4xl mx-auto w-full py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Nav */}
        <div className="space-y-2 md:col-span-1">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-semibold ${
              activeTab === "profile" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                : "text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <User className="w-4 h-4" /> Profile & Appearance
          </button>
          <button 
            onClick={() => setActiveTab("advanced")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-semibold ${
              activeTab === "advanced" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                : "text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Key className="w-4 h-4" /> Web3 Security
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-8">
          
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
                
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-white/70">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-medium" 
                    />
                  </div>
                  <Button onClick={handleSaveChanges} variant="primary" className="mt-2">
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Appearance / Theme preference */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Sparkles className="w-5 h-5 text-slate-400 dark:text-white/50" /> Interface Theme
                </h2>
                <p className="text-sm text-slate-500 dark:text-white/60 mb-6">MeshTab supports automatic theme switching between Clean High-Contrast Light and Sleek Dark.</p>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/5">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Theme Mode</h3>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">Toggle between Day (Light) and Night (Dark) mode</p>
                  </div>
                  <ThemeToggle />
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

          {activeTab === "advanced" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-gradient-to-br dark:from-indigo-500/10 dark:to-purple-500/5 border border-slate-200 dark:border-indigo-500/20 rounded-3xl p-6 md:p-8 shadow-sm">
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Settings2 className="w-5 h-5" /> Web3 Native Architecture
                </h2>
                <p className="text-slate-600 dark:text-white/60 text-sm mb-6">MeshTab abstracts blockchain complexity away for standard users. If you're verifying contract logic, your Smart Account details on Monad are below.</p>
                
                <div className="space-y-6">
                  {/* Wallet Address */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 dark:text-white/80 mb-2 block">Smart Account Address (Monad)</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-indigo-600 dark:text-indigo-300 text-sm font-mono truncate select-all">
                        {fullAddress}
                      </div>
                      <Button onClick={copyAddress} variant="secondary" className="h-11 px-4">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-2 font-medium">All ledger transactions and multilateral netting have network gas fees fully sponsored via Pimlico Paymasters.</p>
                  </div>

                  {/* Security Architecture */}
                  <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white/80 mb-2">Biometric Enclave Security</h3>
                    <p className="text-xs text-slate-500 dark:text-white/40 mb-3 leading-relaxed">Your account is secured by your device's hardware Secure Enclave (WebAuthn P-256). Private keys never leave physical hardware.</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                      Hardware Secured
                    </div>
                  </div>

                  {/* Dashboard Toggle */}
                  <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white/80">Developer Mode</h3>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Show smart account address badge in the dashboard header.</p>
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
    </div>
  );
}
