import type { WasmModule } from './wasm-loader';

/**
 * Helper to determine if SharedArrayBuffer is available
 * (required for multi-threaded WASM via WasmWorkers / Atomics)
 */
export function isSharedArrayBufferSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Wrap a WASM-loaded function call with automatic error mapping
 * and timing instrumentation.
 */
export async function withWasmTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    return { result, durationMs: performance.now() - start };
  } catch (error) {
    throw new WasmEngineError(label, error);
  }
}

export class WasmEngineError extends Error {
  readonly engineId: string;
  readonly cause: unknown;

  constructor(engineId: string, cause: unknown) {
    super(`[${engineId}] WASM engine error`);
    this.name = 'WasmEngineError';
    this.engineId = engineId;
    this.cause = cause;
    // Maintains proper stack trace for where error is thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WasmEngineError);
    }
  }
}

/** Check that a WASM module exports the expected functions */
export function validateWasmExports(
  mod: WasmModule,
  required: string[]
): string[] {
  const missing: string[] = [];
  for (const exp of required) {
    if (typeof mod.exports[exp] !== 'function') {
      missing.push(exp);
    }
  }
  return missing;
}
