import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { EngineLogger } from '../shared/EngineLogger';
import { BlobUtils } from '../shared/blob-utils';

export interface FFmpegOptions {
  args: string[];
  outputName: string;
}

export class FFmpegEngine {
  private ffmpeg: FFmpeg;
  private loaded: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async load(): Promise<void> {
    const startTime = performance.now();
    try {
      await this.ffmpeg.load({
        // The core WASM files are served from /public/engines/video/
        coreURL: '/engines/video/ffmpeg-core.js',
        wasmURL: '/engines/video/ffmpeg-core.wasm',
      });
      this.loaded = true;
      EngineLogger.log({
        engineId: 'ffmpeg-wasm',
        operation: 'load',
        status: 'success',
        duration: performance.now() - startTime,
        inputSize: 0,
        timestamp: Date.now(),
      });
    } catch (error) {
      EngineLogger.error('ffmpeg-wasm', 'Load failed', error);
      throw error;
    }
  }

  async convert(file: File, options: FFmpegOptions): Promise<Blob> {
    if (!this.loaded) await this.load();

    const startTime = performance.now();
    const inputName = 'input_' + file.name;
    const outputName = options.outputName;

    try {
      // Write file to FFmpeg MEMFS
      await this.ffmpeg.writeFile(inputName, await fetchFile(file));

      // Execute command
      await this.ffmpeg.exec([...options.args, '-i', inputName, outputName]);

      // Read result
      const data = await this.ffmpeg.readFile(outputName);
      const blob = await BlobUtils.arrayBufferToBlob(
        (data as Uint8Array).slice().buffer,
        'application/octet-stream'
      );

      EngineLogger.log({
        engineId: 'ffmpeg-wasm',
        operation: 'convert',
        status: 'success',
        duration: performance.now() - startTime,
        inputSize: file.size,
        outputSize: blob.size,
        timestamp: Date.now(),
      });

      return blob;
    } catch (error) {
      EngineLogger.error('ffmpeg-wasm', 'Conversion failed', error);
      throw error;
    } finally {
      // Cleanup MEMFS
      (
        this.ffmpeg as unknown as {
          FS: (cmd: string, ...args: unknown[]) => void;
        }
      ).FS('unlink', inputName);
      (
        this.ffmpeg as unknown as {
          FS: (cmd: string, ...args: unknown[]) => void;
        }
      ).FS('unlink', outputName);
    }
  }
}
