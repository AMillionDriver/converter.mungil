export interface WasmModule {
  module: WebAssembly.Module;
  instance: WebAssembly.Instance;
  exports: Record<string, unknown>;
  loadedAt: number;
}

export interface WasmLoaderConfig {
  streaming?: boolean;
  verifyChecksum?: boolean;
  /** Maximum number of cached modules */
  maxCache?: number;
}

const DEFAULT_CONFIG: WasmLoaderConfig = {
  streaming: true,
  verifyChecksum: false,
  maxCache: 8,
};

const _modules = new Map<string, WasmModule>();
const _pending = new Map<string, Promise<WasmModule>>();

function moduleKey(
  url: string,
  importObject: WebAssembly.Imports = {}
): string {
  return `${url}::${JSON.stringify(importObject)}`;
}

export class WasmLoader {
  static config: WasmLoaderConfig = { ...DEFAULT_CONFIG };

  /**
   * Load a WASM module from URL with optional caching.
   * Returns a { module, instance, exports } object.
   * Calls onProgress(0..100) during streaming if available.
   */
  static async load(
    url: string,
    importObject: WebAssembly.Imports = {},
    onProgress?: (pct: number) => void
  ): Promise<WasmModule> {
    const key = moduleKey(url, importObject);

    // Return cached
    if (_modules.has(key)) {
      const cached = _modules.get(key)!;
      return { ...cached, loadedAt: Date.now() };
    }

    // Deduplicate in-flight requests
    if (_pending.has(key)) return _pending.get(key)!;

    const promise = this.#loadInternal(url, importObject, onProgress);
    _pending.set(key, promise);

    try {
      const result = await promise;
      _modules.set(key, result);

      // Evict oldest if over limit
      if (_modules.size > this.config.maxCache!) {
        const oldestKey = _modules.keys().next().value;
        if (oldestKey) _modules.delete(oldestKey);
      }

      return result;
    } finally {
      _pending.delete(key);
    }
  }

  /** Synchronous access to cached module (null if not loaded) */
  static getCached(key: string): WasmModule | undefined {
    return _modules.get(key);
  }

  /** Evict a specific module from cache */
  static evict(url: string, importObject: WebAssembly.Imports = {}): void {
    _modules.delete(moduleKey(url, importObject));
  }

  /** Clear all cached modules */
  static clearCache(): void {
    _modules.clear();
  }

  /** Total cached modules count */
  static get cacheSize(): number {
    return _modules.size;
  }

  // --- internal ---

  static async #loadInternal(
    url: string,
    importObject: WebAssembly.Imports,
    onProgress?: (pct: number) => void
  ): Promise<WasmModule> {
    onProgress?.(0);

    if (this.config.streaming) {
      return this.#stream(url, importObject, onProgress);
    }
    return this.#fetchCompile(url, importObject, onProgress);
  }

  static async #stream(
    url: string,
    importObject: WebAssembly.Imports,
    onProgress?: (pct: number) => void
  ): Promise<WasmModule> {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        `WASM fetch failed: ${response.status} ${response.statusText}`
      );

    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('ReadableStream not available');

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    try {
      // eslint-disable-next-line no-constant-condition -- ReadableStream loop until done
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0)
          onProgress?.(Math.min(40, Math.floor((loaded / total) * 40)));
      }
    } catch {
      // Stream may be interrupted — fall back to fetch
      return this.#fetchCompile(url, importObject, onProgress);
    }

    const buffer = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    onProgress?.(50);
    const module = await WebAssembly.compile(buffer);
    onProgress?.(80);

    const instance = await WebAssembly.instantiate(module, importObject);
    onProgress?.(100);

    return {
      module,
      instance,
      exports: instance.exports as unknown as Record<string, unknown>,
      loadedAt: Date.now(),
    };
  }

  static async #fetchCompile(
    url: string,
    importObject: WebAssembly.Imports,
    onProgress?: (pct: number) => void
  ): Promise<WasmModule> {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        `WASM fetch failed: ${response.status} ${response.statusText}`
      );

    onProgress?.(10);
    const buffer = await response.arrayBuffer();
    onProgress?.(40);

    const module = await WebAssembly.compile(buffer);
    onProgress?.(70);

    const instance = await WebAssembly.instantiate(module, importObject);
    onProgress?.(100);

    return {
      module,
      instance,
      exports: instance.exports as unknown as Record<string, unknown>,
      loadedAt: Date.now(),
    };
  }
}

// Export a convenience function that calls an exported WASM function
export async function callWasm<T = unknown>(
  url: string,
  funcName: string,
  args: unknown[] = [],
  importObject?: WebAssembly.Imports,
  onProgress?: (pct: number) => void
): Promise<T> {
  const { instance } = await WasmLoader.load(
    url,
    importObject ?? {},
    onProgress
  );
  const fn = instance.exports[funcName];
  if (typeof fn !== 'function') {
    throw new Error(`WASM export "${funcName}" not found`);
  }
  return fn(...args) as Promise<T>;
}
