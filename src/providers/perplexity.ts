import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
  ProviderMetadata,
} from "../core/types";

export class PerplexityProvider extends BaseProvider {
  readonly name: AIProvider = "PERPLEXITY";
  readonly baseUrl = "https://www.perplexity.ai";

  extractContent(response: any): ContentExtraction {
    return this.extractContentCommon(response);
  }

  /**
   * Remove Perplexity header/navbar from HTML
   */
  removeHeader(html: string): string {
    // Remove navbar by targeting the unique @container/header class
    // Matches from the navbar opening div through the border divider at the bottom
    return html.replace(
      /<div[^>]*class="[^"]*@container\/header[^"]*"[^>]*>.*?<div[^>]*class="[^"]*absolute bottom-0 inset-x-0 border-b[^"]*"[^>]*><\/div>/gis,
      ""
    );
  }

  /**
   * Remove Perplexity footer/followup input from HTML
   */
  removeFooter(html: string): string {
    let cleaned = html;
    const regex =
      /<div[^>]*class="[^"]*erp-sidecar:fixed erp-sidecar:w-full bottom-safeAreaInsetBottom p-md pointer-events-none z-10 absolute border-subtlest ring-subtlest divide-subtlest bg-transparent[^"]*"[^>]*>[\s\S]*?(?=<div[^>]*class="[^"]*fixed inset-y-0 right-0[^"]*")/gis;
    cleaned = cleaned.replace(regex, "");
    return cleaned;
  }

  /**
   * Remove Perplexity sources panel from HTML
   */
  removeSources(html: string): string {
    // Remove the fixed right-side sources panel (contains citations/links and cookie dialog)
    return html.replace(/<div[^>]*class="[^"]*fixed inset-y-0 right-0[^"]*"[^>]*>[\s\S]*?(?=<span[^>]*data-radix-focus-guard)/gi, '');
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text } = this.extractContent(response);

    if (!html) {
      throw new Error("No HTML content found in Perplexity response");
    }

    let finalHtml = html;

    const removeHeader = options?.removeHeader ?? false;
    const removeFooter = options?.removeFooter ?? false;

    // Sanitize HTML
    finalHtml = this.sanitizeHtml(finalHtml);

    // Fix collapsed answer container: Perplexity uses JS animation to expand the
    // answer area from height:48px. Without scripts, it stays collapsed.
    finalHtml = finalHtml.replace(
      /style="transition: none; overflow: hidden; height: 48px;"/gi,
      ''
    );

    // Remove header if requested
    if (removeHeader) {
      finalHtml = this.removeHeader(finalHtml);
    }

    // Remove footer if requested
    if (removeFooter) {
      finalHtml = this.removeFooter(finalHtml);
    }

    // Remove sources panel if requested
    if (options?.removeSources) {
      finalHtml = this.removeSources(finalHtml);
    }

    // Remove links if requested
    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    // Always hide cookie consent banner via CSS
    const customCSS = `
      #cookie-consent,
      [role="dialog"]:has(#cookie-consent) {
        display: none !important;
      }
    `;

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS,
    });

    return {
      provider: this.name,
      html: finalHtml,
      text,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        linksRemoved: options?.removeLinks || false,
        headerRemoved: removeHeader,
        footerRemoved: removeFooter,
        cookieBannerRemoved: true,
        sourcesRemoved: options?.removeSources || false,
      } as ProviderMetadata,
    };
  }
}
