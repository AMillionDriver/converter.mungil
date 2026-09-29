export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FileValidatorConfig {
  maxSizeMB: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export class FileValidator {
  // Signature rules per extension, with offsets for formats that need it
  // Signature rules per extension, allowing multiple valid signature variants
  private static SIGNATURES: Record<
    string,
    { offset: number; bytes: number[] }[][]
  > = {
    pdf: [[{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }]], // %PDF
    png: [[{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }]], // PNG
    jpg: [[{ offset: 0, bytes: [0xff, 0xd8, 0xff] }]], // JPEG
    jpeg: [[{ offset: 0, bytes: [0xff, 0xd8, 0xff] }]], // JPEG
    docx: [[{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }]], // PK\x03\x04 (ZIP)
    webp: [
      [
        { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
        { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
      ],
    ],
    bmp: [
      [{ offset: 0, bytes: [0x42, 0x4d] }], // Standard 'BM'
      [{ offset: 0, bytes: [0x4d, 0x42] }], // Legacy little-endian 'MB'
    ],
    gif: [
      [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }], // GIF87a
      [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }], // GIF89a
      [{ offset: 0, bytes: [0x47, 0x49, 0x46] }], // GIF
    ],
    ico: [[{ offset: 0, bytes: [0x00, 0x00, 0x01, 0x00] }]], // ICO
    mp4: [[{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }]], // ftyp at offset 4
  };

  static async validate(
    file: File,
    config: FileValidatorConfig
  ): Promise<ValidationResult> {
    // 1. Size Validation
    if (file.size > config.maxSizeMB * 1024 * 1024) {
      return {
        isValid: false,
        error: `File size exceeds limit of ${config.maxSizeMB}MB`,
      };
    }

    // 2. Extension Validation
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !config.allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `Extension .${extension} is not supported`,
      };
    }

    // 3. MIME Type Validation
    // Windows browsers can provide empty string or alternative image MIMEs
    if (file.type && file.type !== 'application/octet-stream') {
      const isKnownBmp =
        extension === 'bmp' &&
        ['image/bmp', 'image/x-ms-bmp', 'image/x-bmp', 'image/bitmap'].includes(
          file.type
        );
      const isKnownIco =
        extension === 'ico' &&
        ['image/x-icon', 'image/vnd.microsoft.icon', 'image/ico'].includes(
          file.type
        );
      if (
        !config.allowedMimeTypes.includes(file.type) &&
        !isKnownBmp &&
        !isKnownIco
      ) {
        return {
          isValid: false,
          error: `MIME type ${file.type} is not supported`,
        };
      }
    }

    // 4. Magic Number / Signature Validation
    const isValidSignature = await this.verifySignature(file, extension);
    if (!isValidSignature) {
      return {
        isValid: false,
        error:
          'File signature mismatch. The file content does not match its extension.',
      };
    }

    return { isValid: true };
  }

  private static async verifySignature(
    file: File,
    extension: string
  ): Promise<boolean> {
    const signatureVariants = this.SIGNATURES[extension];
    if (!signatureVariants || signatureVariants.length === 0) return true;

    // Check if at least one variant matches
    for (const rules of signatureVariants) {
      const maxNeeded = Math.max(
        ...rules.map((r) => r.offset + r.bytes.length)
      );
      const header = await file.slice(0, maxNeeded).arrayBuffer();
      const bytes = new Uint8Array(header);

      const matches = rules.every((rule) =>
        rule.bytes.every((byte, i) => bytes[rule.offset + i] === byte)
      );

      if (matches) return true;
    }

    return false;
  }
}
