import { invoke } from "@tauri-apps/api/core";
import { speakWithBrowser } from "@live-runtime/core";

interface RuntimeStatus {
  platform: string;
  arch: string;
  speechOutput: string;
  trayEnabled: boolean;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
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

export async function speakText(text: string): Promise<void> {
  if (!text.trim()) return;
  if (isTauriRuntime()) {
    await invoke("speak_text", { text });
    return;
  }
  speakWithBrowser(text);
}

export async function stopSpeech(): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("stop_speech");
    return;
  }
  window.speechSynthesis?.cancel();
}

export async function hideToTray(): Promise<void> {
  if (isTauriRuntime()) await invoke("hide_to_tray");
}
