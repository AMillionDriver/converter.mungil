import { describe, it, expect } from 'vitest';
import { ArchiveEngine } from '../engines/archive/zip';

describe('ArchiveEngine - ZIP Creation & Extraction', () => {
  it('should successfully create a valid ZIP blob from File objects', async () => {
    const file1 = new File(['Hello World!'], 'file1.txt', {
      type: 'text/plain',
    });
    const file2 = new File(['Heading\nParagraph'], 'file2.txt', {
      type: 'text/plain',
    });

    const zipBlob = await ArchiveEngine.zipFiles([file1, file2]);
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.type).toBe('application/zip');
    expect(zipBlob.size).toBeGreaterThan(0);

    // Verify unzipping
    const unzipped = await ArchiveEngine.unzip(zipBlob);
    expect(unzipped.length).toBe(2);

    const names = unzipped.map((u) => u.name);
    expect(names).toContain('file1.txt');
    expect(names).toContain('file2.txt');

    const item1 = unzipped.find((u) => u.name === 'file1.txt');
    const text1 = await item1?.data.text();
    expect(text1).toBe('Hello World!');
  });

  it('should support { name, blob } objects and prevent duplicate filename conflicts', async () => {
    const item1 = {
      name: 'report.txt',
      blob: new Blob(['Report Content 1'], { type: 'text/plain' }),
    };
    const item2 = {
      name: 'report.txt', // Duplicate name
      blob: new Blob(['Report Content 2'], { type: 'text/plain' }),
    };

    const zipBlob = await ArchiveEngine.zipFiles([item1, item2]);
    expect(zipBlob.size).toBeGreaterThan(0);

    const unzipped = await ArchiveEngine.unzip(zipBlob);
    expect(unzipped.length).toBe(2);

    const names = unzipped.map((u) => u.name);
    expect(names).toContain('report.txt');
    expect(names).toContain('report_(1).txt');
  });

  it('should compress data according to compression level', async () => {
    const repeatedText = 'Repeated string to test compression. '.repeat(100);
    const file = new File([repeatedText], 'test.txt', { type: 'text/plain' });

    const zipBlob = await ArchiveEngine.zipFiles([file], {
      compressionLevel: 9,
    });
    expect(zipBlob.size).toBeLessThan(file.size);
  });
});
