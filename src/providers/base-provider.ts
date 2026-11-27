import { AIProvider, ParsedResponse, ParseOptions, StyleOptions, ContentExtraction, extractContentCommon } from '../core/types';
import { removeScripts } from '../core/html';

export abstract class BaseProvider {
  abstract readonly name: AIProvider;
  abstract readonly baseUrl: string;

  /**
   * Parse an AI response and return structured content
   */
  abstract parse(response: any, options?: ParseOptions): ParsedResponse;

  /**
   * Extract content from the response object
   */
  abstract extractContent(response: any): ContentExtraction;

  /**
   * Common content extraction logic - can be used by providers
   */
  protected extractContentCommon(response: any, includeSources = false): ContentExtraction {
    const result = extractContentCommon(response);

    if (includeSources) {
      let sources: any[] = [];
      const dataToCheck = response.result || response;

      if (typeof dataToCheck === 'object' && dataToCheck !== null) {
        if (dataToCheck.aioverview?.sources) {
          sources = dataToCheck.aioverview.sources;
        } else if (dataToCheck.sources) {
          sources = dataToCheck.sources;
        }
      }

      return { ...result, sources };
    }

    return result;
  }

  /**
   * Inject provider-specific styles into HTML
   */
  injectStyles(html: string, options?: StyleOptions): string {
    let styledHtml = html;

    // Inject base URL if not already present
    if (options?.baseUrl && !html.includes('<base ')) {
      if (styledHtml.includes('<head>')) {
        styledHtml = styledHtml.replace(
          '<head>',
          `<head><base href="${options.baseUrl}">`,
        );
      } else {
        styledHtml = styledHtml.replace(
          /(<html[^<>]*>)/i,
          `$1<head><base href="${options.baseUrl}"></head>`,
        );
      }
    }

    // Inject styles only if customCSS is provided
    const styles = options?.customCSS || '';

    if (styles && styledHtml.includes('<head>')) {
      styledHtml = styledHtml.replace('<head>', `<head><style>${styles}</style>`);
    } else if (styles) {
      styledHtml = styledHtml.replace(
        /(<html[^<>]*>)/i,
        `$1<head><style>${styles}</style></head>`,
      );
    }

    return styledHtml;
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(html: string): string {
    return removeScripts(html);
  }

  /**
   * Check if content is a full HTML document
   */
  isFullDocument(html: string): boolean {
    return /^\s*(<html|<!DOCTYPE)/i.test(html);
  }

  /**
   * Remove the href of each link and keep the <a> element. Pages style their
   * layout and fonts on the <a> elements (Bing Search, the Gemini header),
   * and break when the elements are gone.
   */
  removeLinks(html: string): string {
    return html.replace(/<a\b[^<>]*>/gi, (tag) =>
      tag.replace(/\s(href|ping)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    );
  }

  /**
   * Wrap HTML fragment in a document
   */
  wrapFragment(html: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline';">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    img { max-width: 100%; height: auto; }
    body {
      pointer-events: none;
      user-select: none;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }
}