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