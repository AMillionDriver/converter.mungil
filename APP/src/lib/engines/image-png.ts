import { encode } from '@jsquash/png';
import type { ConversionOptions } from '../engine-types';

export const engineId = 'image:webp:png';

export const supportedConversions = ['webp', 'jpg', 'jpeg'];

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
  void options;
  onProgress?.(10);

  try {
    onProgress?.(35);
    const decodedImage = await decodeImage(file);
    onProgress?.(60);

    const pngOutput = await encode(decodedImage);
    if (!pngOutput) {
      throw new Error('PNG encoding failed');
    }
    onProgress?.(95);

    const blob = new Blob([pngOutput], { type: 'image/png' });
    onProgress?.(100);
    return blob;
  } catch (error) {
    console.error('[PNG Engine] Conversion failed:', error);
    throw error;
  }
}
