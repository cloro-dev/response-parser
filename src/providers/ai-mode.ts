import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class AIModeProvider extends BaseProvider {
  readonly name: AIProvider = 'AIMODE';
  readonly baseUrl = 'https://www.google.com';

  readonly defaultStyles = `
    /* UI hiding - Google Search (AI Mode) */
    header, #header, #searchform, .sfbg, #appbar,
    div[role="navigation"], #leftnav, #sidetogether,
    [role="banner"], .Fgvgjc, #hdtb, .hdtb-msb,
    footer, #footer, .fbar,
    .pdp-nav, [aria-label="Main menu"], .gb_Td, .gb_L,

    /* Specific AI Mode Selectors found in analysis */
    .DZ13He, /* Main sticky top bar */
    .wYq63b, /* Accessibility links bar */
    .eT9Cje, /* History/New Search buttons */
    .bNg8Rb, /* Hidden H1 headers */
    .S6VXfe, /* Accessibility container */
    .Lu57id  /* Potential other top bar */ {
      display: none !important;
    }

    /* General Layout */
    main { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
  `;

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

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text } = this.extractContent(response);

    if (!html && !text) {
      throw new Error('No content found in AI Mode response');
    }

    let finalHtml = html || '';

    // If we only have text, create simple HTML
    if (!finalHtml && text) {
      finalHtml = `<div>${text.replace(/\n/g, '<br>')}</div>`;
    }

    // Sanitize HTML
    finalHtml = this.sanitizeHtml(finalHtml);

    // Inject styles to hide UI elements
    finalHtml = this.injectStyles(finalHtml, {
      theme: options?.theme || 'dark',
      baseUrl: options?.baseUrl || this.baseUrl,
      hideUI: true,
    });

    return {
      provider: this.name,
      html: finalHtml,
      text,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
      },
    };
  }
}