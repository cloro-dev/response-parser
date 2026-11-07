import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction, ProviderMetadata } from '../core/types';

/**
 * Bing AI Mode (bing.com/copilotsearch).
 *
 * The page that cloro stores is Bing's chat shell. The answer is inside an
 * `<iframe srcdoc>` that an inline `onload` script sizes to its content. With
 * scripts blocked (a sandboxed preview, or this parser, which removes
 * scripts), the frame stays 150px high and shows only the first sentence. So
 * this provider renders the frame's own document, which holds the whole
 * answer: the reasoning panel, the answer, the citation chips and the source
 * cards.
 */
export class BingAiModeProvider extends BaseProvider {
  readonly name: AIProvider = 'BING_AIMODE';
  readonly baseUrl = 'https://www.bing.com';

  extractContent(response: any): ContentExtraction {
    return this.extractContentCommon(response);
  }

  /**
   * The document in the answer frame's `srcdoc`, or the input when the page
   * has no such frame (for example, when it is already the answer document).
   */
  answerDocument(html: string): string {
    const match = /<iframe\b[^>]*\ssrcdoc="([^"]*)"/i.exec(html);
    if (!match) return html;
    return match[1]
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x0*27;/gi, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  /** The prompt, from the question bubble in the shell. */
  userQuery(html: string): string | null {
    const match = /<div\b[^>]*class="ca_userquery_text"[^>]*>([^<]*)<\/div>/i.exec(html);
    return match ? match[1].trim() : null;
  }

  /** Put the question above the answer, as the shell shows it. */
  addQuery(html: string, query: string | null): string {
    if (!query) return html;
    const bubble = `<div class="cloro_bing_query">${query}</div>`;
    return /<body\b[^>]*>/i.test(html)
      ? html.replace(/(<body\b[^>]*>)/i, `$1${bubble}`)
      : bubble + html;
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text } = this.extractContent(response);

    if (!html) {
      throw new Error('No HTML content found in Bing AI Mode response');
    }

    const removeHeader = options?.removeHeader ?? false;
    const removeSources = options?.removeSources ?? false;

    const query = this.userQuery(html);
    let finalHtml = this.addQuery(this.sanitizeHtml(this.answerDocument(html)), query);

    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    // Bing sets overflow: hidden on <html>, because in Bing the frame grows to
    // its content and the shell scrolls. In a fixed-height view the answer
    // must scroll itself. The column and the question bubble copy the shell.
    // The reasoning panel's favicons are blob: URLs from Bing's session, so
    // they are hidden. The panel's toggle needs a script, so the panel is
    // open and the toggle is hidden.
    let customCSS = `
      html { overflow: auto !important; height: auto !important; }
      body { max-width: 880px; margin: 0 auto !important; padding: 24px 24px 48px !important; box-sizing: border-box; }
      .cloro_bing_query { width: fit-content; max-width: 80%; margin: 0 0 16px; padding: 10px 16px; border-radius: 16px; background: #e8f1fd; color: #111; font: 16px/1.5 "Segoe UI", -apple-system, system-ui, sans-serif; }
      .b_ts_source_fav:has(img[src^="blob:"]) { display: none !important; }
      #b_ts_exp_content { display: block !important; height: auto !important; max-height: none !important; overflow: visible !important; opacity: 1 !important; }
      .b_ts_exp_header { display: none !important; }
    `;

    // The header is the reasoning panel ("See reasoning") above the answer.
    if (removeHeader) {
      customCSS += `
        .b_ts_container { display: none !important; }
      `;
    }

    // The sources are the cards below the answer and the "N Sources" group
    // under each section. The citation chips in the text (.gs_sup_cit) stay.
    if (removeSources) {
      customCSS += `
        .gs_cit_cont, .gs_cit_stry_preview { display: none !important; }
      `;
    }

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS,
    });

    return {
      provider: this.name,
      html: finalHtml,
      text,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        headerRemoved: removeHeader,
        // The answer document has no footer or sidebar. The follow-up box and
        // the side rail are in the shell that this provider drops.
        footerRemoved: true,
        sidebarRemoved: true,
        sourcesRemoved: removeSources,
        linksRemoved: options?.removeLinks || false,
      } as ProviderMetadata,
    };
  }
}
