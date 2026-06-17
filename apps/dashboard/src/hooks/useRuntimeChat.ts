import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OllamaClient, createMessage, defaultRuntimeSettings, type ChatMessage, type ModelInfo } from "@live-runtime/core";
import { speakText } from "../lib/tauriBridge";
import { saveJournal } from "../lib/journalBridge";

const CHAT_STORAGE_KEY = "live-runtime.chat.messages";

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

  useEffect(() => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const reloadModels = useCallback(async () => {
    try {
      setError(null);
      const discovered = await client.listModels();
      setModels(discovered);
      if (discovered.length > 0 && !discovered.some((item) => item.name === model)) {
        setModel(discovered[0].name);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to connect to Ollama");
    }
  }, [client, model]);

  useEffect(() => {
    void reloadModels();
  }, [reloadModels]);

  const send = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    const userMessage = createMessage("user", trimmed);
    const assistantMessage = createMessage("assistant", "");
    const history = messages.filter((message) => message.content.trim());
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsLoading(true);
    setError(null);

    void saveJournal({
      kind: "chat",
      scope: "longTerm",
      title: "User message",
      content: trimmed,
      source: "chat:user",
      confidence: 1,
      tags: ["chat", "user"]
    });

    let assistantText = "";
    try {
      for await (const chunk of client.chat({
        model,
        signal: abort.signal,
        messages: [
          { role: "system", content: "You are Live Runtime, a concise local AI companion running through Ollama. Maintain context from the existing conversation until the user starts a new chat." },
          ...history,
          userMessage
        ],
        temperature: defaultRuntimeSettings.temperature
      })) {
        assistantText += chunk.content;
        setMessages((current) => current.map((message) => (
          message.id === assistantMessage.id ? { ...message, content: assistantText } : message
        )));
      }

      void saveJournal({
        kind: "chat",
        scope: "longTerm",
        title: "Assistant reply",
        content: assistantText,
        source: "chat:assistant",
        confidence: 0.9,
        tags: ["chat", "assistant", model]
      });

      if (speakResponses) await speakText(assistantText);
    } catch (cause) {
      if (!abort.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Chat request failed");
        setMessages((current) => current.map((message) => (
          message.id === assistantMessage.id ? { ...message, content: "I could not reach Ollama. Check that it is running locally and that the selected model exists." } : message
        )));
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, isLoading, messages, model, speakResponses]);

  const clear = useCallback(() => {
    const fresh = [createMessage("assistant", "New chat started. What should we work on?")];
    setMessages(fresh);
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  return {
    messages,
    models,
    model,
    baseUrl,
    isLoading,
    error,
    speakResponses,
    setModel,
    setBaseUrl,
    setSpeakResponses,
    reloadModels,
    send,
    clear
  };
}

function readStoredMessages(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [createMessage("assistant", "Live Runtime is ready. Start Ollama, choose a model, then speak or type a message.")];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [createMessage("assistant", "Live Runtime is ready.")];
  } catch {
    return [createMessage("assistant", "Live Runtime is ready.")];
  }
}
