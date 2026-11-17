import type {
  BackgroundToContent,
  ProviderId,
} from "../shared/types";

const OVERLAY_ID = "qah-overlay-root";

let activeRequestId: string | null = null;
let failedCount = 0;
let answeredCount = 0;

chrome.runtime.onMessage.addListener(
  (message: BackgroundToContent, _sender, sendResponse) => {
    if (message.type === "PREPARE_OVERLAY") {
      const result = handlePrepare(message.requestId, message.fallbackText);
      sendResponse(result);
      return true;
    }

    if (!activeRequestId || message.requestId !== activeRequestId) {
      return;
    }

    if (message.type === "ANSWER") {
      answeredCount += 1;
      showAnswer(
        message.provider,
        message.data.answer,
        message.data.explanation,
      );
      return;
    }

    if (message.type === "PROVIDER_FAILED") {
      failedCount += 1;
      hideSlot(message.provider);
      maybeShowEmpty();
      return;
    }

    if (message.type === "ALL_DONE") {
      maybeShowEmpty();
    }
  },
);

function handlePrepare(
  requestId: string,
  fallbackText?: string,
): { ok: boolean; text?: string } {
  clearPrevious();
  activeRequestId = requestId;
  failedCount = 0;
  answeredCount = 0;

  const selection = window.getSelection();
  const selectedText = selection?.toString().trim() ?? "";
  const text = selectedText || fallbackText?.trim() || "";

  if (!text) {
    return { ok: false };
  }

  if (selection && selection.rangeCount > 0 && selectedText) {
    const range = selection.getRangeAt(0).cloneRange();
    const endRect = getEndRect(range);
    showOverlayShell(endRect);
  } else {
    const endRect = new DOMRect(
      Math.min(window.innerWidth - 340, window.innerWidth * 0.55),
      Math.max(80, window.innerHeight * 0.25),
      0,
      20,
    );
    showOverlayShell(endRect);
  }

  return { ok: true, text };
}

function getEndRect(range: Range): DOMRect {
  const endRange = range.cloneRange();
  endRange.collapse(false);

  const rects = endRange.getClientRects();
  if (rects.length > 0) {
    return rects[rects.length - 1];
  }

  const full = range.getBoundingClientRect();
  return new DOMRect(full.right, full.bottom - 16, 0, 16);
}

function showOverlayShell(endRect: DOMRect): void {
  removeOverlay();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "qah-overlay";
  overlay.innerHTML = `
    <div class="qah-overlay-header">
      <div class="qah-overlay-title">Đáp án</div>
      <button type="button" class="qah-close" aria-label="Đóng">×</button>
    </div>
    <div class="qah-slot" data-provider="gemini">
      <div class="qah-provider">Gemini</div>
      <div class="qah-loading">Đang lấy đáp án…</div>
    </div>
    <div class="qah-slot" data-provider="groq">
      <div class="qah-provider">Groq</div>
      <div class="qah-loading">Đang lấy đáp án…</div>
    </div>
  `;

  document.documentElement.appendChild(overlay);

  const top = window.scrollY + endRect.bottom + 6;
  const left = Math.min(
    window.scrollX + endRect.right + 8,
    window.scrollX + window.innerWidth - overlay.offsetWidth - 12,
  );
  overlay.style.top = `${Math.max(8, top)}px`;
  overlay.style.left = `${Math.max(8, left)}px`;

  overlay.querySelector(".qah-close")?.addEventListener("click", () => {
    clearPrevious();
  });
}

function showAnswer(
  provider: ProviderId,
  answer: string,
  explanation: string,
): void {
  const slot = getSlot(provider);
  if (!slot) return;
  slot.hidden = false;
  slot.innerHTML = `
    <div class="qah-provider">${provider === "gemini" ? "Gemini" : "Groq"}</div>
    <div class="qah-answer">${escapeHtml(answer)}</div>
    ${
      explanation
        ? `<div class="qah-explanation">${escapeHtml(explanation)}</div>`
        : ""
    }
  `;
}

function hideSlot(provider: ProviderId): void {
  const slot = getSlot(provider);
  if (slot) slot.hidden = true;
}

function maybeShowEmpty(): void {
  if (answeredCount > 0) return;
  if (failedCount < 2) return;

  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;
  if (overlay.querySelector(".qah-empty")) return;

  const empty = document.createElement("div");
  empty.className = "qah-empty";
  empty.textContent = "Không có đáp án";
  overlay.appendChild(empty);

  window.setTimeout(() => {
    if (activeRequestId) clearPrevious();
  }, 2500);
}

function getSlot(provider: ProviderId): HTMLElement | null {
  return document.querySelector(
    `#${OVERLAY_ID} .qah-slot[data-provider="${provider}"]`,
  );
}

function removeOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
}

function clearPrevious(): void {
  removeOverlay();
  activeRequestId = null;
  failedCount = 0;
  answeredCount = 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
