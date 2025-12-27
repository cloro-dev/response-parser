import { useState, useEffect, useMemo } from 'react';
import { parseAiResponse, detectProvider, ParsedResponse, ParseOptions, AIProvider } from '../../index';

export interface UseResponseOptions extends ParseOptions {
  autoDetect?: boolean;
  provider?: AIProvider;
  onProviderDetected?: (provider: AIProvider | null) => void;
  onError?: (error: Error) => void;
}

export interface UseResponseReturn {
  parsed: ParsedResponse | null;
  provider: AIProvider | null;
  isLoading: boolean;
  error: Error | null;
  html: string | null;
  text: string | null;
  sources: any[] | null;
  reparse: (options?: Partial<UseResponseOptions>) => void;
}

export function useResponse(
  response: any,
  options: UseResponseOptions = {}
): UseResponseReturn {
  const {
    autoDetect = true,
    provider: explicitProvider,
    removeLinks = false,
    invertColors = false,
    removeNavbar = false,
    removeFollowup = false,
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
        removeLinks,
        invertColors,
        removeNavbar,
        removeFollowup,
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
  }, [response, removeLinks, invertColors, removeNavbar, removeFollowup, explicitProvider, trigger]);

  const reparse = (newOptions?: Partial<UseResponseOptions>) => {
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