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
  private static dbPromise: Promise<IDBPDatabase> = openDB(this.DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(StorageManager.STORE_NAME)) {
        db.createObjectStore(StorageManager.STORE_NAME, { keyPath: 'id' });
      }
    },
  });

  static async setEngineInstalled(
    metadata: EngineMetadataRecord
  ): Promise<void> {
    const db = await this.dbPromise;
    await db.put(StorageManager.STORE_NAME, metadata);
  }

  static async getEngineMetadata(
    id: string
  ): Promise<EngineMetadataRecord | undefined> {
    const db = await this.dbPromise;
    return await db.get(StorageManager.STORE_NAME, id);
  }

  static async removeEngine(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(StorageManager.STORE_NAME, id);
  }

  static async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(StorageManager.STORE_NAME);
  }
}
