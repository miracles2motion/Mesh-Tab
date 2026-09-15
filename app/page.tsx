"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Fingerprint, ChevronRight, Plus, Copy, Check, Sparkles, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [tripName, setTripName] = useState("Lisbon Trip");
  const [members, setMembers] = useState(["Aisha", "Kemi", "Ben", "Sarah"]);
  const [step, setStep] = useState<"create" | "claim">("create");
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authenticatingName, setAuthenticatingName] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName) return;
    setStep("claim");
  };

  const handlePasskeyAuth = (name: string) => {
    setAuthenticatingName(name);
    setIsAuthenticating(true);
    
    // Simulate Mera Passkey Biometric Delay & Smart Account Generation
    setTimeout(() => {
      setIsAuthenticating(false);
      router.push("/tab/lisbon-123");
    }, 2500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -z-10" />
      <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] -z-10" />

      <AnimatePresence mode="wait">
        {step === "create" && (
          <motion.div 
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">MeshTab</h1>
              <p className="text-white/60">Gasless debt netting on Monad.</p>
            </div>

            <form onSubmit={handleCreate} className="glass-panel p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  Trip Name
                </label>
                <input 
                  type="text" 
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="e.g. Lisbon Weekend"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Initial Roster
                </label>
                <div className="flex flex-wrap gap-2">
                  {members.map(member => (
                    <span key={member} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm">
                      {member}
                    </span>
                  ))}
                  <button type="button" className="px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm flex items-center gap-1 hover:bg-indigo-500/30 transition-colors">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 rounded-xl bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Generate Smart Tab <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}

        {step === "claim" && (
          <motion.div 
            key="claim"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm space-y-6"
          >
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-3xl font-bold text-white">{tripName}</h2>
              <p className="text-white/60">Tap your name to claim your seat.</p>
            </div>

            <div className="grid gap-3">
              {members.map((member) => (
                <button
                  key={member}
                  onClick={() => handlePasskeyAuth(member)}
                  disabled={isAuthenticating}
                  className="glass-panel p-4 flex items-center justify-between group hover:bg-white/10 transition-all text-left disabled:opacity-50"
                >
                  <span className="font-medium text-lg">{member}</span>
                  {authenticatingName === member ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-indigo-400"
                    >
                      <Fingerprint className="w-6 h-6 animate-pulse" />
                    </motion.div>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="pt-6 border-t border-white/10 text-center">
              <button className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-2 w-full">
                <Copy className="w-4 h-4" /> Copy Invite Link
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulated Passkey Modal Overlay */}
      <AnimatePresence>
        {isAuthenticating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1c1c1e] w-full max-w-xs rounded-[32px] p-8 flex flex-col items-center space-y-6 border border-white/10 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-semibold text-white">Face ID</h3>
                <p className="text-sm text-white/50">Binding {authenticatingName} to Smart Account</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
