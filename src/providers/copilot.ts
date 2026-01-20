import { BaseProvider } from './base-provider';
import { AIProvider, ParsedResponse, ParseOptions, ContentExtraction } from '../core/types';

export class CopilotProvider extends BaseProvider {
  readonly name: AIProvider = 'COPILOT';
  readonly baseUrl = 'https://copilot.microsoft.com';


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
      //BUG: Button and date divider not yet removed 
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

    // Inject styles with optional color inversion
    // Copilot's default is dark theme, so invertColors should apply light theme
    const colorInversionStyles = options?.invertColors
      ? `
      html {
        color-scheme: light !important;
      }
      /* Force Light Theme (invert from default dark) - only main background */
      html, body, main {
        background-color: #ffffff !important;
      }
      /* Force all text to dark grey (not pure black for better readability) */
      html, body, main, article, div, span, p, h1, h2, h3, h4, h5, h6, li, a, button, strong, label, textarea {
        color: #1A1A1A !important;
      }
      /* User message bubbles - Copilot uses bg-accent-250/60 */
      .bg-accent-250\\/60,
      [class*="bg-accent-250"] {
        background-color: #F4F4F4 !important;
        color: #1A1A1A !important;
      }
      /* Override dark mode user message background */
      .dark\\:bg-accent-200,
      [class*="dark:bg-accent"] {
        background-color: #F4F4F4 !important;
      }
      /* AI response bubbles */
      [class*="ai-message"] {
        background-color: #ffffff !important;
        color: #1A1A1A !important;
      }
      /* Sidebar */
      .bg-sidebar-dark, [class*="bg-sidebar-dark"] {
        background-color: #ffffff !important;
      }
      /* Composer/input area */
      [class*="composer"], [class*="bottom-0"] {
        background-color: #ffffff !important;
        border-color: #E5E5E5 !important;
      }
      /* Input textarea */
      textarea {
        background-color: #F4F4F4 !important;
        color: #1A1A1A !important;
      }
      textarea::placeholder {
        color: #666666 !important;
      }
      /* Buttons - only override dark mode backgrounds, let transparent buttons stay transparent */
      [class*="dark:bg-background-350\\/60"],
      [class*="dark:bg-black"],
      [class*="dark:bg-muted"] {
        background-color: #F4F4F4 !important;
      }
      /* Don't override bg-transparent buttons */
      .bg-transparent {
        background-color: transparent !important;
      }
      /* Override button dark mode backgrounds */
      .dark\\:bg-background-350\\/60,
      [class*="dark:bg-background"] {
        background-color: #F4F4F4 !important;
      }
      /* Override dark mode borders (before:border-black/8) */
      .dark\\:border-black\\/8,
      [class*="dark:border-black"] {
        border-color: #E5E5E5 !important;
      }
      /* Keep transparent borders */
      .after\\:border-transparent,
      [class*="border-transparent"] {
        border-color: transparent !important;
      }
      /* Override dark mode fill colors */
      .dark\\:fill-white,
      [class*="dark:fill"] {
        fill: #1A1A1A !important;
      }
      /* Links */
      a {
        color: #1a73e8 !important;
      }
      /* Override dark mode accent colors */
      .dark\\:text-accent-600,
      [class*="dark:text-accent"] {
        color: #1a73e8 !important;
      }
      /* Code blocks */
      pre, code, [class*="code"] {
        background-color: #f5f5f5 !important;
        color: #1A1A1A !important;
        border-color: #E5E5E5 !important;
      }
      /* Tables - override dark mode background */
      .dark\\:bg-black\\/25,
      [class*="dark:bg-black"] {
        background-color: #ffffff !important;
      }
      table, td, th {
        background-color: #ffffff !important;
        border-color: #E5E5E5 !important;
        color: #1A1A1A !important;
      }
      /* Override dark mode table borders */
      .dark\\:border-stroke-450,
      [class*="dark:border-stroke"] {
        border-color: #E5E5E5 !important;
      }
      /* Force borders to be visible */
      [class*="border"], hr {
        border-color: #E5E5E5 !important;
      }
      /* Foreground colors */
      .text-foreground-800, [class*="text-foreground"] {
        color: #1A1A1A !important;
      }
      /* Override dark mode foreground text */
      .dark\\:fill-white,
      [class*="dark:text-foreground"] {
        color: #1A1A1A !important;
      }
      /* Override dark mode background opacity classes */
      [class*="dark:bg-background-100"],
      [class*="dark:bg-background-150"],
      [class*="dark:bg-background-200"],
      [class*="dark:bg-background-250"],
      [class*="dark:bg-background-350"],
      [class*="dark:bg-background-800"],
      [class*="dark:bg-background-850"],
      [class*="dark:bg-muted-200"],
      [class*="dark:bg-muted-400"],
      [class*="dark:bg-muted-450"] {
        background-color: #F4F4F4 !important;
      }
      /* Override light mode background classes to pure white/gray */
      .bg-background-100,
      .bg-background-150,
      .bg-background-200,
      .bg-background-250,
      [class*="bg-background-1"],
      [class*="bg-background-2"] {
        background-color: #ffffff !important;
      }
      .bg-background-350,
      .bg-background-800,
      .bg-background-850,
      .bg-accent-100,
      .bg-accent-250,
      [class*="bg-accent-1"],
      [class*="bg-accent-2"] {
        background-color: #F4F4F4 !important;
      }
      /* Citation pills - override dark mode */
      .dark\\:bg-white\\/5,
      [class*="dark:bg-white/5"],
      [class*="hover\\:dark\\:bg-accent-250"],
      [class*="focus\\:dark\\:bg-accent-250"] {
        background-color: #F4F4F4 !important;
      }
      /* Citation pills text color */
      .text-foreground-750,
      [class*="text-foreground-750"],
      [class*="dark\\:text-foreground-750"] {
        color: #1A1A1A !important;
      }
      /* Override bg-white/X with dark:bg-background-X pattern */
      .bg-white\\/40,
      .bg-white\\/25,
      .bg-white\\/50,
      .bg-white\\/70,
      .bg-white\\/90,
      [class*="bg-white\\/"] {
        background-color: #ffffff !important;
      }
      /* Pseudo-element overrides - before: gradients */
      [class*="before:from-sidebar-dark"],
      [class*="before:to-sidebar-dark"],
      [class*="dark\\:before:from-sidebar"],
      [class*="dark\\:before:to-sidebar"] {
        background: linear-gradient(transparent, #ffffff) !important;
      }
      /* Override all before: opacity and gradient classes */
      [class*="before:opacity"],
      [class*="before:bg-gradient"],
      [class*="before:from-transparent"],
      [class*="before:to-"] {
        background: linear-gradient(transparent, rgba(255, 255, 255, 0.9)) !important;
      }
      /* Force all before: pseudo-elements to have white/light gradients */
      .before\\:opacity-90\\:before,
      [class*="before:opacity-90"]::before {
        background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.9)) !important;
      }
      /* Pseudo-element overrides - before: borders */
      [class*="before:border-black"],
      [class*="dark\\:before:border-black"] {
        border-color: #E5E5E5 !important;
      }
      /* Pseudo-element overrides - after: borders */
      [class*="after:border-white"],
      [class*="dark\\:after:border-white"] {
        border-color: #E5E5E5 !important;
      }
      /* Pseudo-element overrides - hover states */
      [class*="dark\\:safe-hover:bg-white"],
      [class*="dark\\:active:bg-white"],
      [class*="dark\\:safe-hover\\:before:bg-white"] {
        background-color: #F4F4F4 !important;
      }
      /* Pseudo-element overrides - after:hover */
      [class*="dark\\:after\\:hover:bg-white"],
      [class*="max-md\\:dark\\:after\\:hover"] {
        background-color: rgba(244, 244, 244, 0.5) !important;
      }
      /* Override dark mode marker colors */
      [class*="dark\\:marker:text-foreground"] {
        color: #1A1A1A !important;
      }
      /* Force all before/after pseudo-elements to light colors */
      ::before,
      ::after {
        background-color: transparent !important;
        border-color: #E5E5E5 !important;
      }
      /* Scroll-to-bottom button outer container - force transparent */
      [class*="inset-x-0"][class*="bottom-["],
      .pointer-events-none.absolute.flex.justify-center {
        background-color: transparent !important;
        background: transparent !important;
      }
      [data-testid="scroll-to-bottom-button"] {
        background-color: transparent !important;
      }
    `
      : `
      /* No color inversion - keep default dark theme */
    `;

    finalHtml = this.injectStyles(finalHtml, {
      baseUrl: this.baseUrl,
      customCSS: colorInversionStyles,
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
        colorsInverted: options?.invertColors || false,
      },
    };
  }
}