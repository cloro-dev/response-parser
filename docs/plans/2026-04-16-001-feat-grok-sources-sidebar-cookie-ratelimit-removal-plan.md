---
title: "feat: Add Grok sources hiding, cookie banner removal, and rate-limit banner removal"
type: feat
status: active
date: 2026-04-16
---

# feat: Add Grok sources hiding, cookie banner removal, and rate-limit banner removal

## Overview

Extend the Grok provider to support three new element-hiding capabilities:
1. **Sources panel** — hide the right-side sources drawer and the inline "N sources" trigger button, gated by a new `removeSources` option
2. **Cookie/consent banner** — always remove cookie consent overlays (following Copilot's precedent)
3. **Rate-limit banner** — always remove the "One query left for Auto. Limit resets every 2 hours." inline notification

## Problem Frame

Grok HTML pages contain UI chrome that is irrelevant when rendering parsed responses: a sources drawer on the right, cookie consent banners, and rate-limit warnings. These elements clutter the output and should be hidden automatically (banners) or on request (sources panel).

The existing `removeSidebar` option controls the **left-hand navigation sidebar** across providers. Sources is a distinct concept (right-side content panel) and needs its own option.

## Requirements Trace

- R1. Sources panel (vaul-drawer from right + inline "N sources" trigger) must be hideable via a new `removeSources` option
- R2. Cookie/consent banner must be removed by default (always-on, like Copilot)
- R3. Rate-limit inline banner ("One query left for Auto...") must be removed by default (always-on)
- R4. Metadata must track what was removed (`sourcesRemoved`, `cookieBannerRemoved`)

## Scope Boundaries

- New `removeSources` option added to `ParseOptions` and `sourcesRemoved` to `ProviderMetadata`
- No new options for cookie/rate-limit — these are always-on removals
- Only CSS-based hiding (consistent with Grok provider's existing approach)
- No changes to other providers (they can adopt `removeSources` later if needed)

## Context & Research

### Relevant Code and Patterns

- `src/providers/grok.ts` — current Grok provider, uses CSS injection for header/footer hiding
- `src/providers/copilot.ts:54-63` — cookie banner removal pattern (always-on, regex-based). For Grok, CSS-based hiding is more appropriate since elements are dynamically rendered
- `src/core/types.ts:18-23` — `ParseOptions` interface; `removeSources` will be added here
- `src/core/types.ts:50-58` — `ProviderMetadata` interface; `sourcesRemoved` will be added here
- Grok uses the **vaul** library for drawers (right-sliding panel for sources)
- Grok uses **sonner** for toast notifications (cookie/rate-limit banners may render here)
- The "N sources" inline trigger has class pattern: `rounded-full cursor-pointer bg-surface-l1 border border-border-l1` with a child `div.truncate` containing "N sources"
- The rate-limit banner config flag is `"inline-rate-limit-banner":true` — the banner is rendered dynamically
- Portal elements render at `div#portal` (fixed, z-index 9999) for overlays/modals

### Grok HTML Structure (Key Selectors)

**Sources trigger button:** Inline within response, wrapped in a div with `data-state="closed"`, contains favicon images and "N sources" text in `div.truncate`

**Vaul drawer (sources panel):** Uses `[vaul-drawer][vaul-drawer-direction=right]` attribute selector. Opens as overlay from right side.

**Cookie/consent overlays:** Rendered dynamically via portal (`#portal`) or sonner toaster. Target with broad CSS selectors for cookie consent patterns.

**Rate-limit banner:** Rendered inline, likely using toast/banner pattern. The feature flag `inline-rate-limit-banner` confirms it appears within the conversation area.

## Key Technical Decisions

- **New `removeSources` option** (not reusing `removeSidebar`): `removeSidebar` controls the left-hand navigation sidebar. Sources is a semantically different right-side content panel and deserves its own option for clarity and independent control.
- **CSS injection over regex removal**: Grok renders elements dynamically via React/Next.js. CSS `display: none !important` is more resilient than regex against SSR/hydration differences. Consistent with the existing Grok provider approach for header/footer.
- **Always-on for cookie + rate-limit**: Following Copilot's cookie banner precedent — these are noise, not content. No option flag needed.

## Implementation Units

- [ ] **Unit 1: Add `removeSources` to types**

**Goal:** Add the new option and metadata field to the shared type definitions

**Requirements:** R1, R4

**Dependencies:** None

**Files:**
- Modify: `src/core/types.ts`

**Approach:**
- Add `removeSources?: boolean` to `ParseOptions` interface
- Add `sourcesRemoved?: boolean` to `ProviderMetadata` interface

**Patterns to follow:**
- Existing `removeSidebar` in `ParseOptions` and `sidebarRemoved` in `ProviderMetadata`

**Test scenarios:**
- Happy path: TypeScript compiles with the new fields
- Happy path: New fields are optional and don't break existing provider implementations

**Verification:**
- `pnpm type-check` passes
- No other provider's `parse()` method needs changes (fields are optional)

- [ ] **Unit 2: Add sources hiding via CSS in Grok provider**

**Goal:** Hide the sources trigger button and the vaul-drawer right panel when `removeSources` is requested

**Requirements:** R1, R4

**Dependencies:** Unit 1

**Files:**
- Modify: `src/providers/grok.ts`

**Approach:**
- Add CSS rules to the `stylesToInject` string when `options?.removeSources` is true
- Target the vaul-drawer with `[vaul-drawer][vaul-drawer-direction=right]` and its overlay `[vaul-overlay]`
- Target the inline sources trigger with a selector matching the sources button pattern (the div containing favicon images + "N sources" truncated text)
- Track `sourcesRemoved` in metadata

**Patterns to follow:**
- Existing header/footer CSS injection pattern in `src/providers/grok.ts:47-69`

**Test scenarios:**
- Happy path: When `removeSources: true`, injected CSS contains vaul-drawer-direction=right and sources trigger selectors
- Happy path: When `removeSources` is false/undefined, no sources CSS is injected
- Happy path: Metadata reflects `sourcesRemoved: true` when option is enabled

**Verification:**
- Parsed HTML includes CSS rules targeting the sources drawer and trigger when `removeSources` is true
- Metadata correctly reports `sourcesRemoved` state

- [ ] **Unit 3: Add always-on cookie banner and rate-limit banner removal**

**Goal:** Automatically hide cookie/consent banners and rate-limit messages in all Grok parsed output

**Requirements:** R2, R3, R4

**Dependencies:** None (can be implemented in parallel with Unit 2)

**Files:**
- Modify: `src/providers/grok.ts`

**Approach:**
- Add cookie banner CSS rules to the always-injected styles (not gated by any option)
- Target common cookie consent patterns: `#cookie-banner`, `[class*="cookie"]`, consent dialog overlays
- Target sonner toast notifications for rate-limit banners: `[data-sonner-toaster]`, `[data-sonner-toast]`
- Also target elements rendered in `#portal` that match cookie/consent patterns
- Set `cookieBannerRemoved: true` in metadata

**Patterns to follow:**
- `src/providers/copilot.ts:54-63` for always-on removal concept
- `src/providers/copilot.ts:96` for unconditional invocation in parse method
- `src/providers/copilot.ts:129` for metadata tracking

**Test scenarios:**
- Happy path: Parsed HTML always includes cookie banner and rate-limit hiding CSS regardless of options
- Happy path: Metadata always includes `cookieBannerRemoved: true`
- Edge case: CSS selectors are broad enough to catch both toast-style and inline-style rate limit messages

**Verification:**
- Cookie banner and rate-limit CSS rules are present in output HTML even with empty/default options
- Metadata correctly reports `cookieBannerRemoved: true`

## System-Wide Impact

- **API surface:** New `removeSources` field in `ParseOptions` and `sourcesRemoved` in `ProviderMetadata`. Both are optional — no breaking changes.
- **Unchanged invariants:** `removeSidebar` remains for left-hand sidebar. Other providers, detection, and extraction pipeline are not modified.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Grok may change CSS class names or DOM structure | CSS selectors use attribute-based matching (e.g., `[vaul-drawer]`) which is more stable than class-based. Multiple fallback selectors per target. |
| Cookie/rate-limit banners may not be present in all captures | CSS hiding is a no-op when elements don't exist — no harm in always injecting |
| Sources button selector may be too broad | Use a specific compound selector targeting the favicon + truncate text pattern within the response area |
