import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
} from "../core/types";

export class AIModeProvider extends BaseProvider {
  readonly name: AIProvider = "AIMODE";
  readonly baseUrl = "https://www.google.com";

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
   * Remove Google Search header/navbar from HTML
   */
  removeHeader(html: string): string {
    let cleaned = html;

    // Remove the AI Mode filter/header bar
    // Starts with <div jsname="oEQ3x" class="DZ13He YNk70c EjQTId">
    // Contains the Filters and Topics navigation (AI Mode, All, Images, Videos, News, More)
    // Ends with closing divs after <hr class="e9c7U">
    cleaned = cleaned.replace(
      /<div[^>]*jsname="oEQ3x"[^>]*class="[^"]*DZ13He[^"]*"[^>]*>.*?<hr class="e9c7U">.*?<\/div><\/div><\/div><\/div><\/div>/gis,
      ""
    );

    return cleaned;
  }

  /**
   * Remove Google Search footer from HTML
   */
  //BUG: still not working
  removeFooter(html: string): string {
    let cleaned = html;

    // Remove the AI Mode input bar/footer
    // Target the most unique identifier: data-xid="aim-mars-input-plate"
    // This element is deeply nested, so we need to match many closing divs
    cleaned = cleaned.replace(
      /<div[^>]*data-xid="aim-mars-input-plate"[^>]*>[\s\S]*?<\/div><\/div><\/div><\/div><\/div>/gis,
      ""
    );

    // Fallback: Target by jscontroller P5gZDb which wraps the input plate
    cleaned = cleaned.replace(
      /<div[^>]*jscontroller="P5gZDb"[^>]*>[\s\S]*?<\/div><\/div><\/div>/gis,
      ""
    );

    // Fallback: Target the t0ITR container
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*t0ITR hh3ttd[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/gis,
      ""
    );

    // Fallback: Target outer y4VEUd vve6Ce wrapper
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*y4VEUd vve6Ce[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/gis,
      ""
    );

    return cleaned;
  }

  /**
   * Remove Google Search sidebar from HTML
   */
  //BUG: still not working
  removeSidebar(html: string): string {
    let cleaned = html;

    // Remove the AI Mode history panel/slide-over
    // Target by aria-label and class
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*ho072b[^"]*"[^>]*aria-label="AI Mode history"[^>]*>[\s\S]*?<\/div><\/div><\/div><\/div><\/div><\/div>/gis,
      ""
    );

    // Remove the floating action button (FAB) with "Start new search" and "AI Mode history"
    // Target by jsname and class, contains OEwhSe wrapper
    cleaned = cleaned.replace(
      /<div[^>]*jsname="NlVIob"[^>]*class="[^"]*qEn1od[^"]*"[^>]*>[\s\S]*?<\/div><\/div><\/div>/gis,
      ""
    );

    // Fallback: Target by inner class OEwhSe
    cleaned = cleaned.replace(
      /<div[^>]*class="[^"]*OEwhSe[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/gis,
      ""
    );

    // Fallback: Target buttons with aria-label
    cleaned = cleaned.replace(
      /<button[^>]*aria-label="Start new search"[^>]*>[\s\S]*?<\/button>/gis,
      ""
    );
    cleaned = cleaned.replace(
      /<button[^>]*aria-label="AI Mode history"[^>]*>[\s\S]*?<\/button>/gis,
      ""
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
        .DZ13He, .wYq63b, .eT9Cje, .bNg8Rb, .S6VXfe, .Lu57id {
          display: none !important;
        }
      `;
    }

    // Sidebar removal styles
    if (options?.removeSidebar) {
      stylesToInject += `
        /* Sidebar hiding */
        #leftnav, #sidetogether {
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
      },
    };
  }
}
