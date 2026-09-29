import { PDFDocument } from 'pdf-lib';
import { EngineLogger } from '../shared/EngineLogger';

export interface PdfOperation {
  type: 'merge' | 'split' | 'rotate' | 'image-to-pdf' | 'compress';
  files: File[];
  options: {
    pages?: number[];
    angle?: 90 | 180 | 270;
    pageSize?: 'A4' | 'Letter' | 'auto';
  };
}

export class PdfEngine {
  static async process(op: PdfOperation): Promise<Blob> {
    const startTime = performance.now();
    console.log(`[PdfEngine] Executing ${op.type} operation...`);

    try {
      const pdfDoc = await PDFDocument.create();

      if (op.type === 'merge') {
        for (const file of op.files) {
          const bytes = await file.arrayBuffer();
          const doc = await PDFDocument.load(bytes);
          const copiedPages = await pdfDoc.copyPages(doc, doc.getPageIndices());
          copiedPages.forEach((page) => pdfDoc.addPage(page));
        }
      } else if (op.type === 'image-to-pdf') {
        for (const file of op.files) {
          const imageBytes = await file.arrayBuffer();
          let image;
          if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (file.type === 'image/jpeg') {
            image = await pdfDoc.embedJpg(imageBytes);
          } else {
            throw new Error('Unsupported image format for PDF');
          }
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        }
      } else if (op.type === 'compress') {
        if (op.files.length === 0) {
          throw new Error('Tidak ada file PDF yang diberikan untuk kompresi');
        }
        const bytes = await op.files[0].arrayBuffer();
        const loadedDoc = await PDFDocument.load(bytes);
        const pdfBytes = await loadedDoc.save({ useObjectStreams: true });
        const blob = new Blob([pdfBytes as unknown as BlobPart], {
          type: 'application/pdf',
        });

        EngineLogger.log({
          engineId: 'pdf-lib',
          operation: 'compress',
          status: 'success',
          duration: performance.now() - startTime,
          inputSize: op.files[0].size,
          outputSize: blob.size,
          timestamp: Date.now(),
        });

        return blob;
      } else {
        throw new Error(
          `Operation ${op.type} not yet implemented in PdfEngine`
        );
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: 'application/pdf',
      });

      EngineLogger.log({
        engineId: 'pdf-lib',
        operation: op.type,
        status: 'success',
        duration: performance.now() - startTime,
        inputSize: op.files.reduce((acc, f) => acc + f.size, 0),
        outputSize: blob.size,
        timestamp: Date.now(),
      });

      return blob;
    } catch (error) {
      EngineLogger.error('pdf-lib', `Operation ${op.type} failed`, error);
      throw error;
    }
  }
}
