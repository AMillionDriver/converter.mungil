import * as fflate from 'fflate';
import { EngineLogger } from '../shared/EngineLogger';

export interface ArchiveOptions {
  compressionLevel: number; // 0-9
}

export type ZipInputItem = File | { name: string; blob: Blob };

export class ArchiveEngine {
  static async zipFiles(
    files: ZipInputItem[],
    options: ArchiveOptions = { compressionLevel: 6 }
  ): Promise<Blob> {
    const startTime = performance.now();
    console.log(`[ArchiveEngine] Zipping ${files.length} items...`);

    try {
      const entries: Record<string, Uint8Array> = {};
      const usedNames = new Set<string>();
      let totalInputSize = 0;

      for (const item of files) {
        let fileName = item.name;
        // Handle name collision inside zip
        if (usedNames.has(fileName)) {
          const dotIdx = fileName.lastIndexOf('.');
          const base = dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName;
          const ext = dotIdx !== -1 ? fileName.substring(dotIdx) : '';
          let counter = 1;
          while (usedNames.has(`${base}_(${counter})${ext}`)) {
            counter++;
          }
          fileName = `${base}_(${counter})${ext}`;
        }
        usedNames.add(fileName);

        if ('blob' in item) {
          const buffer = await item.blob.arrayBuffer();
          entries[fileName] = new Uint8Array(buffer);
          totalInputSize += item.blob.size;
        } else {
          const buffer = await item.arrayBuffer();
          entries[fileName] = new Uint8Array(buffer);
          totalInputSize += item.size;
        }
      }

      const output = await new Promise<Uint8Array>((resolve, reject) => {
        fflate.zip(
          entries,
          {
            level: options.compressionLevel as
              | 0
              | 1
              | 2
              | 3
              | 4
              | 5
              | 6
              | 7
              | 8
              | 9,
          },
          (err, data) => {
            if (err) reject(err);
            else resolve(data);
          }
        );
      });
      const blob = new Blob([output as Uint8Array<ArrayBuffer>], {
        type: 'application/zip',
      });

      EngineLogger.log({
        engineId: 'fflate-zip',
        operation: 'zip',
        status: 'success',
        duration: performance.now() - startTime,
        inputSize: totalInputSize,
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
    const unzipped = await new Promise<fflate.Unzipped>((resolve, reject) => {
      fflate.unzip(new Uint8Array(buffer), (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const results = Object.entries(unzipped).map(([name, data]) => ({
      name,
      data: new Blob([data as unknown as BlobPart]),
    }));

    return results;
  }
}
