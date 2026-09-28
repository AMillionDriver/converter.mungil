export interface EngineCapability {
  maxFileSizeMB: number;
  minBrowserVersion: string;
  requiresHardwareAcceleration: boolean;
  recommendedRamMB: number;
}

export interface EngineMetadata extends EngineCapability {
  id: string;
  version: string;
  type: 'wasm' | 'js';
  size: number;
  script: string;
  wasm?: string;
  checksum: string;
}

export type EngineRegistry = Record<string, EngineMetadata>;

export type EngineFamily = 'image' | 'video' | 'document' | 'archive';

export interface ConversionOptions {
  // generic conversion options
  [key: string]: unknown;
}

export interface ConversionEngine {
  id: string;
  load(): Promise<void>;
  convert(file: File, options?: ConversionOptions): Promise<Blob>;
}
