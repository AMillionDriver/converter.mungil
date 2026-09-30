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

  it('should convert PDF to DOCX, PDF to TXT, and DOCX to PDF with high text fidelity', async () => {
    // 1. Create a PDF
    const txtContent = 'Bab 1: Pendahuluan Makalah.\nBab 2: Pembahasan dan Kesimpulan.';
    const txtFile = new File([txtContent], 'makalah.txt', { type: 'text/plain' });
    const pdfBlob = await DocumentConverter.txtToPdf(txtFile);
    const pdfFile = new File([pdfBlob], 'makalah.pdf', { type: 'application/pdf' });

    // 2. PDF -> TXT (High fidelity check)
    const extractedTxtBlob = await DocumentConverter.pdfToTxt(pdfFile);
    const extractedTxt = await extractedTxtBlob.text();
    expect(extractedTxt).toContain('Bab 1: Pendahuluan Makalah.');
    expect(extractedTxt).toContain('Bab 2: Pembahasan dan Kesimpulan.');

    // 3. PDF -> DOCX
    const docxBlob = await DocumentConverter.pdfToDocx(pdfFile);
    expect(docxBlob.type).toContain('wordprocessingml.document');
    expect(docxBlob.size).toBeGreaterThan(100);

    // Verify DOCX XML contains the exact text
    const docxTxt = await DocumentConverter.docxToTxt(
      new File([docxBlob], 'makalah.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    );
    const docxReadBack = await docxTxt.text();
    expect(docxReadBack).toContain('Bab 1: Pendahuluan Makalah.');
    expect(docxReadBack).toContain('Bab 2: Pembahasan dan Kesimpulan.');

    // 4. DOCX -> PDF
    const docxFile = new File([docxBlob], 'makalah.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const finalPdfBlob = await DocumentConverter.docxToPdf(docxFile);
    expect(finalPdfBlob.type).toBe('application/pdf');
    expect(finalPdfBlob.size).toBeGreaterThan(100);
  });
});

describe('PdfPageEngine', () => {
  it('should reorder, rotate, and delete PDF pages', async () => {
    const { PdfPageEngine } = await import(
      '../engines/document/pdf-page-engine'
    );

    // 1. Create a 3-page test PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([200, 200]); // Page 1
    pdfDoc.addPage([300, 300]); // Page 2
    pdfDoc.addPage([400, 400]); // Page 3
    const pdfBytes = await pdfDoc.save();
    const pdfFile = new File([pdfBytes as Uint8Array<ArrayBuffer>], 'test-3pages.pdf', {
      type: 'application/pdf',
    });

    // 2. Perform operations:
    // - Keep original page 3 (index 2), rotate 90 deg
    // - Keep original page 1 (index 0), rotate 180 deg
    // - Drop page 2 (index 1)
    const resultBlob = await PdfPageEngine.processPages(pdfFile, [
      { originalIndex: 2, rotation: 90 },
      { originalIndex: 0, rotation: 180 },
    ]);

    expect(resultBlob.type).toBe('application/pdf');
    const resultDoc = await PDFDocument.load(await resultBlob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(2);

    const pages = resultDoc.getPages();
    // Verify first page is original page 3 (width 400) rotated by 90
    expect(pages[0].getWidth()).toBe(400);
    expect(pages[0].getRotation().angle).toBe(90);

    // Verify second page is original page 1 (width 200) rotated by 180
    expect(pages[1].getWidth()).toBe(200);
    expect(pages[1].getRotation().angle).toBe(180);
  });

  it('should split PDF into multiple document ranges', async () => {
    const { PdfPageEngine } = await import(
      '../engines/document/pdf-page-engine'
    );

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([100, 100]);
    pdfDoc.addPage([100, 100]);
    pdfDoc.addPage([100, 100]);
    pdfDoc.addPage([100, 100]);
    const pdfBytes = await pdfDoc.save();
    const pdfFile = new File([pdfBytes as Uint8Array<ArrayBuffer>], 'test-4pages.pdf', {
      type: 'application/pdf',
    });

    // Split into [Page 1-2] and [Page 3-4]
    const splitBlobs = await PdfPageEngine.splitPdf(pdfFile, [
      [0, 1],
      [2, 3],
    ]);

    expect(splitBlobs).toHaveLength(2);

    const doc1 = await PDFDocument.load(await splitBlobs[0].arrayBuffer());
    expect(doc1.getPageCount()).toBe(2);

    const doc2 = await PDFDocument.load(await splitBlobs[1].arrayBuffer());
    expect(doc2.getPageCount()).toBe(2);
  });

  it('should insert blank pages in requested position with rotation', async () => {
    const { PdfPageEngine } = await import(
      '../engines/document/pdf-page-engine'
    );

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([500, 700]); // Page 1
    const pdfBytes = await pdfDoc.save();
    const pdfFile = new File([pdfBytes as Uint8Array<ArrayBuffer>], 'test-1page.pdf', {
      type: 'application/pdf',
    });

    // Insert blank page before Page 1, and blank page after Page 1
    const resultBlob = await PdfPageEngine.processPages(pdfFile, [
      { originalIndex: -1, isBlank: true, rotation: 0 },
      { originalIndex: 0, rotation: 0 },
      { originalIndex: -1, isBlank: true, rotation: 90 },
    ]);

    const resultDoc = await PDFDocument.load(await resultBlob.arrayBuffer());
    expect(resultDoc.getPageCount()).toBe(3);

    const pages = resultDoc.getPages();
    expect(pages[0].getWidth()).toBe(500);
    expect(pages[0].getRotation().angle).toBe(0);

    expect(pages[1].getWidth()).toBe(500);
    expect(pages[1].getRotation().angle).toBe(0);

    expect(pages[2].getWidth()).toBe(500);
    expect(pages[2].getRotation().angle).toBe(90);
  });

  it('should convert CSV to DOCX preserving native Word table structure', async () => {
    const csvContent =
      'Nama,Kategori,Harga,Stok\nLaptop,Elektronik,15000000,10\nMouse,Aksesoris,250000,50\nKeyboard,Aksesoris,750000,25';
    const csvFile = new File([csvContent], 'produk.csv', {
      type: 'text/csv',
    });

    const docxBlob = await DocumentConverter.csvToDocx(csvFile);
    expect(docxBlob.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(docxBlob.size).toBeGreaterThan(1000);

    // Verify it is a valid ZIP and contains <w:tbl> table elements
    const fflate = await import('fflate');
    const buffer = await docxBlob.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(buffer));
    expect(unzipped['word/document.xml']).toBeDefined();

    const docXml = fflate.strFromU8(unzipped['word/document.xml']);
    expect(docXml).toContain('<w:tbl>');
    expect(docXml).toContain('<w:tblHeader/>');
    expect(docXml).toContain('<w:tblGrid>');
    expect(docXml).toContain('<w:gridCol');
    expect(docXml).toContain('Laptop');
    expect(docXml).toContain('15000000');
    expect(docXml).toContain('Elektronik');
  });

  it('should format 20+ column CSV into Landscape DOCX with proportional column grid', async () => {
    // Generate mock CSV with 20 columns
    const cols = Array.from({ length: 20 }, (_, i) => `Col_${i + 1}`);
    const rowVals = Array.from({ length: 20 }, (_, i) => `Val_${i + 1}_data`);
    const csvContent = `${cols.join(',')}\n${rowVals.join(',')}`;
    const csvFile = new File([csvContent], 'wide_data.csv', { type: 'text/csv' });

    const docxBlob = await DocumentConverter.csvToDocx(csvFile);
    const fflate = await import('fflate');
    const buffer = await docxBlob.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(buffer));
    const docXml = fflate.strFromU8(unzipped['word/document.xml']);

    // Must be landscape
    expect(docXml).toContain('w:orient="landscape"');
    // Must have <w:tblGrid> with 20 <w:gridCol> elements
    expect(docXml).toContain('<w:tblGrid>');
    const gridCols = docXml.match(/<w:gridCol\b/g);
    expect(gridCols?.length).toBe(20);
    // Must have <w:cantSplit/>
    expect(docXml).toContain('<w:cantSplit/>');
  });

  it('should convert CSV to native Excel (.XLSX) with frozen header and styles', async () => {
    const csvContent =
      'ID,Product,Price,Quantity\n101,Monitor 4K,4500000,5\n102,USB Cable,50000,120';
    const csvFile = new File([csvContent], 'inventory.csv', { type: 'text/csv' });

    const xlsxBlob = await DocumentConverter.csvToXlsx(csvFile);
    expect(xlsxBlob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(xlsxBlob.size).toBeGreaterThan(1000);

    const fflate = await import('fflate');
    const buffer = await xlsxBlob.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(buffer));

    // Verify OpenXML Spreadsheet package structure
    expect(unzipped['[Content_Types].xml']).toBeDefined();
    expect(unzipped['xl/workbook.xml']).toBeDefined();
    expect(unzipped['xl/styles.xml']).toBeDefined();
    expect(unzipped['xl/worksheets/sheet1.xml']).toBeDefined();

    const sheetXml = fflate.strFromU8(unzipped['xl/worksheets/sheet1.xml']);
    // Frozen pane on row 1
    expect(sheetXml).toContain('state="frozen"');
    expect(sheetXml).toContain('ySplit="1"');
    // Product data present
    expect(sheetXml).toContain('Monitor 4K');
    expect(sheetXml).toContain('4500000');
  });

  it('should convert CSV to PDF preserving grid layout and pagination', async () => {
    const csvContent =
      'ID,Nama Lengkap,Email,Kota\n1,Budi Santoso,budi@example.com,Jakarta\n2,Siti Rahma,siti@example.com,Bandung';
    const csvFile = new File([csvContent], 'users.csv', {
      type: 'text/csv',
    });

    const pdfBlob = await DocumentConverter.csvToPdf(csvFile);
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer());
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(pdfDoc.getTitle()).toBe('users');
  });
});

