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
    const dbPromise = this.getDb();
    if (!dbPromise) {
      this.memoryStore.set(metadata.id, metadata);
      return;
    }
    const db = await dbPromise;
    await db.put(StorageManager.STORE_NAME, metadata);
  }

  static async getEngineMetadata(
    id: string
  ): Promise<EngineMetadataRecord | undefined> {
    const dbPromise = this.getDb();
    if (!dbPromise) {
      return this.memoryStore.get(id);
    }
    const db = await dbPromise;
    return await db.get(StorageManager.STORE_NAME, id);
  }

  static async removeEngine(id: string): Promise<void> {
    const dbPromise = this.getDb();
    if (!dbPromise) {
      this.memoryStore.delete(id);
      return;
    }
    const db = await dbPromise;
    await db.delete(StorageManager.STORE_NAME, id);
  }

  static async clearAll(): Promise<void> {
    const dbPromise = this.getDb();
    if (!dbPromise) {
      this.memoryStore.clear();
      return;
    }
    const db = await dbPromise;
    await db.clear(StorageManager.STORE_NAME);
  }
}
