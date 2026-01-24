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

    // Remove header if requested
    if (removeHeader) {
      finalHtml = this.removeHeader(finalHtml);
    }

    // Remove footer if requested
    if (removeFooter) {
      finalHtml = this.removeFooter(finalHtml);
    }

    // Remove links if requested
    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS: '',
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
      } as ProviderMetadata,
    };
  }
}
