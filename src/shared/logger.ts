export type LogLevel = "info" | "ok" | "error" | "warn";

export interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

const STORAGE_KEY = "appLogs";
const MAX_ENTRIES = 500;

export async function appendLog(
  level: LogLevel,
  message: string,
): Promise<void> {
  const entry: LogEntry = {
    time: new Date().toISOString(),
    level,
    message,
  };

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const prev = Array.isArray(stored[STORAGE_KEY])
    ? (stored[STORAGE_KEY] as LogEntry[])
    : [];
  const next = [...prev, entry].slice(-MAX_ENTRIES);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

export async function getLogs(): Promise<LogEntry[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(stored[STORAGE_KEY])
    ? (stored[STORAGE_KEY] as LogEntry[])
    : [];
}

export async function clearLogs(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
}

export function formatLogs(entries: LogEntry[]): string {
  return entries
    .map((e) => `[${e.time}] [${e.level.toUpperCase()}] ${e.message}`)
    .join("\n");
}

export function downloadLogFile(content: string, filename = "quiz-answer.log"): void {
  const blob = new Blob([content || "(empty log)\n"], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
