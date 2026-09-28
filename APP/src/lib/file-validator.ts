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
  private static SIGNATURES: Record<string, { offset: number; bytes: number[] }[]> = {
    pdf: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
    png: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }], // PNG
    jpg: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }], // JPEG
    jpeg: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }], // JPEG
    docx: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }], // PK\x03\x04 (ZIP)
    webp: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
    ],
    mp4: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // ftyp at offset 4
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
    if (!config.allowedMimeTypes.includes(file.type)) {
      // We allow a fallback to magic number check if MIME is generic (like application/octet-stream)
      if (file.type !== 'application/octet-stream') {
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

  private static async verifySignature(file: File, extension: string): Promise<boolean> {
    const rules = this.SIGNATURES[extension];
    if (!rules) return false; // unknown extension

    // Determine the maximum needed bytes based on offsets and lengths
    const maxNeeded = Math.max(...rules.map((r) => r.offset + r.bytes.length));
    const header = await file.slice(0, maxNeeded).arrayBuffer();
    const bytes = new Uint8Array(header);

    // All rules for this extension must match
    return rules.every((rule) =>
      rule.bytes.every((byte, i) => bytes[rule.offset + i] === byte)
    );
  }
}
