export interface ConversionMetric {
  conversionId: string;
  type: string;
  engineVersion: string;
  durationMs: number;
  success: boolean;
  cacheHit: boolean;
  browser: string;
  deviceClass: 'mobile' | 'desktop';
  fileSize: number;
  timestamp?: number;
  error?: string;
}

export interface MetricsSummary {
  total: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  totalBytesProcessed: number;
}

const STORAGE_KEY = 'flowy_conversion_metrics_v1';
const MAX_STORED_METRICS = 50;

export class ObservabilityManager {
  private static memoryMetrics: ConversionMetric[] = [];

  static async logMetric(metric: ConversionMetric): Promise<void> {
    const enrichedMetric: ConversionMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    };

    // 1. Maintain in-memory and local storage ring buffer
    this.memoryMetrics.unshift(enrichedMetric);
    if (this.memoryMetrics.length > MAX_STORED_METRICS) {
      this.memoryMetrics = this.memoryMetrics.slice(0, MAX_STORED_METRICS);
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = this.getStoredMetrics();
        stored.unshift(enrichedMetric);
        const trimmed = stored.slice(0, MAX_STORED_METRICS);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      }
    } catch {
      // LocalStorage quota or access denied; fallback to in-memory silently
    }

    // 2. Optional remote analytics ping if endpoint is configured
    const analyticsUrl = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    if (analyticsUrl && typeof navigator !== 'undefined') {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(analyticsUrl, JSON.stringify(enrichedMetric));
        } else {
          void fetch(analyticsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enrichedMetric),
            keepalive: true,
          }).catch(() => {
            // Ignore analytics network drop
          });
        }
      } catch {
        // Safe fail
      }
    }
  }

  static getStoredMetrics(): ConversionMetric[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = window.localStorage.getItem(STORAGE_KEY);
        if (data) {
          return JSON.parse(data) as ConversionMetric[];
        }
      }
    } catch {
      // JSON parse error
    }
    return [...this.memoryMetrics];
  }

  static getMetricsSummary(): MetricsSummary {
    const list = this.getStoredMetrics();
    if (list.length === 0) {
      return {
        total: 0,
        successCount: 0,
        failureCount: 0,
        avgDurationMs: 0,
        totalBytesProcessed: 0,
      };
    }

    const total = list.length;
    const successCount = list.filter((m) => m.success).length;
    const failureCount = total - successCount;
    const totalDuration = list.reduce((acc, m) => acc + (m.durationMs || 0), 0);
    const totalBytes = list.reduce((acc, m) => acc + (m.fileSize || 0), 0);

    return {
      total,
      successCount,
      failureCount,
      avgDurationMs: Math.round(totalDuration / total),
      totalBytesProcessed: totalBytes,
    };
  }

  static clearMetrics(): void {
    this.memoryMetrics = [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }

  static async reportEngineError(
    engineId: string,
    error: Error
  ): Promise<void> {
    console.error(`[Observability] Engine ${engineId} error: ${error.message}`);

    await this.logMetric({
      conversionId: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: engineId,
      engineVersion: '1.0.0',
      durationMs: 0,
      success: false,
      cacheHit: false,
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
      deviceClass:
        typeof navigator !== 'undefined' &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? 'mobile'
          : 'desktop',
      fileSize: 0,
      error: error.message,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('flowy:engine-error', {
          detail: { engineId, message: error.message },
        })
      );
    }
  }

  static exportDiagnostics(): string {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const summary = this.getMetricsSummary();
    const metrics = this.getStoredMetrics().slice(0, 10);

    const memoryGB = (nav as unknown as { deviceMemory?: number })?.deviceMemory || 'N/A';
    const cores = nav?.hardwareConcurrency || 'N/A';

    return [
      `=== Flowy Converter System Diagnostics ===`,
      `Date: ${new Date().toISOString()}`,
      `User Agent: ${nav?.userAgent || 'Unknown'}`,
      `Cores: ${cores} | RAM: ~${memoryGB} GB`,
      `WebAssembly Support: ${typeof WebAssembly !== 'undefined' ? 'YES' : 'NO'}`,
      `Total Conversions Recorded: ${summary.total} (${summary.successCount} Success, ${summary.failureCount} Failed)`,
      `Avg Duration: ${summary.avgDurationMs}ms`,
      `Total Data Processed: ${(summary.totalBytesProcessed / (1024 * 1024)).toFixed(2)} MB`,
      ``,
      `=== Recent 10 Records ===`,
      ...metrics.map(
        (m, i) =>
          `#${i + 1} [${new Date(m.timestamp || Date.now()).toLocaleTimeString()}] ${m.type} (${(m.fileSize / 1024).toFixed(1)} KB) - ${m.success ? 'SUCCESS' : 'FAIL: ' + (m.error || 'unknown')} in ${m.durationMs.toFixed(0)}ms`
      ),
    ].join('\n');
  }
}
