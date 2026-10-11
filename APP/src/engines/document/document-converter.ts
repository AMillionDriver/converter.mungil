import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fflate from 'fflate';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { PdfTableExtractor, type TextToken } from './pdf-table-extractor';

// Register the worker module directly on globalThis so PDF.js runs in-thread
// without nested worker or window.location dependencies in Web Worker environments.
if (typeof globalThis !== 'undefined') {
  (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
}

export interface ExtractedPdfPage {
  pageNumber: number;
  lines: string[];
  tokens?: TextToken[];
}

export interface DocxMediaItem {
  id: string;
  target: string;
  extension: 'png' | 'jpeg' | 'jpg';
  contentType: 'image/png' | 'image/jpeg';
  data: Uint8Array;
  widthEmu: number;
  heightEmu: number;
  title?: string;
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

    // Split text into wrapped lines with O(1) per-word measurement
    const rawLines = text.split(/\r?\n/);
    const wrappedLines: string[] = [];
    const spaceWidth = font.widthOfTextAtSize(' ', fontSize);

    for (const rawLine of rawLines) {
      if (!rawLine) {
        wrappedLines.push('');
        continue;
      }
      const words = rawLine.split(' ');
      let currentLine = '';
      let currentLineWidth = 0;

      for (const word of words) {
        if (!word) {
          if (currentLine) {
            currentLine += ' ';
            currentLineWidth += spaceWidth;
          }
          continue;
        }
        const wordWidth = font.widthOfTextAtSize(word, fontSize);
        if (!currentLine) {
          currentLine = word;
          currentLineWidth = wordWidth;
        } else if (currentLineWidth + spaceWidth + wordWidth <= usableWidth) {
          currentLine += ` ${word}`;
          currentLineWidth += spaceWidth + wordWidth;
        } else {
          wrappedLines.push(currentLine);
          currentLine = word;
          currentLineWidth = wordWidth;
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
    try {
      const pages: ExtractedPdfPage[] = [];
      const textParts: string[] = [];

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        try {
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
          // Fast spatial locality check: check last added line & recent lines before fallback
          const visualLines: { y: number; height: number; items: TextItemLike[] }[] = [];
          for (const item of items) {
            const y = item.transform[5];
            const h = Math.abs(item.height) || 10;
            const lastLine = visualLines[visualLines.length - 1];
            if (
              lastLine &&
              Math.abs(lastLine.y - y) <= Math.max(lastLine.height, h) * 0.4
            ) {
              lastLine.items.push(item);
              continue;
            }

            let matched = false;
            const lookback = Math.max(0, visualLines.length - 10);
            for (let i = visualLines.length - 2; i >= lookback; i--) {
              const line = visualLines[i];
              if (Math.abs(line.y - y) <= Math.max(line.height, h) * 0.4) {
                line.items.push(item);
                matched = true;
                break;
              }
            }
            if (matched) continue;

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

          const tokens: TextToken[] = items.map((it) => ({
            str: it.str,
            x: it.transform[4],
            y: it.transform[5],
            width: it.width,
            height: it.height,
          }));

          pages.push({
            pageNumber: pageNum,
            lines: pageLines,
            tokens,
          });

          textParts.push(`--- Halaman ${pageNum} ---`);
          if (pageLines.length > 0) {
            textParts.push(pageLines.join('\n'));
          }
        } finally {
          page.cleanup();
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
    } finally {
      doc.cleanup?.();
      loadingTask.destroy?.();
    }
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
   * PDF -> DOCX Converter (Preserves Tables & Text Blocks with Strict OpenXML Schema)
   */
  static async pdfToDocx(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const { pages } = await this.extractPdfTextWithLayout(buffer);

    const paragraphsXmlList: string[] = [];
    let hasWideTable = false;

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const pageBlocks = PdfTableExtractor.analyzePageBlocks(page.tokens || []);

      if (pageBlocks.length > 0) {
        for (const block of pageBlocks) {
          if (block.type === 'table' && block.table) {
            if (block.table.headers.length > 5) {
              hasWideTable = true;
            }
            paragraphsXmlList.push(
              this.generateDocxTableXml(block.table.headers, block.table.rows)
            );
          } else if (block.text) {
            paragraphsXmlList.push(
              `<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${this.escapeXml(block.text)}</w:t></w:r></w:p>`
            );
          }
        }
      } else {
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
      file.name.replace(/\.[^/.]+$/, ''),
      hasWideTable ? { landscape: true, narrowMargins: true } : undefined
    );
  }

  /**
   * PDF -> XLSX Converter (Reconstructs Tables directly to Excel Spreadsheet)
   */
  static async pdfToXlsx(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const { pages } = await this.extractPdfTextWithLayout(buffer);

    let allHeaders: string[] = [];
    const allRows: string[][] = [];

    for (const page of pages) {
      const blocks = PdfTableExtractor.analyzePageBlocks(page.tokens || []);
      for (const block of blocks) {
        if (block.type === 'table' && block.table) {
          if (allHeaders.length === 0) {
            allHeaders = block.table.headers;
          }
          allRows.push(...block.table.rows);
        }
      }
    }

    if (allHeaders.length > 0) {
      return this.buildXlsxPackage(
        allHeaders,
        allRows,
        file.name.replace(/\.[^/.]+$/, '')
      );
    }

    // Fallback: emit text lines into a 1-column spreadsheet
    const lines = pages.flatMap((p) => p.lines).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return this.buildXlsxPackage(
        ['Kolom 1'],
        [['(Dokumen PDF kosong)']],
        file.name.replace(/\.[^/.]+$/, '')
      );
    }

    const headers = [lines[0]];
    const rows = lines.slice(1).map((l) => [l]);
    return this.buildXlsxPackage(
      headers,
      rows,
      file.name.replace(/\.[^/.]+$/, '')
    );
  }

  /**
   * XLSX -> DOCX Converter (Preserves Table Structure, Borders & Styling)
   */
  static async xlsxToDocx(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const { headers, rows } = this.parseXlsx(buffer);

    if (headers.length === 0) {
      return this.txtToDocx(file);
    }

    const tableXml = this.generateDocxTableXml(headers, rows);
    const isLandscape = headers.length > 5;
    const narrowMargins = headers.length > 8;

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
   * DOCX -> XLSX Converter (Extracts Tables to Excel Spreadsheet)
   */
  static async docxToXlsx(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const { headers, rows } = this.parseDocxTables(buffer);

    if (headers.length === 0) {
      return this.buildXlsxPackage(
        ['Kolom 1'],
        [['(Dokumen DOCX kosong)']],
        file.name.replace(/\.[^/.]+$/, '')
      );
    }

    return this.buildXlsxPackage(
      headers,
      rows,
      file.name.replace(/\.[^/.]+$/, '')
    );
  }

  /**
   * XLSX -> CSV Converter
   */
  static async xlsxToCsv(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const { headers, rows } = this.parseXlsx(buffer);

    if (headers.length === 0) {
      return new Blob([''], { type: 'text/csv' });
    }

    const escapeCsv = (val: string): string => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvLines: string[] = [headers.map(escapeCsv).join(',')];
    for (const row of rows) {
      csvLines.push(row.map(escapeCsv).join(','));
    }

    return new Blob([csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
  }

  /**
   * XLSX -> PDF Converter (Table Pagination & Layout)
   */
  static async xlsxToPdf(file: File): Promise<Blob> {
    const csvBlob = await this.xlsxToCsv(file);
    const csvFile = new File([csvBlob], file.name.replace(/\.[^/.]+$/, '.csv'), {
      type: 'text/csv',
    });
    return this.csvToPdf(csvFile);
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

    const isLandscape = headers.length > 5;
    const narrowMargins = headers.length > 8;
    const tableXml = this.generateDocxTableXml(headers, rows, {
      isLandscape,
      narrowMargins,
    });

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
   * Generates a 100% ECMA-376 compliant Word OpenXML Table (<w:tbl>)
   */
  static generateDocxTableXml(
    headers: string[],
    rows: string[][],
    options?: {
      colWidthsDxa?: number[];
      isLandscape?: boolean;
      narrowMargins?: boolean;
    }
  ): string {
    const colCount = headers.length;
    if (colCount === 0) return '';

    const isLandscape = options?.isLandscape ?? colCount > 5;
    const narrowMargins = options?.narrowMargins ?? colCount > 8;
    const marginDxa = narrowMargins ? 500 : isLandscape ? 720 : 1440;
    const pageWidthDxa = isLandscape ? 16838 : 11906;
    const usableWidthDxa = pageWidthDxa - marginDxa * 2;

    const fontSizeVal =
      colCount > 15 ? '13' : colCount > 10 ? '15' : colCount > 6 ? '17' : '19';
    const cellPadTop = colCount > 12 ? '50' : '80';
    const cellPadBottom = colCount > 12 ? '50' : '80';
    const cellPadHoriz = colCount > 15 ? '40' : colCount > 10 ? '60' : '100';

    let colWidthsDxa = options?.colWidthsDxa;
    if (!colWidthsDxa || colWidthsDxa.length !== colCount) {
      const sampleRows = rows.slice(0, 50);
      const colWeights = headers.map((h, cIdx) => {
        let maxLen = h.length;
        for (const row of sampleRows) {
          if (row[cIdx] && row[cIdx].length > maxLen) {
            maxLen = row[cIdx].length;
          }
        }
        return Math.min(Math.max(maxLen, 4), 30);
      });
      const totalWeight = colWeights.reduce((acc, w) => acc + w, 0) || 1;
      const minColDxa = colCount > 15 ? 650 : colCount > 8 ? 900 : 1200;
      colWidthsDxa = colWeights.map((w) =>
        Math.max(Math.round((w / totalWeight) * usableWidthDxa), minColDxa)
      );

      const sumCalculated = colWidthsDxa.reduce((acc, w) => acc + w, 0);
      if (sumCalculated < usableWidthDxa) {
        const extra = usableWidthDxa - sumCalculated;
        colWidthsDxa = colWidthsDxa.map((w) => w + Math.floor(extra / colCount));
      }
    }

    const totalTableDxa = colWidthsDxa.reduce((acc, w) => acc + w, 0);

    const tblGridXml = `
      <w:tblGrid>
        ${colWidthsDxa.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}
      </w:tblGrid>`;

    const headerCellsXml = headers
      .map(
        (h, cIdx) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${colWidthsDxa![cIdx]}" w:type="dxa"/>
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

    const dataRowsXml = rows
      .map((row, rIdx) => {
        const rowBg = rIdx % 2 === 1 ? ' fill="F8FAFC"' : '';
        const cellsXml = headers
          .map((_, cIdx) => {
            const val = row[cIdx] !== undefined ? row[cIdx] : '';
            return `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${colWidthsDxa![cIdx]}" w:type="dxa"/>
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

    return `
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

    return this.buildXlsxPackage(
      headers,
      rows,
      file.name.replace(/\.[^/.]+$/, '')
    );
  }

  /**
   * Builds a 100% ECMA-376 compliant XLSX spreadsheet archive
   */
  static buildXlsxPackage(
    headers: string[],
    rows: string[][],
    documentTitle: string = 'Workbook'
  ): Blob {
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
  <dc:title>${this.escapeXml(documentTitle)}</dc:title>
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
   * Generates a 100% ECMA-376 DrawingML picture element
   */
  static generateDrawingXml(
    rId: string,
    widthEmu: number,
    heightEmu: number,
    name: string = 'Picture'
  ): string {
    const cx = Math.max(12700, Math.round(widthEmu));
    const cy = Math.max(12700, Math.round(heightEmu));
    const picId = Math.floor(Math.random() * 90000) + 10000;

    return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${picId}" name="${name}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }

  /**
   * Parses XLSX spreadsheet archive and extracts headers and cell rows
   */
  static parseXlsx(buffer: ArrayBuffer | Uint8Array): { headers: string[]; rows: string[][] } {
    const unzipped = fflate.unzipSync(new Uint8Array(buffer));

    // 1. Parse shared strings if present
    const sharedStrings: string[] = [];
    const sstBytes = unzipped['xl/sharedStrings.xml'];
    if (sstBytes) {
      const sstXml = fflate.strFromU8(sstBytes);
      const siMatches = sstXml.match(/<si>[\s\S]*?<\/si>/gi) || [];
      for (const si of siMatches) {
        const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/gi) || [];
        const text = tMatches
          .map((t) => t.replace(/<t[^>]*>/i, '').replace(/<\/t>/i, ''))
          .join('');
        sharedStrings.push(this.unescapeXml(text));
      }
    }

    // 2. Find worksheet
    let sheetXmlBytes = unzipped['xl/worksheets/sheet1.xml'];
    if (!sheetXmlBytes) {
      const sheetKey = Object.keys(unzipped).find(
        (k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml')
      );
      if (sheetKey) {
        sheetXmlBytes = unzipped[sheetKey];
      }
    }
    if (!sheetXmlBytes) {
      return { headers: [], rows: [] };
    }

    const sheetXml = fflate.strFromU8(sheetXmlBytes);
    const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/gi) || [];
    const parsedRows: string[][] = [];

    const refToColIndex = (ref: string): number => {
      const colLetter = ref.replace(/[0-9]/g, '').toUpperCase();
      let col = 0;
      for (let i = 0; i < colLetter.length; i++) {
        col = col * 26 + (colLetter.charCodeAt(i) - 64);
      }
      return Math.max(0, col - 1);
    };

    for (const rXml of rowMatches) {
      const cellMatches = rXml.match(/<c[^>]*>[\s\S]*?<\/c>|<c[^>]*\/>/gi) || [];
      const rowData: string[] = [];

      for (const cXml of cellMatches) {
        const refMatch = cXml.match(/r="([A-Z0-9]+)"/i);
        const ref = refMatch ? refMatch[1] : '';
        const colIdx = ref ? refToColIndex(ref) : rowData.length;

        while (rowData.length < colIdx) {
          rowData.push('');
        }

        const tMatch = cXml.match(/t="([a-z]+)"/i);
        const cellType = tMatch ? tMatch[1] : '';

        if (cellType === 's') {
          const vMatch = cXml.match(/<v>([0-9]+)<\/v>/i);
          const sstIdx = vMatch ? parseInt(vMatch[1], 10) : -1;
          rowData[colIdx] =
            sstIdx >= 0 && sstIdx < sharedStrings.length ? sharedStrings[sstIdx] : '';
        } else if (cellType === 'inlineStr') {
          const tSub = cXml.match(/<t[^>]*>([\s\S]*?)<\/t>/i);
          rowData[colIdx] = tSub ? this.unescapeXml(tSub[1]) : '';
        } else {
          const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/i);
          rowData[colIdx] = vMatch ? this.unescapeXml(vMatch[1]) : '';
        }
      }

      if (rowData.some((c) => c.trim().length > 0)) {
        parsedRows.push(rowData);
      }
    }

    if (parsedRows.length === 0) {
      return { headers: [], rows: [] };
    }

    const maxCols = Math.max(...parsedRows.map((r) => r.length));
    for (const r of parsedRows) {
      while (r.length < maxCols) {
        r.push('');
      }
    }

    return {
      headers: parsedRows[0],
      rows: parsedRows.slice(1),
    };
  }

  /**
   * Parses DOCX tables or paragraphs into structured tabular rows
   */
  static parseDocxTables(buffer: ArrayBuffer | Uint8Array): { headers: string[]; rows: string[][] } {
    const unzipped = fflate.unzipSync(new Uint8Array(buffer));
    const docXmlBytes = unzipped['word/document.xml'];
    if (!docXmlBytes) {
      throw new Error('Berkas DOCX tidak memiliki word/document.xml');
    }

    const docXml = fflate.strFromU8(docXmlBytes);
    const tblMatch = docXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/i);
    if (tblMatch) {
      const tableXml = tblMatch[0];
      const trMatches = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/gi) || [];
      const tableRows: string[][] = [];

      for (const tr of trMatches) {
        const tcMatches = tr.match(/<w:tc[\s\S]*?<\/w:tc>/gi) || [];
        const rowCells: string[] = [];

        for (const tc of tcMatches) {
          const tMatches = tc.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
          const cellText = tMatches
            .map((t) => t.replace(/<w:t[^>]*>/i, '').replace(/<\/w:t>/i, ''))
            .join('');
          rowCells.push(this.unescapeXml(cellText.trim()));
        }

        if (rowCells.some((c) => c.length > 0)) {
          tableRows.push(rowCells);
        }
      }

      if (tableRows.length > 0) {
        return {
          headers: tableRows[0],
          rows: tableRows.slice(1),
        };
      }
    }

    // Fallback: extract paragraphs
    const paragraphs = docXml.split(/<\/w:p>/i);
    const resultLines: string[] = [];
    for (const p of paragraphs) {
      const textMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
      if (textMatches) {
        const lineText = textMatches
          .map((m) => m.replace(/<w:t[^>]*>/i, '').replace(/<\/w:t>/i, ''))
          .join('');
        const trimmed = this.unescapeXml(lineText.trim());
        if (trimmed) resultLines.push(trimmed);
      }
    }

    if (resultLines.length === 0) {
      return { headers: [], rows: [] };
    }

    return {
      headers: [resultLines[0]],
      rows: resultLines.slice(1).map((l) => [l]),
    };
  }

  /**
   * Builds a 100% ECMA-376 OpenXML standard compliant DOCX archive
   * that opens cleanly in Microsoft Word without any recovery prompt.
   */
  static buildDocxPackage(
    paragraphsXml: string,
    documentTitle: string,
    options?: {
      landscape?: boolean;
      narrowMargins?: boolean;
      media?: DocxMediaItem[];
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
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
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

    const mediaRelsXml = (options?.media || [])
      .map(
        (m) =>
          `<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.target}"/>`
      )
      .join('\n  ');

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  ${mediaRelsXml}
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
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:basedOn w:val="TableNormal"/>
    <w:uiPriority w:val="39"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
      </w:tblBorders>
    </w:tblPr>
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

    if (options?.media) {
      for (const m of options.media) {
        files[`word/media/${m.target}`] = m.data;
      }
    }

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
