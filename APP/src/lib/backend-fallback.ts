export interface FallbackResponse {
  success: boolean;
  blobUrl?: string;
  error?: string;
}

export class BackendFallbackManager {
  /**
   * Checks if a server-side conversion fallback API is reachable and active.
   */
  static async isFallbackAvailable(): Promise<boolean> {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Requests server-side conversion when local WASM processing is impossible or exceeds device capabilities.
   */
  static async requestFallback(
    engineId: string,
    file: File,
    options: Record<string, unknown> = {}
  ): Promise<Blob> {
    const apiUrl = import.meta.env.VITE_API_URL;

    if (!apiUrl) {
      throw new Error(
        `Layanan konversi server untuk format (${engineId}) belum diaktifkan. Konversi pada versi ini diproses secara lokal di browser Anda untuk menjaga privasi.`
      );
    }

    console.log(
      `[Fallback] Menghubungi server fallback untuk engine ${engineId}...`
    );

    const formData = new FormData();
    formData.append('file', file);
    formData.append('engineId', engineId);
    formData.append('options', JSON.stringify(options));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for server processing

      const response = await fetch(`${apiUrl}/api/convert/fallback`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Fitur konversi sisi-server untuk format (${engineId}) belum tersedia di backend.`
          );
        }
        if (response.status === 413) {
          throw new Error(
            'Ukuran file melebihi kapasitas maksimum payload server.'
          );
        }
        throw new Error(
          `Server fallback gagal (HTTP ${response.status}: ${response.statusText})`
        );
      }

      return await response.blob();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(
          'Permintaan konversi sisi-server melebihi batas waktu (timeout).'
        );
      }
      throw err;
    }
  }
}
