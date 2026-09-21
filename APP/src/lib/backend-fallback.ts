export interface FallbackResponse {
  success: boolean;
  blobUrl?: string;
  error?: string;
}

export class BackendFallbackManager {
  static async requestFallback(
    engineId: string,
    file: File,
    options: Record<string, unknown> = {}
  ): Promise<Blob> {
    console.log(
      `[Fallback] Requesting server-side conversion for ${engineId}...`
    );

    const formData = new FormData();
    formData.append('file', file);
    formData.append('engineId', engineId);
    formData.append('options', JSON.stringify(options));

    const response = await fetch('/api/convert/fallback', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Backend fallback failed: ${response.statusText}`);
    }

    return await response.blob();
  }
}
