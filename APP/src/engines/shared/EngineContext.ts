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

  // Dependency injection for shared utilities
  static getUtility(key: string) {
    console.log(`[EngineContext] Fetching utility: ${key}`);
    // Extension point for adding shared utils like blob-utils or wasm-loader
  }
}
