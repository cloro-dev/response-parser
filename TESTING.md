# Testing @cloro/response-parser Locally

## ✅ Already Completed

### 1. **TypeScript Compilation**
```bash
cd monitor
npx tsc --noEmit --skipLibCheck
```
✅ **Result**: No errors - types are correct!

### 2. **Package Linked**
```bash
cd ai-response-parser
pnpm link --global

cd monitor
pnpm link --global @cloro/response-parser
```
✅ **Result**: Package is linked and ready to test!

## 🧪 How to Test

### **Option 1: Start Dev Server (Recommended)**
```bash
cd monitor
pnpm dev
```
Then:
1. Open http://localhost:3000
2. Navigate to the prompts page
3. Click on a prompt to see results
4. The HTML rendering should work exactly as before
5. Check browser console for any errors

### **Option 2: Make Changes & See Them Live**
Since we used `pnpm link`, any changes to the package are immediate:

```bash
# In one terminal
cd ai-response-parser
pnpm build

# In another terminal
cd monitor
pnpm dev
```

Changes will reflect immediately! 🚀

### **Option 3: Test Specific Scenarios**

Create a test file in the monitor app:

```typescript
// test-response-parser.tsx
import { AiResponseRenderer } from '@cloro/response-parser/react';

const mockChatGPTResponse = {
  html: '<div>Hello from ChatGPT</div>'
};

const mockGeminiResponse = {
  html: '<div>Hello from Gemini</div>'
};

// Test rendering
export function TestComponent() {
  return (
    <div>
      <h2>ChatGPT Response:</h2>
      <AiResponseRenderer response={mockChatGPTResponse} theme="dark" />

      <h2>Gemini Response:</h2>
      <AiResponseRenderer response={mockGeminiResponse} theme="dark" />
    </div>
  );
}
```

## 🔍 What to Check

### ✅ **Auto-Detection**
- Does it correctly detect ChatGPT vs Gemini vs Perplexity?
- Are the styles applied correctly for each provider?

### ✅ **Dark Mode**
- Are all providers rendering in dark mode?
- Is the text readable?

### ✅ **UI Cleanup**
- Are sidebars hidden?
- Are headers hidden?
- Is the content clean?

### ✅ **Performance**
- Does it render quickly?
- Any console errors?

## 🐛 Debugging

If something doesn't work:

```bash
# Check what's actually linked
cd monitor
ls -la node_modules/@cloro/

# Rebuild the package
cd ai-response-parser
pnpm build

# Relink if needed
cd ai-response-parser
pnpm link --global

cd monitor
pnpm link --global @cloro/response-parser
```

## 📋 Pre-Publish Checklist

Before running `npm publish`, verify:

- [x] TypeScript compiles without errors
- [x] Package builds successfully
- [x] Monitor app imports work
- [ ] Dev server runs without errors
- [ ] Rendering works in browser
- [ ] All 6 providers render correctly
- [ ] No sensitive data in package
- [ ] README is accurate

## 🚀 Ready to Publish?

Once everything works locally:

```bash
cd ai-response-parser
npm login
npm publish
```

The package will be available at:
- https://www.npmjs.com/package/@cloro/response-parser
- Installable via: `npm install @cloro/response-parser`