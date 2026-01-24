export type AIProvider =
  | 'CHATGPT'
  | 'GEMINI'
  | 'PERPLEXITY'
  | 'COPILOT'
  | 'AIOVERVIEW'
  | 'AIMODE'
  | 'GROK';

export interface ParsedResponse {
  provider: AIProvider;
  html: string;
  text?: string;
  sources?: any[];
  metadata?: Record<string, any>;
}

export interface ParseOptions {
  removeLinks?: boolean;
  removeHeader?: boolean;
  removeFooter?: boolean;
  removeSidebar?: boolean;
}

export interface ProviderConfig {
  name: AIProvider;
  baseUrl: string;
}

export interface DetectedProvider {
  provider: AIProvider;
  confidence: number;
}

export interface StyleOptions {
  customCSS?: string;
  hideUI?: boolean;
  baseUrl?: string;
}

export type ContentExtraction = {
  html?: string;
  text?: string;
  sources?: any[];
};

/**
 * Standardized metadata for provider responses
 */
export interface ProviderMetadata {
  isFullDocument?: boolean;
  headerRemoved?: boolean;
  footerRemoved?: boolean;
  sidebarRemoved?: boolean;
  linksRemoved?: boolean;
  cookieBannerRemoved?: boolean;
  detectionConfidence?: number;
}

/**
 * Common content extraction utility - shared across providers and parser
 */
export function extractContentCommon(response: any): ContentExtraction {
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