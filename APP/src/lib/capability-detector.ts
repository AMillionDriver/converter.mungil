export interface DeviceCapabilityMatrix {
  wasm: boolean;
  sab: boolean; // SharedArrayBuffer
  worker: boolean;
  cache: boolean;
  indexedDB: boolean;
  memory: number; // GB
  cores: number;
  isMobile: boolean;
  tier: 'low' | 'medium' | 'high';
}

export class CapabilityDetector {
  static async detect(): Promise<DeviceCapabilityMatrix> {
    console.log('[CapabilityDetector] Scanning device capabilities...');

    const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 2;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const matrix: DeviceCapabilityMatrix = {
      wasm: typeof WebAssembly === 'object',
      sab: typeof SharedArrayBuffer !== 'undefined',
      worker: typeof Worker !== 'undefined',
      cache: 'caches' in window,
      indexedDB: 'indexedDB' in window,
      memory,
      cores,
      isMobile,
      tier: this.determineTier(memory, cores),
    };

    return matrix;
  }

  private static determineTier(
    memory: number,
    cores: number
  ): 'low' | 'medium' | 'high' {
    if (memory < 4 || cores < 4) return 'low';
    if (memory < 8 || cores < 8) return 'medium';
    return 'high';
  }

  static canHandleLocal(
    engineRequirementMB: number,
    matrix: DeviceCapabilityMatrix
  ): boolean {
    const availableMB = matrix.memory * 1024;
    // Reserve 50% for OS/Browser, use 50% for engine
    return availableMB * 0.5 > engineRequirementMB;
  }
}
