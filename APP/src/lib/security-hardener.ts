export interface SecurityAuditResult {
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  fixed: boolean;
}

export interface ZipBombCheckResult {
  isBomb: boolean;
  compressionRatio: number;
  totalUncompressedBytes: number;
  fileSizeBytes: number;
  reason?: string;
}

export class SecurityHardener {
  /**
   * Sanitizes filenames to prevent path traversal and shell injection vulnerabilities.
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '')
      .replace(/[<>:"/\\|?*]/g, '_')
      .substring(0, 255);
  }

  /**
   * Calculates the SHA-256 checksum of binary data using Web Crypto API.
   */
  static async calculateChecksum(
    binary: ArrayBuffer | Uint8Array
  ): Promise<string> {
    const u8 = binary instanceof Uint8Array ? binary : new Uint8Array(binary);
    const copy = new Uint8Array(u8);
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      copy.buffer as ArrayBuffer
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies engine binary integrity against an expected SHA-256 hash.
   * Skips external check for local built-in WASM binaries.
   */
  static async validateEngineIntegrity(
    binary: ArrayBuffer | Uint8Array,
    expectedChecksum?: string
  ): Promise<boolean> {
    if (
      !expectedChecksum ||
      expectedChecksum === 'local' ||
      expectedChecksum === 'builtin'
    ) {
      return true;
    }

    const calculated = await this.calculateChecksum(binary);
    return calculated.toLowerCase() === expectedChecksum.toLowerCase();
  }

  /**
   * Inspects a ZIP archive's headers to detect Zip Bombs (anomalously high decompression ratio or extreme uncompressed sizes)
   * without extracting/allocating uncompressed payloads into browser RAM.
   */
  static async inspectZip(file: File | Blob): Promise<ZipBombCheckResult> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verify ZIP magic signature: PK\x03\x04 or empty PK\x05\x06
    if (
      bytes.length < 4 ||
      bytes[0] !== 0x50 ||
      bytes[1] !== 0x4b ||
      (bytes[2] !== 0x03 && bytes[2] !== 0x05)
    ) {
      return {
        isBomb: false,
        compressionRatio: 1,
        totalUncompressedBytes: bytes.length,
        fileSizeBytes: bytes.length,
      };
    }

    let totalUncompressed = 0;
    let totalCompressed = 0;
    const view = new DataView(buffer);
    let offset = 0;

    // Scan Central Directory (PK\x01\x02) first if present
    let foundCentralDir = false;
    for (let i = 0; i < bytes.length - 4; i++) {
      if (
        bytes[i] === 0x50 &&
        bytes[i + 1] === 0x4b &&
        bytes[i + 2] === 0x01 &&
        bytes[i + 3] === 0x02
      ) {
        foundCentralDir = true;
        offset = i;
        break;
      }
    }

    if (foundCentralDir) {
      while (offset + 46 <= bytes.length) {
        if (
          bytes[offset] !== 0x50 ||
          bytes[offset + 1] !== 0x4b ||
          bytes[offset + 2] !== 0x01 ||
          bytes[offset + 3] !== 0x02
        ) {
          break;
        }

        const compSize = view.getUint32(offset + 20, true);
        const uncompSize = view.getUint32(offset + 24, true);
        const nameLen = view.getUint16(offset + 28, true);
        const extraLen = view.getUint16(offset + 30, true);
        const commentLen = view.getUint16(offset + 32, true);

        totalCompressed += compSize;
        totalUncompressed += uncompSize;

        offset += 46 + nameLen + extraLen + commentLen;
      }
    } else {
      // Fallback: Scan local headers (PK\x03\x04)
      offset = 0;
      while (offset + 30 <= bytes.length) {
        if (
          bytes[offset] !== 0x50 ||
          bytes[offset + 1] !== 0x4b ||
          bytes[offset + 2] !== 0x03 ||
          bytes[offset + 3] !== 0x04
        ) {
          offset++;
          continue;
        }

        const compSize = view.getUint32(offset + 18, true);
        const uncompSize = view.getUint32(offset + 22, true);
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);

        totalCompressed += compSize;
        totalUncompressed += uncompSize;

        offset += 30 + nameLen + extraLen + compSize;
      }
    }

    const compressedBase = totalCompressed > 0 ? totalCompressed : bytes.length;
    const ratio = totalUncompressed / Math.max(compressedBase, 1);
    const MAX_SAFE_RATIO = 100; // 100:1 ratio limit
    const MAX_UNCOMPRESSED_LIMIT = 2 * 1024 * 1024 * 1024; // 2 GB limit for browser safety

    if (ratio > MAX_SAFE_RATIO && totalUncompressed > 10 * 1024 * 1024) {
      return {
        isBomb: true,
        compressionRatio: ratio,
        totalUncompressedBytes: totalUncompressed,
        fileSizeBytes: bytes.length,
        reason: `Rasio kompresi mencurigakan (${ratio.toFixed(1)}:1 melebihi batas aman ${MAX_SAFE_RATIO}:1).`,
      };
    }

    if (totalUncompressed > MAX_UNCOMPRESSED_LIMIT && bytes.length < 50 * 1024 * 1024) {
      return {
        isBomb: true,
        compressionRatio: ratio,
        totalUncompressedBytes: totalUncompressed,
        fileSizeBytes: bytes.length,
        reason: `Ukuran dekompresi arsip terlalu besar (${(totalUncompressed / (1024 * 1024 * 1024)).toFixed(1)} GB) untuk memori browser.`,
      };
    }

    return {
      isBomb: false,
      compressionRatio: ratio,
      totalUncompressedBytes: totalUncompressed,
      fileSizeBytes: bytes.length,
    };
  }

  /**
   * Helper that returns true if file is detected as a potential Zip Bomb.
   */
  static async checkForZipBomb(file: File | Blob): Promise<boolean> {
    const result = await this.inspectZip(file);
    return result.isBomb;
  }
}
