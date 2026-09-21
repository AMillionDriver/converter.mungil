export enum ConversionErrorCode {
  UNSUPPORTED_FORMAT = 'ERR_UNSUPPORTED_FORMAT',
  CORRUPT_FILE = 'ERR_CORRUPT_FILE',
  OUT_OF_MEMORY = 'ERR_OUT_OF_MEMORY',
  WASM_LOAD_FAIL = 'ERR_WASM_LOAD_FAIL',
  CONVERSION_TIMEOUT = 'ERR_TIMEOUT',
  BROWSER_INCOMPATIBLE = 'ERR_BROWSER_INCOMPATIBLE',
  GENERIC_ERROR = 'ERR_GENERIC',
}

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion: string;
  code: ConversionErrorCode;
}

export class ErrorMapper {
  private static ERROR_MAP: Record<string, UserFriendlyError> = {
    [ConversionErrorCode.UNSUPPORTED_FORMAT]: {
      title: 'Format Tidak Didukung',
      message: 'Maaf, format file ini belum didukung oleh engine kami.',
      suggestion: 'Coba gunakan format lain atau tunggu update selanjutnya.',
      code: ConversionErrorCode.UNSUPPORTED_FORMAT,
    },
    [ConversionErrorCode.CORRUPT_FILE]: {
      title: 'File Rusak',
      message: 'File yang Anda unggah tampak rusak atau tidak valid.',
      suggestion:
        'Pastikan file bisa dibuka di aplikasi aslinya sebelum dikonversi.',
      code: ConversionErrorCode.CORRUPT_FILE,
    },
    [ConversionErrorCode.OUT_OF_MEMORY]: {
      title: 'Memori Penuh',
      message: 'File terlalu besar untuk diproses di browser Anda.',
      suggestion: 'Coba tutup tab lain atau gunakan mode Backend Fallback.',
      code: ConversionErrorCode.OUT_OF_MEMORY,
    },
    [ConversionErrorCode.WASM_LOAD_FAIL]: {
      title: 'Gagal Memuat Engine',
      message: 'Koneksi terputus saat mengunduh mesin konversi.',
      suggestion: 'Periksa koneksi internet Anda dan coba lagi.',
      code: ConversionErrorCode.WASM_LOAD_FAIL,
    },
    [ConversionErrorCode.CONVERSION_TIMEOUT]: {
      title: 'Waktu Habis',
      message: 'Proses konversi memakan waktu terlalu lama.',
      suggestion:
        'Coba gunakan file yang lebih kecil atau aktifkan Backend Fallback.',
      code: ConversionErrorCode.CONVERSION_TIMEOUT,
    },
    [ConversionErrorCode.BROWSER_INCOMPATIBLE]: {
      title: 'Browser Tidak Support',
      message:
        'Browser Anda tidak mendukung teknologi WebAssembly yang dibutuhkan.',
      suggestion: 'Gunakan Chrome atau Firefox versi terbaru.',
      code: ConversionErrorCode.BROWSER_INCOMPATIBLE,
    },
  };

  static map(error: unknown): UserFriendlyError {
    const message = error instanceof Error ? error.message : String(error);

    // Simple keyword mapping for technical errors
    if (
      message.includes('out of memory') ||
      message.includes('allocation failed')
    ) {
      return this.ERROR_MAP[ConversionErrorCode.OUT_OF_MEMORY];
    }
    if (
      message.includes('failed to fetch') ||
      message.includes('network error')
    ) {
      return this.ERROR_MAP[ConversionErrorCode.WASM_LOAD_FAIL];
    }
    if (message.includes('invalid') || message.includes('corrupt')) {
      return this.ERROR_MAP[ConversionErrorCode.CORRUPT_FILE];
    }

    // Fallback to generic error
    return {
      title: 'Terjadi Kesalahan',
      message: message || 'Sesuatu yang tidak terduga terjadi saat konversi.',
      suggestion: 'Silakan coba lagi beberapa saat lagi.',
      code: ConversionErrorCode.GENERIC_ERROR,
    };
  }
}
