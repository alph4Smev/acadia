# Acadia

> Fork of **[vbatecan/netacad-autoanswer](https://github.com/vbatecan/netacad-autoanswer)** by Vince Angelo Batecan. All original credit goes to the upstream author; this fork adds multi-provider LLM support, generic question-type handling, a Cisco-domain prompt pipeline, and a redesigned UI.

AI study companion for Cisco Networking Academy (NetAcad / Skills for All) courses. Explains quiz questions with reasoning and confidence scores. Bring your own LLM key — supports Gemini, Groq, OpenRouter, and Ollama.

Acadia attaches a small floating panel to `netacad.com` pages. When you open a quiz, it reads the question, identifies its type (single-choice MCQ, multi-select, ordering, matching, fill-in, etc.), and asks your configured LLM to reason through it — returning the most likely correct option(s) with a short explanation of *why*.

It's a study tool. It tells you how to think about a question; the goal is for you to internalize Cisco's terminology and reasoning patterns, not to skip the work.

---

## Features

- **Multi-provider LLM support**
  - **Google Gemini** — free tier (1500 req/day on `gemini-2.0-flash`)
  - **Groq** — fastest inference, free tier with daily cap
  - **OpenRouter** — aggregator including many free-tier models
  - **Ollama** — local, fully offline, zero token cost
- **Auto-detects question type:** radio MCQ, checkbox multi-select, ordering, matching, fill-in, hotspot, generic
- **Verbatim option matching:** numbered options in the prompt, model returns 1-based indices, panel highlights the matching choice exactly
- **Forced chain-of-thought** via JSON schema — the model must reason before committing
- **Accuracy mode** — optional second verification pass for tricky questions
- **Lesson context** — paste your own notes; the model treats them as authoritative
- **Local answer cache** — re-visiting the same question doesn't re-burn API quota
- **In-flight dedup** — DOM mutations don't double-fire requests
- **Modern UI** — glass-effect floating panel, draggable, minimize/close, copy-answer button
- **Firefox / LibreWolf / Chromium compatible** (Manifest V3)

## Screenshots

> _Add screenshots to `docs/screenshots/` and reference them here._

## Installation

### Firefox / LibreWolf

1. Download or build the `.xpi` (see [Building](#building) below).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and pick the `.xpi`.
4. (Optional for permanent install:) sign the add-on via [AMO](https://addons.mozilla.org/) or in LibreWolf set `xpinstall.signatures.required = false` in `about:config`.

### Chromium / Chrome / Brave / Edge

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and pick the `acadia/` folder.

### Configuration

1. Click the Acadia toolbar icon.
2. Pick a provider tab (recommended: **Gemini** — easiest free tier).
3. Paste your API key — see [docs/PROVIDERS.md](docs/PROVIDERS.md) for where to get one for each provider.
4. Click **Save**.
5. Open a NetAcad quiz. The panel appears in the top-right and analyzes the question automatically.

Keyboard shortcut to re-trigger analysis: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>Q</kbd>

## How it works

```
┌────────────────────────────────────────────────────────────┐
│  netacad.com page                                          │
│                                                            │
│  ┌──────────────────────┐    ┌────────────────────────┐   │
│  │  Quiz <mcq-view>     │    │  Acadia floating panel │   │
│  │  (Cisco shadow DOM)  │    │  (injected by content) │   │
│  └──────────┬───────────┘    └────────┬───────────────┘   │
│             │                         │                    │
└─────────────┼─────────────────────────┼────────────────────┘
              │                         │
              ▼                         │
   ┌──────────────────────┐             │
   │  scraper.js          │             │
   │  - finds mcq-view    │             │
   │  - reads question +  │             │
   │    options + types   │             │
   │  - falls back to     │             │
   │    generic scrape    │             │
   │    for ordering/etc. │             │
   └──────────┬───────────┘             │
              │                         │
              ▼                         │
   ┌──────────────────────┐             │
   │  api.js              │             │
   │  - numbers options   │             │
   │  - builds prompt     │             │
   │  - calls provider    │             │
   │  - extracts JSON     │             │
   │  - caches result     │             │
   └──────────┬───────────┘             │
              │                         │
              ▼                         │
   ┌──────────────────────┐             │
   │  background.js       │             │
   │  - proxies HTTP to   │             │
   │    LLM provider      │             │
   │  - handles auth      │             │
   └──────────┬───────────┘             │
              │                         │
              ▼                         │
       LLM provider                     │
       (Gemini / Groq /                 │
        OpenRouter / Ollama)            │
              │                         │
              └─────────────────────────┘
                       result
```

### The prompt

Every question goes through a Cisco-anchored system prompt that:

1. Tells the model it's a senior NetAcad instructor.
2. Requires it to obey "Choose two / (Choose three.)" instructions literally.
3. Distinguishes radio (single) vs checkbox (multi) inputs based on the captured `<input type>`.
4. Requires JSON output with an `analysis` field _before_ `indices`/`answers`, forcing chain-of-thought.
5. Forbids paraphrasing — the model must quote option text verbatim.

For ordering / matching / fill-in / hotspot questions, a generic prompt asks the model to identify the type itself and emit a `structuredAnswer` array suitable for rendering.

### Privacy

- Your API keys live in `chrome.storage.local`, never synced.
- Settings (provider choice, model, toggles) live in `chrome.storage.sync` — synced across your browser profile but never readable by Acadia's authors.
- The only network traffic Acadia generates is the single LLM API call per question, sent directly from your browser to the provider you configured.
- No telemetry. No analytics. No phone-home.

## Providers

| Provider | Where to get a key | Free tier | Notes |
|---|---|---|---|
| **Gemini** ⭐ | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | 15 RPM, 1500 RPD on `gemini-2.0-flash` | Recommended default |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | strict daily cap, very fast | `openai/gpt-oss-120b` is excellent |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | ~1000 req/day on `:free` models | Browse current free models at [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0) |
| Ollama | local | unlimited | Run any model locally, zero cost |

Full provider setup walkthrough: [docs/PROVIDERS.md](docs/PROVIDERS.md).

## Building

To produce a distributable `.xpi`:

```bash
cd acadia
zip -r ../acadia.xpi . -x "*.git*" "docs/*" "*.md" "*.DS_Store"
```

That zip is also a valid Chrome unpacked extension if you extract it; or load this folder directly via **Load unpacked**.

## Troubleshooting

**Panel doesn't appear** — Ensure the URL is on `*.netacad.com`. Open DevTools console; look for `NetAcad AI Study Helper content script loaded and ready.`. If absent, the content script didn't attach — try hard-reloading the tab.

**Wrong answer / stale answer from previous question** — The currently-visible question must have its center inside the viewport for Acadia to consider it "active." If scrolling is weird, try scrolling the question into the middle of the page and clicking **Regenerate**.

**HTTP 429 quota errors** — You hit your provider's rate limit. Either wait (the error message tells you how long), switch to a higher-quota model (`gemini-2.0-flash` over `gemini-2.5-flash`), or change provider.

**OpenRouter `:free` model returns 404** — Model IDs rotate. Visit [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0) and copy a current model slug into the popup.

**Question type not handled** — If the panel says "Could not find a question" on something unusual (a Packet Tracer activity, a video-with-questions, an interactive sim), Acadia probably can't read it. Open an issue with a screenshot.

## Roadmap

- [ ] Course content indexing with on-page retrieval for course-specific context
- [ ] Image-based question support (vision-capable models)
- [ ] Multi-language UI
- [ ] Export answer history to markdown
- [ ] Browser-extension-store distribution

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

## Disclaimer

Acadia is an **educational study aid**. It is intended to help students understand Cisco curriculum concepts by explaining the reasoning behind quiz questions. Using it to submit answers to graded assessments you did not arrive at yourself may violate your institution's academic integrity policies — that's between you and your school.

The author is **not affiliated with Cisco Systems, Inc.** or the Cisco Networking Academy. "Cisco," "NetAcad," and "Cisco Networking Academy" are trademarks of Cisco Systems, Inc., used here solely for descriptive purposes.

## Credits

This project is a fork of **[vbatecan/netacad-autoanswer](https://github.com/vbatecan/netacad-autoanswer)** by **Vince Angelo Batecan**, originally released under MIT. All original architecture, shadow-DOM scraping, popup/content-script wiring, and the core extension scaffolding come from the upstream project. Huge thanks to Vince for building and open-sourcing it.

Changes introduced in this fork:

- Rewritten Cisco-domain prompt pipeline with forced chain-of-thought and verbatim option matching
- Multi-provider LLM support (Gemini, Groq, OpenRouter, Ollama) instead of Groq-only
- Generic question-type fallback for ordering, matching, and other non-MCQ formats
- Strict viewport-center visibility check to fix stale-answer bugs
- Local answer cache with per-question signature dedup and force-refresh
- Redesigned floating panel and popup UI (glass-effect, draggable, toggle switches)
- Firefox / LibreWolf compatibility via `browser_specific_settings`

## License

MIT — see [LICENSE](LICENSE).

- Original work © 2025 Vince Angelo Batecan
- Fork modifications © 2026 Alp Krasniqi
