console.log("NetAcad AI Study Helper content script loaded and ready.");

// Clean up panels left behind by older extension builds when the page is not refreshed.
setTimeout(() => {
  if (typeof window.clearNetacadStudyHelperUis === "function") window.clearNetacadStudyHelperUis();
}, 50);

setInterval(() => {
  if (typeof window.pruneNetacadStudyHelperDuplicateUis === "function") {
    window.pruneNetacadStudyHelperDuplicateUis();
  }
}, 1200);

let debounceTimeout;
let observerStarted = false;
let lastUrl = location.href;
let lastQuizSignature = "";
let questionWatcherStarted = false;

async function getAutoSettings() {
  const result = await chrome.storage.sync.get(["showAnswers", "processOnSwitch", "autoGenerate"]);
  return {
    showAnswers: typeof result.showAnswers === "boolean" ? result.showAnswers : true,
    processOnSwitch: typeof result.processOnSwitch === "boolean" ? result.processOnSwitch : true,
    autoGenerate: typeof result.autoGenerate === "boolean" ? result.autoGenerate : true,
  };
}

function debouncedScrape(reason = "page change") {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(async () => {
    const settings = await getAutoSettings();

    if (!settings.showAnswers) {
      console.debug("NetAcad Study Helper: Study hints are disabled.");
      return;
    }

    if (!settings.autoGenerate) {
      console.debug("NetAcad Study Helper: Auto-generate is disabled.");
      return;
    }

    if (reason !== "initial" && !settings.processOnSwitch) {
      console.debug("NetAcad Study Helper: Page switch detected but refresh-on-switch is disabled.");
      return;
    }

    if (typeof window.scrapeData === "function") {
      console.debug(`NetAcad Study Helper: Auto-generating study hints (${reason}).`);
      window.scrapeData();
    } else {
      console.error("NetAcad Study Helper: window.scrapeData not found for debounced call.");
    }
  }, 900);
}

function findDeepElements(selector, root = document) {
  const results = [];
  const seenRoots = new Set();

  function walk(currentRoot) {
    if (!currentRoot || seenRoots.has(currentRoot)) return;
    seenRoots.add(currentRoot);

    try {
      if (currentRoot.querySelectorAll) {
        results.push(...currentRoot.querySelectorAll(selector));
        currentRoot.querySelectorAll("*").forEach((el) => {
          if (el.shadowRoot) walk(el.shadowRoot);
        });
      }
    } catch (error) {
      console.debug("NetAcad Study Helper: deep element scan skipped a root:", error);
    }
  }

  walk(root);
  return results;
}

function getVisibleQuizSignature() {
  try {
    const mcqViews = findDeepElements("mcq-view").filter((el) => el && el.isConnected);
    if (!mcqViews.length || typeof extractQuestionAndAnswers !== "function") return "";

    const mapped = mcqViews.map((mcqView, index) => {
      const extracted = extractQuestionAndAnswers(mcqView, index);
      const answerTexts = typeof processAnswerElements === "function"
        ? processAnswerElements(extracted.answerElements, index)
        : Array.from(extracted.answerElements || []).map((el) => el.innerText.trim());
      const buildSig = typeof buildNetacadQuestionSignature === "function"
        ? buildNetacadQuestionSignature
        : (q, a) => `${q}::${(a || []).join("||")}`;
      return {
        question: extracted.questionText,
        answers: answerTexts,
        answerElements: Array.from(extracted.answerElements || []),
        mcqViewElement: mcqView,
        originalIndex: index,
        questionTextElement: extracted.questionTextElement,
        signature: buildSig(extracted.questionText, answerTexts),
      };
    }).filter((q) => q.signature);

    if (typeof netacadStudyHelperChooseCurrentQuestion === "function") {
      const current = netacadStudyHelperChooseCurrentQuestion(mapped);
      return current.map((q) => q.signature || "").filter(Boolean).join("\n---NETACAD-Q---\n");
    }

    return mapped.map((q) => q.signature || "").filter(Boolean).join("\n---NETACAD-Q---\n");
  } catch (error) {
    console.debug("NetAcad Study Helper: Unable to compute quiz signature:", error);
    return "";
  }
}

function initQuestionSignatureWatcher() {
  if (questionWatcherStarted) return;
  questionWatcherStarted = true;

  setInterval(() => {
    const signature = getVisibleQuizSignature();
    if (!signature) return;

    if (!lastQuizSignature) {
      lastQuizSignature = signature;
      return;
    }

    if (signature !== lastQuizSignature) {
      lastQuizSignature = signature;
      console.debug("NetAcad Study Helper: Detected visible question/options change.");
      if (typeof window.clearNetacadStudyHelperUis === "function") {
        window.clearNetacadStudyHelperUis();
      }
      debouncedScrape("question/options change");
    }
  }, 650);
}

function initMutationObserver() {
  if (observerStarted) return;
  console.debug("NetAcad Study Helper: Attempting to initialize MutationObserver.");
  const appRoot = document.querySelector("app-root");
  if (appRoot && appRoot.shadowRoot) {
    const pageView = appRoot.shadowRoot.querySelector("page-view");
    if (pageView && pageView.shadowRoot) {
      const targetNode = pageView.shadowRoot;
      const observerConfig = { childList: true, subtree: true };

      const observer = new MutationObserver(() => {
        debouncedScrape("DOM mutation");
      });

      observer.observe(targetNode, observerConfig);
      observerStarted = true;
      console.debug("NetAcad Study Helper: MutationObserver initialized.");
    } else {
      console.warn("NetAcad Study Helper: MutationObserver setup failed - page-view or its shadowRoot not found yet.");
    }
  } else {
    console.warn("NetAcad Study Helper: MutationObserver setup failed - app-root or its shadowRoot not found yet.");
  }
}

function initUrlWatcher() {
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      debouncedScrape("URL change");
      setTimeout(initMutationObserver, 1000);
    }
  }, 1000);

  window.addEventListener("hashchange", () => debouncedScrape("hash change"));
  window.addEventListener("popstate", () => debouncedScrape("history navigation"));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) debouncedScrape("tab visible");
  });

  initQuestionSignatureWatcher();
}

if (typeof window.scrapeData !== "function") {
  if (typeof scrapeData === "function") {
    window.scrapeData = scrapeData;
  } else {
    console.error("scrapeData function not found in global scope. scraper.js might not have loaded correctly or before this script.");
  }
}

const autoRunScraper = async () => {
  if (!document.querySelector("app-root")) {
    const frameContext = window.top === window ? "main page" : "an iframe";
    console.debug(`NetAcad Study Helper: autoRunScraper - app-root not found in this frame context (${frameContext}). Auto-run aborted.`);
    return;
  }

  if (document.readyState !== "complete") {
    await new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
  }

  await new Promise((resolve) => setTimeout(resolve, 700));

  const settings = await getAutoSettings();
  if (settings.showAnswers && settings.autoGenerate) {
    console.debug("NetAcad Study Helper: Auto-generate enabled. Attempting initial scrape and setting up observer.");
    if (typeof window.scrapeData === "function") {
      await window.scrapeData();
      lastQuizSignature = getVisibleQuizSignature();
      initMutationObserver();
      initUrlWatcher();
      initQuestionSignatureWatcher();
    } else {
      console.error("NetAcad Study Helper: Critical - window.scrapeData not defined for auto-run and observer setup.");
    }
  } else {
    console.debug("NetAcad Study Helper: Auto-generate or study hints are disabled. Skipping initial scrape.");
    initUrlWatcher();
    initQuestionSignatureWatcher();
  }
};

autoRunScraper();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processPage") {
    console.debug("NetAcad Study Helper (content.js): Received processPage message from popup/shortcut.");
    if (document.querySelector("app-root")) {
      if (request.hasOwnProperty("showAnswers") && request.showAnswers === false) {
        console.debug("NetAcad Study Helper (content.js): showAnswers is false, not scraping.");
        sendResponse({ success: true, result: false, message: "Study hints are hidden by user setting." });
        return false;
      }
      if (typeof window.scrapeData === "function") {
        window.scrapeData()
          .then((result) => sendResponse({ success: true, result }))
          .catch((error) => {
            console.error("NetAcad Study Helper (content.js): Error calling scrapeData:", error);
            sendResponse({ success: false, error: error.toString() });
          });
        return true;
      }
      sendResponse({ success: false, error: "scrapeData_not_found_in_frame" });
    } else {
      console.debug("NetAcad Study Helper (content.js): app-root NOT found in this frame. Ignoring processPage message.");
      return false;
    }
  }
  return false;
});

setInterval(() => {
  console.debug("NetAcad AI Study Helper content script is active @ " + new Date().toLocaleTimeString());
}, 30000);
