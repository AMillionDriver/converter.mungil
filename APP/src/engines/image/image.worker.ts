import { EngineLogger } from '../shared/EngineLogger';

export interface ImageConvertOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  preserveAspect?: boolean;
  background?: string;
}

export interface ImageConversionResult {
  blob: Blob;
  mime: string;
  filename: string;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
}

/**
 * ImageEngine (Worker-ready)
 *
 * Encodes images to webp/jpeg/png using @jsquash WASM binaries.
 * Falls back to Canvas API if WASM is unavailable (Safari < 14, etc.).
 */
export class ImageEngine {
  /**
   * Convert an image File to the target MIME type.
   *
   * @param file        Source image (PNG, JPEG, GIF, WebP, etc.)
   * @param targetMime  One of 'image/webp', 'image/jpeg', 'image/png'
   * @param options     Quality / resize / background options
   */
  static async convert(
    file: File,
    targetMime: 'image/webp' | 'image/jpeg' | 'image/png',
    options: ImageConvertOptions = {}
  ): Promise<ImageConversionResult> {
    const startTime = performance.now();
    EngineLogger.log({
      engineId: 'image-wasm',
      operation: `convert-to-${targetMime.split('/')[1]}`,
      status: 'loading',
      duration: 0,
      inputSize: file.size,
      timestamp: Date.now(),
    });

    // Resolve the @jsquash codec for the target format
    const codec = resolveCodec(targetMime);

    try {
      // Decode source into an ImageData-like buffer
      const source = await decodeSource(file);

      // Encode via the @jsquash WASM codec
      const encoded = await encodeViaJsquash(source, codec, options);

      const mimeType = targetMime;
      const blob = new Blob([encoded], { type: mimeType });

      const duration = performance.now() - startTime;
      EngineLogger.log({
        engineId: 'image-wasm',
        operation: `convert-to-${targetMime.split('/')[1]}`,
        status: 'success',
        duration,
        inputSize: file.size,
        outputSize: blob.size,
        timestamp: Date.now(),
      });

      return {
        blob,
        mime: mimeType,
        filename: stripExt(file.name) + '.' + targetMime.split('/')[1],
        originalSize: file.size,
        convertedSize: blob.size,
        compressionRatio: blob.size / file.size,
      };
    } catch (error) {
      // WASM unavailable or failed — fall back to Canvas
      EngineLogger.warn('image-wasm', `WASM encode failed, falling back to Canvas: ${error}`);
      return canvasFallback(file, targetMime, options);
    }
  }
}

// ---------------------------------------------------------------------------
// Codec resolution — maps target MIME to the @jsquash module + encode fn
// ---------------------------------------------------------------------------

type JsquashEncode = (
  input: ImageDataLike,
  options?: { quality?: number }
) => Promise<Uint8Array>;

interface CodecEntry {
  modulePromise: Promise<{ encode: JsquashEncode }>;
  encode: (input: ImageDataLike, opts?: { quality?: number }) => Promise<Uint8Array>;
}

const CODEC_CACHE: Map<string, CodecEntry> = new Map();

function resolveCodec(targetMime: string): CodecEntry {
  const cached = CODEC_CACHE.get(targetMime);
  if (cached) return cached;

  const entry: CodecEntry = {
    modulePromise: importCodecModule(targetMime),
    encode: async (input, opts) => {
      const mod = await entry.modulePromise;
      return mod.encode(input, opts);
    },
  };

  CODEC_CACHE.set(targetMime, entry);
  return entry;
}

async function importCodecModule(targetMime: string): Promise<{ encode: JsquashEncode }> {
  // @jsquash packages: @jsquash/webp, @jsquash/jpeg, @jsquash/png
  if (targetMime === 'image/webp') {
    const { encode } = await import('@jsquash/webp');
    return { encode };
  }
  if (targetMime === 'image/jpeg') {
    const { encode } = await import('@jsquash/jpeg');
    return { encode };
  }
  if (targetMime === 'image/png') {
    const { encode } = await import('@jsquash/png');
    return { encode };
  }
  throw new Error(`No @jsquash codec for ${targetMime}`);
}

// ---------------------------------------------------------------------------
// Source decoding — turn a File into ImageDataLike (RGBA pixels)
// ---------------------------------------------------------------------------

interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

async function decodeSource(file: File): Promise<ImageDataLike> {
  const bitmap = await createImageBitmap(file, { colorSpaceConversion: 'none' });
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
    };
  } finally {
    bitmap.close();
  }
}

// ---------------------------------------------------------------------------
// WASM encoding via @jsquash
// ---------------------------------------------------------------------------

async function encodeViaJsquash(
  source: ImageDataLike,
  codec: CodecEntry,
  options: ImageConvertOptions
): Promise<Uint8Array> {
  const quality = options.quality ?? 0.85;
  return codec.encode(source, { quality: Math.round(quality * 100) });
}

// ---------------------------------------------------------------------------
// Canvas fallback (no WASM, no OffscreenCanvas)
// ---------------------------------------------------------------------------

async function canvasFallback(
  file: File,
  targetMime: 'image/webp' | 'image/jpeg' | 'image/png',
  options: ImageConvertOptions
): Promise<ImageConversionResult> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Resize
  let width = bitmap.width;
  let height = bitmap.height;
  if (options.maxWidth || options.maxHeight) {
    const ratio = Math.min(
      options.maxWidth ? options.maxWidth / width : Infinity,
      options.maxHeight ? options.maxHeight / height : Infinity
    );
    width *= ratio;
    height *= ratio;
  }
  canvas.width = width;
  canvas.height = height;

  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve) => {
    canvas.convertToBlob(
      {
        type: targetMime,
        quality: options.quality ? options.quality : 0.8,
      },
      resolve
    );
  });

  return {
    blob,
    mime: targetMime,
    filename: stripExt(file.name) + '.' + targetMime.split('/')[1],
    originalSize: file.size,
    convertedSize: blob.size,
    compressionRatio: blob.size / file.size,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripExt(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}
