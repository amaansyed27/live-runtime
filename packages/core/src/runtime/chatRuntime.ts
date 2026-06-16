import type { AiProvider, ChatMessage } from "../ai/types";

export interface RuntimeConversationOptions {
  provider: AiProvider;
  model: string;
  systemPrompt?: string;
}

export class RuntimeConversation {
  private readonly provider: AiProvider;
  private model: string;
  private readonly systemPrompt: string;
  private history: ChatMessage[] = [];

  constructor(options: RuntimeConversationOptions) {
    this.provider = options.provider;
    this.model = options.model;
    this.systemPrompt = options.systemPrompt ?? defaultRuntimeSystemPrompt;
  }

  setModel(model: string): void {
    this.model = model;
  }

  getMessages(): ChatMessage[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }

  async *send(content: string, signal?: AbortSignal): AsyncIterable<string> {
    const userMessage: ChatMessage = createMessage("user", content);
    const messages: ChatMessage[] = [
      { role: "system", content: this.systemPrompt },
      ...this.history,
      userMessage
    ];

    let assistantContent = "";
    for await (const chunk of this.provider.chat({ model: this.model, messages, signal })) {
      assistantContent += chunk.content;
      yield chunk.content;
    }

    this.history = [...this.history, userMessage, createMessage("assistant", assistantContent)];
  }
}

export const defaultRuntimeSystemPrompt = [
  "You are Live Runtime, a concise local AI companion running on the user's machine.",
  "Prefer practical, short responses unless the user asks for detail.",
  "Never claim cloud access. Assume Ollama is the local model provider."
].join(" ");

export function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString()
  };
}
