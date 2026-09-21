# 📚 Developer Documentation: Flowy Converter Engine

This document provides guidance for developers to integrate and maintain the local conversion engines.

## 🛠 Architecture Overview

Flowy uses a **"Convert locally first"** approach. The conversion logic resides in Web Workers using WASM binaries, ensuring user privacy and reducing server load.

### Engine Lifecycle

1. **Resolve**: `EngineRegistry` finds the correct engine based on input/output formats.
2. **Load**: `EngineLoader` fetches JS/WASM assets and stores them in `Cache Storage`.
3. **Execute**: `ConversionWorkerManager` spins up a Web Worker and executes the engine.
4. **Cleanup**: `DownloadManager` handles the output Blob and revokes Object URLs.

## 🚀 Adding a New Engine

To add a new conversion capability, follow these steps:

### 1. Define the Engine

Create a new engine class in `src/engines/[family]/`.

- Implement the `ConversionEngine` interface.
- Use `EngineLogger` for tracking.
- Ensure memory is cleaned up after processing.

### 2. Update the Manifest

Add the engine metadata to the backend manifest (or mock registry):

```json
"image:png:webp": {
  "version": "1.0.0",
  "type": "wasm",
  "size": 12400000,
  "script": "/engines/image/png-webp.js",
  "wasm": "/engines/image/png-webp.wasm"
}
```

### 3. Place Assets

Put the `.js` and `.wasm` files in `public/engines/[family]/[engine-id]/`.

## 🧪 Testing & Profiling

- **Regression**: Use `ConversionTester.runRegressionSuite()` with standard fixtures.
- **Performance**: Use `PerformanceProfiler.profile()` to measure RAM and CPU usage.
- **Security**: Always run `SecurityHardener.sanitizeFilename()` on any user-provided name.

## ⚠️ Critical Constraints

- **Memory**: Avoid storing large Blobs in RAM. Use `Transferable` objects when communicating with Workers.
- **COOP/COEP**: If using `SharedArrayBuffer` (e.g., FFmpeg), ensure the server sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
- **Privacy**: Never send user files to the backend unless it's an explicit `BackendFallback` request.
