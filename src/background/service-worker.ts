import { askGemini } from "./providers/gemini";
import { askGroq } from "./providers/groq";
import { withTimeout } from "./providers/timeout";
import { appendLog } from "../shared/logger";
import { hashQuestion } from "../shared/prompt";
import { getSettings } from "../shared/storage";
import {
  PROVIDER_TIMEOUT_MS,
  type AnswerPayload,
  type BackgroundToContent,
  type ProviderId,
} from "../shared/types";

const MENU_ID = "get-dap-an";
const cache = new Map<string, AnswerPayload>();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Get đáp án",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || tab?.id == null) return;

  const tabId = tab.id;
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const prepared = await prepareTab(
      tabId,
      requestId,
      info.selectionText?.trim() || "",
    );

    const question = prepared?.text?.trim() || info.selectionText?.trim() || "";

    if (!question) {
      await appendLog("warn", `request=${requestId}: không có selection`);
      await failBoth(tabId, requestId);
      return;
    }

    await appendLog(
      "info",
      `request=${requestId}: Get đáp án — ${question.slice(0, 120).replace(/\s+/g, " ")}`,
    );

    const settings = await getSettings();
    const questionHash = hashQuestion(question);

    // Both run in parallel; each streams result to the page as soon as it finishes.
    // Overlay keeps Gemini slot above Groq slot.
    await Promise.allSettled([
      runProvider({
        provider: "gemini",
        tabId,
        requestId,
        question,
        questionHash,
        apiKey: settings.geminiApiKey,
        ask: askGemini,
      }),
      runProvider({
        provider: "groq",
        tabId,
        requestId,
        question,
        questionHash,
        apiKey: settings.groqApiKey,
        ask: askGroq,
      }),
    ]);

    await sendToTab(tabId, { type: "ALL_DONE", requestId });
  } catch (error) {
    console.error("Get đáp án failed", error);
    await appendLog(
      "error",
      `request=${requestId}: handler failed — ${error instanceof Error ? error.message : String(error)}`,
    );
    await failBoth(tabId, requestId);
  }
});

async function failBoth(tabId: number, requestId: string): Promise<void> {
  await sendToTab(tabId, {
    type: "PROVIDER_FAILED",
    requestId,
    provider: "gemini",
  });
  await sendToTab(tabId, {
    type: "PROVIDER_FAILED",
    requestId,
    provider: "groq",
  });
  await sendToTab(tabId, { type: "ALL_DONE", requestId });
}

async function runProvider(opts: {
  provider: ProviderId;
  tabId: number;
  requestId: string;
  question: string;
  questionHash: string;
  apiKey: string;
  ask: (
    apiKey: string,
    question: string,
    signal?: AbortSignal,
  ) => Promise<AnswerPayload>;
}): Promise<void> {
  const cacheKey = `${opts.questionHash}:${opts.provider}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    await appendLog(
      "info",
      `${opts.provider}: cache hit — answer=${cached.answer}`,
    );
    await sendToTab(opts.tabId, {
      type: "ANSWER",
      requestId: opts.requestId,
      provider: opts.provider,
      data: cached,
    });
    return;
  }

  if (!opts.apiKey.trim()) {
    await appendLog("error", `${opts.provider}: thiếu API key`);
    await sendToTab(opts.tabId, {
      type: "PROVIDER_FAILED",
      requestId: opts.requestId,
      provider: opts.provider,
    });
    return;
  }

  const controller = new AbortController();
  try {
    const data = await withTimeout(
      opts.ask(opts.apiKey, opts.question, controller.signal),
      PROVIDER_TIMEOUT_MS,
      controller.signal,
    );
    cache.set(cacheKey, data);
    await appendLog(
      "ok",
      `${opts.provider}: OK — answer=${data.answer}; explanation=${data.explanation}`,
    );
    await sendToTab(opts.tabId, {
      type: "ANSWER",
      requestId: opts.requestId,
      provider: opts.provider,
      data,
    });
  } catch (error) {
    controller.abort();
    await appendLog(
      "error",
      `${opts.provider}: FAIL/timeout — ${error instanceof Error ? error.message : String(error)}`,
    );
    await sendToTab(opts.tabId, {
      type: "PROVIDER_FAILED",
      requestId: opts.requestId,
      provider: opts.provider,
    });
  }
}

function sendToTab(tabId: number, message: BackgroundToContent): Promise<void> {
  return chrome.tabs.sendMessage(tabId, message).then(
    () => undefined,
    () => undefined,
  );
}

async function prepareTab(
  tabId: number,
  requestId: string,
  fallbackText: string,
): Promise<{ ok: boolean; text?: string } | undefined> {
  const payload = {
    type: "PREPARE_OVERLAY" as const,
    requestId,
    fallbackText,
  };

  try {
    return (await chrome.tabs.sendMessage(tabId, payload)) as {
      ok: boolean;
      text?: string;
    };
  } catch {
    // Page opened before extension load — inject content script once.
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["overlay.css"],
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      return (await chrome.tabs.sendMessage(tabId, payload)) as {
        ok: boolean;
        text?: string;
      };
    } catch (error) {
      console.error("Cannot inject content script", error);
      return undefined;
    }
  }
}
