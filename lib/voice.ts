// MeshTab Living Voice Engine — Siri-Grade Conversational Prosody
// Selects natural, high-fidelity neural voices across modern browsers (Chrome, Edge, Safari, Firefox)
// Eliminates artificial pitch-shifting distortion (which causes synthetic crying/whimpering effects)
// and ensures voice acts like modern conversational assistants (Siri, Alexa, ChatGPT Voice) rather than a screen reader.

export type VoicePersona = "mute" | "deep-male" | "warm-female";

// Preferred natural/neural voices in order of fidelity
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

/**
 * Siri-Grade Conversational Speech Sanitizer
 * Transforms screen-reading raw markdown, emojis, code blocks, and walls of text
 * into a single, punchy conversational sentence with calm, confident cadence.
 */
export function formatSiriSpeech(rawText: string): string {
  if (!rawText) return "";

  let speech = rawText;

  // 1. Remove markdown formatting (bold, italics, headers, blockquotes, code blocks)
  speech = speech.replace(/[*_#`~>]/g, "");
  speech = speech.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 2. Remove ALL emojis and pictographs so the synthesizer NEVER verbalizes emoji names (e.g., "light bulb", "rocket")
  speech = speech.replace(/\p{Extended_Pictographic}/gu, "");
  speech = speech.replace(/\p{Emoji_Presentation}/gu, "");
  speech = speech.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "");
  speech = speech.replace(/[•●▪■◆▲▼▶◀→←↑↓]/g, " ");

  // 3. Mask technical contract hashes / addresses
  speech = speech.replace(/0x[a-fA-F0-9]{3,}\.{0,3}[a-fA-F0-9]*/g, "your account");

  // 4. Convert currencies into natural human phrasing ("500 dollars" instead of "plus sign five hundred dot zero zero A-U-S-D")
  speech = speech.replace(/\+\$?([0-9,]+(?:\.[0-9]{2})?)\s*(?:AUSD|USD)?/gi, "$1 dollars");
  speech = speech.replace(/\$([0-9,]+(?:\.[0-9]{2})?)\s*(?:AUSD|USD)?/gi, "$1 dollars");
  speech = speech.replace(/\bAUSD\b/gi, "dollars");

  // 5. Eliminate punctuation that causes vocal whimpers, tremolos, or sighs
  // Trailing ellipses "..." -> period
  speech = speech.replace(/\.{2,}/g, ".");
  // Multiple exclamation marks "!!" -> single period (calm prosody)
  speech = speech.replace(/[!]{2,}/g, ".");
  speech = speech.replace(/[?]{2,}/g, "?");
  speech = speech.replace(/!/g, "."); // period provides confident, relaxed intonation rather than shrill pitch spikes

  // 6. Anti-Screen-Reader: Extract ONLY the first punchline sentence
  // Siri gives a quick 1-sentence vocal acknowledgment, leaving details on screen
  const sentences = speech
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length > 0) {
    speech = sentences[0];
    // If the first sentence was super brief (e.g. "Done."), allow a second short sentence
    if (speech.length < 35 && sentences[1] && sentences[1].length < 65) {
      speech = `${speech} ${sentences[1]}`;
    }
  }

  // 7. Final whitespace cleanup
  speech = speech.replace(/\s+/g, " ").trim();

  // 8. Max length guard: Never speak more than ~140 characters
  if (speech.length > 140) {
    const truncated = speech.slice(0, 140);
    const lastSpace = truncated.lastIndexOf(" ");
    speech = (lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated) + ".";
  }

  return speech;
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

    // Siri-grade sanitization: brief, calm, no crying vocal strain
    const speechPunchline = formatSiriSpeech(text);

    if (!speechPunchline) {
      options.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(speechPunchline);
    const voice = getBestVoice(persona);

    if (voice) {
      utterance.voice = voice;
    }

    // Siri / Apple Assistant Prosody Standards:
    // 1. Pitch = 1.0 STRICTLY. NEVER artificially pitch-shift with DSP, which introduces
    //    the tremolo/choked-up/crying artifacts!
    // 2. Rate = 1.04. Upbeat, brisk, confident conversational pace without dragging clauses.
    utterance.pitch = 1.0;
    utterance.rate = persona === "warm-female" ? 1.04 : 1.02;
    utterance.volume = 1.0;

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
