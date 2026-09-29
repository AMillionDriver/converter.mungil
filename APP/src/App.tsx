import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useEngineRegistry } from './hooks/useEngineRegistry';
import { useEngineLoader } from './hooks/useEngineLoader';
import { useConversion } from './hooks/useConversion';
import { engineRegistry } from './lib/engine-registry';
import { FileValidator } from './lib/file-validator';
import { ConversionPipeline } from './lib/conversion-pipeline';
import { DownloadManager } from './lib/download-manager';
import { MetadataSideMenu } from './components/MetadataSideMenu';
import { MetadataDiffModal } from './components/MetadataDiffModal';
import {
  ExifEngine,
  type ExifData,
  type ExifResult,
  type MetadataDiffItem,
} from './engines/image/exif-engine';

type IconName =
  | 'chevronDown'
  | 'creditCard'
  | 'facebook'
  | 'github'
  | 'instagram'
  | 'menu'
  | 'message'
  | 'upload'
  | 'user'
  | 'x'
  | 'youtube';

const iconPaths: Record<IconName, string[]> = {
  chevronDown: ['m6 9 6 6 6-6'],
  creditCard: ['M21 6H3v12h18z', 'M8 12h8', 'M8 16h4'],
  github: [
    'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
    'M9 18c-4.51 2-5-2-7-2',
  ],
  instagram: [
    'M16 3H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V8a5 5 0 0 0-5-5Z',
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'm17.5 6.51.01-.01',
  ],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  message: [
    'M21 11.5a8.38 8.38 0 0 1-9 8.5 8.5 8.5 0 0 1-7.5-5.5 8.38 8.38 0 0 1-1-6.5 8.5 8.5 0 0 1 8.5-6.5 8.38 8.38 0 0 1 6.5 2.5A8.5 8.5 0 0 1 21 11.5Z',
    'M8 12h.01',
    'M12 12h.01',
    'M16 12h.01',
  ],
  upload: [
    'M4 14v4m-2-4h4m-4 0l2-2 2 2m-2-2v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8',
    'M12 3v11',
  ],
  user: [
    'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2',
    'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  ],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  youtube: [
    'M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8Z',
    'm10 15 5-3-5-3z',
  ],
  facebook: [
    'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  ],
};

interface IconProps {
  name: IconName;
  title?: string;
}

function Icon({ name, title }: IconProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className="size-5"
      fill="none"
      role={title ? 'img' : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {title ? <title>{title}</title> : null}
      {iconPaths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

interface DropzoneProps {
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  activeMetadata: ExifResult | null;
  editedExif: ExifData;
  onInterceptDiff: (
    diffs: MetadataDiffItem[],
    execute: () => Promise<void>
  ) => void;
}

function Dropzone({
  uploadedFiles,
  setUploadedFiles,
  activeMetadata,
  editedExif,
  onInterceptDiff,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbLoadError, setThumbLoadError] = useState(false);
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const { runConversion, status, progress } = useConversion();

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    if (uploadedFiles.length > 0) {
      const file = uploadedFiles[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'ico'].includes(ext)) {
        url = URL.createObjectURL(file);
        if (active) {
          setThumbnailUrl(url);
          setThumbLoadError(false);
        }
      }
    } else {
      setThumbnailUrl(null);
      setThumbLoadError(false);
    }

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [uploadedFiles]);

  const isPdfMerge =
    uploadedFiles.length > 0 &&
    uploadedFiles.every((f) => f.name.toLowerCase().endsWith('.pdf'));

  const handleFiles = async (
    files: FileList | null,
    append: boolean = false
  ) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const config = {
      maxSizeMB: 1024,
      allowedMimeTypes: [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/bmp',
        'image/x-ms-bmp',
        'image/x-bmp',
        'image/x-icon',
        'image/vnd.microsoft.icon',
        'image/gif',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4',
      ],
      allowedExtensions: [
        'pdf',
        'png',
        'jpg',
        'jpeg',
        'webp',
        'bmp',
        'ico',
        'gif',
        'docx',
        'mp4',
      ],
    };

    const sanitizedFiles: File[] = [];
    for (const f of fileList) {
      let currentFile = f;
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (ext === 'bmp') {
        try {
          const headerSlice = await f.slice(0, 2).arrayBuffer();
          const bytes = new Uint8Array(headerSlice);
          if (bytes[0] === 0x4d && bytes[1] === 0x42) {
            // Auto-heal inverted legacy header ("MB" -> "BM")
            const repairedBlob = new Blob(
              [new Uint8Array([0x42, 0x4d]), f.slice(2)],
              { type: 'image/bmp' }
            );
            currentFile = new File([repairedBlob], f.name, {
              type: 'image/bmp',
              lastModified: f.lastModified,
            });
          } else if (f.type !== 'image/bmp') {
            currentFile = new File([f], f.name, {
              type: 'image/bmp',
              lastModified: f.lastModified,
            });
          }
        } catch {
          // Keep original file if slice fails
        }
      }
      sanitizedFiles.push(currentFile);
    }

    for (const f of sanitizedFiles) {
      const result = await FileValidator.validate(f, config);
      if (!result.isValid) {
        alert(`Invalid file (${f.name}): ${result.error}`);
        return;
      }
    }

    const nextFiles = append
      ? [...uploadedFiles, ...sanitizedFiles]
      : sanitizedFiles;
    setUploadedFiles(nextFiles);

    const allPdfs = nextFiles.every((f) =>
      f.name.toLowerCase().endsWith('.pdf')
    );
    if (allPdfs) {
      setAvailableFormats(['merge']);
      setSelectedFormat('merge');
      return;
    }

    if (nextFiles.length === 1) {
      const ext = nextFiles[0].name.split('.').pop()?.toLowerCase() || '';
      const formats = engineRegistry.getSupportedOutputFormats(ext);
      if (formats.length === 0) {
        alert(`No conversion options available for .${ext} files`);
        setUploadedFiles([]);
        return;
      }
      setAvailableFormats(formats);
      setSelectedFormat(formats[0]);
    } else {
      // Multiple non-PDF images -> option to convert all to 1 PDF
      const allImages = nextFiles.every((f) =>
        ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'ico'].includes(
          f.name.split('.').pop()?.toLowerCase() || ''
        )
      );
      if (allImages) {
        setAvailableFormats(['pdf']);
        setSelectedFormat('pdf');
      }
    }
  };

  const removeFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
    if (updated.length === 0) {
      setAvailableFormats([]);
      setSelectedFormat('');
    }
  };

  const handleConvert = async () => {
    if (uploadedFiles.length === 0) return;

    // PDF Merge Mode
    if (isPdfMerge) {
      if (uploadedFiles.length < 2) {
        alert(
          'Silakan pilih minimal 2 file PDF untuk digabungkan menjadi 1 file.'
        );
        return;
      }

      try {
        setIsMerging(true);
        const { PdfEngine } = await import('./engines/document/pdf-merge');
        const outputBlob = await PdfEngine.process({
          type: 'merge',
          files: uploadedFiles,
          options: {},
        });
        await DownloadManager.download(outputBlob, {
          filename: `merged-${Date.now()}.pdf`,
          mimeType: 'application/pdf',
        });
        setUploadedFiles([]);
      } catch (err) {
        alert(
          `Gagal menggabungkan PDF: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      } finally {
        setIsMerging(false);
      }
      return;
    }

    // Multiple Images to Single PDF Mode
    if (uploadedFiles.length > 1 && selectedFormat === 'pdf') {
      try {
        setIsMerging(true);
        const { PdfEngine } = await import('./engines/document/pdf-merge');
        const outputBlob = await PdfEngine.process({
          type: 'image-to-pdf',
          files: uploadedFiles,
          options: {},
        });
        await DownloadManager.download(outputBlob, {
          filename: `images-combined-${Date.now()}.pdf`,
          mimeType: 'application/pdf',
        });
        setUploadedFiles([]);
      } catch (err) {
        alert(
          `Gagal membuat PDF: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      } finally {
        setIsMerging(false);
      }
      return;
    }

    // Single File Conversion
    const executeSingle = async () => {
      const targetFile = uploadedFiles[0];
      try {
        const extension = targetFile.name.split('.').pop()?.toLowerCase() || '';
        const engine = await ConversionPipeline.resolveAndLoad(
          extension,
          selectedFormat
        );

        const outputBlob = await runConversion(engine.id, targetFile);
        const filename = DownloadManager.generateFilename(
          targetFile.name,
          selectedFormat
        );
        let mimeType = `image/${selectedFormat}`;
        if (selectedFormat === 'pdf') {
          mimeType = 'application/pdf';
        } else if (selectedFormat === 'ico') {
          mimeType = 'image/x-icon';
        } else if (selectedFormat === 'bmp') {
          mimeType = 'image/bmp';
        }

        await DownloadManager.download(outputBlob, {
          filename,
          mimeType,
        });

        setUploadedFiles([]);
      } catch (err) {
        alert(
          `Conversion error: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    };

    if (activeMetadata) {
      const diffs = ExifEngine.computeDiff(activeMetadata.exif, editedExif);
      if (diffs.length > 0) {
        onInterceptDiff(diffs, executeSingle);
        return;
      }
    }

    await executeSingle();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const isBusy = status === 'processing' || isMerging;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8
        transition-all duration-200 ease-in-out
        ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50'
            : thumbnailUrl && !thumbLoadError
              ? 'border-indigo-300 bg-slate-900/5 shadow-xs'
              : 'border-slate-300 bg-white hover:border-slate-400'
        }
      `}
    >
      {thumbnailUrl && !thumbLoadError && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <img
            src={thumbnailUrl}
            alt=""
            aria-hidden="true"
            className="size-full object-cover blur-2xl opacity-20 scale-110 transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-white/75 backdrop-blur-xs" />
        </div>
      )}

      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        type="file"
        multiple
        accept=".pdf"
        ref={addMoreInputRef}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, true)}
      />

      {uploadedFiles.length === 0 ? (
        <div className="relative z-10 flex flex-col items-center text-center">
          <div
            className={`
            mb-4 rounded-full p-4 transition-colors duration-200
            ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}
          `}
          >
            <Icon name="upload" title="Upload file" />
          </div>
          <div className="mb-6">
            <button
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95 ${
                isBusy ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600'
              }`}
            >
              {isBusy ? 'Memproses...' : 'Pilih File'}
            </button>
            <p className="mt-3 text-sm text-slate-500">
              atau seret dan lepas file di sini (mendukung banyak file
              sekaligus)
            </p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center text-center py-2">
          {isPdfMerge ? (
            <div className="w-full max-w-md mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-900">
                  File PDF ({uploadedFiles.length} file)
                </span>
                <button
                  type="button"
                  onClick={() => addMoreInputRef.current?.click()}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  + Tambah PDF Lagi
                </button>
              </div>
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 p-2 text-left text-xs text-slate-700">
                {uploadedFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between py-1.5 px-2"
                  >
                    <span className="truncate pr-2 font-medium">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-rose-500 hover:text-rose-700 font-medium ml-2 shrink-0"
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
              {uploadedFiles.length < 2 && (
                <p className="mt-2 text-xs text-amber-600">
                  Tambahkan minimal 1 file PDF lagi untuk mulai menggabungkan.
                </p>
              )}
            </div>
          ) : (
            <div className="mb-6">
              {thumbnailUrl && !thumbLoadError && (
                <div className="mb-4 flex justify-center">
                  <div className="group/thumb relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-md transition duration-200 hover:scale-102">
                    <img
                      src={thumbnailUrl}
                      alt={uploadedFiles[0].name}
                      onError={() => setThumbLoadError(true)}
                      className="max-h-48 w-auto max-w-full rounded-lg object-contain"
                    />
                    <div className="absolute bottom-2.5 right-2.5 rounded-md bg-slate-900/75 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                      {uploadedFiles[0].name.split('.').pop()?.toUpperCase()}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm font-semibold text-slate-900 mb-1">
                {uploadedFiles[0].name}
              </p>
              <p className="text-xs text-slate-500 mb-4">
                {(uploadedFiles[0].size / 1024 / 1024).toFixed(2)} MB
              </p>

              <div className="flex items-center justify-center gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Konversi ke:
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {availableFormats.map((format) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setUploadedFiles([])}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              disabled={isBusy || (isPdfMerge && uploadedFiles.length < 2)}
              onClick={handleConvert}
              className={`rounded-lg px-6 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-95 ${
                isBusy || (isPdfMerge && uploadedFiles.length < 2)
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600'
              }`}
            >
              {isBusy
                ? `Memproses ${progress > 0 ? `${progress}%` : '...'}`
                : isPdfMerge
                  ? 'Gabungkan PDF'
                  : 'Konversi Sekarang'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Footer() {
  const footerLinks = {
    'Alat Konversi': [
      { name: 'PDF ke Word', href: '#pdf-to-word' },
      { name: 'Word ke PDF', href: '#word-to-pdf' },
      { name: 'JPG ke PNG', href: '#jpg-to-png' },
      { name: 'PNG ke JPG', href: '#png-to-jpg' },
    ],
    Perusahaan: [
      { name: 'Tentang Kami', href: '#about' },
      { name: 'Karir', href: '#careers' },
      { name: 'Kontak', href: '#contact' },
      { name: 'Blog', href: '#blog' },
    ],
    'Informasi Hukum': [
      { name: 'Kebijakan Privasi', href: '#privacy' },
      { name: 'Syarat & Ketentuan', href: '#tos' },
      { name: 'Cookie Policy', href: '#cookies' },
      { name: 'DMCA', href: '#dmca' },
    ],
    Bantuan: [
      { name: 'Pusat Bantuan', href: '#help' },
      { name: 'Panduan Pengguna', href: '#guide' },
      { name: 'FAQ', href: '#faq' },
      { name: 'Hubungi Kami', href: '#contact' },
    ],
  };

  return (
    <footer className="bg-slate-100 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-6">
                {category}
              </h3>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-600 transition hover:text-indigo-600"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-slate-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <img
                alt="Mungil Converter Logo"
                className="size-8 rounded-lg object-cover"
                src="/asset/icon_mungil.svg"
              />
              <span className="text-base font-bold text-slate-900">
                Mungil Converter
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              <a
                aria-label="Facebook"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#facebook"
              >
                <Icon name="facebook" />
              </a>
              <a
                aria-label="Instagram"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#instagram"
              >
                <Icon name="instagram" />
              </a>
              <a
                aria-label="Twitter"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#twitter"
              >
                <Icon name="x" />
              </a>
              <a
                aria-label="YouTube"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#youtube"
              >
                <Icon name="youtube" />
              </a>
              <a
                aria-label="GitHub"
                className="text-slate-400 transition hover:text-indigo-600"
                href="#github"
              >
                <Icon name="github" />
              </a>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                <Icon name="creditCard" />
                <span className="text-xs font-medium text-slate-500">
                  Secure Payments
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Mungil Converter. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [activeMetadata, setActiveMetadata] = useState<ExifResult | null>(null);
  const [editedExif, setEditedExif] = useState<ExifData>({});
  const [isReadingMetadata, setIsReadingMetadata] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isMobileMetadataOpen, setIsMobileMetadataOpen] = useState(false);
  const [activeDiffs, setActiveDiffs] = useState<MetadataDiffItem[]>([]);
  const [pendingConvertAction, setPendingConvertAction] = useState<
    (() => Promise<void>) | null
  >(null);

  useEngineRegistry();
  useEngineLoader();

  useEffect(() => {
    if (uploadedFiles.length === 1) {
      const file = uploadedFiles[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isImage = [
        'png',
        'jpg',
        'jpeg',
        'webp',
        'bmp',
        'gif',
        'ico',
      ].includes(ext);
      if (isImage) {
        setIsReadingMetadata(true);
        ExifEngine.read(file)
          .then((res) => {
            setActiveMetadata(res);
            setEditedExif({ ...res.exif });
          })
          .catch((err) => {
            console.warn('Gagal membaca EXIF:', err);
            setActiveMetadata(null);
            setEditedExif({});
          })
          .finally(() => {
            setIsReadingMetadata(false);
          });
        return;
      }
    }
    setActiveMetadata(null);
    setEditedExif({});
  }, [uploadedFiles]);

  const handleUpdateExifField = (key: string, value: string) => {
    setEditedExif((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRemoveGps = () => {
    setEditedExif((prev) => ({
      ...prev,
      GPSLatitude: undefined,
      GPSLongitude: undefined,
      GPSAltitude: undefined,
    }));
  };

  const handleUpdateCoordinates = (
    lat?: number,
    long?: number,
    alt?: number
  ) => {
    setEditedExif((prev) => ({
      ...prev,
      GPSLatitude: lat,
      GPSLongitude: long,
      ...(alt !== undefined ? { GPSAltitude: alt } : {}),
    }));
  };

  const handleUpdateDevice = (
    make: string,
    model: string,
    software: string
  ) => {
    setEditedExif((prev) => ({
      ...prev,
      Make: make,
      Model: model,
      Software: software,
    }));
  };

  const handleStripAllExif = () => {
    setEditedExif({
      Artist: '',
      Copyright: '',
      ImageDescription: '',
      Software: '',
      Make: undefined,
      Model: undefined,
      LensModel: undefined,
      DateTimeOriginal: undefined,
      GPSLatitude: undefined,
      GPSLongitude: undefined,
      GPSAltitude: undefined,
      FNumber: undefined,
      ExposureTime: undefined,
      ISO: undefined,
      FocalLength: undefined,
    });
  };

  const handleResetExif = () => {
    if (activeMetadata) {
      setEditedExif({ ...activeMetadata.exif });
    }
  };

  const hasMetadataChanges = Boolean(
    activeMetadata &&
      ExifEngine.computeDiff(activeMetadata.exif, editedExif).length > 0
  );

  const handleInterceptDiff = (
    diffs: MetadataDiffItem[],
    execute: () => Promise<void>
  ) => {
    setActiveDiffs(diffs);
    setPendingConvertAction(() => execute);
    setIsDiffModalOpen(true);
  };

  const handleConfirmDiffModal = async () => {
    setIsDiffModalOpen(false);
    if (pendingConvertAction) {
      const action = pendingConvertAction;
      setPendingConvertAction(null);
      await action();
    }
  };

  const handleCancelDiffModal = () => {
    setIsDiffModalOpen(false);
    setPendingConvertAction(null);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((currentState) => !currentState);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav
          aria-label="Navigasi utama"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="flex h-16 items-center justify-between gap-4">
            <a
              aria-label="Mungil Converter beranda"
              className="flex shrink-0 items-center gap-3"
              href="#beranda"
            >
              <img
                alt=""
                className="size-10 rounded-xl object-cover"
                src="/asset/icon_mungil.svg"
              />
              <span className="text-base font-bold tracking-tight text-slate-900">
                Mungil Converter
              </span>
            </a>

            <button
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 md:flex"
              type="button"
            >
              <span className="max-w-36 truncate">mungil.my.id</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                Free
              </span>
              <Icon name="chevronDown" />
            </button>

            <div className="hidden items-center gap-1 md:flex">
              <a
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                href="#support"
              >
                <Icon name="message" />
                Support
              </a>
              <a
                aria-label="Buka profil"
                className="ml-1 inline-grid size-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                href="#profile"
              >
                <Icon name="user" />
              </a>
            </div>

            <button
              aria-controls="mobile-navigation"
              aria-expanded={isMobileMenuOpen}
              aria-label={
                isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'
              }
              className="inline-grid size-10 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 md:hidden"
              onClick={toggleMobileMenu}
              type="button"
            >
              <Icon name={isMobileMenuOpen ? 'x' : 'menu'} />
            </button>
          </div>

          {isMobileMenuOpen ? (
            <div
              className="border-t border-slate-200 py-3 md:hidden"
              id="mobile-navigation"
            >
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="text-sm font-medium text-slate-600">
                  mungil.my.id
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  Free
                </span>
              </div>
              <div className="mt-2 grid gap-1">
                <a
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                  href="#support"
                  onClick={toggleMobileMenu}
                >
                  <Icon name="message" />
                  Support
                </a>
                <a
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                  href="#profile"
                  onClick={toggleMobileMenu}
                >
                  <Icon name="user" />
                  Profil
                </a>
              </div>
            </div>
          ) : null}
        </nav>
      </header>

      <main
        className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        id="beranda"
      >
        <div className="w-full">
          {/* Grid 3 kolom desktop, 1 kolom mobile */}
          <div className="grid gap-8 lg:grid-cols-[280px_1fr_280px]">
            {/* Kolom Kiri - Ad Banner / Metadata Side Menu */}
            <aside
              aria-label={activeMetadata ? 'Metadata Inspector' : 'Iklan kiri'}
              className="hidden lg:block w-full max-w-[280px] self-start sticky top-24"
            >
              {activeMetadata ? (
                <MetadataSideMenu
                  metadata={activeMetadata}
                  editedExif={editedExif}
                  isLoading={isReadingMetadata}
                  hasChanges={hasMetadataChanges}
                  onUpdateField={handleUpdateExifField}
                  onUpdateCoordinates={handleUpdateCoordinates}
                  onUpdateDevice={handleUpdateDevice}
                  onRemoveGps={handleRemoveGps}
                  onStripAll={handleStripAllExif}
                  onReset={handleResetExif}
                />
              ) : (
                <div className="h-96 rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
                  <span className="text-sm text-slate-400">Advertisement</span>
                </div>
              )}
            </aside>

            {/* Kolom Tengah - Core Tool */}
            <section
              aria-labelledby="tool-title"
              className="w-full lg:max-w-3xl"
            >
              <h1
                className="mb-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                id="tool-title"
              >
                Konversikan file dengan mudah
              </h1>

              {/* Dropzone */}
              <div className="relative" id="converter-dropzone">
                <Dropzone
                  uploadedFiles={uploadedFiles}
                  setUploadedFiles={setUploadedFiles}
                  activeMetadata={activeMetadata}
                  editedExif={editedExif}
                  onInterceptDiff={handleInterceptDiff}
                />
              </div>

              {/* Mobile Accordion for Metadata Inspector */}
              {activeMetadata && (
                <div className="mt-6 block lg:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setIsMobileMetadataOpen(!isMobileMetadataOpen)
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <svg
                          className="size-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Metadata & EXIF
                          </span>
                          {hasMetadataChanges && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                              Ada Perubahan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {isMobileMetadataOpen
                            ? 'Tutup panel pengeditan'
                            : 'Ketuk untuk memeriksa & mengedit metadata'}
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`size-5 text-slate-400 transition-transform duration-200 ${
                        isMobileMetadataOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>

                  {isMobileMetadataOpen && (
                    <div className="mt-3">
                      <MetadataSideMenu
                        metadata={activeMetadata}
                        editedExif={editedExif}
                        isLoading={isReadingMetadata}
                        hasChanges={hasMetadataChanges}
                        onUpdateField={handleUpdateExifField}
                        onUpdateCoordinates={handleUpdateCoordinates}
                        onUpdateDevice={handleUpdateDevice}
                        onRemoveGps={handleRemoveGps}
                        onStripAll={handleStripAllExif}
                        onReset={handleResetExif}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Support text + Turnstile */}
              <div className="mt-6 space-y-3">
                <p className="text-sm text-slate-500">
                  Ukuran file maksimum 1GB.{' '}
                  <a
                    className="font-medium text-indigo-600 hover:text-indigo-700 underline"
                    href="#registrasi"
                  >
                    Daftar gratis untuk file lebih besar
                  </a>
                </p>
                <p className="text-xs text-slate-400">
                  Dengan mengunggah file, Anda menyetujui{' '}
                  <a className="underline hover:text-slate-500" href="#tos">
                    Syarat & Ketentuan
                  </a>{' '}
                  dan{' '}
                  <a className="underline hover:text-slate-500" href="#privacy">
                    Kebijakan Privasi
                  </a>
                  .
                </p>
                {/* Cloudflare Turnstile */}
                <div
                  className="mx-auto flex justify-center"
                  id="turnstile-placeholder"
                >
                  <div
                    className="cf-turnstile"
                    data-sitekey="0x4AAAAAADu46RXWxLxLRnbN"
                    data-theme="light"
                  ></div>
                </div>
              </div>
            </section>

            {/* Kolom Kanan - Ad Banner */}
            <aside
              aria-label="Iklan kanan"
              className="hidden lg:block w-full max-w-[280px] self-start"
            >
              <div className="h-96 rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
                <span className="text-sm text-slate-400">Advertisement</span>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <MetadataDiffModal
        isOpen={isDiffModalOpen}
        diffs={activeDiffs}
        onConfirm={handleConfirmDiffModal}
        onCancel={handleCancelDiffModal}
      />

      <Footer />
    </div>
  );
}

export default App;
