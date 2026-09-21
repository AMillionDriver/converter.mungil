// This is the main worker orchestrator.
// It handles message communication between the UI thread and the WASM engines.

let isCancelled = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'CANCEL':
      isCancelled = true;
      self.postMessage({ type: 'CANCELLED', payload: {} });
      break;

    case 'INIT_ENGINE':
      try {
        const { engineId } = payload;
        console.log(`[Worker] Engine ${engineId} initialized.`);
        self.postMessage({ type: 'ENGINE_READY', payload: { engineId } });
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          payload: { message: (error as Error).message },
        });
      }
      break;

    case 'CONVERT':
      try {
        isCancelled = false;
        const { engineId } = payload;
        console.log(`[Worker] Starting conversion with ${engineId}...`);

        for (let i = 0; i <= 100; i += 20) {
          if (isCancelled) {
            throw new Error('Conversion cancelled');
          }
          self.postMessage({ type: 'PROGRESS', payload: { progress: i } });
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        const resultBlob = new Blob(['Converted Content'], {
          type: 'application/octet-stream',
        });
        self.postMessage({ type: 'SUCCESS', payload: { blob: resultBlob } });
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          payload: { message: (error as Error).message },
        });
      }
      break;

    default:
      console.warn(`[Worker] Unknown message type: ${type}`);
  }
};
