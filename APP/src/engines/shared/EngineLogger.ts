export interface LogEntry {
  engineId: string;
  operation: string;
  status: 'success' | 'fail' | 'warn' | 'loading';
  duration: number;
  inputSize: number;
  outputSize?: number;
  timestamp: number;
}

export class EngineLogger {
  static log(entry: LogEntry) {
    const statusIcon =
      entry.status === 'success'
        ? '✅'
        : entry.status === 'fail'
          ? '❌'
          : entry.status === 'loading'
            ? '⏳'
            : '⚠️';
    console.log(
      `[EngineLogger] ${statusIcon} ${entry.engineId} | ${entry.operation} | ${entry.duration}ms | ${entry.inputSize} bytes`
    );

    // In production, this would be sent to the ObservabilityManager
  }

  static error(engineId: string, message: string, error?: unknown) {
    console.error(
      `[EngineLogger] ❌ ${engineId} ERROR: ${message}`,
      error || ''
    );
  }

  static warn(engineId: string, message: string, error?: unknown) {
    console.warn(`[EngineLogger] ⚠️ ${engineId} WARN: ${message}`, error || '');
  }
}
