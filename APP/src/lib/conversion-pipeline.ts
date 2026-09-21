import { type ConversionEngine } from './engine-types';
import { engineRegistry } from './engine-registry';
import { imageWebPEngine } from './engines/image-webp';

export class ConversionPipeline {
  private static engines: Map<string, ConversionEngine> = new Map();

  static async resolveAndLoad(
    inputFormat: string,
    outputFormat: string
  ): Promise<ConversionEngine> {
    const category = this.getCategory(inputFormat);
    const engineId = `${category}:${inputFormat}:${outputFormat}`;

    const metadata = engineRegistry.getRegistry()[engineId];
    if (!metadata) {
      throw new Error(
        `No engine found for conversion from ${inputFormat} to ${outputFormat}`
      );
    }

    // Check if we already have an instance of this engine
    if (this.engines.has(engineId)) {
      return this.engines.get(engineId)!;
    }

    // Dynamic instantiation via factory
    const engine = this.createEngineInstance(engineId);
    await engine.load();

    this.engines.set(engineId, engine);
    return engine;
  }

  private static createEngineInstance(engineId: string): ConversionEngine {
    // Factory for engines
    switch (engineId) {
      case 'image:png:webp':
      case 'image:jpg:webp':
      case 'image:jpeg:webp':
        return imageWebPEngine;
      default:
        throw new Error(`Engine implementation not found for ${engineId}`);
    }
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
