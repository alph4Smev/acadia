// Constants for retry mechanism
const MAX_SCRAPE_ATTEMPTS = 10;
const SCRAPE_RETRY_DELAY_MS = 1500;
let netacadStudyHelperRunId = 0;


function netacadStudyHelperElementIsRenderable(el) {
  if (!el || !el.isConnected || typeof el.getBoundingClientRect !== "function") return false;

  try {
    let node = el;
    let guard = 0;
    while (node && guard++ < 80) {
      if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        node = node.host;
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) break;
      const style = window.getComputedStyle(node);
      if (!style || style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      node = node.parentNode || (node.getRootNode && node.getRootNode().host);
    }
  } catch (_) {}

  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const hasSize = rect.width > 2 && rect.height > 2;
  const intersectsViewport = rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
  return hasSize && intersectsViewport;
}

function netacadStudyHelperVisibleScore(questionData) {
  if (!questionData) return 0;
  const elements = [];
  if (questionData.mcqViewElement) elements.push(questionData.mcqViewElement);
  if (questionData.questionTextElement) elements.push(questionData.questionTextElement);
  if (questionData.answerElements) elements.push(...Array.from(questionData.answerElements));

  let score = 0;
  for (const el of elements) {
    if (netacadStudyHelperElementIsRenderable(el)) {
      const rect = el.getBoundingClientRect();
      score += 1 + Math.min(50, (rect.width * rect.height) / 20000);
    }
  }
  return score;
}

function netacadStudyHelperChooseCurrentQuestion(questionDataList) {
  if (!Array.isArray(questionDataList) || questionDataList.length === 0) return [];

  const scored = questionDataList
    .map((q) => ({ q, score: netacadStudyHelperVisibleScore(q) }))
    .filter((entry) => entry.score > 0);

  if (scored.length === 0) {
    return [questionDataList[questionDataList.length - 1]];
  }

  scored.sort((a, b) => b.score - a.score);
  return [scored[0].q];
}

function signatureForQuestionData(questionData) {
  if (typeof buildQuestionSignature === "function") {
    return buildQuestionSignature(questionData.question, questionData.answers);
  }
  return `${questionData.question}::${(questionData.answers || []).join("||")}`;
}

function isQuestionStillCurrent(questionData) {
  try {
    if (!questionData || !questionData.mcqViewElement || !questionData.mcqViewElement.isConnected) return false;
    const current = extractQuestionAndAnswers(questionData.mcqViewElement, questionData.originalIndex);
    const currentAnswers = processAnswerElements(current.answerElements, questionData.originalIndex);
    const currentSignature = typeof buildQuestionSignature === "function"
      ? buildQuestionSignature(current.questionText, currentAnswers.map(a => a.text))
      : `${current.questionText}::${currentAnswers.map(a => a.text).join("||")}`;
    return currentSignature === signatureForQuestionData(questionData);
  } catch (error) {
    console.debug("NetAcad Scraper (scraper.js): Could not verify current question signature:", error);
    return false;
  }
}

/**
 * Aggressive recursive shadow DOM walker to find the active module text.
 */
function extractAutoLessonContext() {
  let contextText = "";
  const seenRoots = new Set();
  const foundTextBlocks = [];

  function walk(node) {
    if (!node || seenRoots.has(node)) return;
    if (node.shadowRoot) {
      seenRoots.add(node);
      walk(node.shadowRoot);
    }

    // Identify current active lesson blocks (article-view, block-view)
    if (node.tagName === 'ARTICLE-VIEW' || node.tagName === 'BLOCK-VIEW') {
        // Collect text from non-quiz elements within this block
        const textNodes = node.shadowRoot ? node.shadowRoot.querySelectorAll('p, li, h1, h2, h3, h4, span.text') : [];
        textNodes.forEach(el => {
            const txt = el.innerText.trim();
            // Ignore quiz options, buttons, and short UI noise
            if (txt.length > 25 && !el.closest('mcq-view') && !el.closest('button')) {
                foundTextBlocks.push(txt);
            }
        });
    }

    if (node.children) {
      Array.from(node.children).forEach(child => walk(child));
    }
  }

  walk(document.body);
  
  // Deduplicate and join
  contextText = [...new Set(foundTextBlocks)].join("\n\n");
  
  return contextText.substring(0, 5000); 
}

async function scrapeData(currentAttempt = 1) {
  console.debug(
    `NetAcad Scraper (scraper.js): scrapeData attempt #${currentAttempt}`
  );

  const thisRunId = currentAttempt === 1 ? ++netacadStudyHelperRunId : netacadStudyHelperRunId;

  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get([
      "provider",
      "groqApiUrl", "groqModel",
      "ollamaApiUrl", "ollamaModel",
      "geminiModel",
      "openrouterModel",
      "accuracyMode", "diagnosticMode",
      "lessonContext",
    ]),
    chrome.storage.local.get(["groqApiKey", "geminiApiKey", "openrouterApiKey"]),
  ]);

  const autoLessonContext = extractAutoLessonContext();

  const apiKey = {
    provider: syncData.provider || "gemini",
    groqApiUrl: syncData.groqApiUrl || "https://api.groq.com/openai/v1/chat/completions",
    groqModel: syncData.groqModel || "openai/gpt-oss-120b",
    groqApiKey: localData.groqApiKey || "",
    ollamaApiUrl: syncData.ollamaApiUrl || "http://127.0.0.1:11434/api/generate",
    ollamaModel: syncData.ollamaModel || "qwen3:8b",
    geminiModel: syncData.geminiModel || "gemini-2.0-flash",
    geminiApiKey: localData.geminiApiKey || "",
    openrouterModel: syncData.openrouterModel || "meta-llama/llama-3.3-70b-instruct:free",
    openrouterApiKey: localData.openrouterApiKey || "",
    accuracyMode: !!syncData.accuracyMode,
    diagnosticMode: !!syncData.diagnosticMode,
    lessonContext: (syncData.lessonContext || "") + (autoLessonContext ? "\n\n[AUTO_SCRAPED_CONTEXT]:\n" + autoLessonContext : ""),
  };

  let mcqViewElements = [];
  try {
    const appRoot = document.querySelector("app-root");
    if (appRoot && appRoot.shadowRoot) {
      const pageView = appRoot.shadowRoot.querySelector("page-view");
      if (pageView && pageView.shadowRoot) {
        const articleViews = pageView.shadowRoot.querySelectorAll("article-view");
        articleViews.forEach((articleView) => {
          if (articleView.shadowRoot) {
            const blockViews = articleView.shadowRoot.querySelectorAll("block-view");
            blockViews.forEach((blockView) => {
              if (blockView.shadowRoot) {
                const mcqView = blockView.shadowRoot.querySelector("mcq-view");
                if (mcqView) mcqViewElements.push(mcqView);
              }
            });
          }
        });
      }
    }
  } catch (e) {
    console.error(`NetAcad Scraper (scraper.js): Exception during shadow DOM traversal.`, e);
  }

  if (mcqViewElements.length === 0) {
    // No standard MCQ on this page. Try the generic fallback for matching / ordering /
    // drag-and-drop / fill-in / hotspot questions: capture the visible question region
    // as plain text and let the AI parse + solve it.
    const generic = await scrapeGenericQuestion(apiKey);
    if (generic) return true;

    if (currentAttempt < MAX_SCRAPE_ATTEMPTS) {
      setTimeout(() => { window.scrapeData && window.scrapeData(currentAttempt + 1); }, SCRAPE_RETRY_DELAY_MS);
      return false;
    }
    return false;
  }

  let allQuestionsData = [];
  for (const [index, mcqViewElement] of mcqViewElements.entries()) {
    if (typeof extractQuestionAndAnswers !== 'function') continue;
    const extractionResult = extractQuestionAndAnswers(mcqViewElement, index);
    const answerData = processAnswerElements(extractionResult.answerElements, index);

    if (extractionResult.questionText && !extractionResult.questionText.startsWith("Error")) {
      allQuestionsData.push({
        question: extractionResult.questionText,
        answers: answerData.map(a => a.text),
        answerTypes: answerData.map(a => a.type),
        mcqViewElement: mcqViewElement,
        originalIndex: index,
        questionTextElement: extractionResult.questionTextElement
      });
    }
  }

  if (allQuestionsData.length > 1) {
    allQuestionsData = netacadStudyHelperChooseCurrentQuestion(allQuestionsData);
  }

  // Strict visibility: the chosen MCQ's center MUST be inside the viewport, otherwise
  // we treat the page as a non-MCQ (ordering/matching/etc.) and use the generic path.
  function isElCenterInViewport(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (r.width < 10 || r.height < 10) return false;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return cx > 0 && cx < vw && cy > 0 && cy < vh;
  }

  if (allQuestionsData.length > 0) {
    const candidateEl = allQuestionsData[0].mcqViewElement;
    if (!isElCenterInViewport(candidateEl)) {
      console.debug("NetAcad Scraper: chosen MCQ is off-screen, falling through to generic scrape.");
      const generic = await scrapeGenericQuestion(apiKey);
      if (generic) return true;
      // If generic didn't fire either, abort so we don't render a stale MCQ answer.
      return false;
    }
  }

  if (allQuestionsData.length > 0) {
    const questionData = allQuestionsData[0];

    if (apiKey.diagnosticMode) {
        console.debug("DIAGNOSTIC DATA SENT TO MODEL:", {
            question: questionData.question,
            options: questionData.answers,
            types: questionData.answerTypes,
            contextSize: apiKey.lessonContext.length,
            autoContextFound: !!autoLessonContext,
        });
    }

    if (thisRunId !== netacadStudyHelperRunId || !isQuestionStillCurrent(questionData)) return false;

    await processSingleQuestion(questionData.mcqViewElement, questionData.originalIndex, apiKey);
  }

  return true;
}

// ---------- Generic (non-MCQ) question support ----------
// Captures matching, ordering, drag-and-drop, fill-in, etc. by extracting visible
// question text from the page and asking the AI to interpret + solve it.

function netacadDeepWalkAll(selector, root = document) {
  const results = [];
  const seen = new Set();
  function walk(node) {
    if (!node || seen.has(node)) return;
    seen.add(node);
    try {
      if (node.querySelectorAll) {
        results.push(...node.querySelectorAll(selector));
        node.querySelectorAll("*").forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
      }
    } catch (_) {}
  }
  walk(root);
  return results;
}

function netacadFindActiveQuestionRegion() {
  // Pick the question-like region whose CENTER is inside the current viewport.
  // Off-screen elements (stale Q2 lingering in DOM, sidebar TOC entries, etc.) get rejected.
  const candidates = netacadDeepWalkAll(
    "mcq-view, matching-view, gmcq-view, dragdrop-view, ranking-view, ordering-view, textinput-view, " +
    "narrative-view, hotgraphic-view, assessment-view, base-view, " +
    "[class*='question' i]:not(button):not(a):not(li), [class*='assessment' i]:not(button):not(a):not(li), " +
    "[data-component*='question' i], [data-component*='matching' i], [data-component*='ranking' i]"
  );

  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const viewportCx = vw / 2;
  const viewportCy = vh / 2;

  let best = null;
  let bestScore = -Infinity;
  for (const el of candidates) {
    try {
      if (!el.isConnected) continue;
      const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!rect || rect.width < 200 || rect.height < 100) continue;
      const text = (el.innerText || el.textContent || "").trim();
      if (text.length < 30) continue;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const centerInViewport = cx > 0 && cx < vw && cy > 0 && cy < vh;
      if (!centerInViewport) continue;
      // Prefer the element whose center is closest to viewport center AND has substantial size.
      const distFromCenter = Math.hypot(cx - viewportCx, cy - viewportCy);
      const score = (rect.width * rect.height) - distFromCenter * 100;
      if (score > bestScore) { best = el; bestScore = score; }
    } catch (_) {}
  }
  return best;
}

function extractGenericQuestionText(region) {
  // Collect block-level text content, preserving order. Walk shadow roots.
  const parts = [];
  const seen = new Set();

  function collect(node, depth = 0) {
    if (!node || seen.has(node) || depth > 25) return;
    seen.add(node);
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length > 1) parts.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = (node.tagName || "").toLowerCase();
    if (tag === "script" || tag === "style") return;
    // Skip controls that are usually empty/noisy
    if (tag === "svg" || tag === "img") return;

    // If this element is a self-contained block, snapshot its innerText to keep ordering tight.
    if (["p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "td", "th", "label", "button", "div"].includes(tag)) {
      const own = (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
      // If it has rich children, recurse; if it's leaf-ish, just record
      const hasBlockChildren = Array.from(node.children).some((c) =>
        ["p", "li", "ul", "ol", "div", "section", "article"].includes((c.tagName || "").toLowerCase())
      );
      if (!hasBlockChildren) {
        if (own.length > 1) parts.push(own);
        if (node.shadowRoot) collect(node.shadowRoot, depth + 1);
        return;
      }
    }
    if (node.shadowRoot) collect(node.shadowRoot, depth + 1);
    Array.from(node.childNodes).forEach((c) => collect(c, depth + 1));
  }

  collect(region);

  // Deduplicate consecutive duplicates and very short noise
  const cleaned = [];
  for (const p of parts) {
    if (p.length < 2) continue;
    if (cleaned[cleaned.length - 1] === p) continue;
    cleaned.push(p);
  }
  return cleaned.join("\n").slice(0, 8000);
}

async function scrapeGenericQuestion(apiKey) {
  const region = netacadFindActiveQuestionRegion();
  if (!region) return false;
  const text = extractGenericQuestionText(region);
  if (!text || text.length < 40) return false;

  if (apiKey.diagnosticMode) {
    console.debug("GENERIC QUESTION SCRAPE:", { length: text.length, preview: text.slice(0, 500) });
  }

  if (typeof processGenericQuestion !== "function") {
    console.warn("NetAcad scraper: processGenericQuestion not available in ui.js");
    return false;
  }
  await processGenericQuestion(text, apiKey);
  return true;
}
