import { EngineLogger } from '../shared/EngineLogger';

export interface ExifData {
  Make?: string;
  Model?: string;
  Software?: string;
  LensModel?: string;
  DateTimeOriginal?: string | Date;
  GPSLatitude?: number;
  GPSLongitude?: number;
  GPSAltitude?: number;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  FocalLength?: number;
  Artist?: string;
  Copyright?: string;
  ImageDescription?: string;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export interface ExifResult {
  format: string;
  size: number;
  created: Date;
  modified: Date;
  width?: number;
  height?: number;
  exif: ExifData;
}

export interface MetadataDiffItem {
  key: string;
  label: string;
  before: string;
  after: string;
  type: 'added' | 'modified' | 'removed';
}

const FIELD_LABELS: Record<string, string> = {
  Make: 'Merek Kamera',
  Model: 'Model Perangkat',
  Software: 'Perangkat Lunak / OS',
  LensModel: 'Model Lensa',
  DateTimeOriginal: 'Waktu Pengambilan',
  GPSLatitude: 'GPS Latitude',
  GPSLongitude: 'GPS Longitude',
  GPSAltitude: 'GPS Altitude',
  FNumber: 'Aperture (f-stop)',
  ExposureTime: 'Shutter Speed',
  ISO: 'ISO',
  FocalLength: 'Focal Length',
  Artist: 'Fotografer / Artis',
  Copyright: 'Hak Cipta (Copyright)',
  ImageDescription: 'Deskripsi Gambar',
};

export class ExifEngine {
  /**
   * Read EXIF / metadata from an image File or Blob.
   * Uses exifr when available, and extracts dimensions via createImageBitmap.
   */
  static async read(file: File): Promise<ExifResult> {
    const startTime = performance.now();
    try {
      let exif: ExifData = {};

      try {
        const exifr = await import('exifr');
        const parsed = await exifr.parse(file, {
          pick: [
            'Make',
            'Model',
            'Software',
            'LensModel',
            'DateTimeOriginal',
            'GPSLatitude',
            'GPSLongitude',
            'GPSAltitude',
            'FNumber',
            'ExposureTime',
            'ISO',
            'FocalLength',
            'Artist',
            'Copyright',
            'ImageDescription',
          ],
        });
        if (parsed) {
          exif = parsed;
        }
      } catch (err) {
        EngineLogger.warn('exif-engine', 'exifr parse skipped or failed', err);
      }

      // Read dimensions if available
      let width: number | undefined;
      let height: number | undefined;
      try {
        if (typeof createImageBitmap !== 'undefined') {
          const bitmap = await createImageBitmap(file);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        }
      } catch {
        // Dimensions optional
      }

      const metadata: ExifResult = {
        format: file.type || 'image/unknown',
        size: file.size,
        created: new Date(file.lastModified || Date.now()),
        modified: new Date(file.lastModified || Date.now()),
        width,
        height,
        exif,
      };

      EngineLogger.log({
        engineId: 'exif-engine',
        operation: 'read-metadata',
        status: Object.keys(exif).length > 0 ? 'success' : 'warn',
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
   * Computes a structured diff between the original EXIF and user-edited EXIF.
   */
  static computeDiff(
    original: ExifData = {},
    edited: ExifData = {}
  ): MetadataDiffItem[] {
    const allKeys = Array.from(
      new Set([...Object.keys(original), ...Object.keys(edited)])
    ).filter(
      (k) => !['width', 'height', 'created', 'modified', 'format', 'size'].includes(k)
    );

    const diffs: MetadataDiffItem[] = [];

    for (const key of allKeys) {
      const origVal = original[key];
      const editVal = edited[key];

      const origStr =
        origVal !== undefined && origVal !== null
          ? String(origVal instanceof Date ? origVal.toISOString() : origVal).trim()
          : '';
      const editStr =
        editVal !== undefined && editVal !== null
          ? String(editVal instanceof Date ? editVal.toISOString() : editVal).trim()
          : '';

      if (origStr !== editStr) {
        let type: 'added' | 'modified' | 'removed' = 'modified';
        if (!origStr && editStr) type = 'added';
        else if (origStr && !editStr) type = 'removed';

        diffs.push({
          key,
          label: FIELD_LABELS[key] || key,
          before: origStr || '(Kosong)',
          after: editStr || '(Dihapus)',
          type,
        });
      }
    }

    return diffs;
  }
}
