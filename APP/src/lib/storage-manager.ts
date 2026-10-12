import { openDB, type IDBPDatabase } from 'idb';

export interface EngineMetadataRecord {
  id: string;
  version: string;
  installedAt: number;
  checksum: string;
}

export class StorageManager {
  private static DB_NAME = 'flowy-converter-db';
  private static STORE_NAME = 'engine-metadata';
  private static dbPromise: Promise<IDBPDatabase> | null = null;
  private static memoryStore = new Map<string, EngineMetadataRecord>();

  private static getDb(): Promise<IDBPDatabase> | null {
    if (typeof indexedDB === 'undefined') {
      return null;
    }
    if (!this.dbPromise) {
      this.dbPromise = openDB(this.DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(StorageManager.STORE_NAME)) {
            db.createObjectStore(StorageManager.STORE_NAME, { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  static async setEngineInstalled(
    metadata: EngineMetadataRecord
  ): Promise<void> {
    if (!metadata || !metadata.id) return;
    this.memoryStore.set(metadata.id, metadata);

    try {
      const dbPromise = this.getDb();
      if (!dbPromise) return;
      const db = await dbPromise;
      await db.put(StorageManager.STORE_NAME, metadata);
    } catch (err) {
      console.warn(
        '[StorageManager] Gagal menyimpan metadata ke IndexedDB:',
        err
      );
    }
  }

  static async getEngineMetadata(
    id?: string | null
  ): Promise<EngineMetadataRecord | undefined> {
    if (!id || typeof id !== 'string') {
      return undefined;
    }

    try {
      const dbPromise = this.getDb();
      if (!dbPromise) {
        return this.memoryStore.get(id);
      }
      const db = await dbPromise;
      const record = await db.get(StorageManager.STORE_NAME, id);
      return record || this.memoryStore.get(id);
    } catch (err) {
      console.warn(
        `[StorageManager] Gagal membaca metadata engine '${id}':`,
        err
      );
      return this.memoryStore.get(id);
    }
  }

  static async removeEngine(id?: string | null): Promise<void> {
    if (!id || typeof id !== 'string') return;
    this.memoryStore.delete(id);

    try {
      const dbPromise = this.getDb();
      if (!dbPromise) return;
      const db = await dbPromise;
      await db.delete(StorageManager.STORE_NAME, id);
    } catch (err) {
      console.warn(`[StorageManager] Gagal menghapus engine '${id}':`, err);
    }
  }

  static async clearAll(): Promise<void> {
    this.memoryStore.clear();

    try {
      const dbPromise = this.getDb();
      if (!dbPromise) return;
      const db = await dbPromise;
      await db.clear(StorageManager.STORE_NAME);
    } catch (err) {
      console.warn('[StorageManager] Gagal mengosongkan store:', err);
    }
  }
}
