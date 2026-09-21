export interface WorkerMessage {
  type:
    | 'INIT_ENGINE'
    | 'CONVERT'
    | 'ENGINE_READY'
    | 'PROGRESS'
    | 'SUCCESS'
    | 'ERROR'
    | 'CANCELLED';
  payload: unknown;
}

export class ConversionWorkerManager {
  private worker: Worker | null = null;

  private initWorker() {
    if (this.worker) return;

    // Vite handles worker imports using the ?worker suffix
    this.worker = new Worker(
      new URL('../workers/conversion.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  async initEngine(engineId: string, scriptUrl: string): Promise<void> {
    this.initWorker();
    return new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent) => {
        if (
          e.data.type === 'ENGINE_READY' &&
          e.data.payload.engineId === engineId
        ) {
          this.worker?.removeEventListener('message', handleMessage);
          resolve();
        } else if (e.data.type === 'ERROR') {
          this.worker?.removeEventListener('message', handleMessage);
          reject(new Error(e.data.payload.message));
        }
      };

      this.worker?.addEventListener('message', handleMessage);
      this.worker?.postMessage({
        type: 'INIT_ENGINE',
        payload: { engineId, scriptUrl },
      });
    });
  }

  async convert(
    engineId: string,
    file: File,
    options: Record<string, unknown>,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    this.initWorker();
    return new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'PROGRESS') {
          onProgress?.(e.data.payload.progress);
        } else if (e.data.type === 'SUCCESS') {
          this.worker?.removeEventListener('message', handleMessage);
          resolve(e.data.payload.blob);
        } else if (e.data.type === 'ERROR') {
          this.worker?.removeEventListener('message', handleMessage);
          reject(new Error(e.data.payload.message));
        } else if (e.data.type === 'CANCELLED') {
          this.worker?.removeEventListener('message', handleMessage);
          reject(new Error('Conversion cancelled by user'));
        }
      };

      this.worker?.addEventListener('message', handleMessage);
      this.worker?.postMessage({
        type: 'CONVERT',
        payload: { engineId, file, options },
      });
    });
  }

  cancel() {
    if (this.worker) {
      this.worker.postMessage({ type: 'CANCEL' });
    }
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const conversionWorker = new ConversionWorkerManager();
