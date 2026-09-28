import { encode, ParseImage } from '@jsquash/png';
import type { ConversionOptions } from '../engine-types';

export const engineId = 'image:webp:png';

export const supportedConversions = ['webp', 'jpg', 'jpeg'];

export async function runConversion(
  file: File,
  _options: ConversionOptions = {},
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
