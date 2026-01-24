import { AIProvider, ParsedResponse, ParseOptions, extractContentCommon } from './types';
import { ProviderDetector } from './detector';
import { ChatGPTProvider } from '../providers/chatgpt';
import { GeminiProvider } from '../providers/gemini';
import { PerplexityProvider } from '../providers/perplexity';
import { CopilotProvider } from '../providers/copilot';
import { AIOverviewProvider } from '../providers/ai-overview';
import { AIModeProvider } from '../providers/ai-mode';
import { GrokProvider } from '../providers/grok';

export class AIResponseParser {
  private providers: Map<AIProvider, any> = new Map();

  constructor() {
    this.providers.set('CHATGPT', new ChatGPTProvider());
    this.providers.set('GEMINI', new GeminiProvider());
    this.providers.set('PERPLEXITY', new PerplexityProvider());
    this.providers.set('COPILOT', new CopilotProvider());
    this.providers.set('AIOVERVIEW', new AIOverviewProvider());
    this.providers.set('AIMODE', new AIModeProvider());
    this.providers.set('GROK', new GrokProvider());
  }

  /**
   * Parse an AI response with auto-detected provider
   */
  parse(response: any, options?: ParseOptions): ParsedResponse | null {
    const detection = ProviderDetector.detect(response);

    if (!detection) {
      // Try to parse as generic HTML if no provider detected
      return this.parseGeneric(response);
    }

    const provider = this.providers.get(detection.provider);
    if (!provider) {
      return null;
    }

    try {
      const parsed = provider.parse(response, options);
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
      return providerInstance.parse(response, options);
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