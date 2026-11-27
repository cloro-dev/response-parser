import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction, ProviderMetadata } from '../core/types';
import { removeBlocks } from '../core/html';

export class GeminiProvider extends BaseProvider {
  readonly name: AIProvider = 'GEMINI';
  readonly baseUrl = 'https://gemini.google.com';


  extractContent(response: any): ContentExtraction {
    return this.extractContentCommon(response, true);
  }

  /**
   * Remove Gemini header/navbar from HTML
   */
  removeHeader(html: string): string {
    let cleaned = html;

    // Remove the Google navbar with boqOnegoogleliteOgbOneGoogleBar class
    cleaned = removeBlocks(cleaned, 'div', (tag) => /class="[^"]*boqOnegoogleliteOgbOneGoogleBar/i.test(tag), [
      '</div></div></div></div>',
    ]);

    // Remove top-bar-actions (About Gemini, Gemini App, Subscriptions, For Business links)
    cleaned = removeBlocks(cleaned, 'top-bar-actions', () => true, ['</top-bar-actions>']);

    // Remove desktop-ogb-buffer
    cleaned = cleaned.replace(/<div[^<>]*><\/div>/gi, (div) => (/class="[^"]*desktop-ogb-buffer/i.test(div) ? '' : div));

    return cleaned;
  }

  /**
   * Remove Gemini footer/follow-up input box from HTML
   */
  removeFooter(html: string): string {
    // Remove input-container (text input, upload button, send button, disclaimer)
    return removeBlocks(html, 'input-container', () => true, ['</input-container>']);
  }

  /**
   * Remove Gemini sidebar from HTML
   */
  removeSidebar(html: string): string {
    // Remove bard-sidenav element
    return removeBlocks(html, 'bard-sidenav', () => true, ['</bard-sidenav>']);
  }

  /**
   * Remove Gemini sources panel from HTML
   */
  removeSources(html: string): string {
    let cleaned = html;

    // Remove the context-sidebar element (contains source cards)
    cleaned = removeBlocks(cleaned, 'context-sidebar', () => true, ['</context-sidebar>']);

    // Remove the sources-sidebar-button trigger
    cleaned = removeBlocks(cleaned, 'sources-sidebar-button', () => true, ['</sources-sidebar-button>']);

    return cleaned;
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

    // Remove sources panel if requested
    if (options?.removeSources) {
      finalHtml = this.removeSources(finalHtml);
    }

    // Remove links if requested
    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    // Always-on: hide the "Sign in" prompt above the input box, and the
    // menus and tooltips that were open when the page was captured (the
    // input box covers a menu at the bottom of the page).
    let customCSS = `
      sign-in-nudge { display: none !important; }
      .cdk-overlay-container,
      .cdk-overlay-popover { display: none !important; }
      /* Below 560 px the header links (About Gemini, Subscriptions, For
         Business, Sign in) cover the Gemini logo. */
      @media (max-width: 559.98px) {
        top-bar-actions { display: none !important; }
      }
    `;

    // The hamburger button has nested <div>s that a regex cannot balance
    if (removeHeader) {
      customCSS += `
        .side-nav-menu-button { display: none !important; }
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
      sources,
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        headerRemoved: removeHeader,
        footerRemoved: removeFooter,
        sidebarRemoved: options?.removeSidebar || false,
        sourcesRemoved: options?.removeSources || false,
        linksRemoved: options?.removeLinks || false,
      } as ProviderMetadata,
    };
  }
}