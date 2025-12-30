import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
} from "../core/types";

export class AIOverviewProvider extends BaseProvider {
  readonly name: AIProvider = "AIOVERVIEW";
  readonly baseUrl = "https://www.google.com";


  extractContent(response: any): ContentExtraction {
    let html = "";
    let sources: any[] = [];

    // Handle nested structure
    let dataToCheck = response;
    if (response.result) {
      dataToCheck = response.result;
    }

    // For AI Overview, extract sources but never use text field
    if (dataToCheck.aioverview) {
      if (dataToCheck.aioverview.sources) {
        sources = dataToCheck.aioverview.sources;
      }
    }

    // Only extract HTML field - never use text to build HTML
    if (typeof dataToCheck === "string") {
      if (dataToCheck.trim().startsWith("<") && dataToCheck.includes(">")) {
        html = dataToCheck;
      }
    } else if (typeof dataToCheck === "object" && dataToCheck !== null) {
      if (dataToCheck.html) {
        html = dataToCheck.html;
      } else if (dataToCheck.content) {
        if (dataToCheck.content.trim().startsWith("<")) {
          html = dataToCheck.content;
        }
      }
    }

    return { html, sources };
  }

  /**
   * Remove Google Search header/navbar from HTML
   */
  removeHeader(html: string): string {
    // Remove header elements via CSS injection
    return html;
  }

  /**
   * Remove Google Search footer from HTML
   */
  removeFooter(html: string): string {
    // Remove footer elements via CSS injection
    return html;
  }

  /**
   * Remove Google Search sidebar from HTML
   */
  removeSidebar(html: string): string {
    // Remove sidebar elements via CSS injection
    return html;
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, sources } = this.extractContent(response);

    if (!html) {
      throw new Error("No HTML content found in AI Overview response");
    }

    let finalHtml = html;

    // For AI Overview, default to removing header and footer for cleaner display
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
    stylesToInject += ``;

    // Add background and text colors based on invertColors option
    if (options?.invertColors) {
      stylesToInject += ``;
    } else {
      stylesToInject += `
        /* Light theme */
        html, body, main, article {
          background-color: #ffffff !important;
          color: #1a1a1a !important;
        }
      `;
    }

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
      sources,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        headerRemoved: removeHeader,
        footerRemoved: removeFooter,
        sidebarRemoved: options?.removeSidebar || false,
        linksRemoved: options?.removeLinks || false,
        colorsInverted: options?.invertColors || false,
      },
    };
  }
}
