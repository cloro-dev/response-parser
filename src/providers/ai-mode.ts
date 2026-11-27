import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
  ProviderMetadata,
} from "../core/types";
import { removeBlocks } from '../core/html';

export class AIModeProvider extends BaseProvider {
  readonly name: AIProvider = "AIMODE";
  readonly baseUrl = "https://www.google.com";

  extractContent(response: any): ContentExtraction {
    return this.extractContentCommon(response);
  }

  /**
   * Remove Google Search header/navbar from HTML
   */
  removeHeader(html: string): string {
    let cleaned = html;

    // Remove the AI Mode filter/header bar
    // Starts with <div jsname="oEQ3x" class="DZ13He YNk70c EjQTId">
    // Contains the Filters and Topics navigation (AI Mode, All, Images, Videos, News, More)
    // Ends with closing divs after <hr class="e9c7U">
    cleaned = removeBlocks(
      cleaned,
      "div",
      (tag) => /jsname="oEQ3x"/i.test(tag) && /class="[^"]*DZ13He/i.test(tag),
      ['<hr class="e9c7U">', "</div></div></div></div></div>"]
    );

    return cleaned;
  }

  /**
   * Remove Google Search footer from HTML
   */
  removeFooter(html: string): string {
    let cleaned = html;

    // Remove the AI Mode input bar/footer
    // Target the most unique identifier: data-xid="aim-mars-input-plate"
    // This element is deeply nested, so we need to match many closing divs
    cleaned = removeBlocks(
      cleaned,
      "div",
      (tag) => /data-xid="aim-mars-input-plate"/i.test(tag),
      ["</div></div></div></div></div>"]
    );

    // Fallback: Target by jscontroller P5gZDb which wraps the input plate
    cleaned = removeBlocks(
      cleaned,
      "div",
      (tag) => /jscontroller="P5gZDb"/i.test(tag),
      ["</div></div></div>"]
    );

    // Fallback: Target the t0ITR container
    cleaned = removeBlocks(
      cleaned,
      "div",
      (tag) => /class="[^"]*t0ITR hh3ttd/i.test(tag),
      ["</div></div>"]
    );

    // Fallback: Target outer y4VEUd vve6Ce wrapper
    cleaned = removeBlocks(
      cleaned,
      "div",
      (tag) => /class="[^"]*y4VEUd vve6Ce/i.test(tag),
      ["</div></div>"]
    );

    return cleaned;
  }

  /**
   * Remove Google Search sidebar from HTML
   */
  removeSidebar(html: string): string {
    let cleaned = html;

    // Remove the AI Mode history panel/dialog
    // Target by aria-label and class, in either order
    cleaned = removeBlocks(
      cleaned,
      "div",
      (tag) => /aria-label="AI Mode history"/i.test(tag) && /class="[^"]*ho072b/i.test(tag),
      [{ before: "<!--TgQPHd" }]
    );

    // Remove the floating action buttons (OEwhSe wrapper)
    cleaned = removeBlocks(
      cleaned,
      "div",
      (tag) => /class="[^"]*OEwhSe/i.test(tag),
      ["</div></div>"]
    );

    // Remove buttons with aria-label
    cleaned = removeBlocks(
      cleaned,
      "button",
      (tag) => /aria-label="AI Mode history"/i.test(tag),
      ["</button>"]
    );

    return cleaned;
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text } = this.extractContent(response);

    if (!html) {
      throw new Error("No HTML content found in AI Mode response");
    }

    let finalHtml = html;

    // For AI Mode, default to removing header and footer for cleaner display
    const removeHeader = options?.removeHeader ?? true;
    const removeFooter = options?.removeFooter ?? true;

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

    // Remove sidebar if requested
    if (options?.removeSidebar) {
      finalHtml = this.removeSidebar(finalHtml);
    }

    // Remove links if requested
    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    // Build CSS based on options
    let stylesToInject = "";

    // Always inject general layout
    /* Remove cookie consent banner */
    stylesToInject += `
      .KxvlWc, #CXQnmb {
        display: none !important;
      }
    `;

    // Header removal styles
    if (removeHeader) {
      stylesToInject += `
        /* Header hiding */
        header, #header, #searchform, .sfbg, #appbar,
        div[role="navigation"], #leftnav, #sidetogether,
        [role="banner"], .Fgvgjc, #hdtb, .hdtb-msb,
        .DZ13He, .wYq63b, .eT9Cje, .bNg8Rb, .S6VXfe, .Lu57id,
        .YHsVn, .UTNPFf {
          display: none !important;
        }
      `;
    }

    // Footer removal styles
    if (removeFooter) {
      stylesToInject += `
        /* Footer hiding */
        footer, #footer, .fbar,
        .pdp-nav, [aria-label="Main menu"], .gb_Td, .gb_L {
          display: none !important;
        }
        /* Hide the "Ask anything" input bar */
        [data-xid="aim-mars-input-plate"],
        .UAbVe, .y4VEUd, .t0ITR.hh3ttd {
          display: none !important;
        }
      `;
    }

    // Sidebar removal styles
    if (options?.removeSidebar) {
      stylesToInject += `
        /* Hide AI Mode history panel */
        .ho072b, .OEwhSe, .qEn1od {
          display: none !important;
        }
      `;
    }

    // Inject base URL and styles
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
        headerRemoved: removeHeader,
        footerRemoved: removeFooter,
        sidebarRemoved: options?.removeSidebar || false,
        linksRemoved: options?.removeLinks || false,
      } as ProviderMetadata,
    };
  }
}
