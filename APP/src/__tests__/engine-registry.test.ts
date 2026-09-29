import { describe, it, expect } from 'vitest';
import { engineRegistry } from '../lib/engine-registry';

describe('EngineRegistry - Routing & Zero-Unknown Assurance', () => {
  const supportedInputs = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'ico', 'gif'];

  it('should provide output formats for all supported input image extensions', () => {
    supportedInputs.forEach((ext) => {
      const outputs = engineRegistry.getSupportedOutputFormats(ext);
      expect(
        outputs.length,
        `Expected at least one output format for input: .${ext}`
      ).toBeGreaterThan(0);
    });
  });

  it('should guarantee NO resolved engine ID ever contains "unknown:"', () => {
    supportedInputs.forEach((input) => {
      const outputs = engineRegistry.getSupportedOutputFormats(input);
      outputs.forEach((output) => {
        const engine = engineRegistry.resolveEngine(input, output);
        expect(
          engine,
          `Engine must resolve for ${input} -> ${output}`
        ).not.toBeNull();
        if (engine) {
          expect(
            engine.id.startsWith('unknown:'),
            `Engine ID must NOT start with unknown: (got ${engine.id})`
          ).toBe(false);
          expect(engine.id).toMatch(/^(image|document|video):/);
        }
      });
    });
  });

  it('should correctly resolve BMP conversions to ICO, PNG, WebP, and JPEG/JPG', () => {
    const bmpOutputs = engineRegistry.getSupportedOutputFormats('bmp');
    expect(bmpOutputs).toContain('ico');
    expect(bmpOutputs).toContain('png');
    expect(bmpOutputs).toContain('webp');
    expect(bmpOutputs).toContain('jpeg');

    const icoEngine = engineRegistry.resolveEngine('bmp', 'ico');
    expect(icoEngine?.id).toBe('image:bmp:ico');

    const pngEngine = engineRegistry.resolveEngine('bmp', 'png');
    expect(pngEngine?.id).toBe('image:bmp:png');

    const webpEngine = engineRegistry.resolveEngine('bmp', 'webp');
    expect(webpEngine?.id).toBe('image:bmp:webp');
  });

  it('should correctly resolve ICO conversions to PNG, WebP, and JPEG/JPG', () => {
    const icoOutputs = engineRegistry.getSupportedOutputFormats('ico');
    expect(icoOutputs).toContain('png');
    expect(icoOutputs).toContain('webp');
    expect(icoOutputs).toContain('jpeg');

    const pngEngine = engineRegistry.resolveEngine('ico', 'png');
    expect(pngEngine?.id).toBe('image:ico:png');
  });

  it('should correctly resolve same-format compression routes (Keep Current mode)', () => {
    const jpegEngine = engineRegistry.resolveEngine('jpeg', 'jpeg');
    expect(jpegEngine?.id).toBe('image:jpeg:jpeg');

    const pngEngine = engineRegistry.resolveEngine('png', 'png');
    expect(pngEngine?.id).toBe('image:png:png');

    const webpEngine = engineRegistry.resolveEngine('webp', 'webp');
    expect(webpEngine?.id).toBe('image:webp:webp');
  });
});
