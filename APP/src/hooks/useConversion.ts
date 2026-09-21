import { useState } from 'react';
import { conversionWorker } from '../lib/worker-manager';
import { BackendFallbackManager } from '../lib/backend-fallback';

export type ConversionStatus =
  | 'idle'
  | 'loading-engine'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export function useConversion() {
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runConversion = async (
    engineId: string,
    file: File,
    options: Record<string, unknown> = {}
  ): Promise<Blob> => {
    setStatus('processing');
    setProgress(0);
    setError(null);

    try {
      const result = await conversionWorker.convert(
        engineId,
        file,
        options,
        (p) => setProgress(p)
      );
      setStatus('completed');
      return result;
    } catch (err) {
      const isCancelled =
        err instanceof Error && err.message.includes('cancelled');
      if (isCancelled) {
        setStatus('cancelled');
        throw err;
      }

      console.warn(
        '[useConversion] Client conversion failed. Trying backend fallback...'
      );
      try {
        const fallbackResult = await BackendFallbackManager.requestFallback(
          engineId,
          file,
          options
        );
        setStatus('completed');
        return fallbackResult;
      } catch (fallbackErr) {
        setStatus('failed');
        setError(
          fallbackErr instanceof Error ? fallbackErr.message : 'Fallback failed'
        );
        throw fallbackErr;
      }
    }
  };

  const cancelConversion = () => {
    conversionWorker.cancel();
  };

  return {
    status,
    progress,
    error,
    runConversion,
    cancelConversion,
  };
}
