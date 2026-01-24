import { BaseProvider } from "./base-provider";
import {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ContentExtraction,
  ProviderMetadata,
} from "../core/types";

export class AIOverviewProvider extends BaseProvider {
  readonly name: AIProvider = "AIOVERVIEW";
  readonly baseUrl = "https://www.google.com";

  extractContent(response: any): ContentExtraction {
    return this.extractContentCommon(response, true);
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
      } as ProviderMetadata,
    };
  }
}
