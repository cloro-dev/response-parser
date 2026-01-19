import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class GeminiProvider extends BaseProvider {
  readonly name: AIProvider = 'GEMINI';
  readonly baseUrl = 'https://gemini.google.com';


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

  /**
   * Remove Gemini header/navbar from HTML
   */
  removeHeader(html: string): string {
    let cleaned = html;

    // Remove the Google navbar with boqOnegoogleliteOgbOneGoogleBar class
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*boqOnegoogleliteOgbOneGoogleBar[^"]*"[^>]*>.*?<\/div><\/div><\/div><\/div>/gis, '');

    // Remove side-nav-menu-button (hamburger menu)
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*side-nav-menu-button[^"]*"[^>]*>.*?<\/div>/gis, '');

    // Remove top-bar-actions (About Gemini, Gemini App, Subscriptions, For Business links)
    cleaned = cleaned.replace(/<top-bar-actions[^>]*>.*?<\/top-bar-actions>/gis, '');

    // Remove desktop-ogb-buffer
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*desktop-ogb-buffer[^"]*"[^>]*><\/div>/gis, '');

    return cleaned;
  }

  /**
   * Remove Gemini footer/follow-up input box from HTML
   */
  removeFooter(html: string): string {
    // Remove input-container (text input, upload button, send button, disclaimer)
    return html.replace(/<input-container[^>]*>.*?<\/input-container>/gis, '');
  }

  /**
   * Remove Gemini sidebar from HTML
   */
  removeSidebar(html: string): string {
    // Remove bard-sidenav element
    return html.replace(/<bard-sidenav[^>]*>.*?<\/bard-sidenav>/gis, '');
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text, sources } = this.extractContent(response);

    if (!html) {
      throw new Error('No HTML content found in Gemini response');
    }

    let finalHtml = html;

    const removeHeader = options?.removeHeader ?? false;
    const removeFooter = options?.removeFooter ?? false;

    // Sanitize HTML (remove scripts and noscript)
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

    // Inject styles with optional color inversion
    // Gemini's default is dark theme, so invertColors should apply light theme
    const colorInversionStyles = options?.invertColors
      ? `
      html {
        color-scheme: light !important;
      }
      /* Force Light Theme (invert from default dark) - only main background */
      html, body, main {
        background-color: #ffffff !important;
      }
      /* Force all text to dark grey (not pure black for better readability) */
      html, body, main, article, div, span, p, h1, h2, h3, h4, h5, h6, li, a, button, strong, label, textarea {
        color: #1A1A1A !important;
      }
      /* User message bubbles - Gemini specific classes */
      .user-query-bubble-with-background,
      .user-query-container,
      .query-text,
      .query-text-line {
        background-color: #F4F4F4 !important;
        color: #1A1A1A !important;
      }
      /* AI response bubbles - Gemini specific classes */
      .model-response-text,
      .response-container,
      .response-container-content,
      .response-content {
        background-color: #ffffff !important;
        color: #1A1A1A !important;
      }
      /* Input/composer area - Gemini specific classes */
      input-area-v2,
      .input-area,
      .input-area-container,
      .text-input-field,
      .text-input-field_textarea-wrapper,
      .text-input-field-main-area,
      .text-input-field_textarea-inner,
      .text-input-field_textarea,
      .ql-editor,
      .textarea,
      .input-buttons-wrapper-bottom {
        background-color: #ffffff !important;
        color: #1A1A1A !important;
        border-color: #E5E5E5 !important;
      }
      /* Input gradient - remove the dark gradient overlay */
      input-container,
      .input-gradient {
        background: transparent !important;
      }
      input-container::before,
      .input-gradient::before {
        background: linear-gradient(transparent, #ffffff) !important;
        content: none !important;
      }
      /* Input placeholder text */
      .ql-editor::before,
      .textarea::placeholder {
        color: #666666 !important;
      }
      /* Buttons */
      button, [role="button"] {
        background-color: #F4F4F4 !important;
        color: #1A1A1A !important;
        border-color: #E5E5E5 !important;
      }
      /* Links */
      a {
        color: #1a73e8 !important;
      }
      /* Code blocks */
      pre, code, [class*="code"] {
        background-color: #f5f5f5 !important;
        color: #1A1A1A !important;
        border-color: #E5E5E5 !important;
      }
      /* Tables */
      table, td, th {
        background-color: #ffffff !important;
        border-color: #E5E5E5 !important;
        color: #1A1A1A !important;
      }
      /* Force borders to be visible */
      [class*="border"], hr {
        border-color: #E5E5E5 !important;
      }
      /* Cards and containers */
      [class*="card"], [class*="container"] {
        background-color: #ffffff !important;
        border-color: #E5E5E5 !important;
      }
    `
      : ``;

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS: colorInversionStyles,
    });

    return {
      provider: this.name,
      html: finalHtml,
      text,
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