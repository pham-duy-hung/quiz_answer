import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseAnswerJson,
} from "../../shared/prompt";
import type { AnswerPayload } from "../../shared/types";

const MODEL = "gemini-3.8-flash";

export async function askGemini(
  apiKey: string,
  question: string,
  signal?: AbortSignal,
): Promise<AnswerPayload> {
  if (!apiKey.trim()) {
    throw new Error("Missing Gemini API key");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
    `?key=${encodeURIComponent(apiKey.trim())}`;

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
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
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
    throw new Error("Gemini empty response");
  }

  return parseAnswerJson(text);
}
