import type { ConversionOptions } from '../engine-types';

export const engineId = 'image:png:ico';
export const supportedConversions = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'bmp',
  'gif',
];

/**
 * Converts an image file to Windows ICO format (PNG-encoded ICO container).
 */
export async function runConversion(
  file: File,
  options: ConversionOptions = {},
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  try {
    const bitmap = await createImageBitmap(file);
    onProgress?.(30);

    // Target icon dimensions (default: 32x32, or user requested up to 256)
    const targetSize = Math.min(
      256,
      Math.max(16, (options.size as number) || 32)
    );

    const canvas = new OffscreenCanvas(targetSize, targetSize);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');

    ctx.drawImage(bitmap, 0, 0, targetSize, targetSize);
    bitmap.close();
    onProgress?.(55);

    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
    const pngBuffer = await pngBlob.arrayBuffer();
    const pngBytes = new Uint8Array(pngBuffer);
    onProgress?.(75);

    // ICO file layout: 6-byte header + 16-byte directory entry + PNG payload
    const totalSize = 6 + 16 + pngBytes.byteLength;
    const icoBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(icoBuffer);

    // 1. ICONDIR (6 bytes)
    view.setUint16(0, 0, true); // Reserved, must be 0
    view.setUint16(2, 1, true); // Resource type: 1 = icon
    view.setUint16(4, 1, true); // Number of images: 1

    // 2. ICONDIRENTRY (16 bytes)
    const iconWidth = targetSize === 256 ? 0 : targetSize;
    const iconHeight = targetSize === 256 ? 0 : targetSize;
    view.setUint8(6, iconWidth); // Width (0 means 256)
    view.setUint8(7, iconHeight); // Height (0 means 256)
    view.setUint8(8, 0); // Color count: 0 (>= 8bpp)
    view.setUint8(9, 0); // Reserved
    view.setUint16(10, 1, true); // Color planes
    view.setUint16(12, 32, true); // Bits per pixel (32-bit RGBA)
    view.setUint32(14, pngBytes.byteLength, true); // Size of image data
    view.setUint32(18, 22, true); // Offset of image data (6 + 16)

    // 3. PNG Image Payload
    new Uint8Array(icoBuffer, 22).set(pngBytes);
    onProgress?.(95);

    const blob = new Blob([icoBuffer], { type: 'image/x-icon' });
    onProgress?.(100);
    return blob;
  } catch (error) {
    console.error('[ICO Engine] Conversion failed:', error);
    throw error;
  }
}
