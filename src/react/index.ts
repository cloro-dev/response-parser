// React components
export {
  ResponseRenderer,
  IframeRenderer,
} from "./components/ResponseRenderer";
export type { ResponseRendererProps } from "./components/ResponseRenderer";
export type { IframeRendererProps } from "./components/IframeRenderer";

// React hooks
export { useResponse } from "./hooks/useResponse";
export type {
  UseResponseOptions,
  UseResponseReturn,
} from "./hooks/useResponse";

// Re-export core types for convenience
export type {
  AIProvider,
  ParsedResponse,
  ParseOptions,
  ProviderConfig,
  DetectedProvider,
  StyleOptions,
  ContentExtraction,
} from "../core/types";
