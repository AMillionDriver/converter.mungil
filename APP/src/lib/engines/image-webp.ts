import { encode } from '@jsquash/webp';
import type { ConversionOptions } from '../engine-types';

// Engine metadata is handled by the registry — this module is pure conversion logic.
// The worker imports this module dynamically and calls runConversion.

export const engineId = 'image:png:webp';

export const supportedConversions = ['png', 'jpg', 'jpeg', 'webp'];

async function decodeImage(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
}

/**
 * Converts a PNG/JPG/JPEG file to WebP using jsquash's WebP codec.
 * @param file - Input image file (PNG, JPG, or JPEG)
 * @param options - Optional settings (quality, lossless, etc.)
 * @param onProgress - Callback for progress updates (0-100)
 * @returns WebP blob
 */
export async function runConversion(
  file: File,
  options: ConversionOptions = {},
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  try {
    onProgress?.(35);
    const decodedImage = await decodeImage(file);
    onProgress?.(60);

    // Encode to WebP with configurable quality
    const quality = (options.quality as number) ?? 85;
    const encodeOptions = {
      quality: Math.max(1, Math.min(100, quality)),
      lossless: options.lossless ? 1 : 0,
      method: 6,
    };

    const webpOutput = await encode(decodedImage, encodeOptions);
    if (!webpOutput) {
      throw new Error(
        'WebP encoding failed — the image may be too large or invalid'
      );
    }

    onProgress?.(95);

    const blob = new Blob([webpOutput], { type: 'image/webp' });
    onProgress?.(100);
    return blob;
  } catch (error) {
    console.error('[WebP Engine] Conversion failed:', error);
    throw error;
  }
}
