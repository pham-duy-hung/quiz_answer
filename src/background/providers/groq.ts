import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseAnswerJson,
} from "../../shared/prompt";
import type { AnswerPayload } from "../../shared/types";

const MODEL = "openai/gpt-oss-20b";

export async function askGroq(
  apiKey: string,
  question: string,
  signal?: AbortSignal,
): Promise<AnswerPayload> {
  if (!apiKey.trim()) {
    throw new Error("Missing Groq API key");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(question) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq empty response");
  }

  return parseAnswerJson(text);
}
