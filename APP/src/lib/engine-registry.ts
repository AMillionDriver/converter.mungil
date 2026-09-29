import type { EngineMetadata, EngineRegistry } from './engine-types';

export class EngineRegistryManager {
  private registry: EngineRegistry = {};

  // Built-in manifest fallback — uses jsquash codecs already bundled
  // in node_modules. This allows Phase 1 to function without backend.
  private static readonly BUILTIN_REGISTRY: EngineRegistry = {
    // → WebP encoders
    'image:png:webp': {
      id: 'image:png:webp',
      version: '1.0.0',
      type: 'wasm',
      size: 893000, // @jsquash/webp actual size
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:jpg:webp': {
      id: 'image:jpg:webp',
      version: '1.0.0',
      type: 'wasm',
      size: 893000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:jpeg:webp': {
      id: 'image:jpeg:webp',
      version: '1.0.0',
      type: 'wasm',
      size: 893000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    // → PNG encoders
    'image:webp:png': {
      id: 'image:webp:png',
      version: '1.0.0',
      type: 'wasm',
      size: 216000, // @jsquash/png
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:jpg:png': {
      id: 'image:jpg:png',
      version: '1.0.0',
      type: 'wasm',
      size: 216000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:jpeg:png': {
      id: 'image:jpeg:png',
      version: '1.0.0',
      type: 'wasm',
      size: 216000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    // → JPEG encoders
    'image:png:jpeg': {
      id: 'image:png:jpeg',
      version: '1.0.0',
      type: 'wasm',
      size: 518000, // @jsquash/jpeg
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:webp:jpeg': {
      id: 'image:webp:jpeg',
      version: '1.0.0',
      type: 'wasm',
      size: 518000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:jpg:jpeg': {
      id: 'image:jpg:jpeg',
      version: '1.0.0',
      type: 'wasm',
      size: 518000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:jpeg:jpg': {
      id: 'image:jpeg:jpg',
      version: '1.0.0',
      type: 'wasm',
      size: 518000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    // → PDF encoders (via pdf-lib)
    'image:png:pdf': {
      id: 'image:png:pdf',
      version: '1.0.0',
      type: 'js',
      size: 550000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:jpg:pdf': {
      id: 'image:jpg:pdf',
      version: '1.0.0',
      type: 'js',
      size: 550000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:jpeg:pdf': {
      id: 'image:jpeg:pdf',
      version: '1.0.0',
      type: 'js',
      size: 550000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:webp:pdf': {
      id: 'image:webp:pdf',
      version: '1.0.0',
      type: 'js',
      size: 550000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    // → ICO encoders
    'image:png:ico': {
      id: 'image:png:ico',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    'image:jpg:ico': {
      id: 'image:jpg:ico',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    'image:jpeg:ico': {
      id: 'image:jpeg:ico',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    'image:webp:ico': {
      id: 'image:webp:ico',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    'image:bmp:ico': {
      id: 'image:bmp:ico',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    // → BMP encoders
    'image:png:bmp': {
      id: 'image:png:bmp',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    'image:jpg:bmp': {
      id: 'image:jpg:bmp',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    'image:jpeg:bmp': {
      id: 'image:jpeg:bmp',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    'image:webp:bmp': {
      id: 'image:webp:bmp',
      version: '1.0.0',
      type: 'js',
      size: 50000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 50,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 256,
    },
    // BMP inputs
    'image:bmp:webp': {
      id: 'image:bmp:webp',
      version: '1.0.0',
      type: 'wasm',
      size: 893000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:bmp:png': {
      id: 'image:bmp:png',
      version: '1.0.0',
      type: 'wasm',
      size: 216000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:bmp:jpeg': {
      id: 'image:bmp:jpeg',
      version: '1.0.0',
      type: 'wasm',
      size: 518000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:bmp:pdf': {
      id: 'image:bmp:pdf',
      version: '1.0.0',
      type: 'js',
      size: 550000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    // GIF inputs
    'image:gif:webp': {
      id: 'image:gif:webp',
      version: '1.0.0',
      type: 'wasm',
      size: 893000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:gif:png': {
      id: 'image:gif:png',
      version: '1.0.0',
      type: 'wasm',
      size: 216000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:gif:jpeg': {
      id: 'image:gif:jpeg',
      version: '1.0.0',
      type: 'wasm',
      size: 518000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
    'image:gif:pdf': {
      id: 'image:gif:pdf',
      version: '1.0.0',
      type: 'js',
      size: 550000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    },
  };

  async fetchRegistry(): Promise<void> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/engines`
      );
      const result = await response.json();
      if (result.success && result.data.engines) {
        // Merge backend manifest with built-in (backend can override/augment)
        this.registry = {
          ...EngineRegistryManager.BUILTIN_REGISTRY,
          ...result.data.engines,
        };
      } else {
        this.registry = { ...EngineRegistryManager.BUILTIN_REGISTRY };
      }
    } catch {
      console.warn(
        '[EngineRegistry] Backend unreachable, using built-in registry only.'
      );
      this.registry = { ...EngineRegistryManager.BUILTIN_REGISTRY };
    }
  }

  resolveEngine(
    inputFormat: string,
    outputFormat: string
  ): EngineMetadata | null {
    const key = `${this.getCategory(inputFormat)}:${inputFormat}:${outputFormat}`;
    if (this.registry[key]) return this.registry[key];

    // Fallback: try without category prefix
    const shortKey = `${inputFormat}:${outputFormat}`;
    return this.registry[shortKey] || null;
  }

  getSupportedOutputFormats(inputFormat: string): string[] {
    const normalizedInput = inputFormat.toLowerCase();
    const outputs = new Set<string>();

    Object.keys(this.registry).forEach((key) => {
      const parts = key.split(':');
      const input = parts[1];
      const output = parts[2];
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
      bmp: 'image',
      gif: 'image',
      ico: 'image',
      pdf: 'document',
      docx: 'document',
      mp4: 'video',
      webm: 'video',
    };
    return categories[format.toLowerCase()] || 'unknown';
  }

  getRegistry(): EngineRegistry {
    return { ...this.registry };
  }
}

export const engineRegistry = new EngineRegistryManager();
