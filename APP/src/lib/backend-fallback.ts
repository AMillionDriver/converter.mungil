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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log(
      `[Fallback] Requesting server-side conversion for ${engineId}...`
    );

    const formData = new FormData();
    formData.append('file', file);
    formData.append('engineId', engineId);
    formData.append('options', JSON.stringify(options));

    const response = await fetch(`${apiUrl}/api/convert/fallback`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Fitur konversi sisi-server untuk format (${engineId}) belum tersedia di backend.`
        );
      }
      throw new Error(`Backend fallback failed: ${response.statusText}`);
    }

    return await response.blob();
  }
}
