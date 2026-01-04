import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
} from "../core/types";

export class PerplexityProvider extends BaseProvider {
  readonly name: AIProvider = "PERPLEXITY";
  readonly baseUrl = "https://www.perplexity.ai";

  extractContent(response: any): ContentExtraction {
    let html = "";
    let text = "";

    // Handle nested structure
    let dataToCheck = response;
    if (response.result) {
      dataToCheck = response.result;
    }

    // Extract content
    if (typeof dataToCheck === "string") {
      if (dataToCheck.trim().startsWith("<") && dataToCheck.includes(">")) {
        html = dataToCheck;
      } else {
        text = dataToCheck;
      }
    } else if (typeof dataToCheck === "object" && dataToCheck !== null) {
      if (dataToCheck.html) {
        html = dataToCheck.html;
      } else if (dataToCheck.content) {
        if (dataToCheck.content.trim().startsWith("<")) {
          html = dataToCheck.content;
        } else {
          text = dataToCheck.content;
        }
      } else if (dataToCheck.text) {
        text = dataToCheck.text;
      }
    }

    return { html, text };
  }

  /**
   * Remove Perplexity header/navbar from HTML
   */
  removeHeader(html: string): string {
    // Remove navbar by targeting the unique @container/header class
    // Matches from the navbar opening div through the border divider at the bottom
    return html.replace(/<div[^>]*class="[^"]*@container\/header[^"]*"[^>]*>.*?<div[^>]*class="[^"]*absolute bottom-0 inset-x-0 border-b[^"]*"[^>]*><\/div>/gis, '');
  }

  /**
   * Remove Perplexity footer/followup input from HTML
   */
  removeFooter(html: string): string {
    let cleaned = html;

    // APPROACH 1: Remove by matching the entire fixed container
    // Match from <div with erp-sidecar:fixed to the matching closing </div></div></body>
    // This works by finding the start of the footer and removing everything until we see body close
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*erp-sidecar:fixed[^"']*["'][^>]*>.*?(?=<\/body>)/gis, '</body>');

    // APPROACH 2: Remove by matching the bottom-safeAreaInsetBottom class (footer positioning)
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*bottom-safeAreaInsetBottom[^"']*["'][^>]*>.*?(?=<\/body>)/gis, '</body>');

    // APPROACH 3: If the above fail, remove individual components

    // Remove the entire rounded-2xl bg-raised input container
    // This matches from the bg-raised div through all its nested content
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*bg-raised[^"']*["'][^>]*>.*?id=["']ask-input["'][^>]*>.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gis, '');

    // Remove segmented control (col-start-1 row-start-2) with its container
    // Updated pattern to match more flexibly with variable closing divs
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*col-start-1 row-start-2[^"']*["'][^>]*>.*?(?=<div[^>]*class=["'][^"']*col-start-3)/gis, '');

    // Remove input buttons (col-start-3 row-start-2) with its container
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*col-start-3 row-start-2[^"']*["'][^>]*>.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gis, '');

    // Remove by aria-labels (last resort)
    cleaned = cleaned.replace(/<div[^>]*class=["'][^"']*["'][^>]*>.*?aria-label=["']Choose a model["'].*?aria-label=["']Dictation["'].*?aria-label=["']Submit["'].*?<\/div>/gis, '');

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

    // Inject styles with optional color inversion
    const colorInversionStyles = options?.invertColors ? `
      html {
        filter: invert(1) hue-rotate(180deg);
        background-color: white !important;
      }
    ` : "";

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS: colorInversionStyles,
    });

    return {
      provider: this.name,
      html: finalHtml,
      text,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        linksRemoved: options?.removeLinks || false,
        colorsInverted: options?.invertColors || false,
        headerRemoved: removeHeader,
        footerRemoved: removeFooter,
      },
    };
  }
}
