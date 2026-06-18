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
  memoryClass?: string;
  contentHash?: string;
  searchHashes?: string[];
  embeddingModel?: string;
  vector?: number[];
}

export interface JournalSearchQuery {
  text: string;
  termHashes?: string[];
  topics?: string[];
  classes?: string[];
  dynamicClasses?: string[];
  limit?: number;
}

export interface JournalRecord {
  id: string;
  kind: string;
  scope: string;
  title: string;
  content: string;
  source: string;
  confidence: number;
  tags: string[];
  memoryClass?: string;
  contentHash?: string;
  searchHashes?: string[];
  embeddingModel?: string;
  vector?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalStatus {
  databasePath: string;
  memoryCount: number;
  profileCount: number;
  skillCount: number;
  vectorCount: number;
}

export async function saveJournal(draft: JournalDraft): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke("save_memory", { draft });
}

export async function listJournal(limit = 120): Promise<JournalRecord[]> {
  if (!isTauriRuntime()) return [];
  return invoke<JournalRecord[]>("list_memories", { limit });
}

export async function searchJournal(query: JournalSearchQuery): Promise<JournalRecord[]> {
  if (!isTauriRuntime()) return [];
  return invoke<JournalRecord[]>("search_memories", { query });
}

export async function getJournalStatus(): Promise<JournalStatus | null> {
  if (!isTauriRuntime()) return null;
  return invoke<JournalStatus>("memory_status");
}

export async function clearJournal(): Promise<JournalStatus | null> {
  if (!isTauriRuntime()) return null;
  return invoke<JournalStatus>("clear_memory");
}
