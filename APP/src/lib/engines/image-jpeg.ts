import { encode } from '@jsquash/jpeg';
import type { ConversionOptions } from '../engine-types';

export const engineId = 'image:png:jpeg';

export const supportedConversions = ['png', 'webp', 'jpg', 'jpeg'];

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

    // JPEG quality: default 85
    const quality = (options.quality as number) ?? 85;
    const jpegOutput = await encode(decodedImage, { quality });
    if (!jpegOutput) {
      throw new Error('JPEG encoding failed');
    }
    onProgress?.(95);

    const blob = new Blob([jpegOutput], { type: 'image/jpeg' });
    onProgress?.(100);
    return blob;
  } catch (error) {
    console.error('[JPEG Engine] Conversion failed:', error);
    throw error;
  }
}
