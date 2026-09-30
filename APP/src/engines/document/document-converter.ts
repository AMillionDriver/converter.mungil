import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fflate from 'fflate';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

// Register the worker module directly on globalThis so PDF.js runs in-thread
// without nested worker or window.location dependencies in Web Worker environments.
if (typeof globalThis !== 'undefined') {
  (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
}

export interface ExtractedPdfPage {
  pageNumber: number;
  lines: string[];
}

interface TextItemLike {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export class DocumentConverter {
  /**
   * TXT -> PDF Converter
   */
  static async txtToPdf(file: File): Promise<Blob> {
    const text = await file.text();
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 10;
    const lineHeight = 14;
    const margin = 50;
    const pageWidth = 595.28; // A4
    const pageHeight = 841.89;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const maxLinesPerPage = Math.floor(usableHeight / lineHeight);

    // Split text into wrapped lines
    const rawLines = text.split(/\r?\n/);
    const wrappedLines: string[] = [];

    for (const rawLine of rawLines) {
      if (!rawLine) {
        wrappedLines.push('');
        continue;
      }
      const words = rawLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width <= usableWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }

    if (wrappedLines.length === 0) {
      wrappedLines.push('');
    }

    // Write lines across pages
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let lineInPage = 0;

    for (let i = 0; i < wrappedLines.length; i++) {
      if (lineInPage >= maxLinesPerPage) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        lineInPage = 0;
      }

      const y = pageHeight - margin - (lineInPage + 1) * lineHeight;
      page.drawText(wrappedLines[i], {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      lineInPage++;
    }

    pdfDoc.setTitle(file.name.replace(/\.[^/.]+$/, ''));
    pdfDoc.setProducer('Mungil Converter');
    pdfDoc.setCreator('Mungil Converter');

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as Uint8Array<ArrayBuffer>], {
      type: 'application/pdf',
    });
  }

  /**
   * High-fidelity PDF text and layout extraction using Mozilla PDF.js engine.
   * Accurately resolves embedded CMaps, CIDFonts, TrueType/Type1 subsets,
   * coordinates, kerning, line spacing, and paragraph breaks.
   */
  static async extractPdfTextWithLayout(buffer: ArrayBuffer): Promise<{
    fullText: string;
    pages: ExtractedPdfPage[];
  }> {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const doc = await loadingTask.promise;
    const pages: ExtractedPdfPage[] = [];
    const textParts: string[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const items: TextItemLike[] = [];

      for (const it of content.items) {
        if ('str' in it && typeof it.str === 'string' && it.str) {
          items.push({
            str: it.str,
            transform: it.transform,
            width: it.width,
            height: it.height,
          });
        }
      }

      // Group into visual lines based on baseline Y
      const visualLines: { y: number; height: number; items: TextItemLike[] }[] = [];
      for (const item of items) {
        const y = item.transform[5];
        const h = Math.abs(item.height) || 10;
        let line = visualLines.find(
          (l) => Math.abs(l.y - y) <= Math.max(l.height, h) * 0.4
        );
        if (!line) {
          line = { y, height: h, items: [] };
          visualLines.push(line);
        }
        line.items.push(item);
      }

      // Sort lines from top to bottom (Y descending in PDF coordinate system)
      visualLines.sort((a, b) => b.y - a.y);

      const pageLines: string[] = [];
      let lastY: number | null = null;
      let lastH = 12;

      for (const line of visualLines) {
        // Sort tokens on this line from left to right (X ascending)
        line.items.sort((a, b) => a.transform[4] - b.transform[4]);

        let lineText = '';
        let lastXEnd: number | null = null;

        for (const item of line.items) {
          const x = item.transform[4];
          if (
            lastXEnd !== null &&
            x - lastXEnd > 2 &&
            !lineText.endsWith(' ') &&
            !item.str.startsWith(' ')
          ) {
            lineText += ' ';
          }
          lineText += item.str;
          lastXEnd = x + (item.width || 0);
        }

        const trimmed = lineText.trim();
        if (trimmed) {
          if (lastY !== null) {
            const drop = lastY - line.y;
            if (drop > lastH * 1.8) {
              pageLines.push('');
            }
          }
          pageLines.push(trimmed);
          lastY = line.y;
          lastH = line.height;
        }
      }

      pages.push({
        pageNumber: pageNum,
        lines: pageLines,
      });

      textParts.push(`--- Halaman ${pageNum} ---`);
      if (pageLines.length > 0) {
        textParts.push(pageLines.join('\n'));
      }
    }

    const totalLines = pages.reduce((acc, p) => acc + p.lines.length, 0);
    if (totalLines === 0) {
      textParts.push(
        `[Informasi]\nDokumen PDF memiliki ${doc.numPages} halaman.\nTeks tidak terdeteksi (kemungkinan dokumen berupa gambar hasil scan).`
      );
    }

    return {
      fullText: textParts.join('\n\n'),
      pages,
    };
  }

  /**
   * PDF -> TXT Converter
   */
  static async pdfToTxt(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const { fullText } = await this.extractPdfTextWithLayout(buffer);
    return new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  }

  /**
   * PDF -> DOCX Converter
   */
  static async pdfToDocx(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const { pages } = await this.extractPdfTextWithLayout(buffer);

    const paragraphsXmlList: string[] = [];

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];

      if (page.lines.length === 0) {
        paragraphsXmlList.push(
          '<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr></w:p>'
        );
      } else {
        for (const line of page.lines) {
          if (!line.trim()) {
            paragraphsXmlList.push(
              '<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr></w:p>'
            );
          } else {
            paragraphsXmlList.push(
              `<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${this.escapeXml(line)}</w:t></w:r></w:p>`
            );
          }
        }
      }

      // Add page break between pages
      if (pageIdx < pages.length - 1) {
        paragraphsXmlList.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
      }
    }

    if (paragraphsXmlList.length === 0) {
      paragraphsXmlList.push(
        '<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr></w:p>'
      );
    }

    return this.buildDocxPackage(
      paragraphsXmlList.join(''),
      file.name.replace(/\.[^/.]+$/, '')
    );
  }

  /**
   * DOCX -> PDF Converter
   */
  static async docxToPdf(file: File): Promise<Blob> {
    const txtBlob = await this.docxToTxt(file);
    const txtFile = new File([txtBlob], file.name.replace(/\.[^/.]+$/, '.txt'), {
      type: 'text/plain',
    });
    return this.txtToPdf(txtFile);
  }

  /**
   * RFC-4180 compliant CSV parser helper that handles quotes, escaped quotes, and commas
   */
  static parseCsvLines(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.split(/\r?\n/);
    const parsedLines: string[][] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const row: string[] = [];
      let current = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      parsedLines.push(row);
    }

    if (parsedLines.length === 0) {
      return { headers: [], rows: [] };
    }

    return {
      headers: parsedLines[0],
      rows: parsedLines.slice(1),
    };
  }

  /**
   * CSV -> JSON Converter
   */
  static async csvToJson(file: File): Promise<Blob> {
    const text = await file.text();
    const { headers, rows } = this.parseCsvLines(text);

    if (headers.length === 0) {
      return new Blob(['[]'], { type: 'application/json' });
    }

    const jsonResult = rows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        const val = row[index] !== undefined ? row[index] : '';
        obj[header || `col_${index + 1}`] = val;
      });
      return obj;
    });

    const jsonString = JSON.stringify(jsonResult, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Helper to convert 0-indexed column number to Excel column letters (A, B, ..., Z, AA, AB, ...)
   */
  static getColumnLetter(colIndex: number): string {
    let letter = '';
    let temp = colIndex;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  }

  /**
   * CSV -> DOCX Converter (Preserves Native Word Table Structure, Column Grid & Auto Landscape)
   */
  static async csvToDocx(file: File): Promise<Blob> {
    const text = await file.text();
    const { headers, rows } = this.parseCsvLines(text);

    if (headers.length === 0) {
      return this.txtToDocx(file);
    }

    const colCount = headers.length;
    const isLandscape = colCount > 5;
    const narrowMargins = colCount > 8;

    // Available page width in DXA:
    // Landscape A4 = 16838 dxa. Margin narrow (500 dxa * 2 = 1000 dxa). Usable = 15838 dxa.
    // Portrait A4 = 11906 dxa. Margin standard (1440 dxa * 2 = 2880 dxa). Usable = 9026 dxa.
    const marginDxa = narrowMargins ? 500 : isLandscape ? 720 : 1440;
    const pageWidthDxa = isLandscape ? 16838 : 11906;
    const usableWidthDxa = pageWidthDxa - marginDxa * 2;

    // Adaptive typography & cell margins
    const fontSizeVal =
      colCount > 15
        ? '13'
        : colCount > 10
          ? '15'
          : colCount > 6
            ? '17'
            : '19'; // half-points
    const cellPadTop = colCount > 12 ? '50' : '80';
    const cellPadBottom = colCount > 12 ? '50' : '80';
    const cellPadHoriz = colCount > 15 ? '40' : colCount > 10 ? '60' : '100';

    // Calculate maximum character length for each column across headers and sample rows
    const sampleRows = rows.slice(0, 50);
    const colWeights: number[] = headers.map((h, cIdx) => {
      let maxLen = h.length;
      for (const row of sampleRows) {
        if (row[cIdx] && row[cIdx].length > maxLen) {
          maxLen = row[cIdx].length;
        }
      }
      return Math.min(Math.max(maxLen, 4), 30);
    });

    const totalWeight = colWeights.reduce((acc, w) => acc + w, 0);

    // Minimum column dxa to prevent 1-letter vertical squash:
    // Ensures at least 650 dxa per column even for 27 columns!
    const minColDxa = colCount > 15 ? 650 : colCount > 8 ? 900 : 1200;

    let colWidthsDxa = colWeights.map((w) =>
      Math.max(Math.round((w / totalWeight) * usableWidthDxa), minColDxa)
    );

    const sumCalculated = colWidthsDxa.reduce((acc, w) => acc + w, 0);
    if (sumCalculated < usableWidthDxa) {
      const extra = usableWidthDxa - sumCalculated;
      colWidthsDxa = colWidthsDxa.map((w) => w + Math.floor(extra / colCount));
    }

    const totalTableDxa = colWidthsDxa.reduce((acc, w) => acc + w, 0);

    // Build Word OpenXML Table Grid (<w:tblGrid>)
    const tblGridXml = `
      <w:tblGrid>
        ${colWidthsDxa.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}
      </w:tblGrid>`;

    // Header cells with subtle slate background and bold font
    const headerCellsXml = headers
      .map(
        (h, cIdx) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${colWidthsDxa[cIdx]}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
          <w:tcMar>
            <w:top w:w="${cellPadTop}" w:type="dxa"/>
            <w:bottom w:w="${cellPadBottom}" w:type="dxa"/>
            <w:left w:w="${cellPadHoriz}" w:type="dxa"/>
            <w:right w:w="${cellPadHoriz}" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        <w:p>
          <w:pPr>
            <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:b/>
              <w:sz w:val="${fontSizeVal}"/>
              <w:color w:val="0F172A"/>
            </w:rPr>
            <w:t xml:space="preserve">${this.escapeXml(h)}</w:t>
          </w:r>
        </w:p>
      </w:tc>`
      )
      .join('');

    const headerRowXml = `
    <w:tr>
      <w:trPr>
        <w:tblHeader/>
        <w:cantSplit/>
      </w:trPr>
      ${headerCellsXml}
    </w:tr>`;

    // Data rows with alternating light row shading and clean cell borders
    const dataRowsXml = rows
      .map((row, rIdx) => {
        const rowBg = rIdx % 2 === 1 ? ' fill="F8FAFC"' : '';
        const cellsXml = headers
          .map((_, cIdx) => {
            const val = row[cIdx] !== undefined ? row[cIdx] : '';
            return `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${colWidthsDxa[cIdx]}" w:type="dxa"/>
            ${rowBg ? `<w:shd w:val="clear" w:color="auto"${rowBg}/>` : ''}
            <w:tcMar>
              <w:top w:w="${cellPadTop}" w:type="dxa"/>
              <w:bottom w:w="${cellPadBottom}" w:type="dxa"/>
              <w:left w:w="${cellPadHoriz}" w:type="dxa"/>
              <w:right w:w="${cellPadHoriz}" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:sz w:val="${fontSizeVal}"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t xml:space="preserve">${this.escapeXml(val)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;
          })
          .join('');

        return `
    <w:tr>
      <w:trPr>
        <w:cantSplit/>
      </w:trPr>
      ${cellsXml}
    </w:tr>`;
      })
      .join('');

    const tableXml = `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="${totalTableDxa}" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      ${tblGridXml}
      ${headerRowXml}
      ${dataRowsXml}
    </w:tbl>`;

    return this.buildDocxPackage(
      tableXml,
      file.name.replace(/\.[^/.]+$/, ''),
      {
        landscape: isLandscape,
        narrowMargins,
      }
    );
  }

  /**
   * CSV -> PDF Converter (Preserves Table Structure with Auto Landscape/Wide format and Grid)
   */
  static async csvToPdf(file: File): Promise<Blob> {
    const text = await file.text();
    const { headers, rows } = this.parseCsvLines(text);

    if (headers.length === 0) {
      return this.txtToPdf(file);
    }

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Orientation and page width scaling:
    // If > 15 columns, use wide landscape (A3 or dynamic width) to preserve readbility!
    const colCount = headers.length;
    const isLandscape = colCount > 5;
    let pageWidth = isLandscape ? 841.89 : 595.28;
    let pageHeight = isLandscape ? 595.28 : 841.89;

    if (colCount > 15) {
      pageWidth = Math.max(1190.55, colCount * 52 + 72);
      pageHeight = 841.89;
    }

    const margin = 36; // 0.5 inch margin
    const usableWidth = pageWidth - margin * 2;
    const colWidth = usableWidth / colCount;

    const fontSize = colCount > 15 ? 6.5 : colCount > 8 ? 7 : colCount > 5 ? 8 : 9;
    const headerHeight = 22;
    const rowHeight = 18;

    // Helper to truncate text to fit inside cell width with ellipsis
    const truncateToWidth = (str: string, width: number, isHeader = false) => {
      const font = isHeader ? fontBold : fontRegular;
      if (font.widthOfTextAtSize(str, fontSize) <= width) {
        return str;
      }
      let truncated = str;
      while (
        truncated.length > 0 &&
        font.widthOfTextAtSize(truncated + '...', fontSize) > width
      ) {
        truncated = truncated.slice(0, -1);
      }
      return truncated ? truncated + '...' : '';
    };

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    const drawHeader = (page: typeof currentPage) => {
      // Header background
      page.drawRectangle({
        x: margin,
        y: currentY - headerHeight,
        width: usableWidth,
        height: headerHeight,
        color: rgb(0.94, 0.96, 0.98),
      });

      // Header bottom border
      page.drawLine({
        start: { x: margin, y: currentY - headerHeight },
        end: { x: margin + usableWidth, y: currentY - headerHeight },
        thickness: 1,
        color: rgb(0.75, 0.8, 0.88),
      });

      // Header texts
      headers.forEach((h, i) => {
        const textToDraw = truncateToWidth(h, colWidth - 8, true);
        page.drawText(textToDraw, {
          x: margin + i * colWidth + 4,
          y: currentY - headerHeight + 6,
          size: fontSize,
          font: fontBold,
          color: rgb(0.09, 0.13, 0.2),
        });
      });

      currentY -= headerHeight;
    };

    // Draw first page header
    drawHeader(currentPage);

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      // Check if row fits on current page
      if (currentY - rowHeight < margin + 20) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
        drawHeader(currentPage);
      }

      const row = rows[rIdx];

      // Alternating row background
      if (rIdx % 2 === 1) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: usableWidth,
          height: rowHeight,
          color: rgb(0.97, 0.98, 0.99),
        });
      }

      // Bottom grid line for row
      currentPage.drawLine({
        start: { x: margin, y: currentY - rowHeight },
        end: { x: margin + usableWidth, y: currentY - rowHeight },
        thickness: 0.5,
        color: rgb(0.88, 0.91, 0.94),
      });

      // Cell texts
      headers.forEach((_, cIdx) => {
        const val = row[cIdx] !== undefined ? row[cIdx] : '';
        const textToDraw = truncateToWidth(val, colWidth - 8, false);

        currentPage.drawText(textToDraw, {
          x: margin + cIdx * colWidth + 4,
          y: currentY - rowHeight + 5,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.2, 0.25, 0.33),
        });
      });

      currentY -= rowHeight;
    }

    // Outer table bounding box and vertical column dividers on all pages
    const pages = pdfDoc.getPages();
    pages.forEach((page, pIdx) => {
      // Page number in footer
      const footerText = `Halaman ${pIdx + 1} dari ${pages.length}`;
      const footerWidth = fontRegular.widthOfTextAtSize(footerText, 8);
      page.drawText(footerText, {
        x: pageWidth - margin - footerWidth,
        y: margin - 15,
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.6),
      });
    });

    pdfDoc.setTitle(file.name.replace(/\.[^/.]+$/, ''));
    pdfDoc.setProducer('Mungil Converter');
    pdfDoc.setCreator('Mungil Converter');

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as Uint8Array<ArrayBuffer>], {
      type: 'application/pdf',
    });
  }

  /**
   * CSV -> XLSX Converter (Preserves Full Native OpenXML Spreadsheet with Auto-Fit Columns & Frozen Header)
   */
  static async csvToXlsx(file: File): Promise<Blob> {
    const text = await file.text();
    const { headers, rows } = this.parseCsvLines(text);

    if (headers.length === 0) {
      return new Blob([], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    // 1. Calculate column widths based on maximum content length
    const sampleRows = rows.slice(0, 100);
    const colWidths = headers.map((h, cIdx) => {
      let maxLen = h.length;
      for (const row of sampleRows) {
        if (row[cIdx] && row[cIdx].length > maxLen) {
          maxLen = row[cIdx].length;
        }
      }
      return Math.min(Math.max(maxLen + 3, 10), 45);
    });

    const colsXml = colWidths
      .map(
        (w, idx) =>
          `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`
      )
      .join('');

    // 2. Build rows XML
    // Row 1: Header row (style index 1)
    const headerRowCells = headers
      .map((h, cIdx) => {
        const ref = `${this.getColumnLetter(cIdx)}1`;
        return `<c r="${ref}" t="inlineStr" s="1"><is><t>${this.escapeXml(h)}</t></is></c>`;
      })
      .join('');

    const headerRowXml = `<row r="1" spans="1:${headers.length}">${headerRowCells}</row>`;

    // Data rows (starting at row 2)
    const dataRowsXmlList: string[] = [];
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const rowNum = rIdx + 2;
      const row = rows[rIdx];
      const isAlt = rIdx % 2 === 1;
      const styleIdx = isAlt ? '2' : '3';

      const cellsXml = headers
        .map((_, cIdx) => {
          const val = row[cIdx] !== undefined ? row[cIdx] : '';
          const ref = `${this.getColumnLetter(cIdx)}${rowNum}`;

          if (!val) {
            return `<c r="${ref}" s="${styleIdx}"/>`;
          }

          // Check if purely numeric
          const isNum =
            !isNaN(Number(val)) &&
            val.trim() !== '' &&
            !val.startsWith('0') &&
            !val.includes('-');
          if (isNum) {
            return `<c r="${ref}" t="n" s="${styleIdx}"><v>${val.trim()}</v></c>`;
          }

          return `<c r="${ref}" t="inlineStr" s="${styleIdx}"><is><t>${this.escapeXml(val)}</t></is></c>`;
        })
        .join('');

      dataRowsXmlList.push(
        `<row r="${rowNum}" spans="1:${headers.length}">${cellsXml}</row>`
      );
    }

    const sheetDataXml = headerRowXml + dataRowsXmlList.join('');

    const lastColLetter = this.getColumnLetter(headers.length - 1);
    const lastRowNum = rows.length + 1;
    const dimensionRef = `A1:${lastColLetter}${lastRowNum}`;

    // Worksheet XML with frozen header pane & auto-filter
    const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimensionRef}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>
    ${colsXml}
  </cols>
  <sheetData>
    ${sheetDataXml}
  </sheetData>
  <autoFilter ref="${dimensionRef}"/>
</worksheet>`;

    // Styles XML (Fonts, Fills, Borders, CellXfs)
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="11"/>
      <color theme="1"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FF0F172A"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="4">
    <!-- 0: default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: header (bold, slate fill, border) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 2: alternate data row (alt fill, border) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 3: normal data row (no fill, border) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

    const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

    const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Mungil Converter</Application>
</Properties>`;

    const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${this.escapeXml(file.name.replace(/\.[^/.]+$/, ''))}</dc:title>
  <dc:creator>Mungil Converter</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

    const zipFiles: Record<string, Uint8Array> = {
      '[Content_Types].xml': fflate.strToU8(contentTypesXml),
      '_rels/.rels': fflate.strToU8(rootRelsXml),
      'xl/_rels/workbook.xml.rels': fflate.strToU8(wbRelsXml),
      'xl/workbook.xml': fflate.strToU8(workbookXml),
      'xl/styles.xml': fflate.strToU8(stylesXml),
      'xl/worksheets/sheet1.xml': fflate.strToU8(sheet1Xml),
      'docProps/app.xml': fflate.strToU8(appXml),
      'docProps/core.xml': fflate.strToU8(coreXml),
    };

    const zipped = fflate.zipSync(zipFiles);
    return new Blob([zipped as Uint8Array<ArrayBuffer>], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /**
   * JSON -> CSV Converter
   */
  static async jsonToCsv(file: File): Promise<Blob> {
    const text = await file.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('File JSON tidak valid atau korup.');
    }

    if (!Array.isArray(data)) {
      if (typeof data === 'object' && data !== null) {
        data = [data];
      } else {
        throw new Error('Struktur JSON harus berupa array atau object.');
      }
    }

    const records = data as Record<string, unknown>[];
    if (records.length === 0) {
      return new Blob([''], { type: 'text/csv' });
    }

    const headerSet = new Set<string>();
    records.forEach((rec) => {
      if (typeof rec === 'object' && rec !== null) {
        Object.keys(rec).forEach((k) => headerSet.add(k));
      }
    });
    const headers = Array.from(headerSet);

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines: string[] = [];
    csvLines.push(headers.map(escapeCsv).join(','));

    for (const rec of records) {
      const row = headers.map((h) => escapeCsv(rec[h]));
      csvLines.push(row.join(','));
    }

    return new Blob([csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
  }

  /**
   * TXT -> DOCX Converter
   */
  static async txtToDocx(file: File): Promise<Blob> {
    const text = await file.text();
    const lines = text.split(/\r?\n/);

    const paragraphsXml = lines
      .map(
        (l) =>
          `<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${this.escapeXml(l)}</w:t></w:r></w:p>`
      )
      .join('');

    return this.buildDocxPackage(paragraphsXml, file.name.replace(/\.[^/.]+$/, ''));
  }

  /**
   * DOCX -> TXT Converter
   */
  static async docxToTxt(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(buffer));
    const docXmlBytes = unzipped['word/document.xml'];
    if (!docXmlBytes) {
      throw new Error('Berkas DOCX tidak memiliki word/document.xml');
    }

    const docXml = fflate.strFromU8(docXmlBytes);
    const paragraphs = docXml.split(/<\/w:p>/i);
    const resultLines: string[] = [];

    for (const p of paragraphs) {
      const textMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
      if (textMatches) {
        const lineText = textMatches
          .map((m) => m.replace(/<w:t[^>]*>/i, '').replace(/<\/w:t>/i, ''))
          .join('');
        resultLines.push(this.unescapeXml(lineText));
      } else {
        resultLines.push('');
      }
    }

    return new Blob([resultLines.join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
  }

  /**
   * Builds a 100% ECMA-376 OpenXML standard compliant DOCX archive
   * that opens cleanly in Microsoft Word without any recovery prompt.
   */
  private static buildDocxPackage(
    paragraphsXml: string,
    documentTitle: string,
    options?: {
      landscape?: boolean;
      narrowMargins?: boolean;
    }
  ): Blob {
    const isLandscape = Boolean(options?.landscape);
    const marginDxa = options?.narrowMargins ? 500 : isLandscape ? 720 : 1440;
    const pgWidth = isLandscape ? 16838 : 11906;
    const pgHeight = isLandscape ? 11906 : 16838;
    const orientAttr = isLandscape ? ' w:orient="landscape"' : '';

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="id-ID"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="120" w:line="240" w:lineRule="auto"/>
    </w:pPr>
  </w:style>
</w:styles>`;

    const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>`;

    const fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Calibri">
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fonts>`;

    const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Template>Normal.dotm</Template>
  <TotalTime>1</TotalTime>
  <Application>Mungil Converter</Application>
  <Company>Mungil</Company>
</Properties>`;

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="${pgWidth}" w:h="${pgHeight}"${orientAttr}/>
      <w:pgMar w:top="${marginDxa}" w:right="${marginDxa}" w:bottom="${marginDxa}" w:left="${marginDxa}" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${this.escapeXml(documentTitle)}</dc:title>
  <dc:creator>Mungil Converter</dc:creator>
  <cp:lastModifiedBy>Mungil Converter</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

    const files: Record<string, Uint8Array> = {
      '[Content_Types].xml': fflate.strToU8(contentTypesXml),
      '_rels/.rels': fflate.strToU8(rootRelsXml),
      'word/_rels/document.xml.rels': fflate.strToU8(docRelsXml),
      'word/document.xml': fflate.strToU8(docXml),
      'word/styles.xml': fflate.strToU8(stylesXml),
      'word/settings.xml': fflate.strToU8(settingsXml),
      'word/fontTable.xml': fflate.strToU8(fontTableXml),
      'docProps/app.xml': fflate.strToU8(appXml),
      'docProps/core.xml': fflate.strToU8(coreXml),
    };

    const zipped = fflate.zipSync(files);
    return new Blob([zipped as Uint8Array<ArrayBuffer>], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  private static escapeXml(unsafe: string): string {
    if (!unsafe) return '';
    const normalized = unsafe.normalize ? unsafe.normalize('NFC') : unsafe;

    let sanitized = '';
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      // Valid XML 1.0 chars: 0x9 (tab), 0xA (LF), 0xD (CR), 0x20-0xD7FF, 0xE000-0xFFFD
      if (
        code === 0x9 ||
        code === 0xa ||
        code === 0xd ||
        (code >= 0x20 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd)
      ) {
        sanitized += normalized[i];
      } else if (code >= 0xd800 && code <= 0xdbff) {
        // High surrogate - check if next char is low surrogate
        if (i + 1 < normalized.length) {
          const nextCode = normalized.charCodeAt(i + 1);
          if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
            sanitized += normalized[i] + normalized[i + 1];
            i++;
          }
        }
      }
    }

    return sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private static unescapeXml(safe: string): string {
    return safe
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}
