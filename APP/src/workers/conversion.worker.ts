// Worker orchestrator — dispatches conversions to engine modules.
// Engines export a `runConversion()` function that performs the actual
// WASM-based processing. This keeps worker-thread concerns (message
// passing, progress, cancellation) separate from engine logic.

let isCancelled = false;

// Lazy-load engine modules only when needed.
const engineModules: Record<string, { runConversion: (...args: unknown[]) => Promise<unknown> }> = {};

async function loadEngineModule(engineId: string) {
  if (!engineModules[engineId]) {
    // Dynamic import keeps bundle small — only loads engine when requested
    switch (engineId) {
      case 'image:png:webp':
      case 'image:jpeg:webp':
      case 'image:jpg:webp':
        engineModules[engineId] = await import('../lib/engines/image-webp');
        break;
      case 'image:webp:png':
      case 'image:jpeg:png':
      case 'image:jpg:png':
        engineModules[engineId] = await import('../lib/engines/image-png');
        break;
      case 'image:png:jpeg':
      case 'image:webp:jpeg':
      case 'image:jpg:jpeg':
      case 'image:jpeg:jpg':
        engineModules[engineId] = await import('../lib/engines/image-jpeg');
        break;
      default:
        throw new Error(`Unknown engine: ${engineId}`);
    }
  }
  return engineModules[engineId];
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'CANCEL':
      isCancelled = true;
      self.postMessage({ type: 'CANCELLED', payload: {} });
      break;

    case 'INIT_ENGINE': {
      const { engineId } = payload;
      try {
        // Preload the engine module so conversion is instant later
        await loadEngineModule(engineId);
        self.postMessage({ type: 'ENGINE_READY', payload: { engineId } });
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          payload: { message: (error as Error).message },
        });
      }
      break;
    }

    case 'CONVERT': {
      const { engineId, file } = payload;
      try {
        isCancelled = false;
        const module = await loadEngineModule(engineId);

        // The engine's runConversion function accepts (file, onProgress)
        // and returns a Blob
        const resultBlob = await module.runConversion(file, (p: number) => {
          if (isCancelled) {
            throw new Error('Conversion cancelled');
          }
          self.postMessage({ type: 'PROGRESS', payload: { progress: p } });
        });

        if (isCancelled) {
          throw new Error('Conversion cancelled');
        }

        self.postMessage({ type: 'SUCCESS', payload: { blob: resultBlob } });
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          payload: { message: (error as Error).message },
        });
      }
      break;
    }

    default:
      self.postMessage({
        type: 'ERROR',
        payload: { message: `Unknown message type: ${type}` },
      });
  }
};
