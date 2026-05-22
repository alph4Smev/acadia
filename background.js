chrome.commands.onCommand.addListener((command) => {
  if (command !== "process-page-command") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length || !tabs[0].id) return;
    const tabId = tabs[0].id;
    chrome.storage.sync.get(["showAnswers"], (result) => {
      const showAnswers = typeof result.showAnswers === "boolean" ? result.showAnswers : true;
      chrome.tabs.sendMessage(tabId, { action: "processPage", showAnswers }, () => {
        if (chrome.runtime.lastError) {
          console.error("Background: send message failed", chrome.runtime.lastError.message);
        }
      });
    });
  });
});

async function proxyJsonRequest({ url, method = "POST", headers = {}, body }) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
  if (!response.ok) {
    const providerMessage = data?.error?.message || data?.error?.metadata?.raw || text;
    const err = new Error(`HTTP ${response.status} ${response.statusText}: ${providerMessage}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handlers = {
    ollamaGenerate: () => proxyJsonRequest({ url: request.apiUrl, body: request.payload }),
    groqChat: () => proxyJsonRequest({
      url: request.apiUrl,
      headers: { Authorization: `Bearer ${request.apiKey || ""}` },
      body: request.payload,
    }),
    geminiGenerate: () => proxyJsonRequest({
      url: request.apiUrl,
      headers: { "x-goog-api-key": request.apiKey || "" },
      body: request.payload,
    }),
    openrouterChat: () => proxyJsonRequest({
      url: request.apiUrl,
      headers: {
        Authorization: `Bearer ${request.apiKey || ""}`,
        "HTTP-Referer": "https://github.com/fsociety00dat/netacad-ai",
        "X-Title": "NetAcad AI Study Helper",
      },
      body: request.payload,
    }),
  };

  const handler = handlers[request.action];
  if (!handler) return false;

  (async () => {
    try {
      const data = await handler();
      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message || String(error) });
    }
  })();
  return true;
});
