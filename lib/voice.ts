// MeshTab Living Voice Engine — Siri-Grade Conversational Prosody
// Selects natural, high-fidelity neural voices across modern browsers (Chrome, Edge, Safari, Firefox)
// Eliminates artificial pitch-shifting distortion (which causes synthetic crying/whimpering effects)
// and ensures voice acts like modern conversational assistants (Siri, Alexa, ChatGPT Voice) rather than a screen reader.

export type VoicePersona = "mute" | "deep-male" | "warm-female";

// Preferred natural/neural voices in order of fidelity
const FEMALE_PREFERRED = [
  "Microsoft Jenny Online (Natural)",
  "Microsoft Aria Online (Natural)",
  "Microsoft Ava Online (Natural)",
  "Microsoft Emma Online (Natural)",
  "Microsoft Michelle Online (Natural)",
  "Microsoft Libby Online (Natural)",
  "Microsoft Sonia Online (Natural)",
  "Microsoft Clara Online (Natural)",
  "Microsoft Jenny",
  "Microsoft Aria",
  "Google US English",
  "Google UK English Female",
  "Samantha",
  "Victoria",
  "Karen",
  "Microsoft Zira Desktop",
  "Microsoft Zira",
  "Sonia"
];

const MALE_PREFERRED = [
  "Microsoft Guy Online (Natural)",
  "Microsoft Christopher Online (Natural)",
  "Microsoft Eric Online (Natural)",
  "Microsoft Ryan Online (Natural)",
  "Microsoft Steffan Online (Natural)",
  "Microsoft Thomas Online (Natural)",
  "Microsoft Guy",
  "Microsoft Christopher",
  "Google UK English Male",
  "Microsoft David Desktop",
  "Microsoft David",
  "Microsoft Mark Desktop",
  "Microsoft Mark",
  "Microsoft George Desktop",
  "Microsoft George",
  "Daniel",
  "Oliver",
  "Alex",
  "Brian",
  "Arthur",
  "Fred"
];

const MALE_REGEX = /(^|[\s\-(_"'`])(male|man|boy|guy|christopher|eric|roger|steffan|ryan|thomas|david|mark|george|richard|daniel|oliver|alex|brian|arthur|fred|tom|rishi|lee|james|william|matthew|john|michael|paul|andrew|charles|edward)($|[\s\-)_"'`,])/i;

const FEMALE_REGEX = /(^|[\s\-(_"'`])(female|woman|girl|jenny|aria|ava|emma|ana|michelle|libby|sonia|clara|neerja|rosa|natasha|zira|hazel|susan|samantha|victoria|karen|moira|fiona|tessa|serena|kate|sara|sarah|stephanie|amanda|elizabeth|catherine|heather|linda|mary|patricia|jennifer|nancy)($|[\s\-)_"'`,])/i;

export function isVoiceMale(v: SpeechSynthesisVoice): boolean {
  const name = v.name.toLowerCase();
  if (name.includes("google uk english male")) return true;
  if (name.includes("google us english") || name.includes("google uk english female")) return false;
  if (FEMALE_REGEX.test(name)) return false;
  return MALE_REGEX.test(name);
}

export function isVoiceFemale(v: SpeechSynthesisVoice): boolean {
  const name = v.name.toLowerCase();
  if (name.includes("google us english") || name.includes("google uk english female")) return true;
  if (name.includes("google uk english male")) return false;
  if (MALE_REGEX.test(name)) return false;
  return FEMALE_REGEX.test(name);
}

export function isNaturalVoice(v: SpeechSynthesisVoice): boolean {
  const name = v.name.toLowerCase();
  return name.includes("natural") || name.includes("neural") || name.includes("online");
}

let cachedVoices: SpeechSynthesisVoice[] = [];

export function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const list = window.speechSynthesis.getVoices();
  if (list && list.length > 0) {
    cachedVoices = list;
    return list;
  }
  return cachedVoices;
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

  if (persona === "deep-male") {
    // 1. Exact or near match on top preferred natural male voices
    for (const pref of MALE_PREFERRED) {
      const match = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          isVoiceMale(v) &&
          v.name.toLowerCase().includes(pref.toLowerCase())
      );
      if (match) return match;
    }

    // 2. Any English natural/neural voice that is strictly male
    const naturalMale = voices.find(
      (v) => v.lang.startsWith("en") && isVoiceMale(v) && isNaturalVoice(v)
    );
    if (naturalMale) return naturalMale;

    // 3. Any English voice that is verified male (e.g. Microsoft David, Microsoft Mark, Daniel)
    const anyEnglishMale = voices.find(
      (v) => v.lang.startsWith("en") && isVoiceMale(v)
    );
    if (anyEnglishMale) return anyEnglishMale;

    // 4. Any voice in any language verified male
    const anyMale = voices.find((v) => isVoiceMale(v));
    if (anyMale) return anyMale;

    // 5. If NO male voice could be positively identified, find an English voice that is NOT female
    const nonFemale = voices.find(
      (v) => v.lang.startsWith("en") && !isVoiceFemale(v)
    );
    if (nonFemale) return nonFemale;

    // 6. Extreme fallback (only when no male or neutral voice exists on the entire device)
    const defaultEn = voices.find((v) => v.lang.startsWith("en"));
    return defaultEn || voices[0] || null;
  } else {
    // warm-female
    // 1. Exact or near match on top preferred natural female voices
    for (const pref of FEMALE_PREFERRED) {
      const match = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          isVoiceFemale(v) &&
          v.name.toLowerCase().includes(pref.toLowerCase())
      );
      if (match) return match;
    }

    // 2. Any English natural/neural voice that is strictly female
    const naturalFemale = voices.find(
      (v) => v.lang.startsWith("en") && isVoiceFemale(v) && isNaturalVoice(v)
    );
    if (naturalFemale) return naturalFemale;

    // 3. Any English voice that is verified female
    const anyEnglishFemale = voices.find(
      (v) => v.lang.startsWith("en") && isVoiceFemale(v)
    );
    if (anyEnglishFemale) return anyEnglishFemale;

    // 4. Any voice verified female
    const anyFemale = voices.find((v) => isVoiceFemale(v));
    if (anyFemale) return anyFemale;

    // 5. English voice that is NOT male
    const nonMale = voices.find(
      (v) => v.lang.startsWith("en") && !isVoiceMale(v)
    );
    if (nonMale) return nonMale;

    // 6. Fallback
    const defaultEn = voices.find((v) => v.lang.startsWith("en"));
    return defaultEn || voices[0] || null;
  }
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

    // Modern AI Voice Prosody Standards:
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
