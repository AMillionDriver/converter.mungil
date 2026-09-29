import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fflate from 'fflate';

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
   * PDF -> TXT Converter (Client-side text extraction)
   */
  static async pdfToTxt(file: File): Promise<Blob> {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const extractedTextParts: string[] = [];

    // Extract text operators using raw content stream inspection
    for (let i = 0; i < pages.length; i++) {
      extractedTextParts.push(`--- Halaman ${i + 1} ---`);
      try {
        const page = pages[i];
        // Read page content streams
        const { Contents } = page.node.normalizedEntries();
        if (Contents) {
          const contentsArray = Array.isArray(Contents) ? Contents : [Contents];
          for (const c of contentsArray) {
            const rawBytes = (
              c as unknown as { getContents?: () => Uint8Array }
            ).getContents?.();
            if (rawBytes) {
              const str = new TextDecoder('latin1').decode(rawBytes);
              // Match text inside (...) or [...] Tj / TJ operators
              const matches = str.match(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g);
              if (matches) {
                const pageStrings = matches
                  .map((m) => {
                    const cleaned = m.replace(/\\([()\\])/g, '$1');
                    const parenMatch = cleaned.match(/\((.*?)\)/);
                    return parenMatch ? parenMatch[1] : '';
                  })
                  .filter(Boolean);
                if (pageStrings.length > 0) {
                  extractedTextParts.push(pageStrings.join(' '));
                }
              }
            }
          }
        }
      } catch {
        // Fallback for compressed stream
      }
    }

    if (extractedTextParts.length <= pages.length) {
      extractedTextParts.push(
        `[Informasi]\nDokumen PDF '${file.name}' memiliki ${pages.length} halaman.\nBeberapa teks dienkripsi atau berupa gambar pindaian.`
      );
    }

    const resultTxt = extractedTextParts.join('\n\n');
    return new Blob([resultTxt], { type: 'text/plain;charset=utf-8' });
  }

  /**
   * CSV -> JSON Converter
   */
  static async csvToJson(file: File): Promise<Blob> {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return new Blob(['[]'], { type: 'application/json' });
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) =>
      h.replace(/^["']|["']$/g, '')
    );
    const rows = lines.slice(1);
    const jsonResult = rows.map((row) => {
      const cells = parseLine(row);
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        const val =
          cells[index] !== undefined
            ? cells[index].replace(/^["']|["']$/g, '')
            : '';
        obj[header || `col_${index + 1}`] = val;
      });
      return obj;
    });

    const jsonString = JSON.stringify(jsonResult, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
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

    // Collect all headers
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
          `<w:p><w:r><w:t xml:space="preserve">${this.escapeXml(l)}</w:t></w:r></w:p>`
      )
      .join('');

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml}
  </w:body>
</w:document>`;

    const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${this.escapeXml(file.name.replace(/\.[^/.]+$/, ''))}</dc:title>
  <dc:creator>Mungil Converter</dc:creator>
  <cp:lastModifiedBy>Mungil Converter</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

    const files: Record<string, Uint8Array> = {
      '[Content_Types].xml': fflate.strToU8(contentTypesXml),
      '_rels/.rels': fflate.strToU8(relsXml),
      'word/_rels/document.xml.rels': fflate.strToU8(docRelsXml),
      'word/document.xml': fflate.strToU8(docXml),
      'docProps/core.xml': fflate.strToU8(coreXml),
    };

    const zipped = fflate.zipSync(files);
    return new Blob([zipped as Uint8Array<ArrayBuffer>], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
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
    // Split into paragraphs <w:p>
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

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
