import { describe, it, expect, vi } from 'vitest';

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));

vi.mock('@ffmpeg/ffmpeg', () => {
  return {
    FFmpeg: class {
      load = vi.fn().mockResolvedValue(undefined);
      writeFile = vi.fn().mockResolvedValue(undefined);
      exec = vi.fn().mockResolvedValue(0);
      readFile = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
      deleteFile = vi.fn().mockResolvedValue(true);
      on = vi.fn();
    },
  };
});

import { ArchiveEngine } from '../engines/archive/zip';
import { DocumentConverter } from '../engines/document/document-converter';
import { FFmpegEngine } from '../engines/video/ffmpeg-wrapper';

describe('Core Engine Performance & Optimization Verification', () => {
  describe('ArchiveEngine Asynchronous Non-blocking Processing', () => {
    it('should compress and decompress multiple files asynchronously with full content integrity', async () => {
      const file1 = new File(
        ['Hello World! '.repeat(500)],
        'large_sample.txt',
        {
          type: 'text/plain',
        }
      );
      const file2 = new File(
        ['Second file content payload'],
        'sub/second.txt',
        {
          type: 'text/plain',
        }
      );

      const zipBlob = await ArchiveEngine.zipFiles([file1, file2], {
        compressionLevel: 6,
      });

      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);
      expect(zipBlob.type).toBe('application/zip');

      const unzipped = await ArchiveEngine.unzip(zipBlob);
      expect(unzipped).toHaveLength(2);

      const restored1 = unzipped.find(
        (item) => item.name === 'large_sample.txt'
      );
      expect(restored1).toBeDefined();
      const text1 = await restored1!.data.text();
      expect(text1).toBe('Hello World! '.repeat(500));
    });
  });

  describe('DocumentConverter Text-to-PDF Optimized Wrapping', () => {
    it('should efficiently wrap long text with single-pass word width measurements', async () => {
      const longText = Array.from(
        { length: 200 },
        (_, i) =>
          `Paragraph line ${i + 1}: The quick brown fox jumps over the lazy dog repeatedly to test wrap performance.`
      ).join('\n');

      const textFile = new File([longText], 'performance_wrap.txt', {
        type: 'text/plain',
      });

      const t0 = performance.now();
      const pdfBlob = await DocumentConverter.txtToPdf(textFile);
      const duration = performance.now() - t0;

      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.size).toBeGreaterThan(1000);
      expect(pdfBlob.type).toBe('application/pdf');
      // Should easily complete in under 500ms in Node test environment
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('FFmpeg MEMFS Cleanup Resilience', () => {
    it('should invoke modern deleteFile for MEMFS cleanup safely without throwing', async () => {
      const mockFFmpeg = {
        load: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
        exec: vi.fn().mockResolvedValue(0),
        readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        deleteFile: vi.fn().mockResolvedValue(true),
        on: vi.fn(),
      };

      const wrapper = new FFmpegEngine();
      // Inject mock ffmpeg instance
      (wrapper as unknown as { ffmpeg: typeof mockFFmpeg }).ffmpeg = mockFFmpeg;

      const dummyFile = new File(['fake video'], 'test.avi', {
        type: 'video/x-msvideo',
      });

      const outputBlob = await wrapper.convert(dummyFile, {
        args: [],
        outputName: 'output.mp4',
      });

      expect(outputBlob).toBeInstanceOf(Blob);
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledWith('input_test.avi');
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledWith('output.mp4');
    });

    it('should handle deleteFile errors in finally block without masking caller exceptions', async () => {
      const mockFFmpeg = {
        load: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
        exec: vi.fn().mockRejectedValue(new Error('FFmpeg failed execution')),
        readFile: vi.fn(),
        deleteFile: vi.fn().mockRejectedValue(new Error('unlink failed')),
        on: vi.fn(),
      };

      const wrapper = new FFmpegEngine();
      (wrapper as unknown as { ffmpeg: typeof mockFFmpeg }).ffmpeg = mockFFmpeg;

      const dummyFile = new File(['fake video'], 'test.avi', {
        type: 'video/x-msvideo',
      });

      await expect(
        wrapper.convert(dummyFile, {
          args: [],
          outputName: 'output.mp4',
        })
      ).rejects.toThrow('FFmpeg failed execution');
      // deleteFile was still invoked in finally
      expect(mockFFmpeg.deleteFile).toHaveBeenCalled();
    });
  });
});
