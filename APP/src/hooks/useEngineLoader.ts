import { useState } from 'react';
import { EngineLoader, type EngineLoadStatus } from '../lib/engine-loader';
import { type EngineMetadata } from '../lib/engine-types';

export function useEngineLoader() {
  const [loadStatuses, setLoadStatuses] = useState<
    Record<string, EngineLoadStatus>
  >({});

  const loadEngine = async (engineId: string, metadata: EngineMetadata) => {
    setLoadStatuses((prev) => ({
      ...prev,
      [engineId]: { status: 'loading', progress: 0 },
    }));

    try {
      await EngineLoader.load(engineId, metadata, (progress) => {
        setLoadStatuses((prev) => ({
          ...prev,
          [engineId]: { status: 'loading', progress },
        }));
      });

      setLoadStatuses((prev) => ({
        ...prev,
        [engineId]: { status: 'installed', progress: 100 },
      }));
    } catch (error) {
      setLoadStatuses((prev) => ({
        ...prev,
        [engineId]: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
      throw error;
    }
  };

  return {
    loadStatuses,
    loadEngine,
  };
}
