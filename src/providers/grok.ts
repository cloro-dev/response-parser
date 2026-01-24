import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
  ProviderMetadata,
} from "../core/types";

export class GrokProvider extends BaseProvider {
  readonly name: AIProvider = "GROK";
  readonly baseUrl = "https://grok.com";

  extractContent(response: any): ContentExtraction {
    return this.extractContentCommon(response);
  }

  /**
   * Remove Grok header from HTML (using CSS-based hiding)
   */
  removeHeader(html: string): string {
    // Header removal is now done via CSS in the parse method
    return html;
  }

  /**
   * Remove Grok footer/input area from HTML (using CSS-based hiding)
   */
  removeFooter(html: string): string {
    // Footer removal is now done via CSS in the parse method
    return html;
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text } = this.extractContent(response);

    if (!html) {
      throw new Error("No HTML content found in Grok response");
    }

    let finalHtml = html;

    // Sanitize HTML
    finalHtml = this.sanitizeHtml(finalHtml);

    // Build CSS based on options
    let stylesToInject = '';

    // Header hiding via CSS
    if (options?.removeHeader) {
      stylesToInject += `
        /* Header hiding - hide elements with Grok's header class pattern */
        div[class*="h-16"][class*="top-0"][class*="z-10"],
        div[class*="absolute"][class*="inset-x-0"][class*="top-0"] {
          display: none !important;
        }
      `;
    }

    // Footer hiding via CSS
    if (options?.removeFooter) {
      stylesToInject += `
        /* Footer hiding - hide Grok's footer/input area */
        div[class*="absolute"][class*="inset-x-0"][class*="bottom-0"][class*="max-w-breakout"],
        div[class*="absolute"][class*="bottom-0"][class*="w-full"] {
          display: none !important;
        }
      `;
    }

    // Remove links if requested
    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS: stylesToInject,
    });

    return {
      provider: this.name,
      html: finalHtml,
      text,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        linksRemoved: options?.removeLinks || false,
        headerRemoved: options?.removeHeader || false,
        footerRemoved: options?.removeFooter || false,
      } as ProviderMetadata,
    };
  }
}
