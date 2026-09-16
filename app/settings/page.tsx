"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, User, Shield, Settings2, Key, Copy, Check, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "advanced">("profile");
  const [copied, setCopied] = useState(false);
  const [showAddressOnDashboard, setShowAddressOnDashboard] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("meshTab_showAddress");
    if (saved === "true") setShowAddressOnDashboard(true);
  }, []);

  const toggleAddress = () => {
    const newVal = !showAddressOnDashboard;
    setShowAddressOnDashboard(newVal);
    localStorage.setItem("meshTab_showAddress", String(newVal));
  };

  const mockAddress = "0x7F5...3b9A";
  const fullAddress = "0x7F5c0919245151522A1Bc65261dE3b1111923b9A";

  const copyAddress = () => {
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="px-6 md:px-12 pt-10 pb-6 border-b border-white/10 max-w-4xl mx-auto w-full flex items-center gap-4">
        <Link href="/home" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/80" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-white/60 text-sm mt-1">Manage your profile and preferences</p>
        </div>
      </header>

      <main className="px-6 md:px-12 max-w-4xl mx-auto w-full py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Nav */}
        <div className="space-y-2 md:col-span-1">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === "profile" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            <User className="w-4 h-4" /> Profile
          </button>
          <button 
            onClick={() => setActiveTab("advanced")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === "advanced" ? "bg-indigo-500/10 text-indigo-400" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            <Key className="w-4 h-4" /> Advanced
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-8">
          
          {activeTab === "profile" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><User className="w-5 h-5 text-white/50" /> Personal Info</h2>
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-[#0a0a0a] shadow-[0_0_0_2px_rgba(255,255,255,0.1)]">
                    D
                  </div>
                  <Button variant="secondary" size="sm">Change Avatar</Button>
                </div>
                
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/70">Display Name</label>
                    <input type="text" defaultValue="David" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50" />
                  </div>
                  <Button variant="primary">Save Changes</Button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Shield className="w-5 h-5 text-white/50" /> Security</h2>
                <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
                  <div>
                    <h3 className="font-medium text-white">Passkey Authentication</h3>
                    <p className="text-sm text-white/50 mt-1">1 device registered (iPhone 15 Pro)</p>
                  </div>
                  <Button variant="secondary" size="sm">Manage</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-indigo-400"><Settings2 className="w-5 h-5" /> Web3 Settings</h2>
                <p className="text-white/60 text-sm mb-6">MeshTab abstracts the blockchain away, but if you're a crypto native, you can access your underlying Smart Account details here.</p>
                
                <div className="space-y-6">
                  {/* Wallet Address */}
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">Smart Account Address (Monad)</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-indigo-300 text-sm font-mono truncate">
                        {fullAddress}
                      </div>
                      <Button onClick={copyAddress} variant="secondary" className="h-11 px-4">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-white/40 mt-2">Fund this address with Monad to cover gas fees manually (optional, as we sponsor them by default).</p>
                  </div>

                  {/* Export Key */}
                  <div className="pt-6 border-t border-white/10">
                    <h3 className="text-sm font-bold text-white/80 mb-2">Export Private Key</h3>
                    <Button variant="secondary" size="sm" className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border-none">
                      <Eye className="w-4 h-4 mr-2" /> Reveal Key
                    </Button>
                  </div>

                  {/* Dashboard Toggle */}
                  <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white/80">Developer Mode</h3>
                      <p className="text-xs text-white/50 mt-1">Show wallet address in the dashboard header.</p>
                    </div>
                    <button 
                      onClick={toggleAddress}
                      className={`w-12 h-6 rounded-full transition-colors relative ${showAddressOnDashboard ? "bg-indigo-500" : "bg-white/10"}`}
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
