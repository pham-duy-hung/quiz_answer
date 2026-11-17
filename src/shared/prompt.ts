export const SYSTEM_PROMPT = `Bạn là trợ lý trả lời câu hỏi trắc nghiệm.
Chỉ trả về đúng một JSON hợp lệ, không markdown, không giải thích ngoài JSON:
{"answer":"...","explanation":"..."}
- Nếu câu hỏi có lựa chọn A/B/C/D (hoặc tương tự), "answer" phải là ký hiệu đó (ví dụ "B").
- Nếu không có lựa chọn, "answer" là đáp án ngắn nhất có thể.
- "explanation" tối đa 1-2 câu tiếng Việt.`;

export function buildUserPrompt(question: string): string {
  return `Câu hỏi:\n${question.trim()}`;
}

export function parseAnswerJson(raw: string): { answer: string; explanation: string } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON object in response");
  }

  const parsed = JSON.parse(match[0]) as {
    answer?: unknown;
    explanation?: unknown;
  };

  const answer = String(parsed.answer ?? "").trim();
  if (!answer) {
    throw new Error("Empty answer");
  }

  return {
    answer,
    explanation: String(parsed.explanation ?? "").trim(),
  };
}

export function hashQuestion(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}
