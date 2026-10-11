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

  it('should write and re-read metadata on DOCX files', async () => {
    // 1. Generate base DOCX
    const baseTxt = new File(['Halo Dunia!'], 'surat.txt', {
      type: 'text/plain',
    });
    const docxBlob = await DocumentConverter.txtToDocx(baseTxt);
    const docxFile = new File([docxBlob], 'surat.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // 2. Write metadata
    const updatedBlob = await DocumentMetadataEngine.writeMetadata(
      docxFile,
      {
        title: 'Surat Resmi 2026',
        author: 'Nanang Nurmansah',
        subject: 'Pemberitahuan',
        keywords: 'surat, resmi, penting',
      },
      'docx'
    );

    // 3. Re-read and verify roundtrip modification
    const updatedFile = new File([updatedBlob], 'surat-updated.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const reRead = await DocumentMetadataEngine.read(updatedFile);
    expect(reRead.metadata.title).toBe('Surat Resmi 2026');
    expect(reRead.metadata.author).toBe('Nanang Nurmansah');
    expect(reRead.metadata.subject).toBe('Pemberitahuan');
    expect(reRead.metadata.keywords).toBe('surat, resmi, penting');
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

  describe('PdfTableExtractor & High-Fidelity Table Extraction', () => {
    it('should accurately detect and reconstruct tabular layouts from spatial tokens', async () => {
      const { PdfTableExtractor } = await import(
        '../engines/document/pdf-table-extractor'
      );

      // Construct simulated tokens resembling a multi-column invoice table
      const simulatedTokens = [
        // Title / Paragraph block
        { str: 'Invoice #1092', x: 50, y: 700, width: 80, height: 14 },
        // Header line
        { str: 'Item Description', x: 50, y: 650, width: 100, height: 10 },
        { str: 'Qty', x: 220, y: 650, width: 25, height: 10 },
        { str: 'Rate', x: 300, y: 650, width: 30, height: 10 },
        { str: 'Amount', x: 400, y: 650, width: 45, height: 10 },
        // Row 1
        { str: 'Cloudflare Worker', x: 50, y: 625, width: 110, height: 10 },
        { str: '2', x: 220, y: 625, width: 10, height: 10 },
        { str: '15.00', x: 300, y: 625, width: 28, height: 10 },
        { str: '30.00', x: 400, y: 625, width: 28, height: 10 },
        // Row 2
        { str: 'Storage Bucket R2', x: 50, y: 600, width: 105, height: 10 },
        { str: '1', x: 220, y: 600, width: 10, height: 10 },
        { str: '5.00', x: 300, y: 600, width: 22, height: 10 },
        { str: '5.00', x: 400, y: 600, width: 22, height: 10 },
        // Footer paragraph
        { str: 'Thank you for your business!', x: 50, y: 550, width: 150, height: 10 },
      ];

      const blocks = PdfTableExtractor.analyzePageBlocks(simulatedTokens);
      expect(blocks.length).toBeGreaterThanOrEqual(2);

      const tableBlock = blocks.find((b) => b.type === 'table');
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.table).toBeDefined();

      const table = tableBlock!.table!;
      expect(table.headers).toContain('Item Description');
      expect(table.headers).toContain('Amount');
      expect(table.rows.length).toBe(2);
      expect(table.rows[0]).toContain('Cloudflare Worker');
      expect(table.rows[1]).toContain('Storage Bucket R2');
      expect(table.colWidthsPt.length).toBe(4);
    });
  });

  describe('Document Engine - Cross-Format Bidirectional Matrix', () => {
    it('should convert PDF to XLSX with structured sheets', async () => {
      // 1. Create a structured PDF file
      const csvData = 'SKU,Nama Barang,Harga,Stok\nA1,Laptop Asus,12000000,10\nB2,Mouse Wireless,150000,50';
      const csvFile = new File([csvData], 'products.csv', { type: 'text/csv' });
      const pdfBlob = await DocumentConverter.csvToPdf(csvFile);
      const pdfFile = new File([pdfBlob], 'products.pdf', { type: 'application/pdf' });

      // 2. Convert PDF -> XLSX
      const xlsxBlob = await DocumentConverter.pdfToXlsx(pdfFile);
      expect(xlsxBlob.type).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(xlsxBlob.size).toBeGreaterThan(500);

      const fflate = await import('fflate');
      const unzipped = fflate.unzipSync(new Uint8Array(await xlsxBlob.arrayBuffer()));
      expect(unzipped['xl/worksheets/sheet1.xml']).toBeDefined();
      expect(unzipped['xl/workbook.xml']).toBeDefined();

      const sheetXml = fflate.strFromU8(unzipped['xl/worksheets/sheet1.xml']);
      expect(sheetXml).toContain('<sheetData>');
    });

    it('should convert XLSX to DOCX table and back to XLSX roundtrip', async () => {
      const fflate = await import('fflate');

      // 1. Start from CSV -> XLSX to get a valid OpenXML spreadsheet
      const csvContent =
        'Department,Lead,Budget\nEngineering,Alex,50000\nMarketing,Diana,30000\nDesign,Chris,20000';
      const csvFile = new File([csvContent], 'budget.csv', { type: 'text/csv' });
      const xlsxBlob = await DocumentConverter.csvToXlsx(csvFile);
      const xlsxFile = new File([xlsxBlob], 'budget.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 2. XLSX -> DOCX (Preserving tabular grid)
      const docxBlob = await DocumentConverter.xlsxToDocx(xlsxFile);
      expect(docxBlob.type).toContain('wordprocessingml.document');

      const unzippedDocx = fflate.unzipSync(new Uint8Array(await docxBlob.arrayBuffer()));
      expect(unzippedDocx['word/document.xml']).toBeDefined();
      const docXml = fflate.strFromU8(unzippedDocx['word/document.xml']);

      // Must generate standard Word Table XML structure
      expect(docXml).toContain('<w:tbl>');
      expect(docXml).toContain('<w:tblGrid>');
      expect(docXml).toContain('Engineering');
      expect(docXml).toContain('Marketing');

      // 3. DOCX -> XLSX (Extracting table back to Excel spreadsheet)
      const docxFile = new File([docxBlob], 'budget.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const roundtripXlsxBlob = await DocumentConverter.docxToXlsx(docxFile);
      expect(roundtripXlsxBlob.type).toContain('spreadsheetml.sheet');

      const unzippedXlsx = fflate.unzipSync(new Uint8Array(await roundtripXlsxBlob.arrayBuffer()));
      const sheetXml = fflate.strFromU8(unzippedXlsx['xl/worksheets/sheet1.xml']);
      expect(sheetXml).toContain('Engineering');
      expect(sheetXml).toContain('Marketing');
    });

    it('should convert XLSX to CSV and XLSX to PDF cleanly', async () => {
      const csvData = 'Code,Item,Qty\nX1,Keyboard Mechanical,25\nY2,Webcam HD,12';
      const xlsxBlob = await DocumentConverter.csvToXlsx(
        new File([csvData], 'stock.csv', { type: 'text/csv' })
      );
      const xlsxFile = new File([xlsxBlob], 'stock.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 1. XLSX -> CSV
      const csvResultBlob = await DocumentConverter.xlsxToCsv(xlsxFile);
      const csvText = await csvResultBlob.text();
      expect(csvText).toContain('Code,Item,Qty');
      expect(csvText).toContain('Keyboard Mechanical');
      expect(csvText).toContain('Webcam HD');

      // 2. XLSX -> PDF
      const pdfResultBlob = await DocumentConverter.xlsxToPdf(xlsxFile);
      expect(pdfResultBlob.type).toBe('application/pdf');
      const pdfDoc = await PDFDocument.load(await pdfResultBlob.arrayBuffer());
      expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
    });

    it('should package DrawingML media elements into DOCX with correct relationships', async () => {
      const fflate = await import('fflate');

      // 1. Create a 1x1 dummy PNG
      const dummyPngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const binaryString = atob(dummyPngBase64);
      const pngBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pngBytes[i] = binaryString.charCodeAt(i);
      }

      const mediaItems = [
        {
          id: 'rIdImg1',
          target: 'image1.png',
          extension: 'png' as const,
          contentType: 'image/png' as const,
          data: pngBytes,
          widthEmu: 150 * 12700,
          heightEmu: 100 * 12700,
        },
      ];

      const drawingXml = DocumentConverter.generateDrawingXml(
        'rIdImg1',
        150 * 12700,
        100 * 12700,
        'image1.png'
      );
      expect(drawingXml).toContain('<w:drawing>');
      expect(drawingXml).toContain('<wp:inline');
      expect(drawingXml).toContain('r:embed="rIdImg1"');

      // 2. Build full package with media
      const docxBlob = DocumentConverter.buildDocxPackage(
        `<w:p>${drawingXml}</w:p>`,
        'Media Document',
        { media: mediaItems }
      );

      const unzipped = fflate.unzipSync(new Uint8Array(await docxBlob.arrayBuffer()));

      // Media folder entry
      expect(unzipped['word/media/image1.png']).toBeDefined();
      expect(unzipped['word/media/image1.png'].length).toBe(pngBytes.length);

      // Relationship entry
      const relsXml = fflate.strFromU8(unzipped['word/_rels/document.xml.rels']);
      expect(relsXml).toContain('Id="rIdImg1"');
      expect(relsXml).toContain('Target="media/image1.png"');
      expect(relsXml).toContain('/relationships/image');

      // Content Types entry
      const contentTypesXml = fflate.strFromU8(unzipped['[Content_Types].xml']);
      expect(contentTypesXml).toContain('Extension="png"');
      expect(contentTypesXml).toContain('ContentType="image/png"');
    });
  });
});

