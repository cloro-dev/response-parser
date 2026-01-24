import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction, ProviderMetadata } from '../core/types';

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

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS: '',
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
      } as ProviderMetadata,
    };
  }
}