import { type EngineMetadata } from './engine-registry';
import { CacheManager } from './cache-manager';
import { StorageManager } from './storage-manager';

export interface EngineLoadStatus {
  status: 'idle' | 'loading' | 'verifying' | 'installed' | 'error';
  progress: number; // 0 to 100
  error?: string;
}

export class EngineLoader {
  private static activeDownloads = new Map<string, ForgeDownloadTask>();

  static async load(
    engineId: string,
    metadata: EngineMetadata,
    onProgress?: (p: number) => void
  ): Promise<void> {
    if (await this.isInstalled(engineId)) {
      onProgress?.(100);
      return;
    }

    // Avoid duplicate downloads for same engine
    if (this.activeDownloads.has(engineId)) {
      return this.activeDownloads.get(engineId)!.promise;
    }

    const task = new ForgeDownloadTask(engineId, metadata, onProgress);
    this.activeDownloads.set(engineId, task);

    try {
      await task.promise;
    } finally {
      this.activeDownloads.delete(engineId);
    }
  }

  static async isInstalled(engineId: string): Promise<boolean> {
    const metadata = await StorageManager.getEngineMetadata(engineId);
    if (!metadata) return false;

    // Simplified: assume if metadata exists, assets are in cache
    // In production, we'd check CacheManager.has(assetUrl)
    return true;
  }
}

class ForgeDownloadTask {
  public promise: Promise<void>;

  constructor(
    private engineId: string,
    private metadata: EngineMetadata,
    private onProgress?: (p: number) => void
  ) {
    this.promise = this.execute();
  }

  private async execute(): Promise<void> {
    try {
      // 1. Download and Cache Script
      await this.downloadAndCache(this.metadata.script);
      this.onProgress?.(30);

      // 2. Download and Cache WASM
      if (this.metadata.wasm) {
        await this.downloadAndCache(this.metadata.wasm);
      }
      this.onProgress?.(70);

      // 3. Verify Integrity
      await this.verify();
      this.onProgress?.(100);

      // 4. Mark as installed in IndexedDB
      await StorageManager.setEngineInstalled({
        id: this.engineId,
        version: this.metadata.version,
        installedAt: Date.now(),
        checksum: this.metadata.checksum,
      });
    } catch (error) {
      throw new Error(`Failed to load engine ${this.engineId}: ${error}`);
    }
  }

  private async downloadAndCache(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);

    // Store in Cache Storage
    await CacheManager.put(url, response);

    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  private async verify(): Promise<void> {
    // Simulate checksum verification
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
