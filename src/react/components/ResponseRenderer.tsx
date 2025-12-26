import React from 'react';
import { useResponse, UseResponseOptions } from '../hooks/useResponse';
import { IframeRenderer, IframeRendererProps } from './IframeRenderer';

export interface ResponseRendererProps extends Omit<UseResponseOptions, 'onError'> {
  response: any;
  className?: string;
  style?: React.CSSProperties;
  iframeProps?: Partial<IframeRendererProps>;
  loadingComponent?: React.ComponentType<{ isLoading: boolean }>;
  errorComponent?: React.ComponentType<{ error: Error | null; retry: () => void }>;
  fallbackComponent?: React.ComponentType<{ provider: string | null }>;
  onRenderComplete?: (html: string) => void;
}

export const ResponseRenderer: React.FC<ResponseRendererProps> = ({
  response,
  className = '',
  style,
  iframeProps = {},
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  fallbackComponent: FallbackComponent,
  onRenderComplete,
  ...options
}) => {
  const {
    parsed,
    provider,
    isLoading,
    error,
    html,
    text,
    sources,
    reparse,
  } = useResponse(response, options);

  // Handle render completion
  React.useEffect(() => {
    if (html && !isLoading && !error) {
      onRenderComplete?.(html);
    }
  }, [html, isLoading, error, onRenderComplete]);

  // Show loading state
  if (isLoading) {
    if (LoadingComponent) {
      return <LoadingComponent isLoading={true} />;
    }
    return (
      <div className={`ai-response-loading ${className}`} style={style}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    if (ErrorComponent) {
      return <ErrorComponent error={error} retry={reparse} />;
    }
    return (
      <div className={`ai-response-error ${className}`} style={style}>
        <div className="text-red-500">
          <p>Failed to render AI response:</p>
          <p className="text-sm">{error.message}</p>
          <button
            onClick={() => reparse()}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show fallback for no content
  if (!parsed && !html && !text) {
    if (FallbackComponent) {
      return <FallbackComponent provider={provider} />;
    }
    return (
      <div className={`ai-response-empty ${className}`} style={style}>
        <div className="text-gray-500 text-center">
          <p>No content available</p>
          {provider && <p className="text-sm">Detected provider: {provider}</p>}
        </div>
      </div>
    );
  }

  // Show only text if no HTML
  if (!html && text) {
    return (
      <div
        className={`ai-response-text ${className}`}
        style={{
          ...style,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {text}
      </div>
    );
  }

  // Render HTML in iframe
  if (html) {
    return (
      <div className={`ai-response-container ${className}`} style={style}>
        <IframeRenderer
          html={html}
          className="w-full h-full border-0 rounded-md"
          title={`${provider || 'AI'} Response`}
          {...iframeProps}
        />
      </div>
    );
  }

  return null;
};

ResponseRenderer.displayName = 'ResponseRenderer';


// Export additional components
export { IframeRenderer } from './IframeRenderer';
export { useResponse } from '../hooks/useResponse';