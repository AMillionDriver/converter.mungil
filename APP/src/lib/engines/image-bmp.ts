import type { ConversionOptions } from '../engine-types';

export const engineId = 'image:png:bmp';
export const supportedConversions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

/**
 * Converts an image file to standard Windows 24-bit uncompressed BMP format.
 */
export async function runConversion(
  file: File,
  _options: ConversionOptions = {},
  onProgress?: (p: number) => void
): Promise<Blob> {
  void _options;
  onProgress?.(10);

  try {
    const bitmap = await createImageBitmap(file);
    onProgress?.(30);

    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    onProgress?.(50);

    const imageData = ctx.getImageData(0, 0, width, height);
    const rgba = imageData.data;

    // In 24-bit BMP, each row must be padded to a multiple of 4 bytes
    const rowBytes = width * 3;
    const padding = (4 - (rowBytes % 4)) % 4;
    const paddedRowBytes = rowBytes + padding;
    const pixelArraySize = paddedRowBytes * height;
    const headerSize = 54; // 14 (file header) + 40 (DIB header)
    const fileSize = headerSize + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // --- BITMAPFILEHEADER (14 bytes) ---
    bytes[0] = 0x42; // 'B'
    bytes[1] = 0x4d; // 'M'
    view.setUint32(2, fileSize, true); // Total file size
    view.setUint16(6, 0, true); // Reserved
    view.setUint16(8, 0, true); // Reserved
    view.setUint32(10, headerSize, true); // Offset to pixel data (54)

    // --- BITMAPINFOHEADER (40 bytes) ---
    view.setUint32(14, 40, true); // Header size
    view.setInt32(18, width, true); // Width
    view.setInt32(22, height, true); // Height (positive: bottom-to-top)
    view.setUint16(26, 1, true); // Color planes: 1
    view.setUint16(28, 24, true); // Bits per pixel: 24 (RGB)
    view.setUint32(30, 0, true); // Compression: BI_RGB (uncompressed)
    view.setUint32(34, pixelArraySize, true); // Image data size
    view.setInt32(38, 2835, true); // Horizontal resolution (72 DPI)
    view.setInt32(42, 2835, true); // Vertical resolution (72 DPI)
    view.setUint32(46, 0, true); // Colors in color table
    view.setUint32(50, 0, true); // Important colors

    // --- Pixel Data (Bottom-to-Top, BGR order) ---
    let offset = headerSize;
    for (let y = height - 1; y >= 0; y -= 1) {
      for (let x = 0; x < width; x += 1) {
        const srcIdx = (y * width + x) * 4;
        bytes[offset] = rgba[srcIdx + 2]; // Blue
        bytes[offset + 1] = rgba[srcIdx + 1]; // Green
        bytes[offset + 2] = rgba[srcIdx]; // Red
        offset += 3;
      }
      for (let p = 0; p < padding; p += 1) {
        bytes[offset] = 0;
        offset += 1;
      }
    }

    onProgress?.(90);
    const blob = new Blob([buffer], { type: 'image/bmp' });
    onProgress?.(100);
    return blob;
  } catch (error) {
    console.error('[BMP Engine] Conversion failed:', error);
    throw error;
  }
}
