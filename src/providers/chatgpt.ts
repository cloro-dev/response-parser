import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
  ProviderMetadata,
} from "../core/types";

export class ChatGPTProvider extends BaseProvider {
  readonly name: AIProvider = "CHATGPT";
  readonly baseUrl = "https://chatgpt.com";


  extractContent(response: any): ContentExtraction {
    return this.extractContentCommon(response);
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
    // The sidebar wrapper is hidden with CSS in parse(). Its nested <div>s
    // cannot be balanced with a regex.
    return html.replace(/<nav[^>]*>.*?<\/nav>/gis, "");
  }

  /**
   * Remove ChatGPT footer/composer from HTML.
   * Handled with CSS in parse(). A regex cannot balance the nested <div>s of
   * the composer, and a partial removal changes the page structure.
   */
  removeFooter(html: string): string {
    return html;
  }

  /**
   * Remove ChatGPT cookie banner from HTML
   */
  removeCookieBanner(html: string): string {
    // Remove the cookie dialog banner (matched by cookie-policy URL, language-agnostic)
    return html.replace(/<div[^>]*role="dialog"[^>]*>[\s\S]*?openai\.com\/policies\/cookie-policy[\s\S]*?<\/div><\/div><\/div><\/div><\/div><\/div>/gi, '');
  }

  /**
   * Remove ChatGPT sources/search flyout panel from HTML.
   * Handled with CSS in parse().
   */
  removeSources(html: string): string {
    return html;
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

    // Always remove cookie banner
    finalHtml = this.removeCookieBanner(finalHtml);

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

    // Remove sources panel if requested
    if (options?.removeSources) {
      finalHtml = this.removeSources(finalHtml);
    }

    // Remove links if requested
    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    // Build CSS overrides conditionally based on which remove* options are active
    let customCSS = '';

    if (options?.removeSidebar) {
      customCSS += `
        #stage-slideover-sidebar { display: none !important; }
        [data-sidebar-item] { display: none !important; }
        [data-skip-to-content] { display: none !important; }
        .h-svh { height: auto !important; }
      `;
    }

    if (removeFooter) {
      customCSS += `
        #thread-bottom-container { display: none !important; }
        form[data-type="unified-composer"] { display: none !important; }
        #thread { min-height: auto !important; }
      `;
    }

    if (options?.removeSources) {
      customCSS += `
        /* Side flyout, and the modal sheet that replaces it on narrow pages */
        [data-testid="stage-thread-flyout"],
        [data-sheet-travel-state] {
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
        cookieBannerRemoved: true,
        headerRemoved: options?.removeHeader || false,
        sidebarRemoved: options?.removeSidebar || false,
        footerRemoved: removeFooter,
        sourcesRemoved: options?.removeSources || false,
        linksRemoved: options?.removeLinks || false,
      } as ProviderMetadata,
    };
  }
}
