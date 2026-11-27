// Pages made to slow down the cleanup patterns (CodeQL js/polynomial-redos).
// Before the fix, a 78 KB page of "<div" took 11 s with AIMODE, and a 234 KB
// page of '<div class="' took 37 s with COPILOT. Each page here must parse in
// less than one second with every provider. Run `npm run build` first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parser } from '../dist/index.esm.js';

const providers = ['CHATGPT', 'GEMINI', 'PERPLEXITY', 'COPILOT', 'AIMODE', 'AIOVERVIEW', 'BING_AIMODE', 'GROK'];
const allOptions = {
  removeLinks: true,
  removeHeader: true,
  removeFooter: true,
  removeSidebar: true,
  removeSources: true,
  invertColors: true,
};

// Each unit is repeated until the page is approximately 300 KB.
const units = [
  '<div',
  '<div class="',
  '<html',
  '<head ',
  '<body',
  '<a ',
  '<header',
  '<iframe ',
  '<script',
  '<noscript',
  '<input-container',
  '<bard-sidenav',
  '<context-sidebar',
  '<top-bar-actions',
  '<sources-sidebar-button',
  '<div class="ca_userquery_text"',
  '<div class="ca_userquery_text">',
  ' class="ca_userquery_text"',
  '<div class="OEwhSe">',
  '<div data-xid="aim-mars-input-plate">',
  '<div jscontroller="P5gZDb">',
  '<div aria-label="AI Mode history" class="ho072b">',
  '<div role="dialog">',
  '<div id="cookie-banner">',
  '<div class="absolute bottom-0 w-full">',
  '<div class="boqOnegoogleliteOgbOneGoogleBar">',
  '<div class="w-sideBarWidth">',
  '<div class="@container/header">',
  '<div class="h-dvh flex-shrink-0 max-w-sm">',
  '<div class="relative h-full overflow-hidden will-change-auto" style="width: 1px">',
  '<header id="page-header">',
  '<button aria-label="AI Mode history">',
];

for (const unit of units) {
  test(`${JSON.stringify(unit)} repeated to 300 KB`, () => {
    const html = unit.repeat(Math.ceil(300_000 / unit.length));
    for (const provider of providers) {
      const start = performance.now();
      try {
        parser.parseWithProvider({ result: { html } }, provider, allOptions);
      } catch {
        // A provider can reject a page that is not its own. Only the time counts.
      }
      const ms = performance.now() - start;
      assert.ok(ms < 1000, `${provider} took ${Math.round(ms)} ms`);
    }
  });
}
