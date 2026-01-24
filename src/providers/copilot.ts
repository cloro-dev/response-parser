import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction, ProviderMetadata } from '../core/types';

export class CopilotProvider extends BaseProvider {
  readonly name: AIProvider = 'COPILOT';
  readonly baseUrl = 'https://copilot.microsoft.com';


  extractContent(response: any): ContentExtraction {
    return this.extractContentCommon(response);
  }

  /**
   * Remove Copilot header/navbar from HTML
   */
  removeHeader(html: string): string {
    let cleaned = html;

    // Remove backstage-chats (hidden navbar element)
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*relative shrink-0 min-h-14[^"]*"[^>]*data-testid="backstage-chats"[^>]*>.*?<\/div>/gis, '');

    // Remove date divider (e.g., "Today" with horizontal line)
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*flex items-center px-6 mx-auto w-full max-w-chat[^"]*"[^>]*>.*?<span[^>]*data-testid="date-divider"[^>]*>.*?<\/span>.*?<div[^>]*class="[^"]*border-t-\[1px\][^"]*"[^>]*>.*?<\/div>.*?<\/div>/gis, '');

    // Remove settings wrapper (share/settings buttons in top-right corner)
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*absolute flex end-6 origin-top-right flex-col items-end[^"]*"[^>]*data-testid="settings-wrapper"[^>]*>.*?<\/div><\/div>/gis, '');

    return cleaned;
  }

  /**
   * Remove Copilot footer/followup input box from HTML
   */
  removeFooter(html: string): string {
    let cleaned = html;

    // Remove the composer (input box at bottom)
    // Starts with: <div class="absolute bottom-0 w-full">
    // Contains: file input, composer content with textarea, buttons (home, attach, chat mode, audio call)
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*absolute bottom-0 w-full[^"]*"[^>]*>.*?<\/div><\/div><\/div><\/div><\/div><\/div><\/div><\/div><\/div><\/div><\/div><\/div>/gis, '');

    // Remove spacer div for composer height
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*mt-\[var\(--composer-container-height\)\][^"]*"[^>]*><\/div>/gis, '');

    // Remove "scroll to bottom" button (full container with button and inner content)
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*pointer-events-none absolute flex justify-center z-20 inset-x-0 bottom-\[calc\(var\(--composer-container-height\)\+1rem\)\][^"]*"[^>]*>.*?<button[^>]*data-testid="scroll-to-bottom-button"[^>]*>.*?<\/button><\/div>/gis, '');

    return cleaned;
  }

  /**
   * Remove Copilot cookie banner from HTML
   */
  removeCookieBanner(html: string): string {
    let cleaned = html;

    // Remove cookie banner by id
    cleaned = cleaned.replace(/<div[^>]*id="cookie-banner"[^>]*>.*?<\/div>.*?<\/div>.*?<\/div>.*?<\/div>/gis, '');

    // Remove cookie banner by max-w-cookie-banner class (outer container)
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*max-w-cookie-banner[^"]*"[^>]*>.*?<\/div>.*?<\/div>.*?<\/div>.*?<\/div>/gis, '');

    return cleaned;
  }

  /**
   * Remove Copilot sidebar from HTML
   */
  removeSidebar(html: string): string {
    let cleaned = html;

    // Remove the inner sidebar div
    // Starts with: <div class="absolute h-full w-0 will-change-auto max-md:bg-sidebar-light..." style="width: 52px;">
    // Ends right before: <main class="relative flex w-full min-w-0 will-change-auto...
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*absolute h-full w-0 will-change-auto max-md:bg-sidebar-light[^"]*"[^>]*style="[^"]*"[^>]*>.*?<main/gis, '<main');

    return cleaned;
  }

  parse(response: any, options?: ParseOptions): ParsedResponse {
    const { html, text } = this.extractContent(response);

    if (!html) {
      throw new Error('No HTML content found in Copilot response');
    }

    let finalHtml = html;

    const removeHeader = options?.removeHeader ?? false;
    const removeFooter = options?.removeFooter ?? false;

    // Sanitize HTML
    finalHtml = this.sanitizeHtml(finalHtml);

    // Remove cookie banner (always)
    finalHtml = this.removeCookieBanner(finalHtml);

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
      metadata: {
        isFullDocument: this.isFullDocument(finalHtml),
        cookieBannerRemoved: true,
        headerRemoved: removeHeader,
        footerRemoved: removeFooter,
        sidebarRemoved: options?.removeSidebar || false,
        linksRemoved: options?.removeLinks || false,
      } as ProviderMetadata,
    };
  }
}