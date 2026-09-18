"use client";

import { motion } from "framer-motion";
import { useId } from "react";

export type BuddyMood = "happy" | "talking" | "thinking" | "wink" | "excited";

export interface BuddyAvatarProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  mood?: BuddyMood;
  isSpeaking?: boolean;
  className?: string;
  glow?: boolean;
  showAntenna?: boolean;
}

const SIZE_MAP = {
  xs: { width: 26, height: 26, viewBox: "0 0 100 100" },
  sm: { width: 36, height: 36, viewBox: "0 0 100 100" },
  md: { width: 48, height: 48, viewBox: "0 0 100 100" },
  lg: { width: 58, height: 58, viewBox: "0 0 100 100" },
  xl: { width: 84, height: 84, viewBox: "0 0 100 100" },
};

export function BuddyAvatar({
  size = "md",
  mood = "happy",
  isSpeaking = false,
  className = "",
  glow = true,
  showAntenna = true,
}: BuddyAvatarProps) {
  const uniqueId = useId().replace(/:/g, "_");
  const { width, height, viewBox } = SIZE_MAP[size];

  const currentMood: BuddyMood = isSpeaking ? "talking" : mood;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width, height }}
      aria-label="MeshBuddy Avatar"
    >
      {/* Ambient Outer Glow Aura */}
      {glow && (
        <div
          className={`absolute inset-0 rounded-full blur-sm transition-all duration-300 pointer-events-none ${
            isSpeaking
              ? "bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 opacity-80 scale-110 animate-pulse"
              : currentMood === "wink"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 opacity-60"
              : currentMood === "thinking"
              ? "bg-gradient-to-r from-amber-400 to-indigo-500 opacity-60"
              : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 opacity-50"
          }`}
        />
      )}

      {/* Handcrafted Vector Avatar SVG */}
      <svg
        width={width}
        height={height}
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 overflow-visible"
      >
        <defs>
          {/* Head Body Gradient */}
          <linearGradient id={`helmet_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>

          {/* Visor Screen Gradient */}
          <linearGradient id={`visor_${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0e1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Neon Ring Border */}
          <linearGradient id={`neon_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>

          {/* Eye Luminous Cyan */}
          <linearGradient id={`eyeCyan_${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Specular Highlight */}
          <linearGradient id={`specular_${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. Antenna */}
        {showAntenna && (
          <g>
            {/* Stalk */}
            <path
              d="M 50 16 L 50 6"
              stroke="#64748b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Pulsing Beacon Pearl */}
            <circle
              cx="50"
              cy="5"
              r="4.5"
              fill="#38bdf8"
              filter="drop-shadow(0 0 4px #38bdf8)"
            />
            <circle cx="50" cy="5" r="2" fill="#ffffff" />
          </g>
        )}

        {/* 2. Side Ear Sensor Pods */}
        <rect x="8" y="42" width="6" height="18" rx="3" fill="#6366f1" opacity="0.9" />
        <rect x="86" y="42" width="6" height="18" rx="3" fill="#a855f7" opacity="0.9" />

        {/* 3. Outer Head / Helmet Shell */}
        <rect
          x="12"
          y="16"
          width="76"
          height="72"
          rx="26"
          fill={`url(#helmet_${uniqueId})`}
          stroke={`url(#neon_${uniqueId})`}
          strokeWidth="2"
        />

        {/* Specular Glass Highlight */}
        <path
          d="M 22 20 Q 50 17 78 20 C 72 26 28 26 22 20 Z"
          fill={`url(#specular_${uniqueId})`}
        />

        {/* 4. OLED Face Visor Screen */}
        <rect
          x="18"
          y="26"
          width="64"
          height="52"
          rx="18"
          fill={`url(#visor_${uniqueId})`}
          stroke="rgba(99, 102, 241, 0.3)"
          strokeWidth="1"
        />

        {/* Subtle Visor Scanline Texture */}
        <line x1="22" y1="36" x2="78" y2="36" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1="22" y1="46" x2="78" y2="46" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1="22" y1="56" x2="78" y2="56" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1="22" y1="66" x2="78" y2="66" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

        {/* 5. Cute Cheek Blushes */}
        <ellipse cx="28" cy="58" rx="4.5" ry="2.5" fill="#f472b6" opacity="0.45" />
        <ellipse cx="72" cy="58" rx="4.5" ry="2.5" fill="#f472b6" opacity="0.45" />

        {/* 6. Luminous Expressive Eyes */}
        {currentMood === "wink" ? (
          /* Wink Mood: Left eye closed in a cheeky curve, right eye wide */
          <g>
            {/* Left Eye (Winking Arch) */}
            <path
              d="M 30 48 Q 37 42 44 48"
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right Eye (Wide Open) */}
            <circle
              cx="63"
              cy="47"
              r="7"
              fill={`url(#eyeCyan_${uniqueId})`}
              filter="drop-shadow(0 0 5px #38bdf8)"
            />
            <circle cx="65" cy="45" r="2.5" fill="#ffffff" />
          </g>
        ) : currentMood === "thinking" ? (
          /* Thinking Mood: Looking up to the top-right */
          <g>
            <circle
              cx="36"
              cy="44"
              r="6.5"
              fill={`url(#eyeCyan_${uniqueId})`}
              filter="drop-shadow(0 0 4px #38bdf8)"
            />
            <circle cx="38" cy="42" r="2.5" fill="#ffffff" />

            <circle
              cx="64"
              cy="44"
              r="6.5"
              fill={`url(#eyeCyan_${uniqueId})`}
              filter="drop-shadow(0 0 4px #38bdf8)"
            />
            <circle cx="66" cy="42" r="2.5" fill="#ffffff" />
          </g>
        ) : (
          /* Happy / Default / Talking Mood: Luminous Cheerful Eyes with Blink Animation */
          <g className="animate-[pulse_3s_ease-in-out_infinite]">
            {/* Left Eye */}
            <rect
              x="30"
              y="40"
              width="13"
              height="14"
              rx="6"
              fill={`url(#eyeCyan_${uniqueId})`}
              filter="drop-shadow(0 0 5px #38bdf8)"
            />
            <circle cx="37" cy="44" r="2.5" fill="#ffffff" />

            {/* Right Eye */}
            <rect
              x="57"
              y="40"
              width="13"
              height="14"
              rx="6"
              fill={`url(#eyeCyan_${uniqueId})`}
              filter="drop-shadow(0 0 5px #38bdf8)"
            />
            <circle cx="64" cy="44" r="2.5" fill="#ffffff" />
          </g>
        )}

        {/* 7. Expressive Mouth / Voice Waveform */}
        {currentMood === "talking" || isSpeaking ? (
          /* Talking Waveform Equalizer Mouth */
          <g>
            <rect x="36" y="61" width="3" height="7" rx="1.5" fill="#38bdf8" className="animate-pulse" />
            <rect x="42" y="58" width="3" height="13" rx="1.5" fill="#818cf8" className="animate-bounce" />
            <rect x="48.5" y="56" width="3" height="17" rx="1.5" fill="#c084fc" />
            <rect x="55" y="58" width="3" height="13" rx="1.5" fill="#818cf8" className="animate-bounce" />
            <rect x="61" y="61" width="3" height="7" rx="1.5" fill="#38bdf8" className="animate-pulse" />
          </g>
        ) : currentMood === "thinking" ? (
          /* Thinking Mouth: Cute little puzzled 'o' */
          <ellipse
            cx="50"
            cy="64"
            rx="3.5"
            ry="4"
            fill="#818cf8"
            stroke="#c084fc"
            strokeWidth="1.5"
          />
        ) : (
          /* Warm Friendly Smile */
          <path
            d="M 38 61 Q 50 71 62 61"
            stroke="#818cf8"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            filter="drop-shadow(0 0 3px #818cf8)"
          />
        )}
      </svg>
    </div>
  );
}
