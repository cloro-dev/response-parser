import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class PerplexityProvider extends BaseProvider {
  readonly name: AIProvider = 'PERPLEXITY';
  readonly baseUrl = 'https://www.perplexity.ai';

  readonly defaultStyles = `
    html {
      filter: invert(1) hue-rotate(180deg);
      background-color: white !important;
    }
    img, video, iframe, svg {
      filter: invert(1) hue-rotate(180deg);
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
      throw new Error('No content found in Perplexity response');
    }

    let finalHtml = html || '';

    // If we only have text, create simple HTML
    if (!finalHtml && text) {
      finalHtml = `<div>${text.replace(/\n/g, '<br>')}</div>`;
    }

    // For Perplexity, we apply color inversion for dark mode
    // Don't sanitize scripts as Perplexity might need them for functionality
    finalHtml = this.injectStyles(finalHtml, {
      theme: options?.theme || 'dark',
      baseUrl: options?.baseUrl || this.baseUrl,
      customCSS: options?.theme === 'light' ? '' : this.defaultStyles,
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