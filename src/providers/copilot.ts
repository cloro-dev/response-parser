import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction, ProviderMetadata } from '../core/types';
import { removeBlocks } from '../core/html';

/**
 * @deprecated cloro discontinues its Copilot endpoint. For Bing's AI answers,
 * use `BingAiModeProvider` (`BING_AIMODE`).
 */
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

    // Remove settings wrapper (share/settings buttons in top-right corner)
    cleaned = removeBlocks(
      cleaned,
      'div',
      (tag) =>
        /class="[^"]*absolute flex end-6 origin-top-right flex-col items-end/i.test(tag) &&
        /data-testid="settings-wrapper"/i.test(tag),
      ['</div></div>'],
    );

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
    cleaned = removeBlocks(cleaned, 'div', (tag) => /class="[^"]*absolute bottom-0 w-full/i.test(tag), [
      '</div>'.repeat(12),
    ]);

    // Remove spacer div for composer height
    cleaned = cleaned.replace(/<div[^<>]*><\/div>/gi, (div) =>
      /class="[^"]*mt-\[var\(--composer-container-height\)\]/i.test(div) ? '' : div,
    );

    // Remove "scroll to bottom" button (full container with button and inner content)
    cleaned = removeBlocks(
      cleaned,
      'div',
      (tag) =>
        /class="[^"]*pointer-events-none absolute flex justify-center z-20 inset-x-0 bottom-\[calc\(var\(--composer-container-height\)\+1rem\)\]/i.test(
          tag,
        ),
      [/<button[^<>]*data-testid="scroll-to-bottom-button"[^<>]*>/gi, '</button></div>'],
    );

    return cleaned;
  }

  /**
   * Remove Copilot cookie banner from HTML
   */
  removeCookieBanner(html: string): string {
    let cleaned = html;

    // Remove cookie banner by id
    cleaned = removeBlocks(cleaned, 'div', (tag) => /id="cookie-banner"/i.test(tag), [
      '</div>',
      '</div>',
      '</div>',
      '</div>',
    ]);

    // Remove cookie banner by max-w-cookie-banner class (outer container)
    cleaned = removeBlocks(cleaned, 'div', (tag) => /class="[^"]*max-w-cookie-banner/i.test(tag), [
      '</div>',
      '</div>',
      '</div>',
      '</div>',
    ]);

    return cleaned;
  }

  /**
   * Remove Copilot sources/references panel from HTML
   */
  removeSources(html: string): string {
    // Remove the references panel (right-side panel with variable width containing citations)
    return removeBlocks(
      html,
      'div',
      (tag) =>
        /class="[^"]*relative h-full overflow-hidden will-change-auto/i.test(tag) &&
        /style="[^"]*width:\s*\d+px/i.test(tag),
      [{ before: /<div[^<>]*class="[^"<>]*pointer-events-none (?:fixed|absolute)[^"<>]*"/gi }],
    );
  }

  /**
   * Remove Copilot sidebar from HTML
   */
  removeSidebar(html: string): string {
    // Handled with CSS in parse(). The sidebar shares a flex wrapper with
    // <main>, and a regex removes the opening tag of that wrapper.
    return html;
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

    // Remove sources/references panel if requested
    if (options?.removeSources) {
      finalHtml = this.removeSources(finalHtml);
    }

    // Remove links if requested
    if (options?.removeLinks) {
      finalHtml = this.removeLinks(finalHtml);
    }

    let customCSS = '';

    if (removeHeader) {
      customCSS += `
        [data-testid="sticky-header"],
        [data-testid="backstage-chats"],
        div:has(> div > [data-testid="date-divider"]) {
          display: none !important;
        }
      `;
    }

    if (options?.removeSidebar) {
      customCSS += `
        div:has(> #sidebar-container) { display: none !important; }
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
        cookieBannerRemoved: true,
        headerRemoved: removeHeader,
        footerRemoved: removeFooter,
        sidebarRemoved: options?.removeSidebar || false,
        sourcesRemoved: options?.removeSources || false,
        linksRemoved: options?.removeLinks || false,
      } as ProviderMetadata,
    };
  }
}