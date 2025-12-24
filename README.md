# @cloro/response-parser

A powerful TypeScript library for parsing and rendering AI model responses from ChatGPT, Gemini, Perplexity, Copilot, and Google AI Overview/Mode.

## Features

- 🤖 **Multi-Provider Support**: ChatGPT, Gemini, Perplexity, Copilot, AI Overview, AI Mode
- 🔍 **Auto-Detection**: Automatically detects the AI provider from response structure
- 🎨 **Theme Support**: Built-in dark and light mode styling
- ⚡ **React Components**: Ready-to-use React components for rendering
- 🔒 **Secure**: Sandboxed rendering with script sanitization
- 📦 **TypeScript**: Full TypeScript support with comprehensive types
- 🎯 **Lightweight**: No runtime dependencies for core parsing

## Installation

```bash
npm install @cloro/response-parser
# or
yarn add @cloro/response-parser
# or
pnpm add @cloro/response-parser
```

## Quick Start

### Basic Parsing

```typescript
import { parseAiResponse, detectProvider } from '@cloro/response-parser';

// Auto-detect provider and parse
const response = await fetchAIResponse();
const parsed = parseAiResponse(response, { theme: 'dark' });

console.log(parsed.provider); // 'CHATGPT' | 'GEMINI' | etc.
console.log(parsed.html); // Sanitized HTML ready for rendering
console.log(parsed.text); // Plain text version
```

### React Component

```tsx
import { AiResponseRenderer } from '@cloro/response-parser/react';

function MyComponent() {
  const [aiResponse, setAiResponse] = useState(null);

  return (
    <AiResponseRenderer
      response={aiResponse}
      theme="dark"
      autoDetect
      className="w-full h-96"
      iframeProps={{
        sandbox: 'allow-popups'
      }}
      onProviderDetected={(provider) => console.log('Detected:', provider)}
    />
  );
}
```

## API Reference

### Core Functions

#### `parseAiResponse(response, options?)`

Parse an AI response with auto-detected provider.

**Options:**
- `theme`: `'light' | 'dark'` (default: `'dark'`)
- `baseUrl`: Base URL for relative links
- `sanitize`: Remove scripts (default: `true`)
- `includeStyles`: Inject provider-specific styles (default: `true`)

**Returns:** `ParsedResponse | null`

#### `detectProvider(response)`

Detect the AI provider from a response.

**Returns:** `AIProvider | null`

### React Components

#### `<AiResponseRenderer />`

Main React component for rendering AI responses.

**Props:**
- `response`: The AI response object
- `theme`: Light or dark mode
- `autoDetect`: Auto-detect provider (default: `true`)
- `provider`: Explicitly specify provider
- `className`: CSS class for container
- `iframeProps`: Additional props for iframe
- `loadingComponent`: Custom loading component
- `errorComponent`: Custom error component
- `onProviderDetected`: Callback when provider is detected

### Hooks

#### `useAiResponse(response, options?)`

React hook for parsing AI responses.

**Returns:**
- `parsed`: Parsed response object
- `provider`: Detected provider
- `isLoading`: Loading state
- `error`: Error object
- `html`: HTML string
- `text`: Plain text string
- `reparse`: Function to re-parse with new options

## Supported Providers

| Provider | Status | Features |
|----------|--------|----------|
| ChatGPT | ✅ | Dark mode, sidebar hiding |
| Gemini | ✅ | Material Design overrides |
| Perplexity | ✅ | Color inversion for dark mode |
| Copilot | ✅ | UI element hiding |
| AI Overview | ✅ | WIZ data extraction |
| AI Mode | ✅ | Google UI hiding |

## Examples

### Manual Provider Specification

```typescript
import { parseAiResponse } from 'ai-response-parser';

const parsed = parseAiResponse(response, {
  provider: 'CHATGPT',
  theme: 'dark'
});
```

### Advanced Usage with Custom Styles

```tsx
<AiResponseRenderer
  response={response}
  theme="dark"
  onError={(error) => console.error(error)}
  onRenderComplete={(html) => console.log('Rendered', html)}
  iframeProps={{
    className: 'custom-iframe',
    style: { border: 'none', borderRadius: '8px' }
  }}
/>
```

### Error Handling

```tsx
const ErrorComponent = ({ error, retry }) => (
  <div className="error">
    <p>Failed to load: {error.message}</p>
    <button onClick={retry}>Retry</button>
  </div>
);

<AiResponseRenderer
  response={response}
  errorComponent={ErrorComponent}
/>
```

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Your Name](https://github.com/yourusername)