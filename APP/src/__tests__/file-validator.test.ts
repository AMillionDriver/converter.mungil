import { describe, it, expect } from 'vitest';
import { FileValidator, type FileValidatorConfig } from '../lib/file-validator';

const standardConfig: FileValidatorConfig = {
  maxSizeMB: 1024,
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/bmp',
    'image/x-ms-bmp',
    'image/x-bmp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/gif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
  ],
  allowedExtensions: [
    'pdf',
    'png',
    'jpg',
    'jpeg',
    'webp',
    'bmp',
    'ico',
    'gif',
    'docx',
    'mp4',
  ],
};

function createMockFile(name: string, type: string, bytes: number[]): File {
  const buffer = new Uint8Array(bytes);
  return new File([buffer], name, { type });
}

describe('FileValidator - Magic Number & Security Verification', () => {
  it('should accept valid PNG files with 89 50 4E 47 signature', async () => {
    const pngBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const file = createMockFile('test.png', 'image/png', pngBytes);
    const result = await FileValidator.validate(file, standardConfig);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid JPEG files with FF D8 FF signature', async () => {
    const jpegBytes = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
    const file = createMockFile('test.jpg', 'image/jpeg', jpegBytes);
    const result = await FileValidator.validate(file, standardConfig);
    expect(result.isValid).toBe(true);
  });

  it('should accept valid standard BMP files with BM signature', async () => {
    // 0x42 ('B'), 0x4D ('M')
    const bmpBytes = [0x42, 0x4d, 0x36, 0x00, 0x00, 0x00];
    const file = createMockFile('test.bmp', 'image/bmp', bmpBytes);
    const result = await FileValidator.validate(file, standardConfig);
    expect(result.isValid).toBe(true);
  });

  it('should accept legacy/little-endian BMP files with MB signature variant', async () => {
    // 0x4D ('M'), 0x42 ('B')
    const bmpBytes = [0x4d, 0x42, 0x36, 0x00, 0x00, 0x00];
    const file = createMockFile('test_legacy.bmp', 'image/x-ms-bmp', bmpBytes);
    const result = await FileValidator.validate(file, standardConfig);
    expect(result.isValid).toBe(true);
  });

  it('should accept valid WebP files with RIFF....WEBP signature', async () => {
    // RIFF (4 bytes) + 4 bytes size + WEBP (4 bytes)
    const webpBytes = [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ];
    const file = createMockFile('image.webp', 'image/webp', webpBytes);
    const result = await FileValidator.validate(file, standardConfig);
    expect(result.isValid).toBe(true);
  });

  it('should accept valid PDF files with %PDF signature', async () => {
    // %PDF = 0x25, 0x50, 0x44, 0x46
    const pdfBytes = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
    const file = createMockFile('document.pdf', 'application/pdf', pdfBytes);
    const result = await FileValidator.validate(file, standardConfig);
    expect(result.isValid).toBe(true);
  });

  it('should reject spoofed files (e.g. text file renamed to .png)', async () => {
    // Plain text content in a file named image.png
    const fakeBytes = [0x48, 0x65, 0x6c, 0x6c, 0x6f]; // "Hello"
    const file = createMockFile('image.png', 'image/png', fakeBytes);
    const result = await FileValidator.validate(file, standardConfig);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('File signature mismatch');
  });

  it('should reject files exceeding maximum size limit', async () => {
    const pngBytes = [0x89, 0x50, 0x4e, 0x47];
    const file = createMockFile('huge.png', 'image/png', pngBytes);
    // Config with strict 0 MB limit to trigger size rejection
    const strictConfig: FileValidatorConfig = {
      ...standardConfig,
      maxSizeMB: 0.000001, // ~1 byte
    };
    const result = await FileValidator.validate(file, strictConfig);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('File size exceeds limit');
  });

  it('should reject disallowed extensions', async () => {
    const file = createMockFile(
      'malicious.exe',
      'application/x-msdownload',
      [0x4d, 0x5a]
    );
    const result = await FileValidator.validate(file, standardConfig);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('is not supported');
  });
});
