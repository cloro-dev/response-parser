import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class CopilotProvider extends BaseProvider {
  readonly name: AIProvider = 'COPILOT';
  readonly baseUrl = 'https://copilot.microsoft.com';

  readonly defaultStyles = `
    /* Copilot Sidebar & Header */
    div:has(> [data-testid="sidebar-container"]),
    [data-testid="sidebar-container"],
    [data-testid="sticky-header"],
    .side-nav-menu-button {
      display: none !important;
    }

    /* General Layout Fixes */
    main {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
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
      throw new Error('No content found in Copilot response');
    }

    let finalHtml = html || '';

    // If we only have text, create simple HTML
    if (!finalHtml && text) {
      finalHtml = `<div>${text.replace(/\n/g, '<br>')}</div>`;
    }

    // Remove noscript tags
    finalHtml = finalHtml.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

    // Inject styles
    finalHtml = this.injectStyles(finalHtml, {
      theme: options?.theme || 'dark',
      baseUrl: options?.baseUrl || this.baseUrl,
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