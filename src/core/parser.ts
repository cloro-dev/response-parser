import { AIProvider, ParsedResponse, ParseOptions, extractContentCommon } from './types';
import { ProviderDetector } from './detector';
import { ChatGPTProvider } from '../providers/chatgpt';
import { GeminiProvider } from '../providers/gemini';
import { PerplexityProvider } from '../providers/perplexity';
import { CopilotProvider } from '../providers/copilot';
import { AIOverviewProvider } from '../providers/ai-overview';
import { AIModeProvider } from '../providers/ai-mode';
import { BingAiModeProvider } from '../providers/bing-ai-mode';
import { GrokProvider } from '../providers/grok';

/**
 * Inverts the colors of the page with a CSS filter on the root element. The
 * filter is applied again to images, videos and other media, so that they keep
 * their colors. This includes elements with an inline `url(...)` style, for
 * example the Gemini YouTube thumbnail, which is a `<div>` with
 * `style="background-image: url(...)"`. `hue-rotate(180deg)` keeps hues near
 * the original values, for example blue links stay blue.
 *
 * The white background is for pages that have no background of their own. In
 * an iframe, such a page shows the background of the iframe, which the filter
 * does not change, and the inverted (white) text is not visible. The rule has
 * no `!important`, so the background of the page wins when it has one.
 */
const INVERT_COLORS_CSS = `
  html {
    background-color: #fff;
    filter: invert(1) hue-rotate(180deg) !important;
  }
  img, video, canvas, iframe, embed, object, [style*="url("] {
    filter: invert(1) hue-rotate(180deg) !important;
  }
`;

/**
 * Keeps pages in their light theme when the viewer's browser is in dark mode.
 *
 * Pages built with Lightning CSS (for example the ChatGPT mobile web page)
 * emulate `light-dark()` with the `--lightningcss-light` and
 * `--lightningcss-dark` variables, which a `prefers-color-scheme: dark` media
 * query switches. The page then gets a dark background, but some text keeps
 * its light-theme color (#0d0d0d), and the text is not visible. These rules
 * keep the light values. They have no effect on pages that do not use these
 * variables.
 */
const LIGHT_SCHEME_CSS = `
  *, ::before, ::after {
    --lightningcss-light: initial !important;
    --lightningcss-dark: !important;
  }
`;

/**
 * Adds a style at the start of the head, before the styles of the page, so
 * that the page can set its own background.
 */
function addStyle(html: string, css: string): string {
  const style = `<style>${css}</style>`;
  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/(<head(\s[^>]*)?>)/i, `$1${style}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/(<html[^>]*>)/i, `$1<head>${style}</head>`);
  }
  return `${style}${html}`;
}

/**
 * Adds the color styles that apply to all providers.
 */
function applyColorStyles(
  parsed: ParsedResponse,
  options?: ParseOptions
): ParsedResponse {
  if (!parsed.html) {
    return parsed;
  }
  if (!options?.invertColors) {
    return { ...parsed, html: addStyle(parsed.html, LIGHT_SCHEME_CSS) };
  }
  return {
    ...parsed,
    html: addStyle(parsed.html, LIGHT_SCHEME_CSS + INVERT_COLORS_CSS),
    metadata: { ...parsed.metadata, colorsInverted: true },
  };
}

export class AIResponseParser {
  private providers: Map<AIProvider, any> = new Map();

  constructor() {
    this.providers.set('CHATGPT', new ChatGPTProvider());
    this.providers.set('GEMINI', new GeminiProvider());
    this.providers.set('PERPLEXITY', new PerplexityProvider());
    this.providers.set('COPILOT', new CopilotProvider());
    this.providers.set('AIOVERVIEW', new AIOverviewProvider());
    this.providers.set('AIMODE', new AIModeProvider());
    this.providers.set('BING_AIMODE', new BingAiModeProvider());
    this.providers.set('GROK', new GrokProvider());
  }

  /**
   * Parse an AI response with auto-detected provider
   */
  parse(response: any, options?: ParseOptions): ParsedResponse | null {
    const detection = ProviderDetector.detect(response);

    if (!detection) {
      // Try to parse as generic HTML if no provider detected
      const generic = this.parseGeneric(response);
      return generic && applyColorStyles(generic, options);
    }

    const provider = this.providers.get(detection.provider);
    if (!provider) {
      return null;
    }

    try {
      const parsed = applyColorStyles(provider.parse(response, options), options);
      return {
        ...parsed,
        metadata: {
          ...parsed.metadata,
          detectionConfidence: detection.confidence,
        },
      };
    } catch (error) {
      console.error(`Failed to parse response with ${detection.provider}:`, error);
      return null;
    }
  }

  /**
   * Parse with explicit provider specification
   */
  parseWithProvider(
    response: any,
    provider: AIProvider,
    options?: ParseOptions
  ): ParsedResponse | null {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    try {
      return applyColorStyles(providerInstance.parse(response, options), options);
    } catch (error) {
      console.error(`Failed to parse response with ${provider}:`, error);
      return null;
    }
  }

  /**
   * Detect the provider from a response
   */
  detectProvider(response: any): AIProvider | null {
    const detection = ProviderDetector.detect(response);
    return detection?.provider || null;
  }

  /**
   * Get all possible providers with confidence scores
   */
  detectAllProviders(response: any): Array<{ provider: AIProvider; confidence: number }> {
    return ProviderDetector.getAllProviders(response);
  }

  /**
   * Parse as generic HTML when no specific provider is detected
   */
  private parseGeneric(response: any): ParsedResponse | null {
    const { html, text } = extractContentCommon(response);

    if (!html && !text) {
      return null;
    }

    // Basic sanitization
    let sanitizedHtml = html;
    if (sanitizedHtml) {
      sanitizedHtml = sanitizedHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, '');
      sanitizedHtml = sanitizedHtml.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
    }

    return {
      provider: 'CHATGPT' as AIProvider, // Default to ChatGPT for unknown
      html: sanitizedHtml || '',
      text: text || '',
      metadata: {
        isGeneric: true,
      },
    };
  }

  /**
   * Get list of supported providers
   */
  getSupportedProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Register a custom provider
   */
  registerProvider(provider: AIProvider, instance: any): void {
    this.providers.set(provider, instance);
  }
}

// Export a singleton instance
export const parser = new AIResponseParser();

// Convenience functions
export const parseAiResponse = (response: any, options?: ParseOptions) =>
  parser.parse(response, options);

export const detectProvider = (response: any) =>
  parser.detectProvider(response);