import { describe, it, expect } from 'vitest';
import { ExifEngine, type ExifData } from '../engines/image/exif-engine';

describe('ExifEngine - Metadata Diff & Modification Tracking', () => {
  it('should return empty diff array when original and edited are identical', () => {
    const original: ExifData = {
      Make: 'Canon',
      Model: 'EOS R5',
      ISO: 400,
    };
    const edited: ExifData = { ...original };
    const diffs = ExifEngine.computeDiff(original, edited);
    expect(diffs).toEqual([]);
  });

  it('should detect added metadata fields', () => {
    const original: ExifData = {};
    const edited: ExifData = {
      Make: 'Sony',
      Software: 'v1.0.0',
    };
    const diffs = ExifEngine.computeDiff(original, edited);
    expect(diffs).toHaveLength(2);
    expect(diffs.find((d) => d.key === 'Make')?.type).toBe('added');
    expect(diffs.find((d) => d.key === 'Make')?.after).toBe('Sony');
  });

  it('should detect modified camera and GPS coordinates', () => {
    const original: ExifData = {
      Make: 'Apple',
      Model: 'iPhone 13',
      GPSLatitude: -6.2088,
      GPSLongitude: 106.8456,
    };
    const edited: ExifData = {
      Make: 'Apple',
      Model: 'iPhone 15 Pro',
      GPSLatitude: -7.2575, // Changed to Surabaya
      GPSLongitude: 112.7521,
    };
    const diffs = ExifEngine.computeDiff(original, edited);
    expect(diffs).toHaveLength(3); // Model, Lat, Lon changed; Make unchanged

    const modelDiff = diffs.find((d) => d.key === 'Model');
    expect(modelDiff?.type).toBe('modified');
    expect(modelDiff?.before).toBe('iPhone 13');
    expect(modelDiff?.after).toBe('iPhone 15 Pro');

    const latDiff = diffs.find((d) => d.key === 'GPSLatitude');
    expect(latDiff?.type).toBe('modified');
    expect(latDiff?.before).toBe('-6.2088');
    expect(latDiff?.after).toBe('-7.2575');
  });

  it('should detect stripped / removed EXIF fields', () => {
    const original: ExifData = {
      Artist: 'Photographer John',
      Copyright: '2026 John Doe',
    };
    const edited: ExifData = {
      Artist: '', // user cleared it
    };
    const diffs = ExifEngine.computeDiff(original, edited);
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs.find((d) => d.key === 'Artist')?.type).toBe('removed');
  });

  it('should ignore non-EXIF dimension/format system keys', () => {
    const original: ExifData = {
      width: 1920,
      height: 1080,
      format: 'image/png',
      size: 500000,
    };
    const edited: ExifData = {
      width: 2560,
      height: 1440,
      format: 'image/webp',
      size: 300000,
    };
    const diffs = ExifEngine.computeDiff(original, edited);
    expect(diffs).toEqual([]);
  });
});
