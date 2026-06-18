import { invoke } from "@tauri-apps/api/core";
import { defaultVoiceSettings, speakWithBrowser, type VoiceSettings } from "@live-runtime/core";

export const VOICE_SETTINGS_KEY = "live-runtime.voice.settings";

interface RuntimeStatus {
  platform: string;
  arch: string;
  speechOutput: string;
  trayEnabled: boolean;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function readVoiceSettings(): VoiceSettings {
  try {
    const raw = window.localStorage.getItem(VOICE_SETTINGS_KEY);
    if (!raw) return defaultVoiceSettings;
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    return normalizeVoiceSettings(parsed);
  } catch {
    return defaultVoiceSettings;
  }
}

export function writeVoiceSettings(settings: VoiceSettings): void {
  window.localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(normalizeVoiceSettings(settings)));
}

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  if (!isTauriRuntime()) {
    return {
      platform: navigator.platform || "browser",
      arch: "web",
      speechOutput: "browser speech synthesis",
      trayEnabled: false
    };
  }
  return invoke<RuntimeStatus>("runtime_status");
}

export async function speakText(text: string, settings: VoiceSettings = readVoiceSettings()): Promise<void> {
  if (!text.trim()) return;
  const normalized = normalizeVoiceSettings(settings);
  if (!isTauriRuntime() || normalized.engine === "browser") {
    speakWithBrowser(text, normalized);
    return;
  }
  await invoke("speak_text", { text, settings: normalized });
}

export async function stopSpeech(): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("stop_speech");
  }
  window.speechSynthesis?.cancel();
}

export async function hideToTray(): Promise<void> {
  if (isTauriRuntime()) await invoke("hide_to_tray");
}

export async function showCompanion(): Promise<void> {
  if (isTauriRuntime()) await invoke("show_companion");
}

export async function hideCompanion(): Promise<void> {
  if (isTauriRuntime()) await invoke("hide_companion");
}

export async function toggleCompanion(): Promise<void> {
  if (isTauriRuntime()) await invoke("toggle_companion");
}

function normalizeVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings {
  return {
    engine: settings.engine === "browser" ? "browser" : "native",
    voiceName: typeof settings.voiceName === "string" ? settings.voiceName : "",
    rate: clampNumber(settings.rate, 0.5, 1.5, defaultVoiceSettings.rate),
    pitch: clampNumber(settings.pitch, 0.5, 1.5, defaultVoiceSettings.pitch),
    volume: clampNumber(settings.volume, 0, 1, defaultVoiceSettings.volume)
  };
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
