import { PDFDocument } from 'pdf-lib';
import type { ConversionOptions } from '../engine-types';

export const engineId = 'image:png:pdf';
export const supportedConversions = ['png', 'jpg', 'jpeg', 'webp'];

export async function runConversion(
  file: File,
  options: ConversionOptions = {},
  onProgress?: (p: number) => void
): Promise<Blob> {
  void options;
  onProgress?.(10);

  try {
    const pdfDoc = await PDFDocument.create();
    onProgress?.(30);

    const isPng = file.type === 'image/png' || file.name.endsWith('.png');
    const isJpg =
      file.type === 'image/jpeg' ||
      file.name.endsWith('.jpg') ||
      file.name.endsWith('.jpeg');

    let image;
    if (isPng) {
      const bytes = await file.arrayBuffer();
      image = await pdfDoc.embedPng(bytes);
    } else if (isJpg) {
      const bytes = await file.arrayBuffer();
      image = await pdfDoc.embedJpg(bytes);
    } else {
      // Fallback for WebP or other formats: rasterize via OffscreenCanvas to PNG
      const bitmap = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('OffscreenCanvas context unavailable');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
      const bytes = await pngBlob.arrayBuffer();
      image = await pdfDoc.embedPng(bytes);
    }

    onProgress?.(60);

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    onProgress?.(85);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], {
      type: 'application/pdf',
    });

    onProgress?.(100);
    return blob;
  } catch (error) {
    console.error('[PDF Engine] Conversion failed:', error);
    throw error;
  }
}
