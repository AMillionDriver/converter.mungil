import { PDFDocument, degrees } from 'pdf-lib';

export interface PageOperation {
  originalIndex: number; // 0-indexed position in source PDF, or -1 for blank page
  rotation: number; // degrees to rotate: 0, 90, 180, 270
  isBlank?: boolean;
}

export class PdfPageEngine {
  /**
   * Applies reordering, rotation, page extraction/deletion, and blank page insertion to a PDF file.
   * Returns a new PDF Blob containing only the requested pages in the new order.
   */
  static async processPages(
    sourcePdf: File | Blob,
    operations: PageOperation[]
  ): Promise<Blob> {
    if (operations.length === 0) {
      throw new Error('Minimal harus ada satu halaman yang disimpan.');
    }

    const buffer = await sourcePdf.arrayBuffer();
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const totalPages = srcDoc.getPageCount();
    const firstPageSize =
      totalPages > 0
        ? srcDoc.getPage(0).getSize()
        : { width: 595.28, height: 841.89 };

    for (const op of operations) {
      if (!op.isBlank && op.originalIndex !== -1) {
        if (op.originalIndex < 0 || op.originalIndex >= totalPages) {
          throw new Error(
            `Indeks halaman ${op.originalIndex + 1} tidak valid (Total: ${totalPages}).`
          );
        }
      }
    }

    for (const op of operations) {
      if (op.isBlank || op.originalIndex === -1) {
        const blankPage = newDoc.addPage([
          firstPageSize.width,
          firstPageSize.height,
        ]);
        if (op.rotation !== 0) {
          const normalizedRotation = ((op.rotation % 360) + 360) % 360;
          blankPage.setRotation(degrees(normalizedRotation));
        }
      } else {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [op.originalIndex]);
        const currentRotation = copiedPage.getRotation().angle || 0;
        const normalizedRotation =
          (((currentRotation + op.rotation) % 360) + 360) % 360;

        copiedPage.setRotation(degrees(normalizedRotation));
        newDoc.addPage(copiedPage);
      }
    }

    const pdfBytes = await newDoc.save();
    return new Blob([pdfBytes as Uint8Array<ArrayBuffer>], {
      type: 'application/pdf',
    });
  }

  /**
   * Splits a PDF into multiple documents based on page index ranges.
   * e.g., [[0, 1], [2, 4]] splits 5 pages into 2 docs (pages 1-2 and 3-5).
   */
  static async splitPdf(
    sourcePdf: File | Blob,
    ranges: number[][]
  ): Promise<Blob[]> {
    const resultBlobs: Blob[] = [];

    for (const range of ranges) {
      const operations: PageOperation[] = range.map((idx) => ({
        originalIndex: idx,
        rotation: 0,
      }));
      const blob = await this.processPages(sourcePdf, operations);
      resultBlobs.push(blob);
    }

    return resultBlobs;
  }
}
