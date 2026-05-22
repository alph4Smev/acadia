# Providers

Acadia supports four LLM backends. You only need to configure one. Switch between them anytime via the popup tabs.

## 1. Google Gemini (recommended default)

**Why:** Generous free tier, very strong reasoning, simple key signup.

**Get a key:**
1. Visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Sign in with any Google account.
3. Click **Create API key** → copy the `AIza…` string.

**Configure in Acadia:**
- Provider tab: **Gemini**
- API key: paste your key
- Model: `gemini-2.0-flash` (recommended)

**Free tier limits** (as of 2025-Q4 — check Google's [rate limits doc](https://ai.google.dev/gemini-api/docs/rate-limits) for current values):

| Model | RPM | TPM | RPD |
|---|---|---|---|
| `gemini-2.0-flash-lite` | 30 | 1M | 1500 |
| `gemini-2.0-flash` ⭐ | 15 | 1M | 1500 |
| `gemini-2.5-flash-lite` | 15 | 250K | 1000 |
| `gemini-2.5-flash` | 5 | 250K | 250 |

`gemini-2.5-flash` is smarter but its quota is brutally low; only use it for tough verification passes. For day-to-day study, `gemini-2.0-flash` is the sweet spot.

---

## 2. Groq

**Why:** Fastest inference on the market (sub-second for 70B–120B models). Free tier exists but has a daily token cap.

**Get a key:**
1. Visit [console.groq.com/keys](https://console.groq.com/keys).
2. Sign in (Google / GitHub / email).
3. Create a new key → copy `gsk_…`.

**Configure in Acadia:**
- Provider tab: **Groq**
- API key: paste
- Model: `openai/gpt-oss-120b` (recommended)

**Other good Groq models for NetAcad:**
- `openai/gpt-oss-120b` — best reasoning
- `moonshotai/kimi-k2-instruct` — strong all-rounder
- `qwen/qwen3-32b` — fast, capable
- `llama-3.3-70b-versatile` — solid fallback
- `llama-3.1-8b-instant` — fast but weaker

Check the current catalog at [console.groq.com/docs/models](https://console.groq.com/docs/models).

---

## 3. OpenRouter

**Why:** Hundreds of models behind one API, including many `:free`-suffixed models that don't count against your dollar balance.

**Get a key:**
1. Visit [openrouter.ai/keys](https://openrouter.ai/keys).
2. Sign in → create a key → copy `sk-or-v1-…`.

**Configure in Acadia:**
- Provider tab: **OpenRouter**
- API key: paste
- Model: pick a current `:free` model — see below

**Find current free models:** [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0). Free-model IDs rotate every few months — if a model returns HTTP 404, check this page for the current slug.

Models that have been stable in this slot:

- `meta-llama/llama-3.3-70b-instruct:free`
- `google/gemini-2.0-flash-exp:free`
- `mistralai/mistral-small-3.2-24b-instruct:free`
- `qwen/qwen-2.5-72b-instruct:free`
- `nousresearch/hermes-3-llama-3.1-70b:free`

**Free tier rate limit:** ~20 req/min and ~1000 req/day **pooled across all free models on your account.** If you hit it, paid models cost fractions of a cent per call, or fall back to Gemini.

---

## 4. Ollama (local)

**Why:** Fully offline, no API key, no rate limits, no cost. Quality depends on your hardware.

**Setup:**
1. Install [Ollama](https://ollama.com/download) for your OS.
2. Pull a model: `ollama pull qwen3:8b` (good balance) or `ollama pull llama3.1:70b` (if you have the GPU).
3. Ensure Ollama is running: `ollama serve` (it usually auto-starts).

**Configure in Acadia:**
- Provider tab: **Ollama**
- Endpoint: `http://127.0.0.1:11434/api/generate` (default — change only if you've moved Ollama)
- Model: e.g. `qwen3:8b`

**Recommended local models for NetAcad questions:**

| Model | Size | Hardware | Notes |
|---|---|---|---|
| `qwen3:8b` | 8B | 8+ GB VRAM | Best balance for most users |
| `qwen3:32b` | 32B | 24+ GB VRAM | Excellent reasoning |
| `llama3.1:8b` | 8B | 8+ GB VRAM | Solid generalist |
| `deepseek-r1:7b` | 7B | 8+ GB VRAM | Strong CoT reasoning |
| `phi4:14b` | 14B | 12+ GB VRAM | Very capable for size |

**No GPU?** Use Acadia with Gemini's free tier instead — local CPU-only inference on a 7B model averages 5–30 seconds per question, which gets old fast.

---

## Choosing a provider

| Use case | Best provider |
|---|---|
| Just want it to work, easy setup | **Gemini** |
| Need fastest possible response | **Groq** |
| Free Gemini exhausted, want overflow | **OpenRouter** |
| Privacy / offline / unlimited usage | **Ollama** |
| Comparing model behavior | **OpenRouter** (most models in one place) |

## Troubleshooting

**HTTP 429** — rate limit hit. The error message includes how long to wait. Switch providers or models in the popup.

**HTTP 401 / 403** — invalid API key. Re-paste from the provider's dashboard.

**HTTP 404 from OpenRouter** — model ID has rotated. Check [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0).

**HTTP 5xx** — provider outage. Try a different provider.

**"No endpoints found"** (OpenRouter) — model exists but isn't currently routable on free tier. Pick another free model.

**Connection refused** (Ollama) — Ollama isn't running. Start it with `ollama serve` or via the desktop app.
