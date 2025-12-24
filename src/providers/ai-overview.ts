import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class AIOverviewProvider extends BaseProvider {
  readonly name: AIProvider = 'AIOVERVIEW';
  readonly baseUrl = 'https://www.google.com';

  readonly defaultStyles = `
    /* UI hiding - Google Search (AI Overview) */
    header, #header, #searchform, .sfbg, #appbar,
    div[role="navigation"], #leftnav, #sidetogether,
    [role="banner"], .Fgvgjc, #hdtb, .hdtb-msb,
    footer, #footer, .fbar,
    .pdp-nav, [aria-label="Main menu"], .gb_Td, .gb_L,

    /* Specific AI Mode Selectors */
    .DZ13He,
    .wYq63b,
    .eT9Cje,
    .bNg8Rb,
    .S6VXfe,
    .Lu57id {
      display: none !important;
    }

    /* General Layout */
    main { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
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

    // For AI Overview, check for aioverview structure first
    if (dataToCheck.aioverview) {
      if (dataToCheck.aioverview.text) {
        text = dataToCheck.aioverview.text;
      }
      if (dataToCheck.aioverview.sources) {
        sources = dataToCheck.aioverview.sources;
      }
    }

    // Check for standard content fields
    if (typeof dataToCheck === 'string') {
      if (dataToCheck.trim().startsWith('<') && dataToCheck.includes('>')) {
        html = dataToCheck;
      } else {
        text = text || dataToCheck;
      }
    } else if (typeof dataToCheck === 'object' && dataToCheck !== null) {
      if (dataToCheck.html && !text) {
        html = dataToCheck.html;
      } else if (dataToCheck.content && !text) {
        if (dataToCheck.content.trim().startsWith('<')) {
          html = dataToCheck.content;
        } else {
          text = dataToCheck.content;
        }
      } else if (dataToCheck.text && !text) {
        text = dataToCheck.text;
      }
    }

    // If we have HTML, try to extract WIZ_global_data
    if (html) {
      const wizDataMatch = html.match(/"DnVkpd"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (wizDataMatch && wizDataMatch[1]) {
        try {
          // Decode the JSON string to get the actual content
          let extractedContent = JSON.parse(`"${wizDataMatch[1]}"`);

          // Format specific delimiters used by AI Overview
          // ∰ seems to separate turns/sections
          extractedContent = extractedContent.replace(
            /∰/g,
            '<hr class="gemini-separator">',
          );

          // ∞ seems to separate prompts/images/responses. Often precedes URLs.
          // We'll try to detect image URLs following this and turn them into tags.
          extractedContent = extractedContent.replace(
            /∞(https:\/\/[^ ]+\.(?:jpg|png|webp|gif|jpeg)(?:\?[^ ]*)?)/gi,
            '<br><img src="$1" class="gemini-image" alt="Generated Image"><br>',
          );

          // Handle remaining ∞
          extractedContent = extractedContent.replace(/∞/g, '<br>');

          // Handle newlines
          extractedContent = extractedContent.replace(/\n/g, '<br>');

          text = extractedContent;
        } catch (e) {
          console.error('Failed to parse AI Overview WIZ data', e);
          // Keep original HTML if parsing fails
        }
      }
    }

    return { html, text, sources };
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text, sources } = this.extractContent(response);

    if (!html && !text) {
      throw new Error('No content found in AI Overview response');
    }

    let finalHtml = '';

    // If we have extracted text from WIZ data, build HTML from it
    if (text && !html) {
      const googleStyles = `
        body {
          font-family: 'Google Sans', Roboto, sans-serif;
          line-height: 1.5;
          padding: 20px;
          color: #e3e3e3;
          background-color: #131314;
        }
        .gemini-separator {
          border: 0;
          border-top: 1px solid #444;
          margin: 24px 0;
        }
        .gemini-image {
          max-width: 100%;
          border-radius: 8px;
          margin: 12px 0;
          border: 1px solid #333;
        }
        a { color: #8ab4f8; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #444; padding: 8px; text-align: left; }
        th { background-color: #1f1f1f; }
      `;

      finalHtml = `<!DOCTYPE html>
      <html>
        <head>
          <base href="${options?.baseUrl || this.baseUrl}">
          <style>${googleStyles}</style>
        </head>
        <body>
          ${text}
        </body>
      </html>`;
    } else {
      // Use the original HTML but clean it
      finalHtml = html || '';
      finalHtml = this.sanitizeHtml(finalHtml);

      // Inject base URL and styles
      finalHtml = this.injectStyles(finalHtml, {
        theme: options?.theme || 'dark',
        baseUrl: options?.baseUrl || this.baseUrl,
        hideUI: true,
      });
    }

    return {
      provider: this.name,
      html: finalHtml,
      text,
      sources,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        hasWizData: !!text && !html,
      },
    };
  }
}