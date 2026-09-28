import { type ConversionEngine } from '../lib/engine-types';

// Lazy-load jsquash to avoid initial bundle bloat.
// jsquash uses a single `convert` entry that auto-resolves codecs.
let _jsquash: typeof import('jsquash');

async function getJsquash() {
  if (!_jsquash) {
    _jsquash = await import('jsquash');
  }
  return _jsquash;
}

/**
 * Factory: create an image conversion engine for a given input/output pair.
 * jsquash's single `convert()` handles PNG/JPEG/WebP/BMP under the hood
 * via modular codecs — no per-format WASM needed in JS land.
 */
export function createImageEngine(
  inputFormat: string,
  outputFormat: string
): ConversionEngine {
  return {
    id: `image:${inputFormat}:${outputFormat}`,
    async load(): Promise<void> {
      // Pre-warm the jsquash module cache so first conversion is fast
      await getJsquash();
    },
    async convert(
      file: File,
      options: Record<string, unknown> = {}
    ): Promise<Blob> {
      const jsquash = await getJsquash();
      const quality = (options.quality as number) ?? 80;

      const outputBlob = await jsquash.convert(file, {
        type: outputFormat,
        quality,
        // jsquash passes through extra options to the underlying codec
        ...options,
      });

      return outputBlob;
    },
  };
}

// Default export — used when worker references `imageWebPEngine` directly
export const imageWebPEngine: ConversionEngine = createImageEngine('png', 'webp');
export default imageWebPEngine;