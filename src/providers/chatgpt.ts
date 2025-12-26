import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class ChatGPTProvider extends BaseProvider {
  readonly name: AIProvider = 'CHATGPT';
  readonly baseUrl = 'https://chatgpt.com';

  readonly defaultStyles = `
    /* Force Dark Background on main containers and wrappers */
    html, body, main, article, footer, form,
    [class*="bg-"], [class*="footer"], [class*="bottom"],
    div[class*="border-t"],
    #thread-bottom-container, #thread-bottom,
    #thread, .composer-parent, [class*="group\\/thread"] {
      background-color: #131314 !important;
      color: #e3e3e3 !important;
      border-color: #2a2b36 !important;
    }

    /* Force background on specific white artifacts in the footer */
    #thread-bottom-container .bg-clip-padding,
    #thread-bottom-container .content-fade,
    #thread-bottom-container .absolute {
       background-color: transparent !important;
    }

    /* Specific targeting for the composer/input box (was white) */
    form .bg-token-bg-primary, form .shadow-short {
      background-color: #2a2b36 !important;
      border-color: #3e3f4b !important;
      box-shadow: none !important;
    }

    /* Disclaimer Footer - Force Dark Background */
    div[class*="text-token-text-secondary"] {
      color: #9ca3af !important;
      background-color: #131314 !important;
    }

    /* Force Text Color to Light */
    p, h1, h2, h3, h4, h5, h6, li, span, div, td, th, textarea, button {
      color: #e3e3e3 !important;
    }

    /* Links - Light Blue */
    a, a span {
      color: #8ab4f8 !important;
    }

    /* Code Blocks */
    pre, code, pre div, code span {
      background-color: #2a2b36 !important;
      color: #e3e3e3 !important;
      text-shadow: none !important;
    }

    /* Inputs/Textareas */
    input, textarea {
      background-color: transparent !important;
      color: #e3e3e3 !important;
      border-color: #3e3f4b !important;
    }

    /* Placeholder text */
    textarea::placeholder {
      color: #9ca3af !important;
    }

    /* Hide Sidebar */
    nav, [class*="sidebar"] {
      display: none !important;
    }

    /* Media visibility */
    img, video {
      opacity: 1 !important;
    }
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
      throw new Error('No content found in ChatGPT response');
    }

    let finalHtml = html || '';

    // If we only have text, create simple HTML
    if (!finalHtml && text) {
      finalHtml = `<div>${text.replace(/\n/g, '<br>')}</div>`;
    }

    // Sanitize HTML
    finalHtml = this.sanitizeHtml(finalHtml);

    // Inject styles
    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS: this.defaultStyles,
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