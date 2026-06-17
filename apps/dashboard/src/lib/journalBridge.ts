import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./tauriBridge";

export interface JournalDraft {
  kind: string;
  scope: string;
  title: string;
  content: string;
  source: string;
  confidence?: number;
  tags?: string[];
}

export interface JournalStatus {
  databasePath: string;
  memoryCount: number;
  profileCount: number;
  skillCount: number;
}

export async function saveJournal(draft: JournalDraft): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("save_memory", { draft });
}

export async function getJournalStatus(): Promise<JournalStatus | null> {
  if (!isTauriRuntime()) return null;
  return invoke<JournalStatus>("memory_status");
}
