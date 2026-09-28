import * as fflate from 'fflate';
import { EngineLogger } from '../shared/EngineLogger';

export interface ArchiveOptions {
  compressionLevel: number; // 0-9
}

export class ArchiveEngine {
  static async zipFiles(
    files: File[],
    options: ArchiveOptions = { compressionLevel: 6 }
  ): Promise<Blob> {
    const startTime = performance.now();
    console.log(`[ArchiveEngine] Zipping ${files.length} files...`);

    try {
      // Use fflate.zipSync for simpler API
      const entries: Record<string, Uint8Array> = {};
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        entries[file.name] = new Uint8Array(buffer);
      }
      const output = fflate.zipSync(entries, {
        level: options.compressionLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      });
      const blob = new Blob([output], { type: 'application/zip' });

      EngineLogger.log({
        engineId: 'fflate-zip',
        operation: 'zip',
        status: 'success',
        duration: performance.now() - startTime,
        inputSize: files.reduce((acc, f) => acc + f.size, 0),
        outputSize: blob.size,
        timestamp: Date.now(),
      });

      return blob;
    } catch (error) {
      EngineLogger.error('fflate-zip', 'Zipping failed', error);
      throw error;
    }
  }

  static async unzip(
    zipBlob: Blob
  ): Promise<Array<{ name: string; data: Blob }>> {
    const buffer = await zipBlob.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(buffer));

    const results = Object.entries(unzipped).map(([name, data]) => ({
      name,
      data: new Blob([data as unknown as BlobPart]),
    }));

    return results;
  }
}
