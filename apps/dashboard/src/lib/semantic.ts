import { buildMemoryIndex, classifyMemoryDraft, classifyMemoryText } from "@live-runtime/core";
import { listJournal, saveJournal, searchJournal, type JournalDraft, type JournalRecord } from "./journalBridge";

export const EMBED_MODEL = "nomic-embed-text";
const EMBED_TIMEOUT_MS = 1600;

export interface ScoredJournalRecord {
  record: JournalRecord;
  score: number;
}

export async function checkEmbeddingModel(baseUrl: string, model = EMBED_MODEL): Promise<boolean | null> {
  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/api/tags`, {}, 1800);
    if (!response.ok) return null;
    const payload = await response.json() as { models?: Array<{ name?: string; model?: string }> };
    return (payload.models ?? []).some((item) => isSameModel(item.name ?? item.model ?? "", model));
  } catch {
    return null;
  }
}

export async function makeEmbedding(baseUrl: string, input: string, model = EMBED_MODEL): Promise<number[] | null> {
  const text = input.trim();
  if (!text) return null;
  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: text })
    }, EMBED_TIMEOUT_MS);
    if (!response.ok) return null;
    const payload = await response.json() as { embeddings?: number[][] };
    return payload.embeddings?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function saveEntry(baseUrl: string, draft: JournalDraft): Promise<void> {
  const classified = classifyMemoryDraft(draft);
  const embedding = classified.classification.shouldEmbed ? await makeEmbedding(baseUrl, classified.draft.content) : null;
  await saveJournal({
    ...classified.draft,
    embeddingModel: embedding ? EMBED_MODEL : undefined,
    vector: embedding ?? undefined
  });
}

export async function relatedEntries(baseUrl: string, query: string, limit = 6): Promise<ScoredJournalRecord[]> {
  const queryIndex = buildMemoryIndex(query);
  const queryClassification = classifyMemoryText(query);
  const dbCandidates = await searchJournal({
    text: query,
    termHashes: queryIndex.termHashes,
    topics: queryIndex.topics,
    classes: queryClassification.index.classes,
    dynamicClasses: queryClassification.dynamicClasses,
    limit: Math.max(limit * 8, 32)
  });
  const records = dbCandidates.length > 0 ? dbCandidates : await listJournal(500);
  const queryEmbedding = await makeEmbedding(baseUrl, query);

  const lexicalMatches = indexedSearch(records, query, queryIndex, Math.max(limit * 3, 12));
  if (!queryEmbedding) return lexicalMatches.slice(0, limit);

  const semanticMatches = records
    .filter((record) => Array.isArray(record.vector) && record.vector.length === queryEmbedding.length)
    .map((record) => ({ record, score: cosine(queryEmbedding, record.vector ?? []) }))
    .filter((item) => item.score > 0.18);

  return mergeScores(semanticMatches, lexicalMatches)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function indexedSearch(records: JournalRecord[], query: string, queryIndex: ReturnType<typeof buildMemoryIndex>, limit: number): ScoredJournalRecord[] {
  const queryTerms = new Set(queryIndex.terms);
  const queryHashes = new Set(queryIndex.termHashes);
  const queryTopics = new Set(queryIndex.topics);
  const querySubclasses = new Set(queryIndex.dynamicClasses);
  if (queryTerms.size === 0 && queryHashes.size === 0) return [];

  return records
    .map((record) => ({ record, score: scoreRecord(record, query, queryTerms, queryHashes, queryTopics, querySubclasses) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function scoreRecord(
  record: JournalRecord,
  query: string,
  queryTerms: Set<string>,
  queryHashes: Set<string>,
  queryTopics: Set<string>,
  querySubclasses: Set<string>
): number {
  const haystack = `${record.title} ${record.content} ${record.tags.join(" ")}`.toLowerCase();
  const recordHashes = new Set([...(record.searchHashes ?? []), ...record.tags.filter((tag) => tag.startsWith("term:")).map((tag) => tag.slice(5))]);
  const recordTopics = new Set(record.tags.filter((tag) => tag.startsWith("topic:")).map((tag) => tag.slice(6)));
  const recordSubclasses = new Set(record.tags.filter((tag) => tag.startsWith("subclass:")).map((tag) => tag.slice(9)));
  let score = 0;

  for (const term of queryTerms) {
    if (haystack.includes(term)) score += 0.16;
  }

  for (const hash of queryHashes) {
    if (recordHashes.has(hash)) score += 0.24;
  }

  for (const topic of queryTopics) {
    if (recordTopics.has(topic)) score += 0.22;
  }

  for (const subclass of querySubclasses) {
    if (recordSubclasses.has(subclass)) score += 0.28;
  }

  if (record.contentHash && haystack.includes(query.toLowerCase().trim())) score += 0.18;
  if (record.memoryClass === "preference" && /prefer|always|remember|from now on/i.test(query)) score += 0.18;
  if (record.memoryClass === "projectMemory" && /project|repo|branch|bug|architecture|component/i.test(query)) score += 0.15;
  return Math.min(1, score);
}

function mergeScores(semanticMatches: ScoredJournalRecord[], lexicalMatches: ScoredJournalRecord[]): ScoredJournalRecord[] {
  const byId = new Map<string, ScoredJournalRecord>();
  for (const item of semanticMatches) {
    byId.set(item.record.id, { record: item.record, score: item.score * 0.72 });
  }
  for (const item of lexicalMatches) {
    const current = byId.get(item.record.id);
    if (current) current.score = Math.min(1, current.score + item.score * 0.42);
    else byId.set(item.record.id, { record: item.record, score: item.score * 0.9 });
  }
  return Array.from(byId.values());
}

function isSameModel(candidate: string, expected: string): boolean {
  const cleanCandidate = candidate.replace(/:latest$/, "");
  const cleanExpected = expected.replace(/:latest$/, "");
  return cleanCandidate === cleanExpected || candidate === expected || candidate === `${expected}:latest`;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function cosine(left: number[], right: number[]): number {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}
