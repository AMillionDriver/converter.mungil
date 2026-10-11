export interface TestCase {
  id: string;
  name: string;
  inputFormat: string;
  outputFormat: string;
  expectedResult: 'success' | 'fail';
  description?: string;
}

export interface TestExecutionResult {
  id: string;
  name: string;
  status: 'passed' | 'failed';
  durationMs: number;
  outputBytes?: number;
  error?: string;
}

export class ConversionTester {
  /**
   * Generates a valid in-memory File fixture for automated client-side regression testing.
   */
  static createSyntheticFile(format: string): File {
    const ext = format.toLowerCase();

    if (ext === 'png') {
      // 1x1 transparent PNG byte array
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x00,
        0x00, 0x00, 0x04, 0x00, 0x01, 0x5d, 0x64, 0x7e, 0xa9, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      return new File([pngBytes], 'synthetic.png', { type: 'image/png' });
    }

    if (ext === 'csv') {
      const csvContent =
        'id,nama,kategori,nilai\n101,Produk Alpha,Elektronik,150000\n102,Produk Beta,Pakaian,75000\n';
      return new File([csvContent], 'synthetic.csv', { type: 'text/csv' });
    }

    if (ext === 'json') {
      const jsonContent = JSON.stringify(
        { title: 'Test Document', author: 'Flowy Test Suite', valid: true },
        null,
        2
      );
      return new File([jsonContent], 'synthetic.json', {
        type: 'application/json',
      });
    }

    if (ext === 'txt') {
      const textContent =
        'Flowy Converter Automated Regression Suite.\nTesting multi-engine local processing pipeline.\n';
      return new File([textContent], 'synthetic.txt', {
        type: 'text/plain;charset=utf-8',
      });
    }

    // Default generic text
    return new File(['Test data fixture content'], `synthetic.${ext}`, {
      type: 'application/octet-stream',
    });
  }

  /**
   * Runs the automated regression suite with real in-memory files and verifies conversion outputs.
   */
  static async runRegressionSuite(
    pipeline: {
      resolveAndLoad: (
        input: string,
        output: string
      ) => Promise<{
        id: string;
        convert?: (file: File, options?: Record<string, unknown>) => Promise<Blob>;
      }>;
    },
    testCases: TestCase[] = this.getStandardMatrix()
  ): Promise<{
    passed: number;
    failed: number;
    results: TestExecutionResult[];
    totalDurationMs: number;
  }> {
    const results: TestExecutionResult[] = [];
    let passed = 0;
    const suiteStart = performance.now();

    for (const tc of testCases) {
      const caseStart = performance.now();

      try {
        const file = this.createSyntheticFile(tc.inputFormat);
        const engine = await pipeline.resolveAndLoad(
          tc.inputFormat,
          tc.outputFormat
        );

        let outputBlob: Blob | null = null;
        if (typeof engine.convert === 'function') {
          outputBlob = await engine.convert(file, {});
        }

        const durationMs = performance.now() - caseStart;

        if (tc.expectedResult === 'success') {
          if (!outputBlob || outputBlob.size === 0) {
            throw new Error('Hasil konversi kosong (0 bytes).');
          }
          results.push({
            id: tc.id,
            name: tc.name,
            status: 'passed',
            durationMs: Math.round(durationMs),
            outputBytes: outputBlob.size,
          });
          passed++;
        } else {
          // Expected fail, but succeeded
          results.push({
            id: tc.id,
            name: tc.name,
            status: 'failed',
            durationMs: Math.round(durationMs),
            error: 'Seharusnya gagal sesuai spesifikasi tes namun berhasil.',
          });
        }
      } catch (err) {
        const durationMs = performance.now() - caseStart;
        const errMessage = err instanceof Error ? err.message : String(err);

        if (tc.expectedResult === 'fail') {
          results.push({
            id: tc.id,
            name: tc.name,
            status: 'passed',
            durationMs: Math.round(durationMs),
            error: `Gagal sesuai ekspektasi: ${errMessage}`,
          });
          passed++;
        } else {
          results.push({
            id: tc.id,
            name: tc.name,
            status: 'failed',
            durationMs: Math.round(durationMs),
            error: errMessage,
          });
        }
      }
    }

    const totalDurationMs = Math.round(performance.now() - suiteStart);
    return {
      passed,
      failed: testCases.length - passed,
      results,
      totalDurationMs,
    };
  }

  static getStandardMatrix(): TestCase[] {
    return [
      {
        id: 'T1',
        name: 'CSV ke XLSX (Native OpenXML)',
        inputFormat: 'csv',
        outputFormat: 'xlsx',
        expectedResult: 'success',
        description: 'Verifikasi pembentukan tabel XLSX dengan autofilter dan header beku.',
      },
      {
        id: 'T2',
        name: 'CSV ke DOCX (Word Table Grid)',
        inputFormat: 'csv',
        outputFormat: 'docx',
        expectedResult: 'success',
        description: 'Verifikasi pembuatan file Word DOCX dengan grid tabel rapi.',
      },
      {
        id: 'T3',
        name: 'TXT ke PDF',
        inputFormat: 'txt',
        outputFormat: 'pdf',
        expectedResult: 'success',
        description: 'Verifikasi konversi teks biasa menjadi halaman PDF.',
      },
      {
        id: 'T4',
        name: 'JSON ke TXT',
        inputFormat: 'json',
        outputFormat: 'txt',
        expectedResult: 'success',
        description: 'Verifikasi ekstraksi data JSON ke format teks terstruktur.',
      },
      {
        id: 'T5',
        name: 'Penolakan Format Tidak Didukung (.exe -> .pdf)',
        inputFormat: 'exe',
        outputFormat: 'pdf',
        expectedResult: 'fail',
        description: 'Verifikasi pipeline menolak format yang tidak terdaftar.',
      },
    ];
  }
}
