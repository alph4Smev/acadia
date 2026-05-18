# Contributing to Acadia

Thanks for your interest. Acadia is small and friendly — PRs and issues welcome.

## Reporting bugs

Open a GitHub issue with:

- **What happened** and **what you expected** to happen
- The NetAcad URL pattern (you can redact the course UUID)
- A screenshot of the question + the Acadia panel
- The browser console output (DevTools → Console) at the time the bug occurred
- Whether **Diagnostic Panel** was enabled in the popup — if yes, paste the contents of the diagnostic block from the panel

For wrong-answer reports, please also include:

- Provider + model you were using
- Whether **Accuracy mode** was on or off
- The full question text and all options (verbatim)

## Suggesting features

Open an issue describing the use case. If the feature is provider-specific (e.g. a new LLM provider), include:

- Public docs link to the provider's chat-completion / generate-content endpoint
- An example request / response payload
- Free tier limits (if any)

## Development setup

No build step. Acadia is plain JS + HTML + CSS.

```bash
git clone <your-fork>
cd acadia
# Load `acadia/` as an unpacked extension in your browser:
#  - Firefox/LibreWolf: about:debugging → Load Temporary Add-on → pick manifest.json
#  - Chromium: chrome://extensions → enable Developer mode → Load unpacked → pick this folder
```

Edit files, reload the extension, hard-reload the netacad tab to see changes.

## Code style

- 2-space indentation, no tabs
- Plain JS, no transpiler — keep it readable and runnable as-is in MV3
- Prefer descriptive function names over comments. Comments are for *why*, not *what*.
- Don't introduce dependencies without strong justification — this is a zero-dependency content-script extension and that's a feature, not a limitation

## Pull request checklist

- [ ] Tested in Firefox **and** Chromium (or one of them with a note about which)
- [ ] No new permissions in `manifest.json` unless strictly needed
- [ ] No leaked API keys, tokens, or personal data in commits
- [ ] `CHANGELOG.md` updated with a one-line entry under an `[Unreleased]` heading
- [ ] If the prompt changed, you've tested against ≥5 real NetAcad MCQs and the new prompt is at least as accurate as the old one

## Areas where help is especially welcome

- **Question-type coverage** — Acadia handles MCQs (radio/checkbox) and falls back to a generic prompt for ordering / matching / fill-in. Native support (better scraping + structured rendering) for these other types would be a meaningful win.
- **Packet Tracer simulator questions** — currently unsupported because the simulator runs in a Java/Flash/WASM container the content script can't read.
- **Image-based questions** — would need a vision-capable provider path (Gemini / Claude / GPT-4o-class).
- **Localization** — UI strings are hardcoded in English. A simple `messages.json` setup would unlock other languages.

## License

By contributing, you agree your contributions are licensed under the MIT License — the same as the rest of the project.
