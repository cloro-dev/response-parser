import { AIProvider, DetectedProvider } from './types';

export class ProviderDetector {
  private static readonly PROVIDER_PATTERNS = {
    CHATGPT: [
      // Check for token-based CSS classes
      (response: any) => {
        const html = response?.result?.html || response?.html || '';
        return html.includes('bg-token-bg-primary') || html.includes('text-token-text-secondary');
      },
      // Check for OpenAI-specific patterns
      (response: any) => {
        const html = response?.result?.html || response?.html || '';
        return html.includes('chatgpt.com') || html.includes('openai.com');
      },
    ],
    GEMINI: [
      // Check for Material Design components
      (response: any) => {
        const html = response?.result?.html || response?.html || '';
        return html.includes('bard-sidenav') || html.includes('mat-sidenav');
      },
      // Check for Gemini-specific classes
      (response: any) => {
        const html = response?.result?.html || response?.html || '';
        return html.includes('gemini.google.com') || html.includes('gem-sys-color');
      },
    ],
    PERPLEXITY: [
      // Check for Perplexity-specific structure
      (response: any) => {
        const html = response?.result?.html || response?.html || '';
        return html.includes('perplexity.ai') || html.includes('prose');
      },
    ],
    COPILOT: [
      // Check for Copilot-specific elements
      (response: any) => {
        const html = response?.result?.html || response?.html || '';
        return html.includes('copilot.microsoft.com') || html.includes('data-testid="sidebar-container"');
      },
    ],
    AIOVERVIEW: [
      // Check for AI Overview specific structure
      (response: any) => {
        // Check for aioverview nested structure
        if (response?.result?.aioverview?.text) return true;
        if (response?.aioverview?.text) return true;

        // Check for WIZ_global_data (AI Overview specific)
        const html = response?.result?.html || response?.html || '';
        return html.includes('WIZ_global_data') || html.includes('DnVkpd');
      },
    ],
    AIMODE: [
      // Check for AI Mode specific elements
      (response: any) => {
        const html = response?.result?.html || response?.html || '';
        return html.includes('DZ13He') || html.includes('wYq63b') || html.includes('AI Mode');
      },
    ],
  };

  /**
   * Detect the AI provider from the response
   */
  static detect(response: any): DetectedProvider | null {
    const scores: Record<AIProvider, number> = {
      CHATGPT: 0,
      GEMINI: 0,
      PERPLEXITY: 0,
      COPILOT: 0,
      AIOVERVIEW: 0,
      AIMODE: 0,
    };

    // Score each provider based on pattern matches
    for (const [provider, patterns] of Object.entries(this.PROVIDER_PATTERNS)) {
      for (const pattern of patterns) {
        try {
          if (pattern(response)) {
            scores[provider as AIProvider]++;
          }
        } catch (error) {
          // Ignore pattern errors
        }
      }
    }

    // Find the provider with the highest score
    let maxScore = 0;
    let detectedProvider: AIProvider | null = null;

    for (const [provider, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedProvider = provider as AIProvider;
      }
    }

    // Return null if no patterns matched
    if (maxScore === 0) return null;

    return {
      provider: detectedProvider!,
      confidence: maxScore / Object.values(scores).reduce((a, b) => Math.max(a, b), 1),
    };
  }

  /**
   * Get all possible providers with their confidence scores
   */
  static getAllProviders(response: any): DetectedProvider[] {
    const providers: DetectedProvider[] = [];

    for (const [provider, patterns] of Object.entries(this.PROVIDER_PATTERNS)) {
      let matches = 0;
      for (const pattern of patterns) {
        try {
          if (pattern(response)) {
            matches++;
          }
        } catch (error) {
          // Ignore pattern errors
        }
      }

      if (matches > 0) {
        providers.push({
          provider: provider as AIProvider,
          confidence: matches / patterns.length,
        });
      }
    }

    // Sort by confidence (highest first)
    return providers.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Validate if a detected provider is likely correct
   */
  static validate(response: any, provider: AIProvider): boolean {
    const detected = this.detect(response);
    return detected?.provider === provider && detected.confidence > 0.5;
  }
}