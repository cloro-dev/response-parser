import React, { forwardRef } from 'react';

export interface IframeRendererProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
  sandbox?: string;
  title?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const IframeRenderer = forwardRef<HTMLIFrameElement, IframeRendererProps>(
  (
    {
      html,
      className = '',
      style,
      sandbox = 'allow-popups allow-same-origin',
      title = 'AI Response',
      onLoad,
      onError,
    },
    ref
  ) => {
    const handleLoad = () => {
      onLoad?.();
    };

    const handleError = () => {
      onError?.();
    };

    // Check if HTML is a URL
    if (html.trim().startsWith('http')) {
      return (
        <iframe
          ref={ref}
          src={html}
          className={className}
          style={style}
          sandbox={sandbox}
          title={title}
          onLoad={handleLoad}
          onError={handleError}
        />
      );
    }

    // Render HTML content directly
    return (
      <iframe
        ref={ref}
        srcDoc={html}
        className={className}
        style={style}
        sandbox={sandbox}
        title={title}
        onLoad={handleLoad}
        onError={handleError}
      />
    );
  }
);

IframeRenderer.displayName = 'IframeRenderer';