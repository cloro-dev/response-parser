# Review against monitor `result` samples, 2026-10-07

## Method

- Source: `monitor.result`, read through the Redash API (data source 4).
  `response.result.html` is now a link to a gzip file in the
  `cloro-monitor-archive` bucket. The HTML is not inline.
- Sample: 73 rows with `status = 'SUCCESS'` from a 3-hour window on
  2026-10-07. For each provider: the 6 newest rows and the 6 rows with the
  highest `sourceCount`.
- Each sample was parsed with each option alone and with all options. The
  output was rendered in headless Chromium (1280x900, scripts off, provider
  CSS loaded), which is how the dashboard iframe shows it. A script then
  measured which page regions were visible and if the answer text was
  complete.

| Provider (`model`) | Samples | Parser provider |
|---|---|---|
| CHATGPT | 12 | CHATGPT |
| GEMINI | 12 | GEMINI |
| COPILOT | 12 | COPILOT |
| AIMODE | 12 | AIMODE |
| GOOGLE | 12 | AIOVERVIEW |
| GOOGLE_NEWS | 6 | AIOVERVIEW |
| PERPLEXITY | 7 | PERPLEXITY |

Not tested: GROK has no rows in the last 30 days. CLAUDE has 5,089 rows in
the last 30 days and none has HTML.

## Gemini sources

The parser removes the Gemini sources panel when `removeSources: true` is
set: 9 of 9 samples that have a panel, before and after this change.

The dashboard playground does not set the option. The call in
`dashboard/src/components/playground/html-view.tsx` passes only
`{ removeSidebar: true }`, and no dashboard commit has passed
`removeSources`. That is why the panel shows there.

## Defects found and fixed

Counts are samples in which the defect occurs.

| Provider | Defect | Before | After |
|---|---|---|---|
| Perplexity | Open "Sources" popover stays after `removeSources` | 7 of 7 | 0 of 7 |
| Perplexity | Cookie banner visible (old selector `#cookie-consent` matches nothing) | 5 of 5 | 0 of 5 |
| Perplexity | Sign-in card visible | 3 of 3 | 0 of 3 |
| Perplexity | Full-page sign-in modal covers the answer | 1 of 1 | 0 of 1 |
| Copilot | `removeHeader` breaks the layout (answer column 720 px becomes 1212 px) | 12 of 12 | 0 of 12 |
| Copilot | `removeSidebar` also hides the references panel | 11 of 11 | 0 of 11 |
| Copilot | Date divider stays after `removeHeader` (regex matches nothing) | 12 of 12 | gone in the 1 sample checked by screenshot |
| ChatGPT | Sources flyout stays after `removeSources` | 5 of 12 | 0 of 12 |
| ChatGPT | Sources sheet (modal with backdrop) stays after `removeSources` | 1 of 1 | 0 of 1 |
| ChatGPT | `removeFooter` changes the page structure (answer column 640 px becomes 768 px) | 12 of 12 | 0 of 12 |
| Gemini | Sign-in prompt visible | 12 of 12 | 0 of 12 |
| Google, Google News | Footer visible after `removeFooter` | 18 of 18 | 0 of 18 |
| All | Provider detection wrong | 1 of 73 | 0 of 73 |
| Package | `require()` of the package fails | fails | works |

Causes:

- **Unbalanced regex.** Several removals matched an opening `<div>` and a
  fixed number of `</div>` tags. The match did not close the element it
  opened (up to 10 `<div>` tags left open in the ChatGPT composer). The
  browser then re-parented the remaining page. These removals now use an
  injected `display: none` rule, which is the approach the Perplexity and
  Grok providers use already.
- **Old selectors.** Perplexity changed its cookie banner and now opens the
  sources in a popover. Google changed its footer id to `#sfooter`.
- **Detection.** Each Gemini page matched GEMINI and AIOVERVIEW with the same
  score, and GEMINI won only because it is first in the list. One Google
  result page that links to `gemini.google.com` was detected as GEMINI. The
  patterns now use page markup (`<chat-app`, `id="gsr"`, `aim-mars`). The 12
  older files in `samples/` are also detected correctly.
- **CommonJS entry.** `package.json` has `"type": "module"` and pointed
  `main` and `require` at `dist/index.js`, a CommonJS file. Node loaded it as
  an ES module and stopped with `exports is not defined`. The file is now
  `dist/index.cjs`. Version 0.4.4 has the same defect.

After the change, each option hides its region in all samples that have the
region, and the answer text is complete in 73 of 73 samples for
`removeFooter`, `removeSidebar`, `removeSources` and `removeLinks`.

## Behaviour change for the dashboard

`removeSidebar` on Copilot no longer hides the references panel. The
dashboard passes only `removeSidebar`, so the Copilot references panel will
show there after an upgrade. Set `removeSources: true` in
`html-view.tsx`. This also hides the sources in Gemini, ChatGPT and
Perplexity.

## Not fixed

1. **AI Mode and AI Overview have no `removeSources`.** The sources rail is
   visible in 9 of 12 AI Mode samples and 9 of 12 Google samples.
2. **Gemini `removeSidebar` does nothing.** The `<bard-sidenav>` element is
   in 0 of 12 samples. No sidebar is visible in the samples.
3. **The sanitizer removes only `<script>` and `<noscript>`.** Inline event
   handlers stay (`onerror="_rtf(this)"` in 30 of 30 Google pages), and
   `<iframe>` elements stay. The README shows `dangerouslySetInnerHTML` and
   `innerHTML`. The dashboard uses a sandboxed iframe, so it is not affected.
4. **Google `removeHeader` hides `div[role="navigation"]`.** This includes
   the pagination block: 5% of the result text on average, 8% at most.
5. **No `AIProvider` value for CLAUDE or GOOGLE_NEWS.** Google News renders
   correctly through AIOVERVIEW.
6. **Grok is not verified.** There are no recent samples.
7. **The repository has no tests.** The scripts for this review are not in
   the repository.

## Limits of this review

- One 3-hour window. Perplexity has 7 samples.
- One viewport (1280x900). The dashboard iframe can be narrower.
- The measurement finds a region that stays visible and answer text that
  goes missing. It does not find all visual defects.
