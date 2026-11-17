import type { ExtensionSettings } from "./types";

const DEFAULTS: ExtensionSettings = {
  geminiApiKey: "",
  groqApiKey: "",
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get([
    "geminiApiKey",
    "groqApiKey",
  ]);
  return {
    geminiApiKey: String(stored.geminiApiKey ?? DEFAULTS.geminiApiKey),
    groqApiKey: String(stored.groqApiKey ?? DEFAULTS.groqApiKey),
  };
}

export async function saveSettings(
  settings: Partial<ExtensionSettings>,
): Promise<void> {
  await chrome.storage.local.set(settings);
}
