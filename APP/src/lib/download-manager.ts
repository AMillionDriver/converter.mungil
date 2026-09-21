export interface DownloadOptions {
  filename?: string;
  mimeType?: string;
}

export class DownloadManager {
  static async download(
    blob: Blob,
    options: DownloadOptions = {}
  ): Promise<void> {
    const defaultFilename = `converted-${Date.now()}.${options.mimeType?.split('/')[1] || 'bin'}`;
    const filename = options.filename || defaultFilename;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  static generateFilename(
    originalName: string,
    targetExtension: string
  ): string {
    const nameWithoutExt = originalName.substring(
      0,
      originalName.lastIndexOf('.')
    );
    return `${nameWithoutExt}_converted.${targetExtension}`;
  }
}
