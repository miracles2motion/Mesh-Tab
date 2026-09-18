"use client";

import { motion, useReducedMotion } from "framer-motion";

export type BuddyMood = "happy" | "talking" | "thinking" | "wink" | "excited";

export interface BuddyAvatarProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  mood?: BuddyMood;
  isSpeaking?: boolean;
  className?: string;
  glow?: boolean;
  isFloating?: boolean;
}

const SIZE_CONFIG = {
  xs: {
    container: "w-6 h-6",
    eye: "w-1 h-0.5",
    gap: "gap-1",
    line: "w-3 h-0.5",
    waveBars: "h-2 w-0.5",
    blur: "blur-xs",
  },
  sm: {
    container: "w-8 h-8",
    eye: "w-1.5 h-0.5",
    gap: "gap-1.5",
    line: "w-4 h-0.5",
    waveBars: "h-2.5 w-0.5",
    blur: "blur-sm",
  },
  md: {
    container: "w-10 h-10",
    eye: "w-1.5 h-1",
    gap: "gap-1.5",
    line: "w-4.5 h-0.5",
    waveBars: "h-3 w-0.5",
    blur: "blur-md",
  },
  lg: {
    container: "w-12 h-12",
    eye: "w-1.5 h-1",
    gap: "gap-1.5",
    line: "w-5 h-0.5",
    waveBars: "h-3.5 w-1",
    blur: "blur-md",
  },
  xl: {
    container: "w-16 h-16",
    eye: "w-2.5 h-1.5",
    gap: "gap-2",
    line: "w-7 h-1",
    waveBars: "h-5 w-1",
    blur: "blur-lg",
  },
};

export function BuddyAvatar({
  size = "md",
  mood = "happy",
  isSpeaking = false,
  className = "",
  glow = true,
  isFloating,
}: BuddyAvatarProps) {
  const cfg = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const currentMood: BuddyMood = isSpeaking ? "talking" : mood;
  const shouldReduceMotion = useReducedMotion();

  // Float only on larger or explicitly requested avatars when reduced motion is not active
  const shouldFloat = (isFloating !== undefined ? isFloating : size === "lg" || size === "xl") && !shouldReduceMotion;

  return (
    <motion.div
      animate={shouldFloat ? { y: [-3, 3, -3] } : { y: 0 }}
      transition={shouldFloat ? { repeat: Infinity, duration: 4.5, ease: "easeInOut" } : undefined}
      className={`relative inline-flex items-center justify-center select-none ${cfg.container} ${className}`}
      aria-label="MeshBuddy Orb"
    >
      {/* 1. Distinct Ambient Glow Aura (Monad Purple, Cyan & Emerald) */}
      {glow && (
        <motion.div
          animate={!shouldReduceMotion ? { rotate: 360 } : {}}
          transition={!shouldReduceMotion ? { repeat: Infinity, duration: isSpeaking ? 6 : currentMood === "excited" ? 5 : 14, ease: "linear" } : undefined}
          className={`absolute inset-0 rounded-full ${cfg.blur} pointer-events-none transition-all duration-500 ${
            isSpeaking
              ? "bg-gradient-to-tr from-indigo-500 via-cyan-400 to-emerald-400 opacity-90 scale-110"
              : currentMood === "excited"
              ? "bg-gradient-to-tr from-emerald-400 via-indigo-500 to-cyan-300 opacity-95 scale-110"
              : currentMood === "thinking"
              ? "bg-gradient-to-tr from-cyan-400 via-indigo-600 to-purple-500 opacity-80"
              : "bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-500 opacity-65 group-hover:opacity-90"
          }`}
        />
      )}

      {/* 2. Deep Obsidian Glass Orb Surface */}
      <div
        className="relative w-full h-full rounded-full bg-gradient-to-br from-indigo-950 via-slate-900 to-black border border-white/30 flex flex-col items-center justify-center shadow-2xl overflow-hidden"
      >
        {/* Specular Radial Highlight */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-t-full" />

        {/* 3. Minimalist Luminous Eyes */}
        <div className={`flex ${cfg.gap} items-center mb-0.5 relative z-10`}>
          <div
            className={`${cfg.eye} bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.95)] transition-all ${
              currentMood === "wink"
                ? "scale-y-[0.25]"
                : currentMood === "excited"
                ? "scale-125 shadow-[0_0_12px_rgba(255,255,255,1)]"
                : isSpeaking
                ? "animate-pulse"
                : currentMood === "thinking"
                ? "bg-cyan-200 animate-pulse"
                : ""
            }`}
          />
          <div
            className={`${cfg.eye} bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.95)] transition-all ${
              currentMood === "excited"
                ? "scale-125 shadow-[0_0_12px_rgba(255,255,255,1)]"
                : currentMood === "thinking"
                ? "bg-cyan-200 animate-pulse"
                : ""
            }`}
          />
        </div>

        {/* 4. Living Wave Soundline (Monad Audio Equalizer) */}
        {isSpeaking ? (
          /* Active soundwave equalizer bars when talking */
          <div className="flex items-center gap-0.5 h-3 relative z-10">
            <span className={`${cfg.waveBars} bg-emerald-400 rounded-full animate-bounce shadow-[0_0_6px_rgba(52,211,153,0.9)]`} />
            <span className={`${cfg.waveBars} bg-indigo-300 rounded-full animate-bounce [animation-delay:0.1s] shadow-[0_0_6px_rgba(165,180,252,0.9)]`} />
            <span className={`${cfg.waveBars} bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s] shadow-[0_0_6px_rgba(192,132,252,0.9)]`} />
            <span className={`${cfg.waveBars} bg-cyan-300 rounded-full animate-bounce [animation-delay:0.15s] shadow-[0_0_6px_rgba(103,232,249,0.9)]`} />
          </div>
        ) : (
          /* Sleek horizontal luminous soundline when idle */
          <div
            className={`${cfg.line} bg-gradient-to-r from-emerald-400 via-indigo-300 to-purple-400 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.8)] relative z-10 transition-all ${
              currentMood === "thinking"
                ? "animate-pulse scale-x-110"
                : currentMood === "excited"
                ? "scale-x-125 -translate-y-0.5"
                : ""
            }`}
          />
        )}
      </div>
    </motion.div>
  );
}
