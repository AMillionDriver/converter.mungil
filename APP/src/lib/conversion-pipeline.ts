import type { ConversionEngine } from './engine-types';
import { engineRegistry } from './engine-registry';
import { EngineLoader } from './engine-loader';

export interface EngineModule {
  runConversion: (
    file: File,
    options?: Record<string, unknown>,
    onProgress?: (p: number) => void
  ) => Promise<Blob>;
}

// Engine factory — maps engineId to its implementation module
// Lazy-loaded via dynamic import in the worker thread
const engineMap: Record<string, () => Promise<EngineModule>> = {
  // Image → WebP
  'image:png:webp': () => import('./engines/image-webp'),
  'image:jpg:webp': () => import('./engines/image-webp'),
  'image:jpeg:webp': () => import('./engines/image-webp'),
  // WebP → PNG, JPG/JPEG → PNG
  'image:webp:png': () => import('./engines/image-png'),
  'image:jpg:png': () => import('./engines/image-png'),
  'image:jpeg:png': () => import('./engines/image-png'),
  // PNG/JPEG → JPEG/JPG
  'image:png:jpeg': () => import('./engines/image-jpeg'),
  'image:webp:jpeg': () => import('./engines/image-jpeg'),
  'image:jpg:jpeg': () => import('./engines/image-jpeg'),
  'image:jpeg:jpg': () => import('./engines/image-jpeg'),
  // Image → PDF
  'image:png:pdf': () => import('./engines/image-pdf'),
  'image:jpg:pdf': () => import('./engines/image-pdf'),
  'image:jpeg:pdf': () => import('./engines/image-pdf'),
  'image:webp:pdf': () => import('./engines/image-pdf'),
  'image:bmp:pdf': () => import('./engines/image-pdf'),
  'image:gif:pdf': () => import('./engines/image-pdf'),
  // Image → ICO
  'image:png:ico': () => import('./engines/image-ico'),
  'image:jpg:ico': () => import('./engines/image-ico'),
  'image:jpeg:ico': () => import('./engines/image-ico'),
  'image:webp:ico': () => import('./engines/image-ico'),
  'image:bmp:ico': () => import('./engines/image-ico'),
  // Image → BMP
  'image:png:bmp': () => import('./engines/image-bmp'),
  'image:jpg:bmp': () => import('./engines/image-bmp'),
  'image:jpeg:bmp': () => import('./engines/image-bmp'),
  'image:webp:bmp': () => import('./engines/image-bmp'),
  // BMP Input → outputs
  'image:bmp:webp': () => import('./engines/image-webp'),
  'image:bmp:png': () => import('./engines/image-png'),
  'image:bmp:jpeg': () => import('./engines/image-jpeg'),
  // GIF Input → outputs
  'image:gif:webp': () => import('./engines/image-webp'),
  'image:gif:png': () => import('./engines/image-png'),
  'image:gif:jpeg': () => import('./engines/image-jpeg'),
};

export class ConversionPipeline {
  private static engines: Map<string, ConversionEngine> = new Map();

  static async resolveAndLoad(
    inputFormat: string,
    outputFormat: string
  ): Promise<ConversionEngine> {
    const category = this.getCategory(inputFormat);
    const engineId = `${category}:${inputFormat}:${outputFormat}`;

    const metadata = engineRegistry.resolveEngine(inputFormat, outputFormat);
    if (!metadata) {
      throw new Error(
        `No engine found for conversion from ${inputFormat} to ${outputFormat}`
      );
    }

    // If engine instance cached, return it
    if (this.engines.has(engineId)) {
      return this.engines.get(engineId)!;
    }

    // Create lightweight engine wrapper
    const engine: ConversionEngine = {
      id: engineId,
      load: async () => {
        await EngineLoader.load(engineId, metadata);
      },
      convert: async (file: File, options?: Record<string, unknown>) => {
        // Delegate to the engine module's runConversion
        const module = await engineMap[engineId]();
        return module.runConversion(file, options);
      },
    };

    await engine.load();
    this.engines.set(engineId, engine);
    return engine;
  }

  /**
   * Returns a direct conversion function for a given engineId.
   * Used by the worker for dynamic dispatch.
   */
  static getConversionFn(
    engineId: string
  ):
    | ((
        file: File,
        options: Record<string, unknown>,
        onProgress?: (p: number) => void
      ) => Promise<Blob>)
    | null {
    const loader = engineMap[engineId];
    if (!loader) return null;
    return async (file, options, onProgress) => {
      const mod = await loader();
      return mod.runConversion(file, options, onProgress);
    };
  }

  static getSupportedEngineIds(): string[] {
    return Object.keys(engineMap);
  }

  private static getCategory(format: string): string {
    const categories: Record<string, string> = {
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      webp: 'image',
      pdf: 'document',
      docx: 'document',
      mp4: 'video',
      webm: 'video',
    };
    return categories[format.toLowerCase()] || 'unknown';
  }
}
