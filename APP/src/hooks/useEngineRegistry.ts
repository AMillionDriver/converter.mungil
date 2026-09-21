import { useState, useEffect } from 'react';
import { engineRegistry } from '../lib/engine-registry';

export function useEngineRegistry() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await engineRegistry.fetchRegistry();
        setInitialized(true);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown registry error')
        );
      }
    }
    init();
  }, []);

  const resolve = (input: string, output: string) => {
    return engineRegistry.resolveEngine(input, output);
  };

  return {
    initialized,
    error,
    resolve,
    registry: engineRegistry.getRegistry(),
  };
}
