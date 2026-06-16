import type { AiProvider, ChatChunk, ChatRequest, ModelInfo } from "./types";

interface OllamaTagsResponse {
  models?: Array<{
    name: string;
    size?: number;
    modified_at?: string;
    details?: { family?: string };
  }>;
}

interface OllamaChatResponse {
  message?: { role?: string; content?: string };
  done?: boolean;
  error?: string;
}

export interface OllamaClientOptions {
  baseUrl?: string;
}

export class OllamaClient implements AiProvider {
  readonly id = "ollama";
  readonly label = "Ollama Local";
  private readonly baseUrl: string;

  constructor(options: OllamaClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? "http://localhost:11434");
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama model discovery failed: ${response.status}`);
    }

    const data = (await response.json()) as OllamaTagsResponse;
    return (data.models ?? []).map((model) => ({
      name: model.name,
      size: model.size,
      modifiedAt: model.modified_at,
      family: model.details?.family
    }));
  }

  async *chat(request: ChatRequest): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: request.signal,
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map(({ role, content }) => ({ role, content })),
        stream: true,
        options: typeof request.temperature === "number" ? { temperature: request.temperature } : undefined
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama chat failed: ${response.status}`);
    }

    if (!response.body) {
      const data = (await response.json()) as OllamaChatResponse;
      yield { content: data.message?.content ?? "", done: Boolean(data.done), raw: data };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parsed = JSON.parse(trimmed) as OllamaChatResponse;
        if (parsed.error) throw new Error(parsed.error);
        yield {
          content: parsed.message?.content ?? "",
          done: Boolean(parsed.done),
          raw: parsed
        };
      }
    }

    if (buffer.trim()) {
      const parsed = JSON.parse(buffer) as OllamaChatResponse;
      yield {
        content: parsed.message?.content ?? "",
        done: Boolean(parsed.done),
        raw: parsed
      };
    }
  }
}

export function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}
