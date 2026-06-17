import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OllamaClient, createMessage, defaultRuntimeSettings, type ChatMessage, type ModelInfo } from "@live-runtime/core";
import { speakText } from "../lib/tauriBridge";
import { saveEntry, relatedEntries, type ScoredJournalRecord } from "../lib/semantic";

const KEY = "live-runtime.chat.messages";

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
}

export function useRuntimeChat(): RuntimeChatState {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages());
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState(defaultRuntimeSettings.defaultModel);
  const [baseUrl, setBaseUrl] = useState(defaultRuntimeSettings.providerBaseUrl);
  const [speakResponses, setSpeakResponses] = useState(defaultRuntimeSettings.speakResponses);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const client = useMemo(() => new OllamaClient({ baseUrl }), [baseUrl]);

  useEffect(() => window.localStorage.setItem(KEY, JSON.stringify(messages)), [messages]);

  const reloadModels = useCallback(async () => {
    try {
      setError(null);
      const found = await client.listModels();
      setModels(found);
      if (found.length > 0 && !found.some((item) => item.name === model)) setModel(found[0].name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to connect to Ollama");
    }
  }, [client, model]);

  useEffect(() => { void reloadModels(); }, [reloadModels]);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || isLoading) return;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    const userMessage = createMessage("user", text);
    const assistantMessage = createMessage("assistant", "");
    const history = messages.filter((message) => message.content.trim());
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsLoading(true);
    setError(null);

    const notes = await relatedEntries(baseUrl, text, 6);
    const noteMessage = notes.length > 0 ? createMessage("assistant", summarizeNotes(notes)) : null;

    void saveEntry(baseUrl, { kind: "chat", scope: "longTerm", title: "User message", content: text, source: "chat:user", confidence: 1, tags: ["chat", "user"] });

    let reply = "";
    try {
      for await (const chunk of client.chat({
        model,
        signal: abort.signal,
        messages: [
          { role: "system", content: "You are Live Runtime, a concise local AI companion running through Ollama." },
          ...history,
          ...(noteMessage ? [noteMessage] : []),
          userMessage
        ],
        temperature: defaultRuntimeSettings.temperature
      })) {
        reply += chunk.content;
        setMessages((current) => current.map((message) => message.id === assistantMessage.id ? { ...message, content: reply } : message));
      }

      void saveEntry(baseUrl, { kind: "chat", scope: "longTerm", title: "Assistant reply", content: reply, source: "chat:assistant", confidence: 0.9, tags: ["chat", "assistant", model] });
      if (speakResponses) await speakText(reply);
    } catch (cause) {
      if (!abort.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Chat request failed");
        setMessages((current) => current.map((message) => message.id === assistantMessage.id ? { ...message, content: "I could not reach Ollama. Check that it is running locally and that the selected model exists." } : message));
      }
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, client, isLoading, messages, model, speakResponses]);

  const clear = useCallback(() => {
    const fresh = [createMessage("assistant", "New chat started. What should we work on?")];
    setMessages(fresh);
    window.localStorage.setItem(KEY, JSON.stringify(fresh));
  }, []);

  return { messages, models, model, baseUrl, isLoading, error, speakResponses, setModel, setBaseUrl, setSpeakResponses, reloadModels, send, clear };
}

function summarizeNotes(items: ScoredJournalRecord[]): string {
  const lines = items.map((item, index) => `${index + 1}. ${item.record.content.replace(/\s+/g, " ").slice(0, 220)}`);
  return `Relevant previous notes:\n${lines.join("\n")}`;
}

function readStoredMessages(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [createMessage("assistant", "Live Runtime is ready. Start Ollama, choose a model, then speak or type a message.")];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [createMessage("assistant", "Live Runtime is ready.")];
  } catch {
    return [createMessage("assistant", "Live Runtime is ready.")];
  }
}
