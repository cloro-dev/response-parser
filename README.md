# @cloro-dev/response-parser

A powerful TypeScript library for parsing AI model responses from ChatGPT, Gemini, Perplexity, Copilot, Grok, and Google AI Overview/Mode.

> **Framework-Agnostic**: This library returns HTML strings that can be rendered in any framework (React, Vue, Svelte, vanilla JS, etc.).

## Features

- 🤖 **Multi-Provider Support**: ChatGPT, Gemini, Perplexity, Copilot, AI Overview, AI Mode, Grok
- 🔍 **Auto-Detection**: Automatically detects the AI provider from response structure
- 🎨 **Built-in Styling**: Provider-specific styling
- 🔧 **Framework-Agnostic**: Pure HTML output for any framework
- 🔒 **Secure**: Automatic script sanitization
- 📦 **TypeScript**: Full TypeScript support with comprehensive types
- 🎯 **Lightweight**: No runtime dependencies for core parsing

## Installation

```bash
npm install @cloro-dev/response-parser
# or
yarn add @cloro-dev/response-parser
# or
pnpm add @cloro-dev/response-parser
```

## Quick Start

This library parses AI responses and returns sanitized HTML strings. You can render the HTML in any framework:

```typescript
import { parseAiResponse, detectProvider } from "@cloro-dev/response-parser";

// Auto-detect provider and parse
const response = await fetchAIResponse();
const parsed = parseAiResponse(response);

console.log(parsed.provider); // 'CHATGPT' | 'GEMINI' | etc.
console.log(parsed.html); // Sanitized HTML ready for rendering
console.log(parsed.text); // Plain text version
```

## Usage Examples

### React

```tsx
import { parseAiResponse } from "@cloro-dev/response-parser";

function MyComponent() {
  const parsed = parseAiResponse(aiResponse, {
    removeLinks: true
  });

  return (
    <div dangerouslySetInnerHTML={{ __html: parsed.html }} />
  );
}
```

### Vue

```vue
<script setup>
import { parseAiResponse } from "@cloro-dev/response-parser";

const parsed = parseAiResponse(aiResponse, {
  removeLinks: true
});
</script>

<template>
  <div v-html="parsed.html"></div>
</template>
```

### Svelte

```svelte
<script>
import { parseAiResponse } from "@cloro-dev/response-parser";

const parsed = parseAiResponse(aiResponse, {
  removeLinks: true
});
</script>

<div>{@html parsed.html}</div>
```

### Vanilla JavaScript

```javascript
import { parseAiResponse } from "@cloro-dev/response-parser";

const parsed = parseAiResponse(aiResponse, {
  removeLinks: true
});

document.getElementById('output').innerHTML = parsed.html;
```

## API Reference

### `parseAiResponse(response, options?)`

Parse an AI response with auto-detected provider.

**Options:**

- `removeLinks`: `boolean` - Remove all hyperlinks from HTML (default: `false`)
- `removeHeader`: `boolean` - Remove navigation bar/header (default: `false`, Perplexity, Gemini, Copilot, AI Overview & AI Mode)
- `removeFooter`: `boolean` - Remove follow-up input box/footer (default: `false`, ChatGPT, Perplexity, Gemini, Copilot, AI Overview & AI Mode)
- `removeSidebar`: `boolean` - Remove sidebar (default: `false`, ChatGPT, Gemini, Copilot & AI Mode)
- `removeSources`: `boolean` - Remove sources/references panel (default: `false`, Gemini, Perplexity, Copilot & Grok)

> **Note:** Cookie/privacy banners are automatically removed for AI Mode, Copilot, Grok, and Perplexity — no option needed.

**Returns:** `ParsedResponse | null`

```typescript
interface ParsedResponse {
  provider: AIProvider;
  html: string;
  text: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
}
```

### `detectProvider(response)`

Detect the AI provider from a response.

**Returns:** `AIProvider | null`

```typescript
type AIProvider =
  | 'CHATGPT'
  | 'GEMINI'
  | 'PERPLEXITY'
  | 'COPILOT'
  | 'AIOVERVIEW'
  | 'AIMODE'
  | 'GROK';
```

## Supported Providers

| Provider    | Status | Features                                                    |
| ----------- | ------ | ----------------------------------------------------------- |
| ChatGPT     | ✅     | Sidebar, header, footer removal                             |
| Gemini      | ✅     | Sidebar, header, footer, sources removal                    |
| Perplexity  | ✅     | Header, footer, sources removal, auto cookie banner hiding  |
| Copilot     | ✅     | Sidebar, header, footer, sources removal, auto cookie banner hiding |
| AI Overview | ✅     | Header, footer removal, WIZ data extraction                 |
| AI Mode     | ✅     | Sidebar, header, footer removal, auto cookie banner hiding  |
| Grok        | ✅     | Sources removal, auto cookie banner hiding                  |

## Common Use Cases

### Remove Hyperlinks

```typescript
import { parseAiResponse } from "@cloro-dev/response-parser";

const parsed = parseAiResponse(response, {
  removeLinks: true, // Removes all <a> tags, keeps text
});
```

### Clean View (Remove UI Elements)

```typescript
const parsed = parseAiResponse(response, {
  removeHeader: true,  // Remove top navigation bar
  removeFooter: true,  // Remove follow-up input box
  removeLinks: true,   // Remove all hyperlinks
  removeSources: true, // Remove sources/references panel
});
```

### Manual Provider Specification

```typescript
import { parseAiResponse, AIProvider } from "@cloro-dev/response-parser";

const parsed = parseAiResponse(response, {
  provider: "CHATGPT",
});
```

### Provider Detection Only

```typescript
import { detectProvider } from "@cloro-dev/response-parser";

const provider = detectProvider(response);
console.log(`Detected: ${provider}`); // 'CHATGPT' | 'GEMINI' | etc.
```

## Migration from v0.1.x

If you were using React components from v0.1.x, here's how to migrate:

### Before (v0.1.x with React)

```tsx
import { ResponseRenderer } from "@cloro-dev/response-parser/react";

<ResponseRenderer
  response={response}
  removeLinks={true}
  onProviderDetected={(provider) => console.log("Detected:", provider)}
/>
```

### After (v0.2.0 framework-agnostic)

```tsx
import { parseAiResponse } from "@cloro-dev/response-parser";

const parsed = parseAiResponse(response, {
  removeLinks: true
});

console.log("Detected:", parsed.provider);

<div dangerouslySetInnerHTML={{ __html: parsed.html }} />
```

The core parsing logic is identical - you just need to handle the HTML rendering yourself in your framework of choice.

## What's Changed

### v0.4.1

- ✅ **Added** Copilot `removeSources` and `removeSidebar` support
- ✅ **Added** Copilot automatic cookie banner removal
- ✅ **Added** AI Mode `removeSidebar` support (history panel removal)
- ✅ **Fixed** AI Mode sidebar/footer removal and detection
- ✅ **Added** AI Mode automatic cookie consent banner hiding

### v0.4.0

- ✅ **Added** `removeSources` option for Gemini, Perplexity, and Grok
- ✅ **Added** automatic cookie/privacy banner removal for Perplexity and Grok
- ✅ **Fixed** Perplexity collapsed answer container (JS animation height workaround)

### v0.3.0

- ✅ **Added** Grok provider support
- ✅ **Simplified** codebase and removed colour inversion

### v0.2.0

- ✅ **Removed** React components and hooks (now framework-agnostic)
- ✅ **Removed** React peer dependency
- ✅ **Simplified** API to return pure HTML strings
- ✅ **Keep** core parsing logic (unchanged)

### v0.1.4

- ✅ **Renamed** `removeNavbar` → `removeHeader` (removes navigation bar/header)
- ✅ **Renamed** `removeFollowup` → `removeFooter` (removes follow-up input box/footer)
- ✅ **Extended** `removeHeader` support to AI Overview and AI Mode
- ✅ **Extended** `removeFooter` support to all providers (ChatGPT, Perplexity, Gemini, Copilot, AI Overview, AI Mode)
- ✅ **Improved** ChatGPT styling
- ✅ **Updated** AI Mode and AI Overview parsers

### v0.1.3

- ✅ **Always sanitizes** HTML by default (removes scripts for security)
- ✅ **Always includes** provider-specific styles
- ✅ **Always uses** provider's base URL for relative links
- ❌ **Removed** `theme` option (styles are provider-specific)
- ❌ **Removed** `sanitize` option (always enabled)
- ❌ **Removed** `includeStyles` option (always enabled)
- ❌ **Removed** `baseUrl` option (uses provider default)

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Development mode
pnpm dev

# Type check
pnpm type-check

# Lint
pnpm lint
```

## License

MIT © cloro
