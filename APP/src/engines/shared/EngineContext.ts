import { WasmLoader, type WasmModule, type WasmLoaderConfig } from './wasm-loader';
import { BlobUtils } from './blob-utils';
import { EngineLogger, type LogEntry } from './EngineLogger';

export interface EngineConfig {
  name: string;
  version: string;
  capabilities: string[];
}

export class EngineContext {
  static readonly GLOBAL_CONFIG: EngineConfig = {
    name: 'Flowy Engine Core',
    version: '1.0.0',
    capabilities: ['wasm', 'web-worker', 'shared-array-buffer'],
  };

  /**
   * Dependency injection for shared utilities.
   * Keys: 'wasm-loader' → WasmLoader class
   *        'blob-utils' → BlobUtils class
   *        'engine-logger' → EngineLogger class
   */
  static getUtility<T>(key: string): T | null {
    switch (key) {
      case 'wasm-loader':
        // @ts-expect-error — caller specifies T
        return WasmLoader;
      case 'blob-utils':
        // @ts-expect-error — caller specifies T
        return BlobUtils;
      case 'engine-logger':
        // @ts-expect-error — caller specifies T
        return EngineLogger;
      default:
        console.warn(`[EngineContext] Unknown utility key: ${key}`);
        return null;
    }
  }
}

// Re-export for convenience (avoid deep import paths in engine code)
export { WasmLoader, type WasmModule, type WasmLoaderConfig };
export { BlobUtils };
export { EngineLogger, type LogEntry };
