export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  id?: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
}

export interface ModelInfo {
  name: string;
  size?: number;
  modifiedAt?: string;
  family?: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
}

export interface ChatChunk {
  content: string;
  done: boolean;
  raw?: unknown;
}

export interface AiProvider {
  readonly id: string;
  readonly label: string;
  listModels(): Promise<ModelInfo[]>;
  chat(request: ChatRequest): AsyncIterable<ChatChunk>;
}
