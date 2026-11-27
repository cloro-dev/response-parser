import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
  ProviderMetadata,
} from "../core/types";
import { removeBlocks } from '../core/html';

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
      .replace(/<a\b([^<>]*)>/gi, (match, attributes) => {
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
    cleaned = removeBlocks(
      cleaned,
      "header",
      (tag) => /id="page-header"/i.test(tag),
      ["</header>"]
    );

    return cleaned;
  }

  /**
   * Remove ChatGPT sidebar from HTML.
   * Handled with CSS in parse(). A regex cannot balance the nested <nav>s of
   * the sidebar, and the composer of the mobile-web page has a <nav> too.
   */
  removeSidebar(html: string): string {
    return html;
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
    return removeBlocks(html, 'div', (tag) => /role="dialog"/i.test(tag), [
      'openai.com/policies/cookie-policy',
      '</div></div></div></div></div></div>',
    ]);
  }

  /**
   * Remove ChatGPT sources/search flyout panel from HTML.
   * Handled with CSS in parse().
   */
  removeSources(html: string): string {
    return html;
  }

  /**
   * Show a page in its light theme. Some pages are captured in the dark
   * theme (`<html class="dark" style="color-scheme: dark">`), and the light
   * Lightning CSS values that the parser keeps then make the text dark on a
   * dark background.
   */
  useLightTheme(html: string): string {
    return html.replace(/<html\b[^<>]*>/i, (tag) =>
      tag
        .replace(/(\sclass="[^"]*?)\bdark\b/i, "$1light")
        .replace(/color-scheme:\s*dark/i, "color-scheme: light")
    );
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

    finalHtml = this.useLightTheme(finalHtml);

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

    // Always hide the login cards in the answer. Always use the light
    // value of light-dark() colors: a part of the answer can set
    // `color-scheme: dark` on a light page, and its text is then white.
    let customCSS = `
      [data-conversation-inline-beacon],
      [data-testid="inline-upsell-card"] { display: none !important; }
      * { color-scheme: light !important; }
    `;

    // The mobile-web page (octane) has other markup than the desktop page.
    // Its parts are the ds-* and data-slot attributes below.
    if (options?.removeHeader) {
      customCSS += `
        [data-ds-top-chrome] { display: none !important; }
      `;
    }

    if (!options?.removeSidebar) {
      // Below 800 px the mobile-web page shows the sidebar as a drawer over
      // the answer. The capture has the drawer open, but on the live page it
      // stays closed until you open it.
      customCSS += `
        @media (max-width: 799.98px) {
          div:has(> #ds-sidebar) { display: none !important; }
        }
      `;
    }

    if (options?.removeSidebar) {
      customCSS += `
        div:has(> #ds-sidebar) { display: none !important; }
        main[data-slot="conversation"] {
          margin-left: 0 !important;
          left: 0 !important;
          width: 100vw !important;
        }
        footer[data-ds-composer] {
          left: 0 !important;
          width: 100% !important;
        }
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
        footer[data-ds-composer] { display: none !important; }
        #thread { min-height: auto !important; }
      `;
    }

    if (options?.removeSources) {
      customCSS += `
        /* Side flyout, the modal sheet that replaces it on narrow pages, and
           the sources dialog of the mobile page */
        [data-testid="stage-thread-flyout"],
        [data-sheet-travel-state],
        #assistant-sources-dialog {
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
