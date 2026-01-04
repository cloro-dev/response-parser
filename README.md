# @cloro-dev/response-parser

A powerful TypeScript library for parsing and rendering AI model responses from ChatGPT, Gemini, Perplexity, Copilot, and Google AI Overview/Mode.

## Features

- 🤖 **Multi-Provider Support**: ChatGPT, Gemini, Perplexity, Copilot, AI Overview, AI Mode
- 🔍 **Auto-Detection**: Automatically detects the AI provider from response structure
- 🎨 **Built-in Styling**: Provider-specific styling with dark mode support
- ⚡ **React Components**: Ready-to-use React components for rendering
- 🔒 **Secure**: Sandboxed rendering with automatic script sanitization
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

### Basic Parsing

```typescript
import { parseAiResponse, detectProvider } from "@cloro-dev/response-parser";

// Auto-detect provider and parse
const response = await fetchAIResponse();
const parsed = parseAiResponse(response);

console.log(parsed.provider); // 'CHATGPT' | 'GEMINI' | etc.
console.log(parsed.html); // Sanitized HTML ready for rendering
console.log(parsed.text); // Plain text version
```

### React Component

```tsx
import { ResponseRenderer } from "@cloro-dev/response-parser/react";

function MyComponent() {
  const [aiResponse, setAiResponse] = useState(null);

  return (
    <ResponseRenderer
      response={aiResponse}
      removeLinks={false}
      invertColors={false}
      autoDetect
      className="w-full h-96"
      iframeProps={{
        sandbox: "allow-popups",
      }}
      onProviderDetected={(provider) => console.log("Detected:", provider)}
    />
  );
}
```

## API Reference

### Core Functions

#### `parseAiResponse(response, options?)`

Parse an AI response with auto-detected provider.

**Options:**

- `removeLinks`: `boolean` - Remove all hyperlinks from HTML (default: `false`)
- `invertColors`: `boolean` - Apply color inversion for dark mode (default: `false`)
- `removeHeader`: `boolean` - Remove navigation bar/header (default: `false`, Perplexity, Gemini, Copilot, AI Overview & AI Mode)
- `removeFooter`: `boolean` - Remove follow-up input box/footer (default: `false`, ChatGPT, Perplexity, Gemini, Copilot, AI Overview & AI Mode)
- `removeSidebar`: `boolean` - Remove sidebar (default: `false`, ChatGPT, Gemini & Copilot)

**Returns:** `ParsedResponse | null`

#### `detectProvider(response)`

Detect the AI provider from a response.

**Returns:** `AIProvider | null`

### React Components

#### `<ResponseRenderer />`

Main React component for rendering AI responses.

**Props:**

- `response`: The AI response object
- `autoDetect`: Auto-detect provider (default: `true`)
- `provider`: Explicitly specify provider
- `removeLinks`: Remove all hyperlinks (default: `false`)
- `invertColors`: Apply color inversion (default: `false`)
- `removeHeader`: Remove navigation bar/header (default: `false`, Perplexity, Gemini, Copilot, AI Overview & AI Mode)
- `removeFooter`: Remove follow-up input box/footer (default: `false`, ChatGPT, Perplexity, Gemini, Copilot, AI Overview & AI Mode)
- `removeSidebar`: Remove sidebar (default: `false`, ChatGPT, Gemini & Copilot)
- `className`: CSS class for container
- `iframeProps`: Additional props for iframe
- `loadingComponent`: Custom loading component
- `errorComponent`: Custom error component
- `fallbackComponent`: Custom fallback component
- `onRenderComplete`: Callback when rendering completes
- `onProviderDetected`: Callback when provider is detected

### Hooks

#### `useResponse(response, options?)`

React hook for parsing AI responses.

**Options:**

- `autoDetect`: Auto-detect provider (default: `true`)
- `provider`: Explicitly specify provider
- `removeLinks`: Remove all hyperlinks (default: `false`)
- `invertColors`: Apply color inversion (default: `false`)
- `removeHeader`: Remove navigation bar/header (default: `false`, Perplexity, Gemini, Copilot, AI Overview & AI Mode)
- `removeFooter`: Remove follow-up input box/footer (default: `false`, ChatGPT, Perplexity, Gemini, Copilot, AI Overview & AI Mode)
- `removeSidebar`: Remove sidebar (default: `false`, ChatGPT, Gemini & Copilot)
- `onProviderDetected`: Callback when provider is detected
- `onError`: Callback when error occurs

**Returns:**

- `parsed`: Parsed response object
- `provider`: Detected provider
- `isLoading`: Loading state
- `error`: Error object
- `html`: HTML string
- `text`: Plain text string
- `sources`: Sources array (if available)
- `reparse`: Function to re-parse with new options

## Supported Providers

| Provider    | Status | Features                                          |
| ----------- | ------ | ------------------------------------------------- |
| ChatGPT     | ✅     | Dark mode, sidebar hiding                         |
| Gemini      | ✅     | Material Design overrides, navbar removal         |
| Perplexity  | ✅     | Color inversion, link removal, UI element removal |
| Copilot     | ✅     | UI element hiding                                 |
| AI Overview | ✅     | WIZ data extraction                               |
| AI Mode     | ✅     | Google UI hiding                                  |

## Examples

### Remove Hyperlinks

```typescript
import { parseAiResponse } from "@cloro-dev/response-parser";

const parsed = parseAiResponse(response, {
  removeLinks: true, // Removes all <a> tags, keeps text
});
```

### Dark Mode

```tsx
<ResponseRenderer
  response={response}
  invertColors={true} // Apply CSS filter for dark mode
  removeLinks={true} // Optionally remove links
/>
```

### Clean View (Remove UI Elements)

```tsx
<ResponseRenderer
  response={response}
  removeHeader={true} // Remove top navigation bar
  removeFooter={true} // Remove follow-up input box
  removeLinks={true} // Remove all hyperlinks
  invertColors={true} // Dark mode
/>
```

### Manual Provider Specification

```typescript
import { parseAiResponse, AIProvider } from "@cloro-dev/response-parser";

const parsed = parseAiResponse(response, {
  provider: "CHATGPT",
});
```

### Error Handling

```tsx
const ErrorComponent = ({ error, retry }) => (
  <div className="error">
    <p>Failed to load: {error.message}</p>
    <button onClick={retry}>Retry</button>
  </div>
);

<ResponseRenderer response={response} errorComponent={ErrorComponent} />;
```

## What's Changed

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

### Component Renaming

- `AiResponseRenderer` → `ResponseRenderer`
- `useAiResponse` → `useResponse`

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
```

## License

MIT © cloro
