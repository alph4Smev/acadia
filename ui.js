function deepQuerySelectorAllOpenShadow(selector, root = document) {
  const matches = [];
  const seenRoots = new Set();
  function walk(currentRoot) {
    if (!currentRoot || seenRoots.has(currentRoot)) return;
    seenRoots.add(currentRoot);
    try {
      if (currentRoot.querySelectorAll) {
        matches.push(...currentRoot.querySelectorAll(selector));
        currentRoot.querySelectorAll("*").forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
      }
    } catch (_) {}
  }
  walk(root);
  return matches;
}

function clearNetacadStudyHelperUis() {
  const selectors = [".netacad-ai-assistant-ui", "#netacad-ai-current-hint", "[id^='netacad-ai-q-']"];
  selectors.forEach((selector) => {
    deepQuerySelectorAllOpenShadow(selector).forEach((el) => { try { el.remove(); } catch (_) {} });
    try {
      document.querySelectorAll(selector).forEach((el) => { try { el.remove(); } catch (_) {} });
    } catch (_) {}
  });
}

function buildQuestionSignature(questionText, answerTexts) {
  return `${String(questionText || "").trim()}::${(answerTexts || [])
    .map((a) => String(a || "").trim()).join("||")}`;
}

window.clearNetacadStudyHelperUis = clearNetacadStudyHelperUis;
window.buildNetacadQuestionSignature = buildQuestionSignature;

function pruneNetacadStudyHelperDuplicateUis() {
  const panels = deepQuerySelectorAllOpenShadow(".netacad-ai-assistant-ui");
  let keeper = document.getElementById("netacad-ai-current-hint");
  if (!keeper) {
    const currentPanels = panels.filter((el) => el.id === "netacad-ai-current-hint");
    keeper = currentPanels[currentPanels.length - 1] || null;
  }
  panels.forEach((panel) => {
    if (panel !== keeper) { try { panel.remove(); } catch (_) {} }
  });
}

window.pruneNetacadStudyHelperDuplicateUis = pruneNetacadStudyHelperDuplicateUis;

const NETACAD_UI_STYLE_ID = "netacad-ai-style-sheet";
const NETACAD_UI_STYLES = `
@keyframes netacad-ai-fade-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes netacad-ai-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@keyframes netacad-ai-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.netacad-ai-assistant-ui {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 380px;
  max-height: 560px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Inter", "Helvetica Neue", sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(241, 245, 249, 0.95);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.92) 100%);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  animation: netacad-ai-fade-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.netacad-ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  cursor: grab;
  user-select: none;
}
.netacad-ai-header:active { cursor: grabbing; }
.netacad-ai-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.85);
}
.netacad-ai-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22d3ee;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.6);
  animation: netacad-ai-pulse 1.6s ease-in-out infinite;
}
.netacad-ai-status-dot.is-ready { background: #34d399; box-shadow: 0 0 12px rgba(52, 211, 153, 0.5); animation: none; }
.netacad-ai-status-dot.is-error { background: #f87171; box-shadow: 0 0 12px rgba(248, 113, 113, 0.55); animation: none; }
.netacad-ai-actions { display: flex; gap: 4px; }
.netacad-ai-icon-btn {
  background: transparent;
  border: none;
  color: rgba(148, 163, 184, 0.7);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
.netacad-ai-icon-btn:hover { background: rgba(148, 163, 184, 0.14); color: rgba(241, 245, 249, 0.95); }
.netacad-ai-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
}
.netacad-ai-body::-webkit-scrollbar { width: 6px; }
.netacad-ai-body::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
.netacad-ai-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 6px;
  color: rgba(148, 163, 184, 0.85);
  font-size: 13px;
}
.netacad-ai-loading-bar {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.08) 0%, rgba(34, 211, 238, 0.55) 50%, rgba(34, 211, 238, 0.08) 100%);
  background-size: 200% 100%;
  animation: netacad-ai-shimmer 1.4s linear infinite;
}
.netacad-ai-answer-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.netacad-ai-answer-pill {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.10) 0%, rgba(16, 185, 129, 0.08) 100%);
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 10px;
  color: rgba(236, 254, 255, 0.98);
  font-weight: 500;
}
.netacad-ai-answer-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(34, 211, 238, 0.20);
  color: #67e8f9;
  font-size: 11px;
  font-weight: 700;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}
.netacad-ai-answer-text { flex: 1; line-height: 1.45; word-break: break-word; }
.netacad-ai-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.85);
}
.netacad-ai-confidence {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: 10px;
}
.netacad-ai-confidence.high   { background: rgba(52, 211, 153, 0.14); color: #6ee7b7; }
.netacad-ai-confidence.medium { background: rgba(250, 204, 21, 0.14); color: #fde68a; }
.netacad-ai-confidence.low    { background: rgba(248, 113, 113, 0.16); color: #fca5a5; }
.netacad-ai-section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.7);
  margin-bottom: 6px;
}
.netacad-ai-analysis {
  font-size: 12px;
  color: rgba(203, 213, 225, 0.85);
  line-height: 1.55;
  padding: 10px 12px;
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.10);
  border-radius: 8px;
}
.netacad-ai-error {
  padding: 12px;
  background: rgba(127, 29, 29, 0.30);
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: 8px;
  color: #fecaca;
  font-size: 12px;
  word-break: break-word;
}
.netacad-ai-footer {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.10);
  background: rgba(2, 6, 23, 0.35);
}
.netacad-ai-btn {
  flex: 1;
  padding: 8px 12px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}
.netacad-ai-btn:hover {
  background: rgba(51, 65, 85, 0.85);
  border-color: rgba(148, 163, 184, 0.32);
  color: rgba(241, 245, 249, 1);
}
.netacad-ai-btn.primary {
  background: linear-gradient(135deg, rgba(8, 145, 178, 0.4) 0%, rgba(6, 182, 212, 0.4) 100%);
  border-color: rgba(34, 211, 238, 0.4);
  color: #ecfeff;
}
.netacad-ai-btn.primary:hover {
  background: linear-gradient(135deg, rgba(8, 145, 178, 0.6) 0%, rgba(6, 182, 212, 0.6) 100%);
}
.netacad-ai-diag {
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(2, 6, 23, 0.55);
  border: 1px dashed rgba(148, 163, 184, 0.18);
  border-radius: 6px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 10.5px;
  color: rgba(148, 163, 184, 0.85);
  white-space: pre-wrap;
  word-break: break-word;
}
.netacad-ai-collapsed .netacad-ai-body,
.netacad-ai-collapsed .netacad-ai-footer { display: none; }
.netacad-ai-collapsed { max-height: 48px; }
`;

function ensureNetacadStyles() {
  if (document.getElementById(NETACAD_UI_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = NETACAD_UI_STYLE_ID;
  style.textContent = NETACAD_UI_STYLES;
  document.head.appendChild(style);
}

function makeDraggable(panel, handle) {
  let startX = 0, startY = 0, baseLeft = 0, baseTop = 0, dragging = false;
  handle.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    baseLeft = rect.left; baseTop = rect.top;
    panel.style.right = "auto";
    panel.style.left = baseLeft + "px";
    panel.style.top = baseTop + "px";
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    panel.style.left = (baseLeft + e.clientX - startX) + "px";
    panel.style.top = (baseTop + e.clientY - startY) + "px";
  });
  window.addEventListener("mouseup", () => { dragging = false; });
}

function createAiAssistantUI(uiContainerId) {
  ensureNetacadStyles();
  const ui = document.createElement("div");
  ui.id = uiContainerId;
  ui.className = "netacad-ai-assistant-ui";

  ui.innerHTML = `
    <div class="netacad-ai-header">
      <div class="netacad-ai-brand">
        <span class="netacad-ai-status-dot"></span>
        <span>Acadia</span>
      </div>
      <div class="netacad-ai-actions">
        <button class="netacad-ai-icon-btn" data-action="collapse" title="Minimize">−</button>
        <button class="netacad-ai-icon-btn" data-action="close" title="Close">×</button>
      </div>
    </div>
    <div class="netacad-ai-body">
      <div class="netacad-ai-loading" data-role="loading">
        <span>Analyzing question</span>
        <span class="netacad-ai-loading-bar"></span>
      </div>
      <div data-role="result" style="display:none;"></div>
      <div class="netacad-ai-diag" data-role="diag" style="display:none;"></div>
    </div>
    <div class="netacad-ai-footer">
      <button class="netacad-ai-btn primary" data-action="refresh">Regenerate</button>
      <button class="netacad-ai-btn" data-action="copy">Copy answer</button>
    </div>
  `;

  const header = ui.querySelector(".netacad-ai-header");
  const statusDot = ui.querySelector(".netacad-ai-status-dot");
  const body = ui.querySelector(".netacad-ai-body");
  const loadingEl = ui.querySelector('[data-role="loading"]');
  const resultEl = ui.querySelector('[data-role="result"]');
  const diagEl = ui.querySelector('[data-role="diag"]');
  const refreshBtn = ui.querySelector('[data-action="refresh"]');
  const copyBtn = ui.querySelector('[data-action="copy"]');
  const collapseBtn = ui.querySelector('[data-action="collapse"]');
  const closeBtn = ui.querySelector('[data-action="close"]');

  collapseBtn.addEventListener("click", () => {
    ui.classList.toggle("netacad-ai-collapsed");
    collapseBtn.textContent = ui.classList.contains("netacad-ai-collapsed") ? "+" : "−";
  });
  closeBtn.addEventListener("click", () => { try { ui.remove(); } catch (_) {} });
  makeDraggable(ui, header);

  return { uiContainer: ui, statusDot, body, loadingEl, resultEl, diagEl, refreshBtn, copyBtn };
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderAnswerResult(resultEl, result) {
  if (result.error) {
    resultEl.innerHTML = `<div class="netacad-ai-error">${escapeHtml(result.error)}</div>`;
    return { copyText: result.error, isError: true };
  }
  const confidence = (result.confidence || "medium").toLowerCase();
  const indices = result.indices || [];
  const picked = result.picked || [];

  let html = `<div class="netacad-ai-meta">
    <span class="netacad-ai-confidence ${confidence}">${escapeHtml(confidence)} confidence</span>
    <span>${picked.length} answer${picked.length === 1 ? "" : "s"}</span>
  </div>`;

  html += `<div class="netacad-ai-section-label">Answer${picked.length === 1 ? "" : "s"}</div>`;
  html += `<div class="netacad-ai-answer-block">`;
  picked.forEach((text, i) => {
    const idx = indices[i];
    html += `<div class="netacad-ai-answer-pill">
      ${idx ? `<span class="netacad-ai-answer-index">${idx}</span>` : ""}
      <span class="netacad-ai-answer-text">${escapeHtml(text)}</span>
    </div>`;
  });
  html += `</div>`;

  if (result.analysis) {
    html += `<div class="netacad-ai-section-label">Reasoning</div>`;
    html += `<div class="netacad-ai-analysis">${escapeHtml(result.analysis)}</div>`;
  }

  resultEl.innerHTML = html;
  const copyText = picked.map((t, i) => indices[i] ? `[${indices[i]}] ${t}` : t).join("\n");
  return { copyText, isError: false };
}

function extractQuestionAndAnswers(mcqViewElement) {
  let questionText = "Question text not found";
  let answerElements = [];
  let questionTextElement = null;
  try {
    if (mcqViewElement && mcqViewElement.shadowRoot) {
      const baseView = mcqViewElement.shadowRoot.querySelector('base-view[type="component"]');
      if (baseView && baseView.shadowRoot) {
        questionTextElement =
          baseView.shadowRoot.querySelector("div.component__body-inner.mcq__body-inner") ||
          baseView.shadowRoot.querySelector(".mcq__prompt") ||
          baseView.shadowRoot.querySelector(".prompt");
      }
      if (!questionTextElement) {
        questionTextElement =
          mcqViewElement.shadowRoot.querySelector("div.component__body-inner.mcq__body-inner") ||
          mcqViewElement.shadowRoot.querySelector(".mcq__prompt") ||
          mcqViewElement.shadowRoot.querySelector(".prompt");
      }
      if (questionTextElement) questionText = questionTextElement.innerText.trim();
      answerElements = mcqViewElement.shadowRoot.querySelectorAll(".mcq__item-label.js-item-label");
    }
  } catch (_) {}
  return { questionText, answerElements, questionTextElement };
}

function processAnswerElements(answerElements) {
  return Array.from(answerElements).map((el) => {
    const text = el.innerText.trim();
    const input = el.closest('mcq-item-view')?.shadowRoot?.querySelector('input');
    const type = input ? input.type : 'unknown';
    return { text, type };
  });
}

async function handleRefreshAction(ctx, options = {}) {
  const { questionText, answerTexts, answerTypes, apiKey,
          statusDot, loadingEl, resultEl, diagEl, copyBtn } = ctx;
  const requestSignature = buildQuestionSignature(questionText, answerTexts);
  resultEl.dataset.questionSignature = requestSignature;

  resultEl.style.display = "none";
  loadingEl.style.display = "flex";
  statusDot.className = "netacad-ai-status-dot";
  copyBtn.disabled = true;

  if (apiKey.diagnosticMode && diagEl) {
    diagEl.style.display = "block";
    diagEl.textContent = `Q: ${questionText}\nOPTIONS: ${answerTexts.join(" | ")}\nTYPES: ${(answerTypes || []).join(", ")}\nCONTEXT: ${apiKey.lessonContext ? "LOADED" : "EMPTY"}\nPROVIDER: ${apiKey.provider}${options.force ? "\nFORCE: true" : ""}`;
  } else if (diagEl) {
    diagEl.style.display = "none";
  }

  const result = await getAiAnswer(questionText, answerTexts, apiKey, answerTypes, { force: !!options.force });

  if (!resultEl.isConnected || resultEl.dataset.questionSignature !== requestSignature) return;

  loadingEl.style.display = "none";
  resultEl.style.display = "block";
  const { copyText, isError } = renderAnswerResult(resultEl, result);
  statusDot.className = "netacad-ai-status-dot " + (isError ? "is-error" : "is-ready");
  copyBtn.disabled = false;
  copyBtn.dataset.copyText = copyText;
}

function renderGenericResult(resultEl, result) {
  if (result.error) {
    resultEl.innerHTML = `<div class="netacad-ai-error">${escapeHtml(result.error)}</div>`;
    return { copyText: result.error, isError: true };
  }
  const confidence = (result.confidence || "medium").toLowerCase();
  const qtype = result.questionType || "other";
  const structured = result.structuredAnswer || [];

  let html = `<div class="netacad-ai-meta">
    <span class="netacad-ai-confidence ${confidence}">${escapeHtml(confidence)} confidence</span>
    <span>${escapeHtml(qtype)}</span>
  </div>`;

  html += `<div class="netacad-ai-section-label">Answer</div>`;

  if (structured.length && (qtype === "ordering" || structured[0]?.position)) {
    html += `<div class="netacad-ai-answer-block">`;
    structured.forEach((item, i) => {
      const pos = item.position || `${i + 1}`;
      html += `<div class="netacad-ai-answer-pill">
        <span class="netacad-ai-answer-index">${escapeHtml(String(pos))}</span>
        <span class="netacad-ai-answer-text">${escapeHtml(item.item || item.text || "")}</span>
      </div>`;
    });
    html += `</div>`;
  } else if (structured.length && (qtype === "matching" || structured[0]?.left)) {
    html += `<div class="netacad-ai-answer-block">`;
    structured.forEach((pair) => {
      html += `<div class="netacad-ai-answer-pill">
        <span class="netacad-ai-answer-text">
          <strong style="color:#67e8f9;">${escapeHtml(pair.left || "")}</strong>
          <span style="opacity:0.6; margin:0 6px;">↔</span>
          ${escapeHtml(pair.right || "")}
        </span>
      </div>`;
    });
    html += `</div>`;
  } else if (result.answer) {
    html += `<div class="netacad-ai-analysis" style="white-space:pre-wrap;">${escapeHtml(result.answer)}</div>`;
  }

  if (result.analysis) {
    html += `<div class="netacad-ai-section-label" style="margin-top:10px;">Reasoning</div>`;
    html += `<div class="netacad-ai-analysis">${escapeHtml(result.analysis)}</div>`;
  }

  resultEl.innerHTML = html;

  let copyText;
  if (structured.length && structured[0]?.position) {
    copyText = structured.map((s) => `${s.position}: ${s.item || s.text || ""}`).join("\n");
  } else if (structured.length && structured[0]?.left) {
    copyText = structured.map((s) => `${s.left} ↔ ${s.right}`).join("\n");
  } else {
    copyText = result.answer || "";
  }
  return { copyText, isError: false };
}

async function processGenericQuestion(rawText, apiKey) {
  const uiContainerId = "netacad-ai-current-hint";
  clearNetacadStudyHelperUis();

  const ctx = createAiAssistantUI(uiContainerId);
  const { uiContainer, statusDot, loadingEl, resultEl, diagEl, refreshBtn, copyBtn } = ctx;
  document.body.appendChild(uiContainer);

  const signature = `generic::${rawText.slice(0, 200)}`;

  async function run(options = {}) {
    resultEl.dataset.questionSignature = signature;
    resultEl.style.display = "none";
    loadingEl.style.display = "flex";
    statusDot.className = "netacad-ai-status-dot";
    copyBtn.disabled = true;

    if (apiKey.diagnosticMode && diagEl) {
      diagEl.style.display = "block";
      diagEl.textContent = `MODE: generic\nLEN: ${rawText.length}\nPREVIEW:\n${rawText.slice(0, 600)}\n…\nPROVIDER: ${apiKey.provider}${options.force ? "\nFORCE: true" : ""}`;
    } else if (diagEl) {
      diagEl.style.display = "none";
    }

    const result = await getGenericAiAnswer(rawText, apiKey, { force: !!options.force });
    if (!resultEl.isConnected || resultEl.dataset.questionSignature !== signature) return;

    loadingEl.style.display = "none";
    resultEl.style.display = "block";
    const { copyText, isError } = renderGenericResult(resultEl, result);
    statusDot.className = "netacad-ai-status-dot " + (isError ? "is-error" : "is-ready");
    copyBtn.disabled = false;
    copyBtn.dataset.copyText = copyText;
  }

  refreshBtn.addEventListener("click", () => run({ force: true }));
  copyBtn.addEventListener("click", async () => {
    const text = copyBtn.dataset.copyText || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => { copyBtn.textContent = original; }, 1200);
    } catch (_) {}
  });

  run();
}

window.processGenericQuestion = processGenericQuestion;

async function processSingleQuestion(mcqViewElement, index, apiKey) {
  const uiContainerId = "netacad-ai-current-hint";
  clearNetacadStudyHelperUis();

  const ctx = createAiAssistantUI(uiContainerId);
  const { uiContainer, refreshBtn, copyBtn } = ctx;

  const { questionText, answerElements } = extractQuestionAndAnswers(mcqViewElement);
  const answerData = processAnswerElements(answerElements);
  const answerTexts = answerData.map((a) => a.text);
  const answerTypes = answerData.map((a) => a.type);

  document.body.appendChild(uiContainer);

  const runCtx = { ...ctx, questionText, answerTexts, answerTypes, apiKey };

  refreshBtn.addEventListener("click", () => handleRefreshAction(runCtx, { force: true }));
  copyBtn.addEventListener("click", async () => {
    const text = copyBtn.dataset.copyText || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => { copyBtn.textContent = original; }, 1200);
    } catch (_) {}
  });

  handleRefreshAction(runCtx);
}
