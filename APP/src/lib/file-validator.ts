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
  // Magic numbers for common file types
  private static MAGIC_NUMBERS: Record<string, number[]> = {
    'application/pdf': [37, 80, 68, 70], // %PDF
    'image/png': [137, 80, 78, 71], // .PNG
    'image/jpeg': [255, 216, 255], // JPEG
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      80, 75, 76, 76,
    ], // ZIP-based (DOCX)
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
    const isValidSignature = await this.verifySignature(file);
    if (!isValidSignature) {
      return {
        isValid: false,
        error:
          'File signature mismatch. The file content does not match its extension.',
      };
    }

    return { isValid: true };
  }

  private static async verifySignature(file: File): Promise<boolean> {
    const header = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(header);

    // Check if the file matches any of our known magic numbers
    return Object.values(this.MAGIC_NUMBERS).some((magic) => {
      return magic.every((byte, index) => bytes[index] === byte);
    });
  }
}
