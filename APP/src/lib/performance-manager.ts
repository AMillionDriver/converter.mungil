export interface DeviceCapabilities {
  ramGB: number;
  isLowEnd: boolean;
  hasHardwareAcceleration: boolean;
  browser: string;
}

export class PerformanceManager {
  static async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    console.log('[Performance] Detecting device capabilities...');

    // Use navigator.deviceMemory (Chrome/Edge)
    const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4; // Default to 4GB if not available
    const isLowEnd = memory < 4;

    // Check for hardware acceleration (via Canvas/WebGL)
    const hasAcceleration = this.checkHardwareAcceleration();

    return {
      ramGB: memory,
      isLowEnd,
      hasHardwareAcceleration: hasAcceleration,
      browser: navigator.userAgent,
    };
  }

  private static checkHardwareAcceleration(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  static shouldFallbackToBackend(
    engineRequirement: number, // recommendedRamMB
    currentCapabilities: DeviceCapabilities
  ): boolean {
    const currentRamMB = currentCapabilities.ramGB * 1024;
    return currentRamMB < engineRequirement;
  }
}
