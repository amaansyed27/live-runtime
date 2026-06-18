import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OllamaClient, createMessage, defaultRuntimeSettings, type ChatMessage, type ModelInfo } from "@live-runtime/core";
import { speakText } from "../lib/tauriBridge";
import { saveEntry, relatedEntries, type ScoredJournalRecord } from "../lib/semantic";

const KEY = "live-runtime.chat.messages";
const MODEL_KEY = "live-runtime.chat.model";
const BASE_URL_KEY = "live-runtime.chat.base-url";
const SPEAK_KEY = "live-runtime.chat.speak";
const SESSION_META_KEY = "live-runtime.chat.session-meta";
const CHAT_BUS = "live-runtime.chat.bus";
const RETRIEVAL_TIMEOUT_MS = 1200;
const IDLE_ARCHIVE_MS = 120 * 60 * 1000;
const CONTEXT_TOKEN_LIMIT = 250000;

interface SessionMeta {
  lastMessageAt: number;
}

export interface RuntimeChatState {
  messages: ChatMessage[];
  models: ModelInfo[];
  model: string;
  baseUrl: string;
  isLoading: boolean;
  error: string | null;
  speakResponses: boolean;
  setModel(model: string): void;
  setBaseUrl(value: string): void;
  setSpeakResponses(value: boolean): void;
  reloadModels(): Promise<void>;
  send(content: string): Promise<void>;
  clear(): void;
  resetAll(): void;
}

export function useRuntimeChat(): RuntimeChatState {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages());
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, updateModel] = useState(() => window.localStorage.getItem(MODEL_KEY) ?? defaultRuntimeSettings.defaultModel);
  const [baseUrl, updateBaseUrl] = useState(() => window.localStorage.getItem(BASE_URL_KEY) ?? defaultRuntimeSettings.providerBaseUrl);
  const [speakResponses, updateSpeakResponses] = useState(() => {
    const stored = window.localStorage.getItem(SPEAK_KEY);
    return stored === null ? defaultRuntimeSettings.speakResponses : stored === "true";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const client = useMemo(() => new OllamaClient({ baseUrl }), [baseUrl]);

  const setModel = useCallback((value: string) => {
    updateModel(value);
    window.localStorage.setItem(MODEL_KEY, value);
  }, []);

  const setBaseUrl = useCallback((value: string) => {
    updateBaseUrl(value);
    window.localStorage.setItem(BASE_URL_KEY, value);
  }, []);

  const setSpeakResponses = useCallback((value: boolean) => {
    updateSpeakResponses(value);
    window.localStorage.setItem(SPEAK_KEY, String(value));
  }, []);

  const syncFromStore = useCallback(() => {
    if (isLoading) return;
    const next = readStoredMessages();
    setMessages((current) => sameMessages(current, next) ? current : next);
  }, [isLoading]);

  useEffect(() => {
    const channel = new BroadcastChannel(CHAT_BUS);
    channel.onmessage = syncFromStore;
    channelRef.current = channel;
    const timer = window.setInterval(syncFromStore, 900);
    return () => {
      window.clearInterval(timer);
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [syncFromStore]);

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(messages));
    channelRef.current?.postMessage({ type: "messages" });
  }, [messages]);

  useEffect(() => {
    const meta = readSessionMeta();
    if (!meta || !hasRealConversation(messages)) return;
    if (Date.now() - meta.lastMessageAt < IDLE_ARCHIVE_MS) return;

    void archiveSession(baseUrl, messages, "idle-120-minutes").then(() => {
      const fresh = [createMessage("assistant", "Previous idle chat was archived into long-term memory. New topic started.")];
      setMessages(fresh);
      window.localStorage.setItem(KEY, JSON.stringify(fresh));
      writeSessionMeta(Date.now());
      channelRef.current?.postMessage({ type: "messages" });
    });
  }, [baseUrl]);

  const reloadModels = useCallback(async () => {
    try {
      setError(null);
      const found = await client.listModels();
      const chatModels = found.filter((item) => !isEmbeddingOnlyModel(item));
      const usableModels = chatModels.length > 0 ? chatModels : found;
      setModels(usableModels);
      if (usableModels.length > 0 && !usableModels.some((item) => item.name === model)) setModel(usableModels[0].name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to connect to Ollama");
    }
  }, [client, model, setModel]);

  useEffect(() => { void reloadModels(); }, [reloadModels]);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || isLoading) return;

    if (isEmbeddingOnlyName(model)) {
      setError("The selected model is an embedding model. Choose a chat model like qwen3.5:4b, gemma4:4b, granite4:8b, or nemotron-3-nano:4b.");
      return;
    }

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    const userMessage = createMessage("user", text);
    const assistantMessage = createMessage("assistant", "");
    const history = messages.filter((message) => message.content.trim() && message.content !== "Thinking...");
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsLoading(true);
    setError(null);
    writeSessionMeta(Date.now());

    let notes: ScoredJournalRecord[] = [];
    try {
      notes = await withFallback(relatedEntries(baseUrl, text, 5), [], RETRIEVAL_TIMEOUT_MS);
    } catch {
      notes = [];
    }

    const noteMessage = notes.length > 0 ? createMessage("system", summarizeNotes(notes)) : null;
    let reply = "";
    try {
      for await (const chunk of client.chat({
        model,
        signal: abort.signal,
        messages: [
          { role: "system", content: "You are Live Runtime, a concise local AI companion running through Ollama. Answer directly. If relevant memory notes are supplied, use them silently and do not mention them unless asked." },
          ...history,
          ...(noteMessage ? [noteMessage] : []),
          userMessage
        ],
        temperature: defaultRuntimeSettings.temperature
      })) {
        reply += chunk.content;
        setMessages((current) => current.map((message) => message.id === assistantMessage.id ? { ...message, content: reply || "Thinking..." } : message));
      }

      if (!reply.trim()) {
        reply = "I reached Ollama but received an empty response. Try another chat model from Settings.";
        setMessages((current) => current.map((message) => message.id === assistantMessage.id ? { ...message, content: reply } : message));
      }

      const finalMessages = [...history, userMessage, { ...assistantMessage, content: reply }];
      writeSessionMeta(Date.now());
      void archiveIfContextLimitReached(baseUrl, finalMessages, setMessages, channelRef.current);
      if (speakResponses) await speakText(reply);
    } catch (cause) {
      if (!abort.signal.aborted) {
        const message = cause instanceof Error ? cause.message : "Chat request failed";
        setError(message);
        setMessages((current) => current.map((item) => item.id === assistantMessage.id ? { ...item, content: `I could not get a response from Ollama. ${message}` } : item));
      }
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, client, isLoading, messages, model, speakResponses]);

  const clear = useCallback(() => {
    const fresh = [createMessage("assistant", "New topic started. What should we work on?")];
    setMessages(fresh);
    window.localStorage.setItem(KEY, JSON.stringify(fresh));
    writeSessionMeta(Date.now());
    channelRef.current?.postMessage({ type: "messages" });
  }, []);

  const resetAll = useCallback(() => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("live-runtime."))
      .forEach((key) => window.localStorage.removeItem(key));
    channelRef.current?.postMessage({ type: "messages" });
    window.location.reload();
  }, []);

  return { messages, models, model, baseUrl, isLoading, error, speakResponses, setModel, setBaseUrl, setSpeakResponses, reloadModels, send, clear, resetAll };
}

async function archiveIfContextLimitReached(baseUrl: string, currentMessages: ChatMessage[], setMessages: (messages: ChatMessage[]) => void, channel: BroadcastChannel | null): Promise<void> {
  if (estimateTokens(currentMessages) < CONTEXT_TOKEN_LIMIT) return;
  await archiveSession(baseUrl, currentMessages, "context-250k");
  const fresh = [createMessage("assistant", "Context limit reached. I archived the previous chat into long-term memory and started fresh.")];
  setMessages(fresh);
  window.localStorage.setItem(KEY, JSON.stringify(fresh));
  writeSessionMeta(Date.now());
  channel?.postMessage({ type: "messages" });
}

async function archiveSession(baseUrl: string, items: ChatMessage[], reason: string): Promise<void> {
  const transcript = items
    .filter((message) => message.content.trim())
    .map((message) => `${message.role.toUpperCase()}: ${message.content.trim()}`)
    .join("\n\n");
  if (!transcript.trim()) return;

  await saveEntry(baseUrl, {
    kind: "chatSession",
    scope: "longTerm",
    title: `Archived chat session (${reason})`,
    content: transcript,
    source: `chat-session:${reason}`,
    confidence: 0.95,
    tags: ["chat-session", reason]
  });
}

function summarizeNotes(items: ScoredJournalRecord[]): string {
  const lines = items.map((item, index) => `${index + 1}. ${item.record.content.replace(/\s+/g, " ").slice(0, 180)}`);
  return `Relevant local notes for this reply:\n${lines.join("\n")}`;
}

function readStoredMessages(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [createMessage("assistant", "Live Runtime is ready. Choose a model, then speak or type a message.")];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [createMessage("assistant", "Live Runtime is ready.")];
  } catch {
    return [createMessage("assistant", "Live Runtime is ready.")];
  }
}

function sameMessages(left: ChatMessage[], right: ChatMessage[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((message, index) => message.id === right[index]?.id && message.content === right[index]?.content);
}

function hasRealConversation(items: ChatMessage[]): boolean {
  return items.some((message) => message.role === "user" && message.content.trim());
}

function estimateTokens(items: ChatMessage[]): number {
  const characters = items.reduce((total, message) => total + message.content.length, 0);
  return Math.ceil(characters / 4);
}

function readSessionMeta(): SessionMeta | null {
  try {
    const raw = window.localStorage.getItem(SESSION_META_KEY);
    return raw ? JSON.parse(raw) as SessionMeta : null;
  } catch {
    return null;
  }
}

function writeSessionMeta(lastMessageAt: number): void {
  window.localStorage.setItem(SESSION_META_KEY, JSON.stringify({ lastMessageAt }));
}

function isEmbeddingOnlyModel(model: ModelInfo): boolean {
  return isEmbeddingOnlyName(model.name) || model.family === "bert";
}

function isEmbeddingOnlyName(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.includes("embed") || normalized.includes("embedding") || normalized.includes("nomic-embed");
}

async function withFallback<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (typeof timeoutId === "number") window.clearTimeout(timeoutId);
  }
}
