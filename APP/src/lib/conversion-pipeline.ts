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
  'image:bmp:jpg': () => import('./engines/image-jpeg'),
  // ICO Input → outputs
  'image:ico:png': () => import('./engines/image-png'),
  'image:ico:webp': () => import('./engines/image-webp'),
  'image:ico:jpeg': () => import('./engines/image-jpeg'),
  'image:ico:jpg': () => import('./engines/image-jpeg'),
  // GIF Input → outputs
  'image:gif:webp': () => import('./engines/image-webp'),
  'image:gif:png': () => import('./engines/image-png'),
  'image:gif:jpeg': () => import('./engines/image-jpeg'),
  // Same-format Re-encoding / Compression routes
  'image:jpeg:jpeg': () => import('./engines/image-jpeg'),
  'image:jpg:jpg': () => import('./engines/image-jpeg'),
  'image:png:png': () => import('./engines/image-png'),
  'image:webp:webp': () => import('./engines/image-webp'),
  'image:bmp:bmp': () => import('./engines/image-bmp'),
  'image:ico:ico': () => import('./engines/image-ico'),
  // Document & Data conversions
  'document:txt:pdf': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.txtToPdfEngine.runConversion,
    })),
  'document:pdf:txt': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.pdfToTxtEngine.runConversion,
    })),
  'document:pdf:docx': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.pdfToDocxEngine.runConversion,
    })),
  'document:docx:pdf': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.docxToPdfEngine.runConversion,
    })),
  'document:txt:docx': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.txtToDocxEngine.runConversion,
    })),
  'document:docx:txt': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.docxToTxtEngine.runConversion,
    })),
  'document:csv:json': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.csvToJsonEngine.runConversion,
    })),
  'document:json:csv': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.jsonToCsvEngine.runConversion,
    })),
  // Document same-format routes
  'document:pdf:pdf': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.identityEngine.runConversion,
    })),
  'document:docx:docx': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.identityEngine.runConversion,
    })),
  'document:txt:txt': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.identityEngine.runConversion,
    })),
  'document:csv:csv': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.identityEngine.runConversion,
    })),
  'document:json:json': () =>
    import('./engines/document-engines').then((m) => ({
      runConversion: m.identityEngine.runConversion,
    })),
};

export class ConversionPipeline {
  private static engines: Map<string, ConversionEngine> = new Map();

  static async resolveAndLoad(
    inputFormat: string,
    outputFormat: string
  ): Promise<ConversionEngine> {
    const metadata = engineRegistry.resolveEngine(inputFormat, outputFormat);
    if (!metadata) {
      throw new Error(
        `No engine found for conversion from ${inputFormat} to ${outputFormat}`
      );
    }

    const engineId = metadata.id;

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
        const loader = engineMap[engineId];
        if (!loader) {
          throw new Error(
            `Engine implementation module not found for ${engineId}`
          );
        }
        const module = await loader();
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
}
