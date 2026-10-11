import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EngineLoader } from '../lib/engine-loader';
import { StorageManager } from '../lib/storage-manager';
import type { EngineMetadata } from '../lib/engine-types';

describe('EngineLoader - Builtin & Local Engine Handling', () => {
  beforeEach(async () => {
    await StorageManager.clearAll();
  });

  it('should load builtin engine without performing HTTP fetch and without throwing HTTP 404', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const builtinMetadata: EngineMetadata = {
      id: 'image:jpg:webp',
      version: '1.0.0',
      type: 'wasm',
      size: 893000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    };

    let reportedProgress = 0;
    await EngineLoader.load('image:jpg:webp', builtinMetadata, (p) => {
      reportedProgress = p;
    });

    // Ensure fetch was never called for 'builtin'
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(reportedProgress).toBe(100);

    // Verify engine was recorded as installed in StorageManager
    const isInstalled = await EngineLoader.isInstalled('image:jpg:webp');
    expect(isInstalled).toBe(true);

    fetchSpy.mockRestore();
  });

  it('should return immediately if engine is already installed', async () => {
    const builtinMetadata: EngineMetadata = {
      id: 'image:png:jpeg',
      version: '1.0.0',
      type: 'wasm',
      size: 500000,
      script: 'builtin',
      checksum: 'local',
      maxFileSizeMB: 100,
      minBrowserVersion: 'Chrome 90',
      requiresHardwareAcceleration: false,
      recommendedRamMB: 512,
    };

    // First load
    await EngineLoader.load('image:png:jpeg', builtinMetadata);

    // Second load should detect isInstalled and complete with progress 100
    let secondProgress = 0;
    await EngineLoader.load('image:png:jpeg', builtinMetadata, (p) => {
      secondProgress = p;
    });

    expect(secondProgress).toBe(100);
  });
});
