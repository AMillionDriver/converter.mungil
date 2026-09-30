import { useEffect, useState } from 'react';
import { PdfViewer } from './preview/PdfViewer';
import { DocxViewer } from './preview/DocxViewer';
import { CsvViewer } from './preview/CsvViewer';
import { TextViewer } from './preview/TextViewer';

interface FilePreviewModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
}: FilePreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{
    w: number;
    h: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !file) {
      setBlobUrl(null);
      setImgDimensions(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = [
      'png',
      'jpg',
      'jpeg',
      'webp',
      'bmp',
      'gif',
      'ico',
      'svg',
    ].includes(ext);

    let active = true;
    let createdUrl: string | null = null;

    if (isImage) {
      createdUrl = URL.createObjectURL(file);
      setBlobUrl(createdUrl);

      const img = new Image();
      img.onload = () => {
        if (active) {
          setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        }
      };
      img.src = createdUrl;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      active = false;
      window.removeEventListener('keydown', handleKeyDown);
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file, isOpen, onClose]);

  if (!isOpen || !file) {
    return null;
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = [
    'png',
    'jpg',
    'jpeg',
    'webp',
    'bmp',
    'gif',
    'ico',
    'svg',
  ].includes(ext);
  const isPdf = ext === 'pdf';
  const isDocx = ext === 'docx';
  const isCsv = ext === 'csv';
  const isText = ['txt', 'json', 'log', 'md'].includes(ext);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] max-h-[850px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
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
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {file.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <span>•</span>
                <span className="uppercase font-semibold text-slate-600">
                  {ext}
                </span>
                {imgDimensions && (
                  <>
                    <span>•</span>
                    <span>
                      {imgDimensions.w} × {imgDimensions.h} px
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Tutup pratinjau"
              onClick={onClose}
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            >
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
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-hidden bg-slate-100/60 flex items-center justify-center">
          {/* 1. Image Viewer */}
          {isImage && blobUrl && (
            <div className="relative flex h-full w-full items-center justify-center p-4 overflow-auto">
              <img
                src={blobUrl}
                alt={file.name}
                className="max-h-full max-w-full rounded-lg object-contain shadow-md transition-transform"
              />
            </div>
          )}

          {/* 2. Interactive PDF Viewer (PDF.js Canvas) */}
          {isPdf && <PdfViewer file={file} />}

          {/* 3. Interactive DOCX Document Viewer */}
          {isDocx && <DocxViewer file={file} />}

          {/* 4. Interactive CSV Table Viewer */}
          {isCsv && <CsvViewer file={file} />}

          {/* 5. Interactive Text / JSON / Code Viewer */}
          {isText && <TextViewer file={file} />}

          {/* 6. Fallback for Unsupported Binary Formats */}
          {!isImage && !isPdf && !isDocx && !isCsv && !isText && (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100 shadow-xs">
                <svg
                  className="size-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Format {ext.toUpperCase()} Teridentifikasi
              </h4>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Format berkas ini telah tervalidasi dan siap diproses melalui
                opsi konversi yang tersedia di bawah.
              </p>
              <div className="mt-5 flex items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-3 w-full text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">Tipe</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {ext}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Ukuran
                  </span>
                  <span className="font-semibold text-slate-800">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-6">
          <span className="text-xs text-slate-500">
            Tekan{' '}
            <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
              ESC
            </kbd>{' '}
            untuk menutup
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 shadow-xs"
          >
            Tutup
          </button>
        </footer>
      </div>
    </div>
  );
}
