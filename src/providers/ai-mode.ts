import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class AIModeProvider extends BaseProvider {
  readonly name: AIProvider = 'AIMODE';
  readonly baseUrl = 'https://www.google.com';


  extractContent(response: any): ContentExtraction {
    let html = '';
    let text = '';

    // Handle nested structure
    let dataToCheck = response;
    if (response.result) {
      dataToCheck = response.result;
    }

    // Extract content
    if (typeof dataToCheck === 'string') {
      if (dataToCheck.trim().startsWith('<') && dataToCheck.includes('>')) {
        html = dataToCheck;
      } else {
        text = dataToCheck;
      }
    } else if (typeof dataToCheck === 'object' && dataToCheck !== null) {
      if (dataToCheck.html) {
        html = dataToCheck.html;
      } else if (dataToCheck.content) {
        if (dataToCheck.content.trim().startsWith('<')) {
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
    const { html, text } = this.extractContent(response);

    if (!html) {
      throw new Error('No HTML content found in AI Mode response');
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
    stylesToInject += `
      /* General Layout */
      main { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
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