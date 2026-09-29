import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { DocumentMetadataEngine } from '../engines/document/document-metadata-engine';
import { DocumentConverter } from '../engines/document/document-converter';

describe('DocumentMetadataEngine', () => {
  it('should read and write metadata on PDF files', async () => {
    // 1. Create a dummy PDF
    const dummyPdf = await PDFDocument.create();
    dummyPdf.addPage([500, 500]);
    const pdfBytes = await dummyPdf.save();
    const pdfFile = new File(
      [pdfBytes as Uint8Array<ArrayBuffer>],
      'test-doc.pdf',
      {
        type: 'application/pdf',
      }
    );

    // 2. Read initial metadata
    const initialMeta = await DocumentMetadataEngine.read(pdfFile);
    expect(initialMeta.pageCount).toBe(1);

    // 3. Write custom metadata
    const updatedBlob = await DocumentMetadataEngine.writeMetadata(
      pdfFile,
      {
        title: 'Laporan Riset 2026',
        author: 'Mungil User',
        subject: 'Keuangan',
        keywords: 'laporan, riset, 2026',
        producer: 'Mungil Converter v1.0',
      },
      'pdf'
    );

    // 4. Verify updated metadata
    const updatedFile = new File([updatedBlob], 'updated.pdf', {
      type: 'application/pdf',
    });
    const reRead = await DocumentMetadataEngine.read(updatedFile);
    expect(reRead.metadata.title).toBe('Laporan Riset 2026');
    expect(reRead.metadata.author).toBe('Mungil User');
    expect(reRead.metadata.subject).toBe('Keuangan');
    expect(reRead.metadata.keywords).toContain('laporan');
    expect(reRead.metadata.keywords).toContain('riset');
    expect(reRead.metadata.keywords).toContain('2026');
    expect(reRead.metadata.creator).toBe('Mungil Converter v1.0');
  });

  it('should sanitize / strip metadata cleanly', async () => {
    const dummyPdf = await PDFDocument.create();
    dummyPdf.setTitle('Private Doc');
    dummyPdf.setAuthor('Secret Author');
    const pdfBytes = await dummyPdf.save();
    const pdfFile = new File(
      [pdfBytes as Uint8Array<ArrayBuffer>],
      'private.pdf',
      {
        type: 'application/pdf',
      }
    );

    // Strip metadata
    const strippedBlob = await DocumentMetadataEngine.writeMetadata(
      pdfFile,
      {
        title: '',
        author: '',
        subject: '',
        keywords: '',
        producer: '',
      },
      'pdf'
    );

    const strippedFile = new File([strippedBlob], 'stripped.pdf', {
      type: 'application/pdf',
    });
    const reRead = await DocumentMetadataEngine.read(strippedFile);
    expect(reRead.metadata.title).toBeUndefined();
    expect(reRead.metadata.author).toBeUndefined();
  });
});

describe('DocumentConverter', () => {
  it('should convert TXT to PDF', async () => {
    const txtContent =
      'Hello Mungil Converter!\nIni adalah baris kedua.\nBaris ketiga.';
    const txtFile = new File([txtContent], 'sample.txt', {
      type: 'text/plain',
    });

    const pdfBlob = await DocumentConverter.txtToPdf(txtFile);
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(500);

    const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer());
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('should convert CSV to JSON and JSON to CSV', async () => {
    const csvContent =
      'name,role,city\nNanang,Engineer,Jakarta\nBudi,Designer,Bandung';
    const csvFile = new File([csvContent], 'data.csv', { type: 'text/csv' });

    // 1. CSV -> JSON
    const jsonBlob = await DocumentConverter.csvToJson(csvFile);
    expect(jsonBlob.type).toBe('application/json');
    const jsonText = await jsonBlob.text();
    const parsed = JSON.parse(jsonText);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Nanang');
    expect(parsed[1].city).toBe('Bandung');

    // 2. JSON -> CSV
    const jsonFile = new File([jsonText], 'data.json', {
      type: 'application/json',
    });
    const reconvertedCsvBlob = await DocumentConverter.jsonToCsv(jsonFile);
    expect(reconvertedCsvBlob.type).toContain('text/csv');
    const reconvertedCsvText = await reconvertedCsvBlob.text();
    expect(reconvertedCsvText).toContain('name,role,city');
    expect(reconvertedCsvText).toContain('Nanang,Engineer,Jakarta');
  });

  it('should convert TXT to DOCX and DOCX to TXT', async () => {
    const textContent =
      'Paragraf pertama dokumen Word.\nParagraf kedua dokumen Word.';
    const txtFile = new File([textContent], 'dokumen.txt', {
      type: 'text/plain',
    });

    // 1. TXT -> DOCX
    const docxBlob = await DocumentConverter.txtToDocx(txtFile);
    expect(docxBlob.type).toContain('wordprocessingml.document');
    expect(docxBlob.size).toBeGreaterThan(100);

    // 2. DOCX -> TXT
    const docxFile = new File([docxBlob], 'dokumen.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const extractedTxtBlob = await DocumentConverter.docxToTxt(docxFile);
    const extractedText = await extractedTxtBlob.text();
    expect(extractedText).toContain('Paragraf pertama dokumen Word.');
    expect(extractedText).toContain('Paragraf kedua dokumen Word.');
  });
});
