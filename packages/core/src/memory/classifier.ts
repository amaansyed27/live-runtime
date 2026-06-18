import type { MemoryClass, MemoryKind, MemoryScope } from "./schema";

export interface MemoryIndex {
  contentHash: string;
  terms: string[];
  termHashes: string[];
  topics: string[];
  classes: MemoryClass[];
}

export interface MemoryClassification {
  primaryClass: MemoryClass;
  secondaryClasses: MemoryClass[];
  suggestedKind: MemoryKind;
  suggestedScope: MemoryScope;
  importance: number;
  shouldSummarize: boolean;
  shouldEmbed: boolean;
  reason: string;
  index: MemoryIndex;
}

export interface MemoryClassifiableDraft {
  kind: string;
  scope: string;
  title: string;
  content: string;
  source: string;
  confidence?: number;
  tags?: string[];
}

export interface ClassifiedMemoryDraft extends MemoryClassifiableDraft {
  kind: MemoryKind;
  scope: MemoryScope;
  confidence: number;
  tags: string[];
  memoryClass: MemoryClass;
  contentHash: string;
  searchHashes: string[];
}

const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "have", "has", "had", "are", "was", "were", "you", "your", "but", "not", "can", "could", "would", "should", "into", "about", "there", "their", "then", "than", "what", "when", "where", "which", "like", "just", "also", "make", "made", "does", "did", "done", "will", "lets", "let", "our", "out", "all", "any", "too", "very"
]);

const CLASS_RULES: Array<{ klass: MemoryClass; patterns: RegExp[]; importance: number; kind: MemoryKind; scope: MemoryScope; reason: string }> = [
  { klass: "preference", patterns: [/\bfrom now on\b/i, /\bi prefer\b/i, /\bremember\b/i, /\balways\b/i, /\bdon't\b/i, /\bkeep .* concise\b/i], importance: 0.88, kind: "preference", scope: "profile", reason: "User preference or stable instruction" },
  { klass: "projectMemory", patterns: [/\brepo\b/i, /\bbranch\b/i, /\bcommit\b/i, /\bgithub\b/i, /\barchitecture\b/i, /\bcomponent\b/i, /\bui\b/i, /\bbug\b/i, /\bfix\b/i], importance: 0.78, kind: "fact", scope: "longTerm", reason: "Project-specific decision or implementation detail" },
  { klass: "actionRequest", patterns: [/\bopen\b/i, /\brun\b/i, /\bstart\b/i, /\bstop\b/i, /\binstall\b/i, /\bcreate\b/i, /\bapply\b/i, /\bupdate\b/i, /\bdelete\b/i, /\brollback\b/i], importance: 0.64, kind: "routine", scope: "session", reason: "User is asking the assistant to perform an action" },
  { klass: "skillCandidate", patterns: [/\bevery time\b/i, /\bwhenever\b/i, /\broutine\b/i, /\bautomate\b/i, /\breuse\b/i, /\bworkflow\b/i], importance: 0.82, kind: "skill", scope: "skill", reason: "Repeated workflow or reusable behavior" },
  { klass: "chatHistory", patterns: [/./], importance: 0.35, kind: "chat", scope: "session", reason: "General conversation history" }
];

const TOPIC_RULES: Array<{ topic: string; patterns: RegExp[] }> = [
  { topic: "memory", patterns: [/\bmemory\b/i, /\bhistory\b/i, /\brecall\b/i, /\bclassifier\b/i, /\bindex\b/i, /\bhash\b/i] },
  { topic: "voice", patterns: [/\bvoice\b/i, /\btts\b/i, /\bspeech\b/i, /\bnatural\b/i, /\bmic\b/i] },
  { topic: "pc-control", patterns: [/\bpc\b/i, /\bcommand\b/i, /\bopen app\b/i, /\bcontrol\b/i, /\bjarvis\b/i] },
  { topic: "ui", patterns: [/\bui\b/i, /\bdesign\b/i, /\balignment\b/i, /\bspacing\b/i, /\bbutton\b/i, /\bcompanion\b/i] },
  { topic: "repo", patterns: [/\bgithub\b/i, /\brepo\b/i, /\bbranch\b/i, /\bcommit\b/i, /\bpull\b/i] },
  { topic: "local-models", patterns: [/\bollama\b/i, /\blocal model\b/i, /\bembedding\b/i, /\bvector\b/i, /\bfast\b/i] }
];

export function classifyMemoryDraft(draft: MemoryClassifiableDraft): { draft: ClassifiedMemoryDraft; classification: MemoryClassification } {
  const text = `${draft.title}\n${draft.content}\n${draft.tags?.join(" ") ?? ""}`;
  const classification = classifyMemoryText(text, draft.kind, draft.scope);
  const originalTags = normalizeTags(draft.tags ?? []);
  const indexTags = [
    `class:${classification.primaryClass}`,
    ...classification.secondaryClasses.map((klass) => `class:${klass}`),
    ...classification.index.topics.map((topic) => `topic:${topic}`),
    `hash:${classification.index.contentHash}`,
    ...classification.index.termHashes.slice(0, 16).map((hash) => `term:${hash}`)
  ];

  const enriched: ClassifiedMemoryDraft = {
    ...draft,
    kind: normalizeKind(draft.kind, classification.suggestedKind),
    scope: normalizeScope(draft.scope, classification.suggestedScope),
    confidence: clampNumber(draft.confidence ?? classification.importance, 0, 1),
    tags: unique([...originalTags, ...indexTags]),
    memoryClass: classification.primaryClass,
    contentHash: classification.index.contentHash,
    searchHashes: classification.index.termHashes
  };

  return { draft: enriched, classification };
}

export function classifyMemoryText(text: string, requestedKind?: string, requestedScope?: string): MemoryClassification {
  const normalizedText = text.trim();
  const index = buildMemoryIndex(normalizedText);
  const matched = CLASS_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(normalizedText)))
    .sort((a, b) => b.importance - a.importance);
  const primary = matched[0] ?? CLASS_RULES[CLASS_RULES.length - 1];
  const secondaryClasses = matched.slice(1, 4).map((rule) => rule.klass);
  const importance = clampNumber(primary.importance + Math.min(0.12, index.terms.length / 140), 0, 1);

  return {
    primaryClass: primary.klass,
    secondaryClasses,
    suggestedKind: normalizeKind(requestedKind, primary.kind),
    suggestedScope: normalizeScope(requestedScope, primary.scope),
    importance,
    shouldSummarize: normalizedText.length > 2600 || primary.klass === "chatHistory",
    shouldEmbed: importance >= 0.5 && normalizedText.length < 12000,
    reason: primary.reason,
    index: { ...index, classes: [primary.klass, ...secondaryClasses] }
  };
}

export function buildMemoryIndex(text: string): MemoryIndex {
  const normalized = normalizeText(text);
  const terms = unique(tokenize(normalized)).slice(0, 48);
  const topics = TOPIC_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map((rule) => rule.topic);
  const contentHash = stableHash(normalized || text).toString(36);
  const termHashes = unique(terms.map((term) => stableHash(term).toString(36)));
  return {
    contentHash,
    terms,
    termHashes,
    topics,
    classes: []
  };
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term) && !/^\d+$/.test(term));
}

export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#._/-]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTags(tags: string[]): string[] {
  return tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function normalizeKind(value: string | undefined, fallback: MemoryKind): MemoryKind {
  const allowed: MemoryKind[] = ["chat", "chatSession", "preference", "fact", "routine", "skill", "web", "document", "action", "project"];
  return allowed.includes(value as MemoryKind) ? value as MemoryKind : fallback;
}

function normalizeScope(value: string | undefined, fallback: MemoryScope): MemoryScope {
  const allowed: MemoryScope[] = ["session", "longTerm", "profile", "skill", "project"];
  return allowed.includes(value as MemoryScope) ? value as MemoryScope : fallback;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
