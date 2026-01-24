import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
} from "../core/types";

export class ChatGPTProvider extends BaseProvider {
  readonly name: AIProvider = "CHATGPT";
  readonly baseUrl = "https://chatgpt.com";


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
   * Remove links from HTML, preserving badge styling
   * Converts <a> tags to <span> while keeping class attributes
   */
  removeLinks(html: string): string {
    // Replace anchor tags with span tags, keeping all attributes except href/alt/rel/target
    return html
      .replace(/<a\b([^>]*)>/gi, (match, attributes) => {
        // Remove link-specific attributes but keep others (class, style, etc.)
        const cleanedAttrs = attributes
          .replace(/\s+href\s*=\s*["'][^"']*["']/gi, "")
          .replace(/\s+alt\s*=\s*["'][^"']*["']/gi, "")
          .replace(/\s+rel\s*=\s*["'][^"']*["']/gi, "")
          .replace(/\s+target\s*=\s*["'][^"']*["']/gi, "")
          .trim();
        return `<span${cleanedAttrs ? " " + cleanedAttrs : ""}>`;
      })
      .replace(/<\/a>/gi, "</span>");
  }

  /**
   * Remove ChatGPT header from HTML
   */
  removeHeader(html: string): string {
    let cleaned = html;

    // Remove page header by id
    cleaned = cleaned.replace(
      /<header[^>]*id="page-header"[^>]*>.*?<\/header>/gis,
      ""
    );

    return cleaned;
  }

  /**
   * Remove ChatGPT sidebar from HTML
   */
  removeSidebar(html: string): string {
    let cleaned = html;

    // Hide Sidebar
    cleaned = cleaned.replace(/<nav[^>]*>.*?<\/nav>/gis, "");
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>.*?<\/div>/gis,
      ""
    );

    return cleaned;
  }

  /**
   * Remove ChatGPT footer/composer from HTML
   */
  removeFooter(html: string): string {
    let cleaned = html;

    // Remove the thread-bottom-container (scroll button container)
    cleaned = cleaned.replace(
      /<div[^>]*id="thread-bottom-container"[^>]*>.*?<\/div><\/div><\/div>/gis,
      ""
    );

    // Remove the entire thread-bottom div (contains composer and inputs)
    cleaned = cleaned.replace(
      /<div[^>]*id="thread-bottom"[^>]*>.*?<\/div><\/div><\/div><\/div><\/div>/gis,
      ""
    );

    // Remove composer leading button (plus button)
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*\[grid-area:leading\][^"]*"[^>]*>.*?<\/div><\/div><\/div>/gis,
      ""
    );

    // Remove composer footer actions (search button, etc.)
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*\[grid-area:footer\][^"]*"[^>]*>.*?<\/div><\/div><\/div><\/div><\/div>/gis,
      ""
    );

    // Remove composer trailing buttons (dictate, send buttons)
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*\[grid-area:trailing\][^"]*"[^>]*>.*?<\/div><\/div><\/div>/gis,
      ""
    );

    // Remove disclaimer footer (language-agnostic, targets view-transition-name)
    cleaned = cleaned.replace(
      /<div[^>]*\[view-transition-name:var\(--vt-disclaimer\)\][^>]*>.*?<\/div><\/div>/gis,
      ""
    );

    return cleaned;
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text } = this.extractContent(response);

    if (!html) {
      throw new Error("No HTML content found in ChatGPT response");
    }

    let finalHtml = html;

    const removeFooter = options?.removeFooter ?? false;

    // Sanitize HTML
    finalHtml = this.sanitizeHtml(finalHtml);

    // Remove header if requested
    if (options?.removeHeader) {
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

    // Remove links if requested
    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS: "",
    });

    return {
      provider: this.name,
      html: finalHtml,
      text,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        headerRemoved: options?.removeHeader || false,
        sidebarRemoved: options?.removeSidebar || false,
        footerRemoved: removeFooter,
        linksRemoved: options?.removeLinks || false,
      },
    };
  }
}
