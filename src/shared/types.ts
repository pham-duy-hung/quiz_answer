export type ProviderId = "gemini" | "groq";

export interface AnswerPayload {
  answer: string;
  explanation: string;
}

export interface ExtensionSettings {
  geminiApiKey: string;
  groqApiKey: string;
}

export type BackgroundToContent =
  | { type: "PREPARE_OVERLAY"; requestId: string; fallbackText?: string }
  | { type: "ANSWER"; requestId: string; provider: ProviderId; data: AnswerPayload }
  | { type: "PROVIDER_FAILED"; requestId: string; provider: ProviderId }
  | { type: "ALL_DONE"; requestId: string };

export const PROVIDER_TIMEOUT_MS = 10_000;
