export class BlobUtils {
  static async arrayBufferToBlob(
    buffer: ArrayBuffer,
    mimeType: string
  ): Promise<Blob> {
    return new Blob([buffer], { type: mimeType });
  }

  static async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return await blob.arrayBuffer();
  }

  static bytesToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
