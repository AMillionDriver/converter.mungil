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
    documentTitle: string
  ): Blob {
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
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
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
