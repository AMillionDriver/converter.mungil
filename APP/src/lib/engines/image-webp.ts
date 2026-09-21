import type { ConversionEngine, ConversionOptions } from '../engine-types';
import { engineRegistry } from '../engine-registry';
import { EngineLoader } from '../engine-loader';
import { conversionWorker } from '../worker-manager';

export class ImageWebPEngine implements ConversionEngine {
  id = 'image:webp-converter';

  supports(inputFormat: string, outputFormat: string): boolean {
    return (
      (inputFormat === 'png' ||
        inputFormat === 'jpg' ||
        inputFormat === 'jpeg') &&
      outputFormat === 'webp'
    );
  }

  async load(): Promise<void> {
    const metadata = engineRegistry.getRegistry()['image:png:webp']; // Simplified for example
    if (!metadata) throw new Error('Engine metadata not found');

    await EngineLoader.load(this.id, metadata);
  }

  async convert(file: File, options?: ConversionOptions): Promise<Blob> {
    // Ensure engine is loaded
    await this.load();

    // In a real implementation, we would send the file to the worker
    // and the worker would use a WASM library like Squoosh or similar.
    return await conversionWorker.convert(this.id, file, options ?? {});
  }
}

export const imageWebPEngine = new ImageWebPEngine();
