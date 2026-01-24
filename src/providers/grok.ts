import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
} from "../core/types";

export class GrokProvider extends BaseProvider {
  readonly name: AIProvider = "GROK";
  readonly baseUrl = "https://grok.com";

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
   * Remove Grok header from HTML
   */
  removeHeader(html: string): string {
    let cleaned = html;

    // The header has a distinct start: <div class="h-16 top-0 @[80rem]/nav:h-0 @[80rem]/nav:top-8 absolute z-10 ...">
    // Find the header start
    const headerStartPattern = /<div[^>]*class="[^"]*h-16\s+top-0\s+@\[80rem\]\/nav:h-0[^"]*"[^>]*>/gi;
    const headerStartMatch = cleaned.match(headerStartPattern);
    if (!headerStartMatch) {
      return cleaned;
    }

    // Get the index of the header start
    const headerStartIndex = cleaned.indexOf(headerStartMatch[0]);
    if (headerStartIndex === -1) {
      return cleaned;
    }

    // The header contains multiple nested divs, we need to count opening and closing tags
    // to find the matching closing tag for the header div
    const afterHeaderStart = cleaned.substring(headerStartIndex + headerStartMatch[0].length);

    // Count div depth to find the matching closing tag
    let depth = 1; // Start at 1 because we're inside the header div
    let pos = 0;
    let foundEnd = false;

    while (pos < afterHeaderStart.length && !foundEnd) {
      // Find the next opening or closing div tag
      const openIndex = afterHeaderStart.indexOf('<div', pos);
      const closeIndex = afterHeaderStart.indexOf('</div>', pos);

      if (openIndex === -1 && closeIndex === -1) {
        // No more div tags
        break;
      }

      if (closeIndex !== -1 && (openIndex === -1 || closeIndex < openIndex)) {
        // Found a closing tag before any opening tag
        depth--;
        pos = closeIndex + 6; // Length of '</div>'

        if (depth === 0) {
          foundEnd = true;
        }
      } else if (openIndex !== -1) {
        // Found an opening tag
        depth++;
        // Move past the opening tag
        const gtIndex = afterHeaderStart.indexOf('>', openIndex);
        if (gtIndex === -1) {
          break;
        }
        pos = gtIndex + 1;
      }
    }

    if (foundEnd) {
      const totalEndIndex = headerStartIndex + headerStartMatch[0].length + pos;
      // Remove the entire header
      cleaned = cleaned.substring(0, headerStartIndex) + cleaned.substring(totalEndIndex);
    }

    return cleaned;
  }

  /**
   * Remove Grok footer/input area from HTML
   */
  removeFooter(html: string): string {
    let cleaned = html;

    // The footer has a distinct start: <div class="absolute inset-x-0 bottom-0 mx-auto max-w-breakout z-40 print:hidden">
    // and ends right before </main> with </div></div></main>

    // Find the footer start
    const footerStartPattern = /<div[^>]*class="[^"]*absolute\s+inset-x-0\s+bottom-0\s+mx-auto\s+max-w-breakout\s+z-40\s+print:hidden[^"]*"[^>]*>/gi;
    const footerStartMatch = cleaned.match(footerStartPattern);
    if (!footerStartMatch) {
      return cleaned;
    }

    // Get the index of the footer start
    const footerStartIndex = cleaned.indexOf(footerStartMatch[0]);
    if (footerStartIndex === -1) {
      return cleaned;
    }

    // Find the end: look for </main> which comes right after the footer closes
    const afterFooterStart = cleaned.substring(footerStartIndex);
    const mainEndPattern = /<\/main>/gi;
    const mainEndMatch = afterFooterStart.match(mainEndPattern);
    if (!mainEndMatch) {
      return cleaned;
    }

    const mainEndIndex = afterFooterStart.indexOf(mainEndMatch[0]);
    const totalEndIndex = footerStartIndex + mainEndIndex;

    // Remove everything from footer start to </main>
    cleaned = cleaned.substring(0, footerStartIndex) + cleaned.substring(totalEndIndex);

    return cleaned;
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text } = this.extractContent(response);

    if (!html) {
      throw new Error("No HTML content found in Grok response");
    }

    let finalHtml = html;

    // Sanitize HTML
    finalHtml = this.sanitizeHtml(finalHtml);

    // Remove header if requested
    if (options?.removeHeader) {
      finalHtml = this.removeHeader(finalHtml);
    }

    // Remove footer if requested
    if (options?.removeFooter) {
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
        headerRemoved: options?.removeHeader || false,
        footerRemoved: options?.removeFooter || false,
      },
    };
  }
}
