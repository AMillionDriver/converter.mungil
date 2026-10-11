import { engineRegistry } from './engine-registry';
import { StorageManager } from './storage-manager';

export const APP_VERSION = '1.0.0';

export interface EngineVersion {
  id: string;
  version: string;
  releaseDate: string;
  changelog: string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  newVersion?: string;
  updateUrl?: string;
}

export class VersionManager {
  /**
   * Checks whether an engine has a newer version available compared to the current registry or remote manifest.
   */
  static async checkUpdate(
    engineId: string,
    currentVersion: string
  ): Promise<UpdateCheckResult> {
    const parts = engineId.split(':');
    let targetVersion = currentVersion;

    if (parts.length === 3) {
      const [, input, output] = parts;
      const meta = engineRegistry.resolveEngine(input, output);
      if (meta && meta.version) {
        targetVersion = meta.version;
      }
    }

    const manifestUrl = import.meta.env.VITE_ENGINES_MANIFEST_URL;
    if (manifestUrl) {
      try {
        const res = await fetch(manifestUrl, { cache: 'no-cache' });
        if (res.ok) {
          const remoteManifest = (await res.json()) as Record<
            string,
            { version?: string; script?: string }
          >;
          if (remoteManifest[engineId]?.version) {
            targetVersion = remoteManifest[engineId].version!;
          }
        }
      } catch {
        // Fallback to local targetVersion
      }
    }

    if (targetVersion !== currentVersion) {
      return {
        updateAvailable: true,
        newVersion: targetVersion,
        updateUrl: `/engines/${engineId}/v${targetVersion}.wasm`,
      };
    }

    return { updateAvailable: false };
  }

  /**
   * Checks if an update to the web application is available via Service Worker.
   */
  static async checkServiceWorkerUpdate(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          if (registration.waiting) {
            return true;
          }
        }
      } catch {
        // Offline or SW disabled
      }
    }
    return false;
  }

  /**
   * Invalidates engine cache in both Cache Storage and IndexedDB metadata.
   */
  static async invalidateCache(engineId: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open('flowy-engines-v1');
        await cache.delete(`/engines/${engineId}.wasm`);
        await cache.delete(`/engines/${engineId}.js`);
      }
    } catch {
      // Ignore cache API errors
    }

    await StorageManager.removeEngine(engineId);
  }
}
