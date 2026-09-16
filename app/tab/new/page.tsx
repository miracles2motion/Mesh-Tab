"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Fingerprint, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import Image from "next/image";

export default function CreateTab() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [tabName, setTabName] = useState("");
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tabName.trim()) return;
    
    setStep(2);
    // Simulate API tab creation
    await new Promise(r => setTimeout(r, 2000));
    // Immediately redirect to the new tab instead of showing a static success screen with a fake link
    router.push('/tab/lisbon-24');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0a0a0a] relative overflow-hidden h-screen">
      {/* Background Mesh */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        layout
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl relative z-10 shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCreate}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Create Group Space</h1>
                <p className="text-white/60">Set up a shared tab for your friends.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 ml-1">Tab Name</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Lisbon Weekend"
                  value={tabName}
                  onChange={e => setTabName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 ml-1">Group Currency</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white/70 flex items-center justify-between opacity-70 cursor-not-allowed">
                  <span>US Dollars (AUSD)</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">Default</span>
                </div>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full group mt-4">
                Create Tab
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              {/* Partner Branding */}
              <div className="pt-2 flex items-center justify-center gap-3 text-white/30 text-[11px] font-medium">
                <span>Powered by</span>
                <div className="flex gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                  <Image src="/logos/monad.svg" alt="Monad" width={60} height={16} />
                  <Image src="/logos/agora.svg" alt="Agora" width={40} height={16} />
                </div>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white/50" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Setting up secure space</h2>
                <p className="text-white/50 text-sm">Creating your group tab and finalizing settings...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
