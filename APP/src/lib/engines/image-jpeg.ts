import { encode, ParseImage } from '@jsquash/jpeg';
import type { ConversionOptions } from '../engine-types';

export const engineId = 'image:png:jpeg';

export const supportedConversions = ['png', 'webp', 'jpg', 'jpeg'];

export async function runConversion(
  file: File,
  options: ConversionOptions = {},
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  try {
    const inputBuffer = await file.arrayBuffer();
    onProgress?.(35);

    const decodedImage = ParseImage(new Uint8Array(inputBuffer));
    if (!decodedImage) {
      throw new Error('Failed to parse source image — unsupported or corrupt file');
    }
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
