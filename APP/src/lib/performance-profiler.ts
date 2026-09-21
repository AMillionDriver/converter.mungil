export interface PerformanceMetric {
  engineId: string;
  inputSize: number;
  outputSize: number;
  durationMs: number;
  memoryPeakMB?: number;
  cacheHit: boolean;
  timestamp: number;
}

export class PerformanceProfiler {
  static async profile(
    engineId: string,
    operation: () => Promise<Blob>,
    file: File
  ): Promise<{ result: Blob; metric: PerformanceMetric }> {
    const startTime = performance.now();

    // Use type casting to avoid 'any' for non-standard performance.memory
    const perfMemory = performance as unknown as {
      memory?: { usedJSHeapSize: number };
    };
    const startMemory = perfMemory.memory?.usedJSHeapSize || 0;

    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      const endMemory = perfMemory.memory?.usedJSHeapSize || 0;

      const metric: PerformanceMetric = {
        engineId,
        inputSize: file.size,
        outputSize: result.size,
        durationMs: duration,
        memoryPeakMB: (endMemory - startMemory) / (1024 * 1024),
        cacheHit: true, // Simplified for profiling
        timestamp: Date.now(),
      };

      console.log(
        `[Profiler] Engine ${engineId} took ${duration.toFixed(2)}ms`
      );
      return { result, metric };
    } catch (error) {
      console.error(`[Profiler] Profiling failed for ${engineId}`, error);
      throw error;
    }
  }

  static async saveMetric(metric: PerformanceMetric): Promise<void> {
    // In a real app, this would be sent to the ObservabilityManager
    console.log('[Profiler] Metric saved:', metric);
  }
}
