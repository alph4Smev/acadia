const DEFAULT_PROVIDER = "gemini";
const DEFAULT_OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate";
const DEFAULT_OLLAMA_MODEL = "qwen3:8b";
const DEFAULT_GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const STUDY_SYSTEM_PROMPT = [
  "You are a senior Cisco Networking Academy instructor with deep, exam-grade mastery of:",
  "CCNA (ITN, SRWE, ENSA), CyberOps Associate, DevNet Associate, Network Security, Endpoint Security,",
  "IoT Fundamentals, Linux Essentials, and Python Essentials. You answer NetAcad quiz questions the way",
  "the official Cisco answer key does — favoring Cisco's terminology, RFC-accurate networking facts,",
  "and the specific wording used in the Cisco curriculum.",
  "",
  "Rules you ALWAYS follow:",
  "1. Read the question literally. If it says 'Choose two' or '(Choose three.)', you MUST return exactly that many options.",
  "2. If the option list uses checkboxes, multiple answers are expected. If radio buttons, exactly one.",
  "3. Reason step-by-step internally before committing to an answer. Eliminate distractors explicitly.",
  "4. Return the EXACT verbatim text of each chosen option — never paraphrase, never add punctuation, never merge options.",
  "5. Prefer the lesson context when provided; otherwise rely on canonical Cisco curriculum knowledge.",
  "6. Never invent options that weren't given. If unsure between two, pick the one most aligned with Cisco's official phrasing.",
].join("\n");

function normalizeAiConfig(config = {}) {
  const provider = (config.provider || DEFAULT_PROVIDER).trim().toLowerCase();
  const validProviders = ["groq", "ollama", "gemini", "openrouter"];
  return {
    provider: validProviders.includes(provider) ? provider : DEFAULT_PROVIDER,
    ollamaApiUrl: (config.ollamaApiUrl || DEFAULT_OLLAMA_API_URL).trim(),
    ollamaModel: (config.ollamaModel || DEFAULT_OLLAMA_MODEL).trim(),
    groqApiUrl: (config.groqApiUrl || DEFAULT_GROQ_API_URL).trim(),
    groqModel: (config.groqModel || DEFAULT_GROQ_MODEL).trim(),
    groqApiKey: (config.groqApiKey || "").trim(),
    geminiApiUrl: (config.geminiApiUrl || DEFAULT_GEMINI_API_URL).trim(),
    geminiModel: (config.geminiModel || DEFAULT_GEMINI_MODEL).trim(),
    geminiApiKey: (config.geminiApiKey || "").trim(),
    openrouterApiUrl: (config.openrouterApiUrl || DEFAULT_OPENROUTER_API_URL).trim(),
    openrouterModel: (config.openrouterModel || DEFAULT_OPENROUTER_MODEL).trim(),
    openrouterApiKey: (config.openrouterApiKey || "").trim(),
    accuracyMode: !!config.accuracyMode,
    lessonContext: (config.lessonContext || "").trim(),
  };
}

function stripThinkingBlocks(text) {
  if (!text) return "";
  return String(text)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json|text)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractJsonObject(raw) {
  const cleaned = stripThinkingBlocks(raw);
  try { return JSON.parse(cleaned); } catch (_) {}
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1);
    try { return JSON.parse(slice); } catch (_) {}
  }
  throw new Error(`Model did not return valid JSON. Raw: ${cleaned.slice(0, 400)}`);
}

async function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime?.sendMessage) {
      reject(new Error("Chrome runtime messaging is unavailable."));
      return;
    }
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function callOllama(prompt, config, expectJson) {
  const payload = {
    model: config.ollamaModel,
    prompt,
    stream: false,
    system: STUDY_SYSTEM_PROMPT,
    options: { temperature: 0, top_p: 1, num_ctx: 8192 },
  };
  if (expectJson) payload.format = "json";

  const proxied = await sendMessageToBackground({
    action: "ollamaGenerate",
    apiUrl: config.ollamaApiUrl,
    payload,
  });
  if (!proxied || !proxied.success) throw new Error(proxied?.error || "Ollama proxy error.");
  return stripThinkingBlocks(proxied.data?.response || "");
}

async function callGroq(prompt, config, expectJson) {
  if (!config.groqApiKey) {
    throw new Error("Groq API key missing. Open the popup, paste your key, and save.");
  }
  const modelLower = config.groqModel.toLowerCase();
  const isReasoning =
    modelLower.includes("reasoning") || modelLower.includes("qwq") ||
    modelLower.includes("r1") || modelLower.includes("gpt-oss") ||
    modelLower.includes("qwen3") || modelLower.includes("deepseek");

  const payload = {
    model: config.groqModel,
    messages: [
      { role: "system", content: STUDY_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0,
    top_p: 1,
    max_completion_tokens: 4096,
  };
  if (isReasoning) payload.reasoning_effort = "high";
  if (expectJson) payload.response_format = { type: "json_object" };

  const proxied = await sendMessageToBackground({
    action: "groqChat",
    apiUrl: config.groqApiUrl,
    apiKey: config.groqApiKey,
    payload,
  });
  if (!proxied || !proxied.success) throw new Error(proxied?.error || "Groq proxy error.");
  return stripThinkingBlocks(proxied.data?.choices?.[0]?.message?.content || "");
}

async function callGemini(prompt, config, expectJson) {
  if (!config.geminiApiKey) {
    throw new Error("Gemini API key missing. Get one free at aistudio.google.com/apikey and save it in the popup.");
  }
  const fullUrl = `${config.geminiApiUrl.replace(/\/$/, "")}/${config.geminiModel}:generateContent`;
  const payload = {
    systemInstruction: { parts: [{ text: STUDY_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      topP: 1,
      maxOutputTokens: 4096,
    },
  };
  if (expectJson) payload.generationConfig.responseMimeType = "application/json";

  const proxied = await sendMessageToBackground({
    action: "geminiGenerate",
    apiUrl: fullUrl,
    apiKey: config.geminiApiKey,
    payload,
  });
  if (!proxied || !proxied.success) throw new Error(proxied?.error || "Gemini proxy error.");
  const candidate = proxied.data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  return stripThinkingBlocks(text);
}

async function callOpenRouter(prompt, config, expectJson) {
  if (!config.openrouterApiKey) {
    throw new Error("OpenRouter key missing. Get one at openrouter.ai/keys and save it in the popup.");
  }
  const payload = {
    model: config.openrouterModel,
    messages: [
      { role: "system", content: STUDY_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0,
    top_p: 1,
    max_tokens: 4096,
  };
  if (expectJson) payload.response_format = { type: "json_object" };

  const proxied = await sendMessageToBackground({
    action: "openrouterChat",
    apiUrl: config.openrouterApiUrl,
    apiKey: config.openrouterApiKey,
    payload,
  });
  if (!proxied || !proxied.success) throw new Error(proxied?.error || "OpenRouter proxy error.");
  return stripThinkingBlocks(proxied.data?.choices?.[0]?.message?.content || "");
}

async function callAi(prompt, config, expectJson = false) {
  const c = normalizeAiConfig(config);
  switch (c.provider) {
    case "ollama":     return callOllama(prompt, c, expectJson);
    case "groq":       return callGroq(prompt, c, expectJson);
    case "openrouter": return callOpenRouter(prompt, c, expectJson);
    case "gemini":
    default:           return callGemini(prompt, c, expectJson);
  }
}

function detectRequiredCount(questionText, answerTypes) {
  const types = Array.isArray(answerTypes) ? answerTypes : [];
  const hasCheckbox = types.some((t) => String(t).toLowerCase() === "checkbox");
  const hasRadio = types.some((t) => String(t).toLowerCase() === "radio");
  const q = String(questionText || "").toLowerCase();
  const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  let explicit = null;
  const wordMatch = q.match(/choose\s+(one|two|three|four|five|six|seven|eight)/);
  const digitMatch = q.match(/choose\s+(\d+)/) || q.match(/\(\s*select\s+(\d+)\s*\)/);
  const selectAll = /select all that apply|choose all that apply/.test(q);
  if (wordMatch) explicit = wordToNum[wordMatch[1]];
  else if (digitMatch) explicit = parseInt(digitMatch[1], 10);

  let mode = "single";
  if (selectAll) mode = "multi-any";
  else if (explicit && explicit > 1) mode = "multi-fixed";
  else if (hasCheckbox && !hasRadio) mode = "multi-any";
  else if (explicit === 1 || hasRadio) mode = "single";

  return { mode, requiredCount: explicit, hasCheckbox, hasRadio };
}

function formatNumberedOptions(answers) {
  return answers.map((a, i) => `  [${i + 1}] ${String(a).replace(/\s+/g, " ").trim()}`).join("\n");
}

function buildAnswerInstruction(counter) {
  if (counter.mode === "multi-fixed") return `This question requires EXACTLY ${counter.requiredCount} correct option(s). You MUST return exactly ${counter.requiredCount}.`;
  if (counter.mode === "multi-any") return "This question is multi-select (checkboxes). Return ALL correct options — typically 2 or 3.";
  return "This question is single-select (radio). Return EXACTLY ONE correct option.";
}

function buildSolvePrompt(question, answers, answerTypes, lessonContext) {
  const counter = detectRequiredCount(question, answerTypes);
  const numbered = formatNumberedOptions(answers);
  return [
    lessonContext ? `LESSON CONTEXT (authoritative when relevant):\n${lessonContext}\n` : "",
    `QUESTION:\n${question}`,
    "",
    `OPTIONS:\n${numbered}`,
    "",
    `INPUT TYPES: ${(answerTypes || []).join(", ") || "unknown"}`,
    buildAnswerInstruction(counter),
    "",
    "TASK:",
    "1. Briefly analyze the question and eliminate clearly wrong options.",
    "2. Decide on the correct option(s) using Cisco curriculum knowledge.",
    "3. Output STRICT JSON ONLY (no markdown, no commentary outside JSON):",
    "{",
    '  "analysis": "1-3 short sentences explaining your reasoning and why you eliminated distractors",',
    '  "indices": [1-based option numbers you picked, e.g. [1] or [2,4]],',
    '  "answers": ["verbatim text of each chosen option, exactly as shown after the [N] marker"],',
    '  "confidence": "low|medium|high"',
    "}",
    "",
    'The "answers" array MUST quote option text verbatim. The length of "indices" and "answers" MUST match the required count.',
  ].filter(Boolean).join("\n");
}

function buildCriticPrompt(question, answers, answerTypes, lessonContext, proposed) {
  const counter = detectRequiredCount(question, answerTypes);
  const numbered = formatNumberedOptions(answers);
  return [
    lessonContext ? `LESSON CONTEXT:\n${lessonContext}\n` : "",
    `QUESTION:\n${question}`,
    "",
    `OPTIONS:\n${numbered}`,
    "",
    `PROPOSED ANSWER (from first pass): ${JSON.stringify(proposed)}`,
    buildAnswerInstruction(counter),
    "",
    "TASK: Critically re-evaluate the proposed answer. Look for subtle distractors, Cisco-specific terminology",
    "(e.g. 'collision domain' vs 'broadcast domain', 'stateful' vs 'stateless', OSI layer numbering,",
    "RFC behavior, default port numbers, IPv6 specifics). If wrong, correct it.",
    "",
    "Output STRICT JSON ONLY:",
    "{",
    '  "analysis": "what (if anything) was wrong with the proposed answer and why",',
    '  "indices": [final 1-based option numbers],',
    '  "answers": ["final verbatim option text"],',
    '  "confidence": "low|medium|high"',
    "}",
  ].filter(Boolean).join("\n");
}

function formatFinalResult(result, answers) {
  const indices = Array.isArray(result.indices) ? result.indices : [];
  const picked = Array.isArray(result.answers) && result.answers.length
    ? result.answers
    : indices.map((i) => answers[i - 1]).filter(Boolean);
  return {
    indices,
    picked,
    confidence: result.confidence || "medium",
    analysis: result.analysis || "",
  };
}

function buildGenericPrompt(rawText, lessonContext) {
  return [
    "You are solving a NetAcad / Cisco Networking Academy quiz question that is NOT a simple radio/checkbox MCQ.",
    "It may be: matching pairs, ordering/ranking, drag-and-drop, fill-in-blank, hotspot, true/false grid, or similar.",
    "",
    lessonContext ? `LESSON CONTEXT (authoritative):\n${lessonContext}\n` : "",
    "Below is the raw visible text of the question region. Parse it, identify the question type, and solve it.",
    "",
    "RAW QUESTION REGION:",
    "```",
    rawText,
    "```",
    "",
    "TASK:",
    "1. Identify the question type and what answer format is expected.",
    "2. Reason through it using Cisco curriculum knowledge.",
    "3. Output STRICT JSON ONLY (no markdown):",
    "{",
    '  "questionType": "matching | ordering | mcq | fill_in | hotspot | true_false | other",',
    '  "analysis": "1-3 sentences explaining your reasoning",',
    '  "answer": "human-readable formatted answer — for ordering use a numbered list 1.→5., for matching use \'Left ↔ Right\' pairs one per line, for fill-in put the blanks filled in",',
    '  "structuredAnswer": [',
    '    /* For ordering: [{"position": "1st", "item": "..."}, ...] */',
    '    /* For matching: [{"left": "...", "right": "..."}, ...] */',
    '    /* For mcq: [{"option": "verbatim text"}] */',
    '    /* For others: free-form objects */',
    '  ],',
    '  "confidence": "low|medium|high"',
    "}",
    "",
    "Be precise. Use verbatim text from the question for option/item references — no paraphrasing.",
  ].filter(Boolean).join("\n");
}

async function getGenericAiAnswer(rawText, aiConfig = {}, options = {}) {
  if (!rawText) return { error: "Empty question text." };
  const normalized = normalizeAiConfig(aiConfig);
  const modelForKey = normalized[normalized.provider + "Model"] || normalized.provider;
  const key = cacheKey(normalized.provider, modelForKey, `generic::${rawText.slice(0, 300)}`, "fast");

  if (options.force) {
    NETACAD_ANSWER_CACHE.delete(key);
    NETACAD_INFLIGHT.delete(key);
  } else {
    if (NETACAD_ANSWER_CACHE.has(key)) return NETACAD_ANSWER_CACHE.get(key);
    if (NETACAD_INFLIGHT.has(key)) return NETACAD_INFLIGHT.get(key);
  }

  const work = (async () => {
    try {
      const raw = await callAi(buildGenericPrompt(rawText, normalized.lessonContext), normalized, true);
      const parsed = extractJsonObject(raw);
      const result = {
        kind: "generic",
        questionType: parsed.questionType || "other",
        analysis: parsed.analysis || "",
        answer: parsed.answer || "",
        structuredAnswer: Array.isArray(parsed.structuredAnswer) ? parsed.structuredAnswer : [],
        confidence: parsed.confidence || "medium",
      };
      cachePut(key, result);
      return result;
    } catch (error) {
      console.error("getGenericAiAnswer error:", error);
      const errResult = { error: error.message || String(error) };
      if (!String(error.message || "").includes("429")) cachePut(key, errResult);
      return errResult;
    } finally {
      NETACAD_INFLIGHT.delete(key);
    }
  })();

  NETACAD_INFLIGHT.set(key, work);
  return work;
}

// In-memory answer cache + in-flight dedup. Same question signature + provider/model =
// reuse the previous answer. Prevents quota burn on DOM mutations and accidental re-runs.
const NETACAD_ANSWER_CACHE = new Map();
const NETACAD_INFLIGHT = new Map();
const NETACAD_CACHE_MAX = 80;

function cacheKey(provider, model, signature, mode) {
  return `${provider}|${model}|${mode}|${signature}`;
}

function cachePut(key, value) {
  if (NETACAD_ANSWER_CACHE.size >= NETACAD_CACHE_MAX) {
    const firstKey = NETACAD_ANSWER_CACHE.keys().next().value;
    NETACAD_ANSWER_CACHE.delete(firstKey);
  }
  NETACAD_ANSWER_CACHE.set(key, value);
}

async function getAiAnswer(question, answers, aiConfig = {}, answerTypes = [], options = {}) {
  if (!question || !answers || answers.length === 0) {
    return { error: "Missing question or answer choices." };
  }
  const normalized = normalizeAiConfig(aiConfig);
  const signature = `${question}::${answers.join("||")}`;
  const mode = normalized.accuracyMode ? "acc" : "fast";
  const modelForKey = normalized[normalized.provider + "Model"] || normalized.provider;
  const key = cacheKey(normalized.provider, modelForKey, signature, mode);

  if (options.force) {
    NETACAD_ANSWER_CACHE.delete(key);
    NETACAD_INFLIGHT.delete(key);
  } else {
    if (NETACAD_ANSWER_CACHE.has(key)) return NETACAD_ANSWER_CACHE.get(key);
    if (NETACAD_INFLIGHT.has(key)) return NETACAD_INFLIGHT.get(key);
  }

  const work = (async () => {
    try {
      const solvePrompt = buildSolvePrompt(question, answers, answerTypes, normalized.lessonContext);
      const solveRaw = await callAi(solvePrompt, normalized, true);
      const solved = extractJsonObject(solveRaw);

      let finalResult = solved;
      if (normalized.accuracyMode) {
        const criticPrompt = buildCriticPrompt(
          question, answers, answerTypes, normalized.lessonContext,
          { indices: solved.indices, answers: solved.answers }
        );
        const criticRaw = await callAi(criticPrompt, normalized, true);
        try { finalResult = extractJsonObject(criticRaw); } catch (_) { finalResult = solved; }
      }
      const formatted = formatFinalResult(finalResult, answers);
      cachePut(key, formatted);
      return formatted;
    } catch (error) {
      console.error("getAiAnswer error:", error);
      const errResult = { error: error.message || String(error) };
      // Cache non-rate-limit errors so we don't keep retrying broken keys; skip caching 429s.
      if (!String(error.message || "").includes("429")) cachePut(key, errResult);
      return errResult;
    } finally {
      NETACAD_INFLIGHT.delete(key);
    }
  })();

  NETACAD_INFLIGHT.set(key, work);
  return work;
}
