export interface RuntimeSettings {
  providerBaseUrl: string;
  defaultModel: string;
  speakResponses: boolean;
  temperature: number;
}

export const defaultRuntimeSettings: RuntimeSettings = {
  providerBaseUrl: "http://localhost:11434",
  defaultModel: "qwen3.5:9b",
  speakResponses: true,
  temperature: 0.7
};
