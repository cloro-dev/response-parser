export type AIProvider =
  | 'CHATGPT'
  | 'GEMINI'
  | 'PERPLEXITY'
  | 'COPILOT'
  | 'AIOVERVIEW'
  | 'AIMODE';

export interface ParsedResponse {
  provider: AIProvider;
  html: string;
  text?: string;
  sources?: any[];
  metadata?: Record<string, any>;
}

export interface ParseOptions {
  theme?: 'light' | 'dark';
  baseUrl?: string;
  sanitize?: boolean;
  includeStyles?: boolean;
}

export interface ProviderConfig {
  name: AIProvider;
  baseUrl: string;
  defaultStyles: string;
}

export interface DetectedProvider {
  provider: AIProvider;
  confidence: number;
}

export interface StyleOptions {
  theme?: 'light' | 'dark';
  customCSS?: string;
  hideUI?: boolean;
  baseUrl?: string;
}

export type ContentExtraction = {
  html?: string;
  text?: string;
  sources?: any[];
};