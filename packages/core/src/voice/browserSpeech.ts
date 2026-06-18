export interface SpeechRecognitionController {
  readonly supported: boolean;
  start(callbacks: SpeechRecognitionCallbacks): void;
  stop(): void;
}

export interface SpeechRecognitionCallbacks {
  onPartial?(text: string): void;
  onFinal(text: string): void;
  onError?(error: string): void;
}

export type SpeechOutputEngine = "native" | "browser";

export interface VoiceSettings {
  engine: SpeechOutputEngine;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface BrowserVoiceOption {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
}

export const defaultVoiceSettings: VoiceSettings = {
  engine: "native",
  voiceName: "",
  rate: 0.95,
  pitch: 1,
  volume: 1
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function createBrowserSpeechRecognition(language = "en-US"): SpeechRecognitionController {
  const SpeechRecognition = typeof window === "undefined"
    ? undefined
    : (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      supported: false,
      start(callbacks) {
        callbacks.onError?.("Speech recognition is not available in this WebView/browser.");
      },
      stop() {}
    };
  }

  let recognition: SpeechRecognitionLike | null = null;

  return {
    supported: true,
    start(callbacks) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0].transcript.trim();
          if (!transcript) continue;
          if (result.isFinal) callbacks.onFinal(transcript);
          else callbacks.onPartial?.(transcript);
        }
      };
      recognition.onerror = (event) => callbacks.onError?.(event.error ?? "Unknown speech error");
      recognition.start();
    },
    stop() {
      recognition?.stop();
      recognition = null;
    }
  };
}

export function getBrowserVoiceOptions(): BrowserVoiceOption[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().map((voice) => ({
    name: voice.name,
    lang: voice.lang,
    default: voice.default,
    localService: voice.localService
  }));
}

export function speakWithBrowser(text: string, settings: Partial<VoiceSettings> = {}): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.trim();
  if (!clean) return;

  const merged: VoiceSettings = { ...defaultVoiceSettings, ...settings };
  const utterance = new SpeechSynthesisUtterance(clean);
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = findVoice(voices, merged.voiceName) ?? findNaturalVoice(voices);
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = clampNumber(merged.rate, 0.5, 1.5);
  utterance.pitch = clampNumber(merged.pitch, 0.5, 1.5);
  utterance.volume = clampNumber(merged.volume, 0, 1);

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function findVoice(voices: SpeechSynthesisVoice[], voiceName: string): SpeechSynthesisVoice | undefined {
  const normalized = voiceName.trim().toLowerCase();
  if (!normalized) return undefined;
  return voices.find((voice) => voice.name.toLowerCase() === normalized);
}

function findNaturalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const candidates = englishVoices.length > 0 ? englishVoices : voices;
  const naturalHints = ["natural", "neural", "online", "enhanced", "microsoft", "google", "aria", "ava", "jenny", "guy", "sonia", "zira"];
  return candidates.find((voice) => naturalHints.some((hint) => voice.name.toLowerCase().includes(hint))) ?? candidates[0];
}

function clampNumber(value: number | undefined, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
