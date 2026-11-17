import { askGemini } from "../background/providers/gemini";
import { askGroq } from "../background/providers/groq";
import { appendLog } from "./logger";

const PING_QUESTION =
  'Câu hỏi kiểm tra: 1+1 bằng bao nhiêu?\nA. 1\nB. 2\nC. 3\nD. 4';

export async function testGeminiKey(apiKey: string): Promise<boolean> {
  const key = apiKey.trim();
  if (!key) {
    await appendLog("error", "Gemini test: API key trống");
    return false;
  }

  await appendLog("info", "Gemini test: bắt đầu kiểm tra key…");
  try {
    const result = await askGemini(key, PING_QUESTION);
    await appendLog(
      "ok",
      `Gemini test: OK — answer=${result.answer}; explanation=${result.explanation}`,
    );
    return true;
  } catch (error) {
    await appendLog(
      "error",
      `Gemini test: FAIL — ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

export async function testGroqKey(apiKey: string): Promise<boolean> {
  const key = apiKey.trim();
  if (!key) {
    await appendLog("error", "Groq test: API key trống");
    return false;
  }

  await appendLog("info", "Groq test: bắt đầu kiểm tra key…");
  try {
    const result = await askGroq(key, PING_QUESTION);
    await appendLog(
      "ok",
      `Groq test: OK — answer=${result.answer}; explanation=${result.explanation}`,
    );
    return true;
  } catch (error) {
    await appendLog(
      "error",
      `Groq test: FAIL — ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}
