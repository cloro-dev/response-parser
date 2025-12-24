import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class GeminiProvider extends BaseProvider {
  readonly name: AIProvider = 'GEMINI';
  readonly baseUrl = 'https://gemini.google.com';

  readonly defaultStyles = `
    /* Gemini Dark Mode Variable Overrides */
    :root {
      --gem-sys-color--surface: #131314 !important;
      --gem-sys-color--surface-container: #1e1f20 !important;
      --gem-sys-color--on-surface: #e3e3e3 !important;
      --bard-color-synthetic--chat-window-surface: #131314 !important;
      --bard-color-surface-dim-tmp: #131314 !important;
    }

    /* UI hiding - Gemini */
    bard-sidenav, mat-sidenav, .mat-drawer-backdrop, .side-nav-menu-button,

    /* Gemini "About Gemini" footer/navigation block */
    .gb_5a, .gb_5c, .gb_5d, .gb_5e,
    .gb_Uc, .gb_Vc, .gb_Wc,
    a[href*="about"],
    a[href*="subscriptions"],
    a[href*="business"],
    div[class*="gb_5"],
    .gb_Pd, .gb_Qd, .gb_Rd,
    .gb_Sd, .gb_Td, .gb_Ud, .gb_Vd,
    [aria-label*="About"],
    [aria-label*="Gemini App"],
    [aria-label*="Subscriptions"],
    [aria-label*="For Business"],
    *:contains("About Gemini"),
    *:contains("Gemini App"),
    *:contains("Subscriptions"),
    *:contains("For Business") {
      display: none !important;
    }

    /* General Layout */
    main { width: 100% !important; max-width: 100% !important; margin: 0 !important; }

    /* Force Dark Mode on Body and Gemini Containers */
    body, .content-container, chat-app, .main-content, .chat-container {
      background-color: #131314 !important;
      color: #e3e3e3 !important;
    }
  `;

  extractContent(response: any): ContentExtraction {
    let html = '';
    let text = '';
    let sources: any[] = [];

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

      // Check for aioverview nested structure
      if (dataToCheck.aioverview) {
        if (dataToCheck.aioverview.text) text = dataToCheck.aioverview.text;
        if (dataToCheck.aioverview.sources) sources = dataToCheck.aioverview.sources;
      }
    }

    return { html, text, sources };
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text, sources } = this.extractContent(response);

    if (!html && !text) {
      throw new Error('No content found in Gemini response');
    }

    let finalHtml = html || '';

    // If we only have text, create simple HTML
    if (!finalHtml && text) {
      finalHtml = `<div>${text.replace(/\n/g, '<br>')}</div>`;
    }

    // Sanitize HTML (remove scripts and noscript)
    finalHtml = this.sanitizeHtml(finalHtml);

    // For Gemini, we need to extract content from WIZ_global_data for AI Overview/Mode
    // But for regular Gemini, we just inject styles
    finalHtml = this.injectStyles(finalHtml, {
      theme: options?.theme || 'dark',
      baseUrl: options?.baseUrl || this.baseUrl,
    });

    return {
      provider: this.name,
      html: finalHtml,
      text,
      sources,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
      },
    };
  }
}