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
   * Remove Perplexity footer/followup input from HTML.
   * Uses CSS hiding — the footer's deeply nested DOM makes regex counting
   * of closing </div> tags fragile across Perplexity versions.
   */
  removeFooter(_html: string): string {
    // Handled via CSS injection in parse() for reliability
    return _html;
  }

  /**
   * Remove Perplexity left sidebar navigation from HTML
   */
  removeSidebar(html: string): string {
    let cleaned = html;
    // Remove the sidebar nav element and its width-holder parent
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*w-sideBarWidth[^"]*"[^>]*>[\s\S]*?<\/nav>[\s\S]*?<\/div>/gi,
      ""
    );
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

    // Strip inline padding-right used for the sources sidecar panel
    // (e.g. padding-right: 500px) which squeezes content when sources are removed
    finalHtml = finalHtml.replace(
      /padding-right:\s*\d+px/gi,
      'padding-right: 0px'
    );

    // Remove header if requested
    if (removeHeader) {
      finalHtml = this.removeHeader(finalHtml);
    }

    // Remove sidebar if requested
    if (options?.removeSidebar) {
      finalHtml = this.removeSidebar(finalHtml);
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

    // Build CSS overrides conditionally based on which remove* options are active
    let customCSS = `
      #cookie-consent,
      [role="dialog"]:has(#cookie-consent) {
        display: none !important;
      }
      [data-radix-focus-guard] {
        display: none !important;
      }
    `;

    if (options?.removeSidebar) {
      customCSS += `
        [class*="w-sideBarWidth"] { display: none !important; }
        #root, #root > div, #root > div > div {
          display: block !important;
          height: auto !important;
          max-height: none !important;
          width: 100% !important;
          padding: 0 !important;
        }
        main {
          display: block !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
        main > div {
          height: auto !important;
          overflow: visible !important;
        }
        [class*="scrollable-container"] {
          height: auto !important;
          overflow: visible !important;
        }
        [class*="max-w-threadContentWidth"] {
          max-width: 100% !important;
        }
      `;
    }

    if (removeFooter) {
      customCSS += `
        [class*="bottom-safeAreaInsetBottom"] {
          display: none !important;
        }
      `;
    }

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
        sidebarRemoved: options?.removeSidebar || false,
        cookieBannerRemoved: true,
        sourcesRemoved: options?.removeSources || false,
      } as ProviderMetadata,
    };
  }
}
