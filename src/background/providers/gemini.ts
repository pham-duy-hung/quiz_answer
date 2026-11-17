import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseAnswerJson,
} from "../../shared/prompt";
import type { AnswerPayload } from "../../shared/types";

// Free-tier: ưu tiên model nhẹ/ít nghẽn; 3.8-flash hay bị 503 high demand.
const MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
] as const;

export async function askGemini(
  apiKey: string,
  question: string,
  signal?: AbortSignal,
): Promise<AnswerPayload> {
  if (!apiKey.trim()) {
    throw new Error("Missing Gemini API key");
  }

  let lastError: Error | null = null;

  for (const model of MODELS) {
    if (signal?.aborted) {
      throw new Error("Aborted");
    }

    try {
      return await callGeminiModel(apiKey.trim(), model, question, signal);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable =
        /HTTP 503|HTTP 429|UNAVAILABLE|high demand|Resource exhausted/i.test(
          lastError.message,
        );
      if (!retryable) {
        throw lastError;
      }
      // Thử model tiếp theo khi bị nghẽn/quota tạm thời.
      await sleep(350, signal);
    }
  }

  throw lastError ?? new Error("Gemini failed");
}

async function callGeminiModel(
  apiKey: string,
  model: string,
  question: string,
  signal?: AbortSignal,
): Promise<AnswerPayload> {
  // 1 retry nhanh nếu đúng model đó bị 503.
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < 2) {
    attempt += 1;
    try {
      return await generateOnce(apiKey, model, question, signal);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable = /HTTP 503|HTTP 429|UNAVAILABLE|high demand/i.test(
        lastError.message,
      );
      if (!retryable || attempt >= 2) {
        throw lastError;
      }
      await sleep(400, signal);
    }
  }

  throw lastError ?? new Error(`Gemini ${model} failed`);
}

async function generateOnce(
  apiKey: string,
  model: string,
  question: string,
  signal?: AbortSignal,
): Promise<AnswerPayload> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    responseMimeType: "application/json",
    maxOutputTokens: 256,
  };

  // 3.8 mặc định thinking medium → chậm, dễ timeout 10s.
  if (model.includes("3.8")) {
    generationConfig.thinkingConfig = { thinkingLevel: "low" };
  }

  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(question)}` }],
        },
      ],
      generationConfig,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 220)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error(`Gemini empty response (${model})`);
  }

  return parseAnswerJson(text);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("Aborted"));
      },
      { once: true },
    );
  });
}
