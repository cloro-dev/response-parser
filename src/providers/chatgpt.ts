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

    // Inject styles - invert colors if requested
    // ChatGPT's default is dark theme, so invertColors should apply light theme
    const stylesToInject = options?.invertColors
      ? `
    /* Force Light Theme (invert from default dark) - only main background */
    html, body, main {
      background-color: #ffffff !important;
    }
    /* Force all text to dark grey (not pure black for better readability) */
    html, body, main, article, div, span, p, h1, h2, h3, h4, h5, h6, li, a, button, strong, label, textarea {
      color: #1A1A1A !important;
    }
    /* Apply light grey background to user message pills */
    .user-message-bubble-color {
      background-color: #F4F4F4 !important;
    }
    /* Apply light grey background to citation pills - highly specific selector */
    a.flex.rounded-xl.px-2.text-\\[9px\\],
    a[class*="rounded-xl"][class*="px-2"][class*="text-\\[9px\\]"],
    span[class*="webpage-citation-pill"] a {
      background-color: #F4F4F4 !important;
    }
    /* Invert scroll button colors */
    button.rounded-full.w-8.h-8.bg-token-main-surface-primary,
    button[class*="rounded-full"][class*="w-8"][class*="h-8"] {
      background-color: #ffffff !important;
      border-color: #E5E5E5 !important;
    }
    /* Invert composer box */
    div[data-composer-surface="true"],
    div.bg-token-bg-primary.dark\\:bg-\\[\\#303030\\] {
      background-color: #ffffff !important;
      border: 1px solid #E5E5E5 !important;
    }
    /* Invert composer pills */
    button.__composer-pill,
    [class*="__composer-pill"] {
      background-color: #F4F4F4 !important;
      border: 1px solid #E5E5E5 !important;
    }
    `: ``;
    //BUG: in default style the buttons are having its inside removed (in original HTML)
    //BUG: in inverted style the citation pills are not having background color inverted
    //BUG: in inverted style the chatbox has not inverted background color

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
        sidebarRemoved: options?.removeSidebar || false,
        footerRemoved: removeFooter,
        linksRemoved: options?.removeLinks || false,
        colorsInverted: options?.invertColors || false,
      },
    };
  }
}
