import { EngineLogger } from '../shared/EngineLogger';
// import { BlobUtils } from '../shared/blob-utils'; // removed unused import

export interface ImageConvertOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  preserveAspect?: boolean;
  background?: string;
}

export interface ImageConversionResult {
  blob: Blob;
  mime: string;
  filename: string;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
}

export class ImageEngine {
  static async convert(
    file: File,
    targetFormat: 'webp' | 'jpeg' | 'png',
    options: ImageConvertOptions = {}
  ): Promise<ImageConversionResult> {
    const startTime = performance.now();
    console.log(`[ImageEngine] Converting ${file.name} to ${targetFormat}...`);

    try {
      // In Chapter 3.2 we will integrate @jsquash and Canvas
      // Current: Proof of Concept using Canvas API for basic conversion
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      // Handle Resize
      let width = bitmap.width;
      let height = bitmap.height;
      if (options.maxWidth || options.maxHeight) {
        const ratio = Math.min(
          options.maxWidth ? options.maxWidth / width : Infinity,
          options.maxHeight ? options.maxHeight / height : Infinity
        );
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      if (options.background) {
        ctx.fillStyle = options.background;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(bitmap, 0, 0, width, height);

      const mimeType = `image/${targetFormat}`;
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b!),
          mimeType,
          options.quality ? options.quality / 100 : 0.8
        );
      });

      const duration = performance.now() - startTime;
      EngineLogger.log({
        engineId: 'image-canvas',
        operation: `convert-to-${targetFormat}`,
        status: 'success',
        duration,
        inputSize: file.size,
        outputSize: blob.size,
        timestamp: Date.now(),
      });

      return {
        blob,
        mime: mimeType,
        filename: file.name.replace(/\.[^/.]+$/, '') + `.${targetFormat}`,
        originalSize: file.size,
        convertedSize: blob.size,
        compressionRatio: blob.size / file.size,
      };
    } catch (error) {
      EngineLogger.error('image-canvas', 'Conversion failed', error);
      throw error;
    }
  }
}
