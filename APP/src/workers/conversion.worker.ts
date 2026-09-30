// Worker orchestrator — dispatches conversions to engine modules.
// Engines export a `runConversion()` function that performs the actual
// WASM-based processing. This keeps worker-thread concerns (message
// passing, progress, cancellation) separate from engine logic.

let isCancelled = false;

interface EngineModule {
  runConversion: (
    file: File,
    options?: Record<string, unknown>,
    onProgress?: (p: number) => void
  ) => Promise<Blob>;
}

// Lazy-load engine modules only when needed.
const engineModules: Record<string, EngineModule> = {};

async function loadEngineModule(engineId: string) {
  if (!engineModules[engineId]) {
    // Dynamic import keeps bundle small — only loads engine when requested
    switch (engineId) {
      case 'image:png:webp':
      case 'image:jpeg:webp':
      case 'image:jpg:webp':
      case 'image:bmp:webp':
      case 'image:ico:webp':
      case 'image:gif:webp':
      case 'image:webp:webp':
        engineModules[engineId] = await import('../lib/engines/image-webp');
        break;
      case 'image:webp:png':
      case 'image:jpeg:png':
      case 'image:jpg:png':
      case 'image:bmp:png':
      case 'image:ico:png':
      case 'image:gif:png':
      case 'image:png:png':
        engineModules[engineId] = await import('../lib/engines/image-png');
        break;
      case 'image:png:jpeg':
      case 'image:webp:jpeg':
      case 'image:jpg:jpeg':
      case 'image:jpeg:jpg':
      case 'image:bmp:jpeg':
      case 'image:bmp:jpg':
      case 'image:ico:jpeg':
      case 'image:ico:jpg':
      case 'image:gif:jpeg':
      case 'image:jpeg:jpeg':
      case 'image:jpg:jpg':
        engineModules[engineId] = await import('../lib/engines/image-jpeg');
        break;
      case 'image:png:pdf':
      case 'image:jpeg:pdf':
      case 'image:jpg:pdf':
      case 'image:webp:pdf':
      case 'image:bmp:pdf':
      case 'image:gif:pdf':
        engineModules[engineId] = await import('../lib/engines/image-pdf');
        break;
      case 'image:png:ico':
      case 'image:jpg:ico':
      case 'image:jpeg:ico':
      case 'image:webp:ico':
      case 'image:bmp:ico':
      case 'image:ico:ico':
        engineModules[engineId] = await import('../lib/engines/image-ico');
        break;
      case 'image:png:bmp':
      case 'image:jpg:bmp':
      case 'image:jpeg:bmp':
      case 'image:webp:bmp':
      case 'image:bmp:bmp':
        engineModules[engineId] = await import('../lib/engines/image-bmp');
        break;
      case 'document:txt:pdf': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.txtToPdfEngine;
        break;
      }
      case 'document:pdf:txt': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.pdfToTxtEngine;
        break;
      }
      case 'document:pdf:docx': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.pdfToDocxEngine;
        break;
      }
      case 'document:docx:pdf': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.docxToPdfEngine;
        break;
      }
      case 'document:txt:docx': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.txtToDocxEngine;
        break;
      }
      case 'document:docx:txt': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.docxToTxtEngine;
        break;
      }
      case 'document:csv:json': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.csvToJsonEngine;
        break;
      }
      case 'document:csv:pdf': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.csvToPdfEngine;
        break;
      }
      case 'document:csv:docx': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.csvToDocxEngine;
        break;
      }
      case 'document:csv:xlsx': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.csvToXlsxEngine;
        break;
      }
      case 'document:json:csv': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.jsonToCsvEngine;
        break;
      }
      case 'document:pdf:pdf':
      case 'document:docx:docx':
      case 'document:txt:txt':
      case 'document:csv:csv':
      case 'document:json:json': {
        const mod = await import('../lib/engines/document-engines');
        engineModules[engineId] = mod.identityEngine;
        break;
      }
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
      const { engineId, file: rawFile, options } = payload;
      try {
        isCancelled = false;
        let file: File = rawFile;

        // Auto-heal inverted legacy BMP headers ("MB" -> "BM")
        if (file.name.toLowerCase().endsWith('.bmp')) {
          try {
            const headerSlice = await file.slice(0, 2).arrayBuffer();
            const bytes = new Uint8Array(headerSlice);
            if (bytes[0] === 0x4d && bytes[1] === 0x42) {
              const repairedBlob = new Blob(
                [new Uint8Array([0x42, 0x4d]), file.slice(2)],
                { type: 'image/bmp' }
              );
              file = new File([repairedBlob], file.name, {
                type: 'image/bmp',
                lastModified: file.lastModified,
              });
            }
          } catch {
            // Keep file as is
          }
        }

        const module = await loadEngineModule(engineId);

        // The engine's runConversion function accepts (file, options, onProgress)
        // and returns a Blob
        const resultBlob = await module.runConversion(
          file,
          options ?? {},
          (p: number) => {
            if (isCancelled) {
              throw new Error('Conversion cancelled');
            }
            self.postMessage({ type: 'PROGRESS', payload: { progress: p } });
          }
        );

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
