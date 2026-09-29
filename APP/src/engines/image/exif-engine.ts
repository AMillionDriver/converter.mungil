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
        const buffer = await file.arrayBuffer();
        const parsed = await exifr.parse(buffer, {
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
      (k) =>
        !['width', 'height', 'created', 'modified', 'format', 'size'].includes(
          k
        )
    );

    const diffs: MetadataDiffItem[] = [];

    for (const key of allKeys) {
      const origVal = original[key];
      const editVal = edited[key];

      const origStr =
        origVal !== undefined && origVal !== null
          ? String(
              origVal instanceof Date ? origVal.toISOString() : origVal
            ).trim()
          : '';
      const editStr =
        editVal !== undefined && editVal !== null
          ? String(
              editVal instanceof Date ? editVal.toISOString() : editVal
            ).trim()
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

  /**
   * Embeds/injects user-modified EXIF metadata into an image Blob (JPEG).
   */
  static async writeExif(blob: Blob, exifData: ExifData): Promise<Blob> {
    const isJpeg =
      blob.type === 'image/jpeg' ||
      blob.type === 'image/jpg' ||
      blob.type === '';
    if (!isJpeg) {
      return blob;
    }

    try {
      const piexifModule = await import('piexifjs');
      const piexif = piexifModule.default || piexifModule;

      const arrayBuffer = await blob.arrayBuffer();
      const u8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < u8.length; i++) {
        binary += String.fromCharCode(u8[i]);
      }
      const base64 =
        typeof btoa !== 'undefined'
          ? btoa(binary)
          : (
              globalThis as unknown as {
                Buffer: {
                  from: (b: ArrayBuffer) => { toString: (s: string) => string };
                };
              }
            ).Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${blob.type || 'image/jpeg'};base64,${base64}`;

      // Check if user requested to strip all EXIF
      const isStripped = Object.keys(exifData).every(
        (k) =>
          exifData[k] === undefined ||
          exifData[k] === '' ||
          ['width', 'height', 'format', 'size'].includes(k)
      );

      if (isStripped) {
        try {
          const strippedDataUrl = piexif.remove(dataUrl);
          return this.dataUrlToBlob(strippedDataUrl);
        } catch {
          return blob;
        }
      }

      // Load existing EXIF from image if any to preserve other tags
      let existingObj: Record<string, Record<number, unknown>> = {};
      try {
        existingObj = piexif.load(dataUrl) as unknown as Record<
          string,
          Record<number, unknown>
        >;
      } catch {
        existingObj = { '0th': {}, Exif: {}, GPS: {} };
      }

      const zeroth: Record<number, unknown> = existingObj['0th'] || {};
      const exif: Record<number, unknown> = existingObj.Exif || {};
      const gps: Record<number, unknown> = existingObj.GPS || {};

      if (exifData.Make !== undefined) {
        if (exifData.Make) zeroth[piexif.ImageIFD.Make] = String(exifData.Make);
        else delete zeroth[piexif.ImageIFD.Make];
      }
      if (exifData.Model !== undefined) {
        if (exifData.Model)
          zeroth[piexif.ImageIFD.Model] = String(exifData.Model);
        else delete zeroth[piexif.ImageIFD.Model];
      }
      if (exifData.Software !== undefined) {
        if (exifData.Software)
          zeroth[piexif.ImageIFD.Software] = String(exifData.Software);
        else delete zeroth[piexif.ImageIFD.Software];
      }
      if (exifData.Artist !== undefined) {
        if (exifData.Artist)
          zeroth[piexif.ImageIFD.Artist] = String(exifData.Artist);
        else delete zeroth[piexif.ImageIFD.Artist];
      }
      if (exifData.Copyright !== undefined) {
        if (exifData.Copyright)
          zeroth[piexif.ImageIFD.Copyright] = String(exifData.Copyright);
        else delete zeroth[piexif.ImageIFD.Copyright];
      }
      if (exifData.ImageDescription !== undefined) {
        if (exifData.ImageDescription) {
          zeroth[piexif.ImageIFD.ImageDescription] = String(
            exifData.ImageDescription
          );
        } else {
          delete zeroth[piexif.ImageIFD.ImageDescription];
        }
      }

      // Date / Time handling (DateTimeOriginal, DateTimeDigitized, DateTime)
      if (exifData.DateTimeOriginal) {
        let formattedDate = '';
        if (typeof exifData.DateTimeOriginal === 'string') {
          const str = exifData.DateTimeOriginal.trim();
          if (str.includes('T')) {
            const [d, t] = str.split('T');
            const [y, m, day] = d.split('-');
            const timePart = t.length === 5 ? `${t}:00` : t.slice(0, 8);
            formattedDate = `${y}:${m}:${day} ${timePart}`;
          } else if (str.includes('-')) {
            const parts = str.replace(' ', 'T').split('T');
            const [y, m, day] = parts[0].split('-');
            const timePart = parts[1] || '12:00:00';
            formattedDate = `${y}:${m}:${day} ${timePart}`;
          } else {
            formattedDate = str;
          }
        } else if (exifData.DateTimeOriginal instanceof Date) {
          const d = exifData.DateTimeOriginal;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          formattedDate = `${y}:${m}:${day} ${hh}:${mm}:${ss}`;
        }

        if (formattedDate) {
          zeroth[piexif.ImageIFD.DateTime] = formattedDate;
          exif[piexif.ExifIFD.DateTimeOriginal] = formattedDate;
          exif[piexif.ExifIFD.DateTimeDigitized] = formattedDate;
        }
      } else if (exifData.DateTimeOriginal === '') {
        delete zeroth[piexif.ImageIFD.DateTime];
        delete exif[piexif.ExifIFD.DateTimeOriginal];
        delete exif[piexif.ExifIFD.DateTimeDigitized];
      }

      if (exifData.LensModel !== undefined) {
        if (exifData.LensModel)
          exif[piexif.ExifIFD.LensModel] = String(exifData.LensModel);
        else delete exif[piexif.ExifIFD.LensModel];
      }

      // GPS Handling
      if (
        typeof exifData.GPSLatitude === 'number' &&
        typeof exifData.GPSLongitude === 'number'
      ) {
        const lat = exifData.GPSLatitude;
        const long = exifData.GPSLongitude;
        gps[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
        gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(
          Math.abs(lat)
        );
        gps[piexif.GPSIFD.GPSLongitudeRef] = long >= 0 ? 'E' : 'W';
        gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(
          Math.abs(long)
        );

        if (typeof exifData.GPSAltitude === 'number') {
          gps[piexif.GPSIFD.GPSAltitude] = [
            Math.round(exifData.GPSAltitude * 100),
            100,
          ];
        }
      } else if (
        exifData.GPSLatitude === undefined &&
        exifData.GPSLongitude === undefined
      ) {
        delete gps[piexif.GPSIFD.GPSLatitudeRef];
        delete gps[piexif.GPSIFD.GPSLatitude];
        delete gps[piexif.GPSIFD.GPSLongitudeRef];
        delete gps[piexif.GPSIFD.GPSLongitude];
        delete gps[piexif.GPSIFD.GPSAltitude];
      }

      const exifObj = { '0th': zeroth, Exif: exif, GPS: gps };
      const exifBytes = piexif.dump(exifObj);
      const newJpegDataUrl = piexif.insert(exifBytes, dataUrl);
      return this.dataUrlToBlob(newJpegDataUrl);
    } catch (err) {
      console.warn('[ExifEngine] Failed to write EXIF with piexifjs:', err);
      return blob;
    }
  }

  private static dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr =
      typeof atob !== 'undefined'
        ? atob(arr[1])
        : (
            globalThis as unknown as {
              Buffer: {
                from: (
                  s: string,
                  enc: string
                ) => { toString: (s: string) => string };
              };
            }
          ).Buffer.from(arr[1], 'base64').toString('binary');
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
