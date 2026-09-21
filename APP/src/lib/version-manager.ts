export interface EngineVersion {
  id: string;
  version: string;
  releaseDate: string;
  changelog: string;
}

export class VersionManager {
  static async checkUpdate(
    engineId: string,
    currentVersion: string
  ): Promise<{
    updateAvailable: boolean;
    newVersion?: string;
    updateUrl?: string;
  }> {
    console.log(
      `[VersionManager] Checking updates for ${engineId} (v${currentVersion})...`
    );

    // In real app: fetch('/api/engines/latest')
    const mockLatestVersion = '1.1.0';

    if (currentVersion !== mockLatestVersion) {
      return {
        updateAvailable: true,
        newVersion: mockLatestVersion,
        updateUrl: `/engines/${engineId}/v${mockLatestVersion}.wasm`,
      };
    }

    return { updateAvailable: false };
  }

  static async invalidateCache(engineId: string): Promise<void> {
    console.log(`[VersionManager] Invalidating cache for ${engineId}...`);
    const cache = await caches.open('flowy-engines-v1');
    await cache.delete(`/engines/${engineId}.wasm`);
    await cache.delete(`/engines/${engineId}.js`);
  }
}
