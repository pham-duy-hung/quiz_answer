import { getSettings, saveSettings } from "../shared/storage";
import {
  appendLog,
  clearLogs,
  downloadLogFile,
  formatLogs,
  getLogs,
} from "../shared/logger";
import { testGeminiKey, testGroqKey } from "../shared/test-api";

const geminiInput = document.getElementById("geminiKey") as HTMLInputElement;
const groqInput = document.getElementById("groqKey") as HTMLInputElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const testGeminiBtn = document.getElementById("testGemini") as HTMLButtonElement;
const testGroqBtn = document.getElementById("testGroq") as HTMLButtonElement;
const refreshLogBtn = document.getElementById("refreshLog") as HTMLButtonElement;
const downloadLogBtn = document.getElementById("downloadLog") as HTMLButtonElement;
const clearLogBtn = document.getElementById("clearLog") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;
const geminiStatus = document.getElementById("geminiStatus") as HTMLParagraphElement;
const groqStatus = document.getElementById("groqStatus") as HTMLParagraphElement;
const logView = document.getElementById("logView") as HTMLPreElement;

async function init(): Promise<void> {
  const settings = await getSettings();
  geminiInput.value = settings.geminiApiKey;
  groqInput.value = settings.groqApiKey;
  await refreshLogView();
}

async function refreshLogView(): Promise<void> {
  const logs = await getLogs();
  logView.textContent = logs.length ? formatLogs(logs) : "(chưa có log)";
  logView.scrollTop = logView.scrollHeight;
}

function setBusy(busy: boolean): void {
  saveBtn.disabled = busy;
  testGeminiBtn.disabled = busy;
  testGroqBtn.disabled = busy;
}

saveBtn.addEventListener("click", async () => {
  await saveSettings({
    geminiApiKey: geminiInput.value.trim(),
    groqApiKey: groqInput.value.trim(),
  });
  await appendLog("info", "Đã lưu API keys từ popup");
  status.textContent = "Đã lưu API key.";
  await refreshLogView();
  window.setTimeout(() => {
    status.textContent = "";
  }, 2000);
});

testGeminiBtn.addEventListener("click", async () => {
  setBusy(true);
  geminiStatus.className = "key-status";
  geminiStatus.textContent = "Đang kiểm tra Gemini…";
  status.textContent = "";

  const ok = await testGeminiKey(geminiInput.value);
  geminiStatus.className = `key-status ${ok ? "ok" : "fail"}`;
  geminiStatus.textContent = ok
    ? "Gemini key hoạt động."
    : "Gemini key lỗi — xem log.";
  status.textContent = ok ? "Gemini OK" : "Gemini FAIL";
  status.style.color = ok ? "#15803d" : "#b91c1c";
  await refreshLogView();
  setBusy(false);
});

testGroqBtn.addEventListener("click", async () => {
  setBusy(true);
  groqStatus.className = "key-status";
  groqStatus.textContent = "Đang kiểm tra Groq…";
  status.textContent = "";

  const ok = await testGroqKey(groqInput.value);
  groqStatus.className = `key-status ${ok ? "ok" : "fail"}`;
  groqStatus.textContent = ok
    ? "Groq key hoạt động."
    : "Groq key lỗi — xem log.";
  status.textContent = ok ? "Groq OK" : "Groq FAIL";
  status.style.color = ok ? "#15803d" : "#b91c1c";
  await refreshLogView();
  setBusy(false);
});

refreshLogBtn.addEventListener("click", () => {
  void refreshLogView();
});

downloadLogBtn.addEventListener("click", async () => {
  const logs = await getLogs();
  downloadLogFile(formatLogs(logs), "quiz-answer.log");
  status.textContent = "Đã tải quiz-answer.log";
  status.style.color = "#15803d";
});

clearLogBtn.addEventListener("click", async () => {
  await clearLogs();
  await appendLog("info", "Log đã được xóa");
  await refreshLogView();
  status.textContent = "Đã xóa log.";
  status.style.color = "#15803d";
});

void init();
