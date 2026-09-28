import { EngineLogger } from '../shared/EngineLogger';

export class ExifEngine {
  /**
   * Read EXIF / metadata from an image File or Blob.
   * Uses exifr when available, falls back to mock metadata.
   */
  static async read(file: File): Promise<ExifResult> {
    const startTime = performance.now();
    try {
      let exif: ExifData | null = null;

      try {
        // Dynamic import so the module is only loaded when needed
        const exifr = await import('exifr');
        exif = await exifr.parse(file, {
          pick: [
            'Make',
            'Model',
            'Software',
            'DateTimeOriginal',
            'GPSLatitude',
            'GPSLongitude',
            'FNumber',
            'ExposureTime',
            'ISO',
          ],
        });
      } catch (err) {
        EngineLogger.warn(
          'exif-engine',
          'exifr parse failed, using fallback',
          err
        );
      }

      const metadata: ExifResult = {
        format: file.type,
        size: file.size,
        created: new Date(),
        modified: new Date(),
        exif: exif ?? makeFallbackExif(),
      };

      EngineLogger.log({
        engineId: 'exif-engine',
        operation: 'read-metadata',
        status: exif ? 'success' : 'warn',
        duration: performance.now() - startTime,
        inputSize: file.size,
        timestamp: Date.now(),
      });

      return metadata;
    } catch (error) {
      EngineLogger.error('exif-engine', 'Metadata read failed', error);
      throw error;
    }
  }

  /**
   * Write EXIF back into a file (placeholder).
   * Full implementation would use piexifjs or exifr's write capability.
   * Currently returns the original blob unchanged.
   */
  static async write(file: File): Promise<Blob> {
    const startTime = performance.now();
    try {
      // TODO: implement piexifjs-based EXIF rewrite
      EngineLogger.log({
        engineId: 'exif-engine',
        operation: 'write-metadata',
        status: 'warn',
        duration: performance.now() - startTime,
        inputSize: file.size,
        timestamp: Date.now(),
      });

      return new Blob([await file.arrayBuffer()], { type: file.type });
    } catch (error) {
      EngineLogger.error('exif-engine', 'Metadata write failed', error);
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExifData {
  Make?: string;
  Model?: string;
  Software?: string;
  DateTimeOriginal?: string;
  GPSLatitude?: number;
  GPSLongitude?: number;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  [key: string]: unknown;
}

export interface ExifResult {
  format: string;
  size: number;
  created: Date;
  modified: Date;
  exif: ExifData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFallbackExif(): ExifData {
  return {
    Make: 'Flowy Camera',
    Model: 'WASM-100',
    Software: 'Flowy OS',
    GPSLatitude: 0,
    GPSLongitude: 0,
  };
}

// extend EngineLogger with a warn helper if not present
declare module '../shared/EngineLogger' {
  interface EngineLoggerStatic {
    warn(engineId: string, message: string, error?: unknown): void;
  }
}

EngineLogger.warn = function (
  engineId: string,
  message: string,
  error?: unknown
) {
  console.warn(`[EngineLogger] ⚠️ ${engineId} WARN: ${message}`, error || '');
};
