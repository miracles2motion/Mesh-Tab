// MeshTab Living Voice Engine
// Selects natural, high-fidelity neural voices across modern browsers (Chrome, Edge, Safari, Firefox)
// Bypasses low-quality robotic synthesizers in favor of human-like natural voices.

export type VoicePersona = "mute" | "deep-male" | "warm-female";

// Preferred high-quality neural voices in order of fidelity
const FEMALE_PREFERRED = [
  "Microsoft Jenny Online (Natural)",
  "Microsoft Jenny",
  "Microsoft Aria Online (Natural)",
  "Microsoft Aria",
  "Google US English",
  "Google UK English Female",
  "Samantha",
  "Karen",
  "Victoria",
  "Sonia",
  "Sara",
  "Zira"
];

const MALE_PREFERRED = [
  "Microsoft Guy Online (Natural)",
  "Microsoft Guy",
  "Microsoft Christopher Online (Natural)",
  "Microsoft Christopher",
  "Google UK English Male",
  "Daniel",
  "Brian",
  "David",
  "George",
  "Arthur"
];

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  const list = window.speechSynthesis.getVoices();
  if (list && list.length > 0) {
    cachedVoices = list;
  }
  return list || [];
}

// Auto-populate voices when available in Chromium / WebKit
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getBestVoice(persona: "deep-male" | "warm-female"): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices || voices.length === 0) return null;

  const preferredList = persona === "warm-female" ? FEMALE_PREFERRED : MALE_PREFERRED;

  // 1. Try to find an exact preferred natural/neural voice match
  for (const preferred of preferredList) {
    const match = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        v.name.toLowerCase().includes(preferred.toLowerCase())
    );
    if (match) return match;
  }

  // 2. Try to find any natural / neural English voice matching gender cues
  const naturalMatch = voices.find((v) => {
    if (!v.lang.startsWith("en")) return false;
    const n = v.name.toLowerCase();
    const isNatural = n.includes("natural") || n.includes("neural") || n.includes("online");
    if (!isNatural) return false;
    if (persona === "warm-female") {
      return !n.includes("male") && !n.includes("guy") && !n.includes("david");
    } else {
      return !n.includes("female") && !n.includes("jenny") && !n.includes("aria") && !n.includes("zira");
    }
  });
  if (naturalMatch) return naturalMatch;

  // 3. Fallback to any English voice matching gender name
  const genderFallback = voices.find((v) => {
    if (!v.lang.startsWith("en")) return false;
    const n = v.name.toLowerCase();
    return persona === "warm-female"
      ? (n.includes("female") || n.includes("woman") || n.includes("girl"))
      : (n.includes("male") || n.includes("man") || n.includes("guy"));
  });
  if (genderFallback) return genderFallback;

  // 4. Default to first available English voice or system voice
  const defaultEnglish = voices.find((v) => v.lang.startsWith("en"));
  return defaultEnglish || voices[0] || null;
}

export function stopSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch (e) {}
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export function speak(text: string, persona: VoicePersona, options: SpeakOptions = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onEnd?.();
    return;
  }

  // Strictly enforce mute: cancel any pending or active speech immediately
  if (persona === "mute") {
    stopSpeech();
    options.onEnd?.();
    return;
  }

  try {
    stopSpeech();

    // Clean markdown, symbols, and limit duration
    const cleanText = text
      .replace(/[*_#`~>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim()
      .slice(0, 350);

    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getBestVoice(persona);

    if (voice) {
      utterance.voice = voice;
    }

    if (persona === "warm-female") {
      utterance.pitch = 1.05;
      utterance.rate = 1.02;
    } else if (persona === "deep-male") {
      utterance.pitch = 0.88;
      utterance.rate = 0.98;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      // Ignore cancellation interrupts
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("Speech synthesis notice:", e.error);
      }
      options.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis error:", e);
    options.onEnd?.();
  }
}
