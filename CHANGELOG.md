# Changelog

All notable changes to Acadia are tracked here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] — Fork release

Fork of [vbatecan/netacad-autoanswer](https://github.com/vbatecan/netacad-autoanswer) by Vince Angelo Batecan, with the following modifications:


### Added
- Multi-provider LLM support: **Google Gemini**, **Groq**, **OpenRouter**, **Ollama**
- Cisco-domain system prompt anchored to CCNA, CyberOps, DevNet, NetSec curricula
- Numbered-option prompt format with verbatim text matching, eliminating fuzzy-match errors
- Forced chain-of-thought via JSON schema (`analysis` field required before `indices`/`answers`)
- Automatic question-type detection: single MCQ, multi-select MCQ, ordering, matching, fill-in
- Generic question fallback scraper for non-MCQ question types
- "Choose two" / "(Choose 3)" / "select all that apply" regex detection
- Radio vs checkbox input awareness passed through to the model
- Accuracy mode — optional second verification pass
- Lesson context input — paste authoritative notes into the popup
- Local answer cache with per-question signature dedup
- In-flight request dedup — DOM mutations don't double-fire
- Force-regenerate via panel button bypasses cache
- **Redesigned UI**: glass-effect floating panel with modern dark aesthetic
- Draggable header, minimize/close buttons
- Copy-answer button
- Loading shimmer animation and status indicator dot
- Confidence pill (low/medium/high)
- Reasoning section displayed alongside the answer
- Diagnostic panel mode for debugging
- Toggle switches throughout the popup, segmented provider tabs
- Firefox / LibreWolf compatibility via `browser_specific_settings` and `background.scripts`

### Changed
- Default provider: Gemini (was Groq)
- Default Gemini model: `gemini-2.0-flash` (1500 RPD free vs `gemini-2.5-flash`'s 250)
- Default Groq model: `openai/gpt-oss-120b`
- Strict viewport-center visibility check on MCQs — stops stale answers when SPA leaves old elements in DOM
- Rebranded from `fsociety00.dat` to `Acadia`

### Fixed
- Stale answer panel persisting across question navigation in single-page exams
- Wrong-question detection when previous `<mcq-view>` lingers off-screen
