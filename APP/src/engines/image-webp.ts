import type { ConversionEngine } from '../lib/engine-types';
import { ImageEngine } from './image/image.worker';

/**
 * Factory: create an image conversion engine for a given input/output pair.
 */
export function createImageEngine(
  inputFormat: string,
  outputFormat: string
): ConversionEngine {
  return {
    id: `image:${inputFormat}:${outputFormat}`,
    async load(): Promise<void> {
      // Pre-warm if needed
    },
    async convert(
      file: File,
      options: Record<string, unknown> = {}
    ): Promise<Blob> {
      const targetMime = `image/${outputFormat}` as
        'image/webp' | 'image/jpeg' | 'image/png';
      const result = await ImageEngine.convert(file, targetMime, options);
      return result.blob;
    },
  };
}

// Default export — used when worker references `imageWebPEngine` directly
export const imageWebPEngine: ConversionEngine = createImageEngine(
  'png',
  'webp'
);
export default imageWebPEngine;
