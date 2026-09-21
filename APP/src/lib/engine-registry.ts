export interface EngineMetadata {
  version: string;
  type: 'wasm' | 'js';
  size: number;
  script: string;
  wasm?: string;
  checksum: string;
  capabilities: {
    maxFileSizeMB: number;
    browserMin: string;
  };
}

export interface EngineRegistry {
  [key: string]: EngineMetadata;
}

export class EngineRegistryManager {
  private registry: EngineRegistry = {};

  async fetchRegistry(): Promise<void> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/engines`
      );
      const result = await response.json();
      if (result.success && result.data.engines) {
        this.registry = result.data.engines;
      }
    } catch (error) {
      console.error('Failed to fetch engine registry:', error);
      throw error;
    }
  }

  resolveEngine(
    inputFormat: string,
    outputFormat: string
  ): EngineMetadata | null {
    const key = `${this.getCategory(inputFormat)}:${inputFormat}:${outputFormat}`;
    // Try specific key first, then a more generic one if needed
    return this.registry[key] || null;
  }

  getSupportedOutputFormats(inputFormat: string): string[] {
    const normalizedInput = inputFormat.toLowerCase();
    const outputs = new Set<string>();

    Object.keys(this.registry).forEach((key) => {
      const [, input, output] = key.split(':');
      if (input === normalizedInput) {
        outputs.add(output);
      }
    });

    return Array.from(outputs);
  }

  private getCategory(format: string): string {
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

  getRegistry() {
    return { ...this.registry };
  }
}

export const engineRegistry = new EngineRegistryManager();
