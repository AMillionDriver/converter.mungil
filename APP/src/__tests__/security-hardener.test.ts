import { describe, it, expect } from 'vitest';
import { SecurityHardener } from '../lib/security-hardener';

describe('SecurityHardener - Path Traversal, Integrity & Zip Bomb Verification', () => {
  it('should sanitize dangerous path traversal characters and filename symbols', () => {
    const malicious = '../../../etc/passwd<script>alert(1)</script>:*?|.pdf';
    const sanitized = SecurityHardener.sanitizeFilename(malicious);

    expect(sanitized).not.toContain('../');
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).not.toContain(':');
    expect(sanitized).not.toContain('*');
    expect(sanitized).not.toContain('?');
    expect(sanitized).not.toContain('|');
    expect(sanitized).toBe('etc_passwd_script_alert(1)__script_____.pdf');
  });

  it('should calculate valid SHA-256 checksums using Web Crypto', async () => {
    const data = new TextEncoder().encode('Flowy Converter Test String');
    const hash = await SecurityHardener.calculateChecksum(data);

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
  });

  it('should validate matching engine checksum and reject mismatched hash', async () => {
    const data = new TextEncoder().encode('Binary engine payload 12345');
    const actualHash = await SecurityHardener.calculateChecksum(data);

    const isValid = await SecurityHardener.validateEngineIntegrity(
      data,
      actualHash
    );
    expect(isValid).toBe(true);

    const isInvalid = await SecurityHardener.validateEngineIntegrity(
      data,
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(isInvalid).toBe(false);
  });

  it('should return isBomb: false for normal files and standard small archives', async () => {
    const normalBlob = new Blob(['Hello World Normal File Content'], {
      type: 'text/plain',
    });
    const result = await SecurityHardener.inspectZip(normalBlob);

    expect(result.isBomb).toBe(false);
  });

  it('should run ConversionTester regression suite and report passed cases', async () => {
    const { ConversionTester } = await import('../lib/conversion-tester');
    const mockPipeline = {
      resolveAndLoad: async (input: string, output: string) => {
        if (input === 'exe') throw new Error('Unsupported format exe');
        return {
          id: `engine:${input}:${output}`,
          convert: async (file: File) =>
            new Blob([await file.arrayBuffer()], {
              type: 'application/octet-stream',
            }),
        };
      },
    };

    const suiteResult = await ConversionTester.runRegressionSuite(mockPipeline);
    expect(suiteResult.passed).toBe(5);
    expect(suiteResult.failed).toBe(0);
    expect(suiteResult.results).toHaveLength(5);
  });

  it('should validate binary magic bytes correctly and reject spoofed headers', () => {
    // Valid PNG header
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(SecurityHardener.validateMagicBytes(pngHeader, 'png')).toBe(true);
    expect(SecurityHardener.validateMagicBytes(pngHeader, 'jpeg')).toBe(false);

    // Valid JPEG header
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(SecurityHardener.validateMagicBytes(jpegHeader, 'jpeg')).toBe(true);
    expect(SecurityHardener.validateMagicBytes(jpegHeader, 'png')).toBe(false);

    // Valid PDF header
    const pdfHeader = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37,
    ]);
    expect(SecurityHardener.validateMagicBytes(pdfHeader, 'pdf')).toBe(true);
    expect(SecurityHardener.validateMagicBytes(pdfHeader, 'png')).toBe(false);

    // Valid ZIP / DOCX / XLSX header
    const zipHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    expect(SecurityHardener.validateMagicBytes(zipHeader, 'docx')).toBe(true);
    expect(SecurityHardener.validateMagicBytes(zipHeader, 'xlsx')).toBe(true);
    expect(SecurityHardener.validateMagicBytes(zipHeader, 'pdf')).toBe(false);
  });

  it('should inspect image dimensions and detect Pixel Flood DoS attempts without memory allocation', () => {
    // Construct simulated PNG IHDR chunk with huge dimensions: 10,000 x 10,000 = 100,000,000 pixels (> 40 MP)
    const pngBuffer = new Uint8Array(32);
    pngBuffer[0] = 0x89;
    pngBuffer[1] = 0x50;
    pngBuffer[2] = 0x4e;
    pngBuffer[3] = 0x47;
    const view = new DataView(pngBuffer.buffer);
    view.setUint32(16, 10000, false); // width: 10,000
    view.setUint32(20, 10000, false); // height: 10,000

    const floodCheck = SecurityHardener.inspectImageDimensions(
      pngBuffer,
      40_000_000
    );
    expect(floodCheck).not.toBeNull();
    expect(floodCheck?.width).toBe(10000);
    expect(floodCheck?.height).toBe(10000);
    expect(floodCheck?.isPixelFlood).toBe(true);

    // Normal image: 800 x 600 = 480,000 pixels
    view.setUint32(16, 800, false);
    view.setUint32(20, 600, false);
    const normalCheck = SecurityHardener.inspectImageDimensions(
      pngBuffer,
      40_000_000
    );
    expect(normalCheck?.isPixelFlood).toBe(false);
  });
});
