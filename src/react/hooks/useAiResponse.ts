import { useState, useEffect, useMemo } from 'react';
import { parseAiResponse, detectProvider, ParsedResponse, ParseOptions, AIProvider } from '../../index';

export interface UseAiResponseOptions extends ParseOptions {
  autoDetect?: boolean;
  provider?: AIProvider;
  onProviderDetected?: (provider: AIProvider | null) => void;
  onError?: (error: Error) => void;
}

export interface UseAiResponseReturn {
  parsed: ParsedResponse | null;
  provider: AIProvider | null;
  isLoading: boolean;
  error: Error | null;
  html: string | null;
  text: string | null;
  sources: any[] | null;
  reparse: (options?: Partial<UseAiResponseOptions>) => void;
}

export function useAiResponse(
  response: any,
  options: UseAiResponseOptions = {}
): UseAiResponseReturn {
  const {
    autoDetect = true,
    provider: explicitProvider,
    theme = 'dark',
    baseUrl,
    sanitize = true,
    includeStyles = true,
    onProviderDetected,
    onError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [parsed, setParsed] = useState<ParsedResponse | null>(null);
  const [trigger, setTrigger] = useState(0);

  const detectedProvider = useMemo(() => {
    if (explicitProvider) return explicitProvider;
    if (autoDetect && response) return detectProvider(response);
    return null;
  }, [response, explicitProvider, autoDetect, trigger]);

  useEffect(() => {
    onProviderDetected?.(detectedProvider);
  }, [detectedProvider, onProviderDetected]);

  useEffect(() => {
    if (!response) {
      setParsed(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parseOptions: ParseOptions = {
        theme,
        baseUrl,
        sanitize,
        includeStyles,
      };

      let result: ParsedResponse | null;

      if (explicitProvider) {
        result = parseAiResponse(response, parseOptions);
      } else {
        result = parseAiResponse(response, parseOptions);
      }

      setParsed(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to parse AI response');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [response, theme, baseUrl, sanitize, includeStyles, explicitProvider, trigger]);

  const reparse = (newOptions?: Partial<UseAiResponseOptions>) => {
    // Force re-parse with new options
    setTrigger((prev) => prev + 1);
  };

  return {
    parsed,
    provider: parsed?.provider || detectedProvider,
    isLoading,
    error,
    html: parsed?.html || null,
    text: parsed?.text || null,
    sources: parsed?.sources || null,
    reparse,
  };
}