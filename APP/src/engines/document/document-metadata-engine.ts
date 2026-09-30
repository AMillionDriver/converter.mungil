import { PDFDocument } from 'pdf-lib';
import * as fflate from 'fflate';

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  producer?: string;
  creator?: string;
  company?: string;
  creationDate?: Date | string;
  modificationDate?: Date | string;
  pageCount?: number;
}

export interface DocumentMetadataResult {
  format: string;
  size: number;
  created: Date;
  modified: Date;
  pageCount?: number;
  metadata: DocumentMetadata;
}

export class DocumentMetadataEngine {
  /**
   * Reads metadata from a document File (PDF, DOCX, or text/data file).
   */
  static async read(file: File): Promise<DocumentMetadataResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const buffer = await file.arrayBuffer();
    const resultMeta: DocumentMetadata = {};
    let pageCount: number | undefined;

    if (ext === 'pdf') {
      try {
        const pdfDoc = await PDFDocument.load(buffer, {
          ignoreEncryption: true,
        });
        resultMeta.title = pdfDoc.getTitle() || undefined;
        resultMeta.author = pdfDoc.getAuthor() || undefined;
        resultMeta.subject = pdfDoc.getSubject() || undefined;
        resultMeta.keywords = pdfDoc.getKeywords() || undefined;
        resultMeta.producer = pdfDoc.getProducer() || undefined;
        resultMeta.creator = pdfDoc.getCreator() || undefined;
        resultMeta.creationDate = pdfDoc.getCreationDate() || undefined;
        resultMeta.modificationDate = pdfDoc.getModificationDate() || undefined;
        pageCount = pdfDoc.getPageCount();
      } catch (err) {
        console.warn(
          '[DocumentMetadataEngine] Gagal membaca metadata PDF:',
          err
        );
      }
    } else if (ext === 'docx') {
      try {
        const unzipped = fflate.unzipSync(new Uint8Array(buffer));
        const coreXmlBytes = unzipped['docProps/core.xml'];
        if (coreXmlBytes) {
          const coreXml = fflate.strFromU8(coreXmlBytes);
          resultMeta.title = this.extractXmlTag(coreXml, 'dc:title');
          resultMeta.author = this.extractXmlTag(coreXml, 'dc:creator');
          resultMeta.subject = this.extractXmlTag(coreXml, 'dc:subject');
          resultMeta.keywords = this.extractXmlTag(coreXml, 'cp:keywords');
          resultMeta.producer = this.extractXmlTag(
            coreXml,
            'cp:lastModifiedBy'
          );
          const createdStr = this.extractXmlTag(coreXml, 'dcterms:created');
          if (createdStr) resultMeta.creationDate = new Date(createdStr);
          const modStr = this.extractXmlTag(coreXml, 'dcterms:modified');
          if (modStr) resultMeta.modificationDate = new Date(modStr);
        }
      } catch (err) {
        console.warn(
          '[DocumentMetadataEngine] Gagal membaca metadata DOCX:',
          err
        );
      }
    } else {
      // Basic text / csv / json metadata fallback
      resultMeta.title = file.name.replace(/\.[^/.]+$/, '');
      resultMeta.author = '';
      resultMeta.producer = 'Mungil Converter';
      resultMeta.creationDate = new Date(file.lastModified || Date.now());
    }

    return {
      format: file.type || `application/${ext}`,
      size: file.size,
      created: new Date(file.lastModified || Date.now()),
      modified: new Date(file.lastModified || Date.now()),
      pageCount,
      metadata: resultMeta,
    };
  }

  /**
   * Writes / updates metadata into a document Blob (PDF or DOCX).
   */
  static async writeMetadata(
    blob: Blob,
    metadata: DocumentMetadata,
    targetExt: string
  ): Promise<Blob> {
    const ext = targetExt.toLowerCase().replace(/^\./, '');
    const buffer = await blob.arrayBuffer();

    if (ext === 'pdf') {
      try {
        const pdfDoc = await PDFDocument.load(buffer, {
          ignoreEncryption: true,
        });

        if (metadata.title !== undefined) {
          pdfDoc.setTitle(metadata.title || '');
        }
        if (metadata.author !== undefined) {
          pdfDoc.setAuthor(metadata.author || '');
        }
        if (metadata.subject !== undefined) {
          pdfDoc.setSubject(metadata.subject || '');
        }
        if (metadata.keywords !== undefined) {
          const kwList = metadata.keywords
            ? metadata.keywords
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
          pdfDoc.setKeywords(kwList);
        }
        const appName =
          metadata.producer || metadata.creator || 'Mungil Converter';
        pdfDoc.setProducer(appName);
        pdfDoc.setCreator(appName);

        if (metadata.creationDate) {
          const d =
            metadata.creationDate instanceof Date
              ? metadata.creationDate
              : new Date(metadata.creationDate);
          if (!isNaN(d.getTime())) {
            pdfDoc.setCreationDate(d);
          }
        }
        pdfDoc.setModificationDate(new Date());

        const savedBytes = await pdfDoc.save();
        return new Blob([savedBytes as Uint8Array<ArrayBuffer>], {
          type: 'application/pdf',
        });
      } catch (err) {
        console.warn(
          '[DocumentMetadataEngine] Gagal menulis metadata PDF:',
          err
        );
        return blob;
      }
    }

    if (ext === 'docx') {
      try {
        const unzipped = fflate.unzipSync(new Uint8Array(buffer));
        const coreXmlPath = 'docProps/core.xml';
        let coreXml = unzipped[coreXmlPath]
          ? fflate.strFromU8(unzipped[coreXmlPath])
          : this.createDefaultCoreXml();

        if (metadata.title !== undefined) {
          coreXml = this.replaceOrInsertXmlTag(
            coreXml,
            'dc:title',
            metadata.title
          );
        }
        if (metadata.author !== undefined) {
          coreXml = this.replaceOrInsertXmlTag(
            coreXml,
            'dc:creator',
            metadata.author
          );
        }
        if (metadata.subject !== undefined) {
          coreXml = this.replaceOrInsertXmlTag(
            coreXml,
            'dc:subject',
            metadata.subject
          );
        }
        if (metadata.keywords !== undefined) {
          coreXml = this.replaceOrInsertXmlTag(
            coreXml,
            'cp:keywords',
            metadata.keywords
          );
        }
        coreXml = this.replaceOrInsertXmlTag(
          coreXml,
          'cp:lastModifiedBy',
          metadata.producer || 'Mungil Converter'
        );

        const modDateIso = new Date().toISOString();
        coreXml = this.replaceOrInsertXmlTag(
          coreXml,
          'dcterms:modified',
          modDateIso,
          'xsi:type="dcterms:W3CDTF"'
        );
        if (metadata.creationDate) {
          const cDate =
            metadata.creationDate instanceof Date
              ? metadata.creationDate.toISOString()
              : new Date(metadata.creationDate).toISOString();
          coreXml = this.replaceOrInsertXmlTag(
            coreXml,
            'dcterms:created',
            cDate,
            'xsi:type="dcterms:W3CDTF"'
          );
        }

        unzipped[coreXmlPath] = fflate.strToU8(coreXml);
        const zipped = fflate.zipSync(unzipped);
        return new Blob([zipped as Uint8Array<ArrayBuffer>], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      } catch (err) {
        console.warn(
          '[DocumentMetadataEngine] Gagal menulis metadata DOCX:',
          err
        );
        return blob;
      }
    }

    return blob;
  }

  private static extractXmlTag(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
  }

  private static replaceOrInsertXmlTag(
    xml: string,
    tag: string,
    value: string,
    attributes: string = ''
  ): string {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'i');
    const attrStr = attributes ? ` ${attributes}` : '';
    if (regex.test(xml)) {
      if (!value) {
        return xml.replace(regex, '');
      }
      return xml.replace(
        regex,
        `<${tag}${attrStr}>${this.escapeXml(value)}</${tag}>`
      );
    }
    if (!value) return xml;

    // Insert before closing </cp:coreProperties>
    const closingTag = '</cp:coreProperties>';
    const insertIdx = xml.indexOf(closingTag);
    if (insertIdx !== -1) {
      const tagString = `  <${tag}${attrStr}>${this.escapeXml(value)}</${tag}>\n`;
      return xml.slice(0, insertIdx) + tagString + xml.slice(insertIdx);
    }
    return xml;
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

  private static createDefaultCoreXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
</cp:coreProperties>`;
  }
}
