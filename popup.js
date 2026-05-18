document.addEventListener("DOMContentLoaded", () => {
  const providerSelect = document.getElementById("providerSelect");
  const providerTabsWrap = document.getElementById("providerTabs");
  const providerTabs = Array.from(providerTabsWrap.querySelectorAll(".provider-tab"));

  const sections = {
    gemini: document.getElementById("geminiSection"),
    groq: document.getElementById("groqSection"),
    openrouter: document.getElementById("openrouterSection"),
    ollama: document.getElementById("ollamaSection"),
  };

  const fields = {
    geminiApiKey: document.getElementById("geminiApiKey"),
    geminiModel: document.getElementById("geminiModel"),
    groqApiKey: document.getElementById("groqApiKey"),
    groqModel: document.getElementById("groqModel"),
    groqUrl: document.getElementById("groqUrl"),
    openrouterApiKey: document.getElementById("openrouterApiKey"),
    openrouterModel: document.getElementById("openrouterModel"),
    ollamaUrl: document.getElementById("ollamaUrl"),
    ollamaModel: document.getElementById("ollamaModel"),
    lessonContext: document.getElementById("lessonContext"),
  };

  const toggles = {
    showAnswers: document.getElementById("showAnswersToggle"),
    autoGenerate: document.getElementById("autoGenerateToggle"),
    processOnSwitch: document.getElementById("processOnSwitchToggle"),
    accuracyMode: document.getElementById("accuracyModeToggle"),
    diagnosticMode: document.getElementById("diagnosticModeToggle"),
  };

  const saveBtn = document.getElementById("saveKey");
  const processBtn = document.getElementById("processPage");
  const statusEl = document.getElementById("status");

  const defaults = {
    provider: "gemini",
    geminiModel: "gemini-2.0-flash",
    groqApiUrl: "https://api.groq.com/openai/v1/chat/completions",
    groqModel: "openai/gpt-oss-120b",
    openrouterModel: "meta-llama/llama-3.3-70b-instruct:free",
    ollamaApiUrl: "http://127.0.0.1:11434/api/generate",
    ollamaModel: "qwen3:8b",
  };

  function setStatus(text, kind = "", timeout = 2200) {
    statusEl.textContent = text;
    statusEl.className = kind ? `is-${kind}` : "";
    if (timeout) setTimeout(() => {
      if (statusEl.textContent === text) { statusEl.textContent = ""; statusEl.className = ""; }
    }, timeout);
  }

  function applyProviderVisibility(provider) {
    Object.entries(sections).forEach(([k, el]) => {
      el.classList.toggle("is-hidden", k !== provider);
    });
    providerTabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.provider === provider);
    });
    providerSelect.value = provider;
  }

  providerTabs.forEach((tab) => {
    tab.addEventListener("click", () => applyProviderVisibility(tab.dataset.provider));
  });

  Promise.all([
    chrome.storage.sync.get([
      "provider",
      "geminiModel",
      "groqApiUrl", "groqModel",
      "openrouterModel",
      "ollamaApiUrl", "ollamaModel",
      "showAnswers", "processOnSwitch", "autoGenerate",
      "accuracyMode", "diagnosticMode",
      "lessonContext",
    ]),
    chrome.storage.local.get(["groqApiKey", "geminiApiKey", "openrouterApiKey"]),
  ]).then(([sync, local]) => {
    applyProviderVisibility(sync.provider || defaults.provider);

    fields.geminiApiKey.value = local.geminiApiKey || "";
    fields.geminiModel.value = sync.geminiModel || defaults.geminiModel;
    fields.groqApiKey.value = local.groqApiKey || "";
    fields.groqModel.value = sync.groqModel || defaults.groqModel;
    fields.groqUrl.value = sync.groqApiUrl || defaults.groqApiUrl;
    fields.openrouterApiKey.value = local.openrouterApiKey || "";
    fields.openrouterModel.value = sync.openrouterModel || defaults.openrouterModel;
    fields.ollamaUrl.value = sync.ollamaApiUrl || defaults.ollamaApiUrl;
    fields.ollamaModel.value = sync.ollamaModel || defaults.ollamaModel;
    fields.lessonContext.value = sync.lessonContext || "";

    toggles.showAnswers.checked = typeof sync.showAnswers === "boolean" ? sync.showAnswers : true;
    toggles.processOnSwitch.checked = typeof sync.processOnSwitch === "boolean" ? sync.processOnSwitch : true;
    toggles.autoGenerate.checked = typeof sync.autoGenerate === "boolean" ? sync.autoGenerate : true;
    toggles.accuracyMode.checked = typeof sync.accuracyMode === "boolean" ? sync.accuracyMode : false;
    toggles.diagnosticMode.checked = typeof sync.diagnosticMode === "boolean" ? sync.diagnosticMode : false;

    setStatus("Settings loaded", "success", 1200);
  });

  // Persist toggles immediately
  toggles.showAnswers.addEventListener("change", () => chrome.storage.sync.set({ showAnswers: toggles.showAnswers.checked }));
  toggles.processOnSwitch.addEventListener("change", () => chrome.storage.sync.set({ processOnSwitch: toggles.processOnSwitch.checked }));
  toggles.autoGenerate.addEventListener("change", () => chrome.storage.sync.set({ autoGenerate: toggles.autoGenerate.checked }));
  toggles.accuracyMode.addEventListener("change", () => chrome.storage.sync.set({ accuracyMode: toggles.accuracyMode.checked }));
  toggles.diagnosticMode.addEventListener("change", () => chrome.storage.sync.set({ diagnosticMode: toggles.diagnosticMode.checked }));
  fields.lessonContext.addEventListener("input", () => chrome.storage.sync.set({ lessonContext: fields.lessonContext.value }));

  saveBtn.addEventListener("click", () => {
    const provider = providerSelect.value || defaults.provider;
    Promise.all([
      chrome.storage.sync.set({
        provider,
        geminiModel: fields.geminiModel.value.trim() || defaults.geminiModel,
        groqApiUrl: fields.groqUrl.value.trim() || defaults.groqApiUrl,
        groqModel: fields.groqModel.value.trim() || defaults.groqModel,
        openrouterModel: fields.openrouterModel.value.trim() || defaults.openrouterModel,
        ollamaApiUrl: fields.ollamaUrl.value.trim() || defaults.ollamaApiUrl,
        ollamaModel: fields.ollamaModel.value.trim() || defaults.ollamaModel,
        showAnswers: toggles.showAnswers.checked,
        processOnSwitch: toggles.processOnSwitch.checked,
        autoGenerate: toggles.autoGenerate.checked,
        accuracyMode: toggles.accuracyMode.checked,
        diagnosticMode: toggles.diagnosticMode.checked,
        lessonContext: fields.lessonContext.value,
      }),
      chrome.storage.local.set({
        geminiApiKey: fields.geminiApiKey.value.trim(),
        groqApiKey: fields.groqApiKey.value.trim(),
        openrouterApiKey: fields.openrouterApiKey.value.trim(),
      }),
    ]).then(() => setStatus("Settings saved", "success"));
  });

  processBtn.addEventListener("click", () => {
    setStatus("Sending to page…", "", 0);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length || !tabs[0].id) { setStatus("No active tab", "error", 3000); return; }
      chrome.tabs.sendMessage(tabs[0].id, { action: "processPage", showAnswers: toggles.showAnswers.checked }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus(chrome.runtime.lastError.message, "error", 4000);
        } else if (response && response.success) {
          setStatus("Generating answer…", "success");
        } else if (response && response.error) {
          setStatus(response.error, "error", 4000);
        }
      });
    });
  });
});
