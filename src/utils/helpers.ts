/**
 * Utility functions for AI response parsing
 */

/**
 * Check if a string is likely HTML
 */
export function isLikelyHtml(str: string): boolean {
  const trimmed = str.trim();
  return (
    trimmed.startsWith('<') &&
    trimmed.includes('>') &&
    (trimmed.includes('</') || trimmed.includes('/>'))
  );
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
  return text.match(urlRegex) || [];
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T = any>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Decode HTML entities
 */
export function decodeHtmlEntities(str: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Generate a unique ID for rendering
 */
export function generateId(): string {
  return `ai-response-${Math.random().toString(36).substr(2, 9)}`;
}