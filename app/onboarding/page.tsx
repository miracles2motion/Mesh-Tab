"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, User } from "lucide-react";
import { Button } from "../../components/ui/button";

import { ThemeToggle } from "../../components/theme-toggle";

import { saveStoredUser, AVATAR_COLORS } from "../../lib/user";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInvite = searchParams.get("invite") === "true";
  const inviteTab = searchParams.get("tab");

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    const colorIndex = AVATAR_COLORS.indexOf(selectedColor);
    saveStoredUser(name.trim(), colorIndex >= 0 ? colorIndex : 0);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    if (isInvite && inviteTab) {
      router.push(`/tab/${inviteTab}?invite=true`);
    } else {
      router.push("/home");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20 blur-[100px] rounded-full pointer-events-none transition-colors duration-500 ${selectedColor}`} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-3xl relative z-10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/20">
            <User className="w-8 h-8 text-slate-600 dark:text-white/50" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome to MeshTab</h1>
          <p className="text-slate-500 dark:text-white/60 text-sm">Let's set up your profile.</p>
        </div>

        <form onSubmit={handleContinue} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Display Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g., David"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg font-medium"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Avatar Color</label>
            <div className="flex items-center gap-3 justify-between px-1">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full ${color} transition-all duration-300 ${
                    selectedColor === color 
                      ? "ring-2 ring-indigo-600 dark:ring-white ring-offset-4 ring-offset-white dark:ring-offset-[#121212] scale-110" 
                      : "opacity-50 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            variant="primary"
            size="lg"
            className="w-full mt-4 group"
            isLoading={isSubmitting}
          >
            Complete Setup
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a]" />}>
      <OnboardingContent />
    </Suspense>
  );
}
