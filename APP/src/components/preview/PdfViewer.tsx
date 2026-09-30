import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

// Ensure worker is registered in-thread
if (typeof globalThis !== 'undefined') {
  (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
}

interface PdfViewerProps {
  file: File;
}

export function PdfViewer({ file }: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    (async () => {
      try {
        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
          disableFontFace: true,
        });

        const doc = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat dokumen PDF. Pastikan file tidak rusak atau terenkripsi.'
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancellation errors
        }
      }
    };
  }, [file]);

  // Render Current Page to Canvas
  const renderPage = useCallback(
    async (pageNum: number, currentScale: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancellation
        }
        renderTaskRef.current = null;
      }

      setIsRendering(true);

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale: currentScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          canvas,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        // If not cancellation error, log
        const isCancelled =
          err instanceof Error && err.name === 'RenderingCancelledException';
        if (!isCancelled) {
          console.warn('[PdfViewer] Gagal me-render halaman:', err);
        }
      } finally {
        setIsRendering(false);
      }
    },
    [pdfDoc]
  );

  // Trigger render on page or scale or viewMode change
  useEffect(() => {
    if (viewMode === 'visual' && pdfDoc && numPages > 0) {
      renderPage(currentPage, scale);
    }
  }, [viewMode, pdfDoc, currentPage, scale, numPages, renderPage]);

  // Load Extracted Text on demand when switching to text mode
  useEffect(() => {
    if (viewMode === 'text' && pdfDoc && !extractedText) {
      let active = true;
      (async () => {
        try {
          const parts: string[] = [];
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            const pageStr = content.items
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((it: any) => typeof it.str === 'string')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((it: any) => it.str)
              .join(' ');
            parts.push(`--- Halaman ${i} ---\n${pageStr.trim()}`);
          }
          if (active) {
            setExtractedText(parts.join('\n\n'));
          }
        } catch {
          if (active) {
            setExtractedText('Gagal mengekstrak teks dari PDF.');
          }
        }
      })();
      return () => {
        active = false;
      };
    }
  }, [viewMode, pdfDoc, extractedText]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(Number((s + 0.2).toFixed(1)), 2.4));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(Number((s - 0.2).toFixed(1)), 0.6));
  };

  const handleResetZoom = () => {
    setScale(1.2);
  };

  const handleCopyText = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <svg
          className="size-8 animate-spin text-indigo-600 mb-3"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium">Memuat dokumen PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-3 border border-rose-100">
          <svg
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-slate-800">Pratinjau Tidak Tersedia</h4>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Interactive PDF Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-700">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isRendering}
            aria-label="Halaman sebelumnya"
            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>

          <span className="px-2 text-slate-600 font-medium whitespace-nowrap">
            Hal. <span className="font-bold text-slate-900">{currentPage}</span> dari{' '}
            <span className="font-bold text-slate-900">{numPages}</span>
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages || isRendering}
            aria-label="Halaman selanjutnya"
            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'visual' && (
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.6 || isRendering}
                aria-label="Perkecil"
                className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <svg
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-[11px] font-mono text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition"
                title="Reset zoom ke 100%"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 2.4 || isRendering}
                aria-label="Perbesar"
                className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <svg
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          )}

          {/* Mode Switcher: Visual vs Text */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                viewMode === 'visual'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('text')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                viewMode === 'text'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Teks
            </button>
          </div>

          {viewMode === 'text' && (
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {isCopied ? 'Tersalin!' : 'Salin Teks'}
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-auto bg-slate-200/60 p-4 sm:p-6 flex items-start justify-center">
        {viewMode === 'visual' ? (
          <div className="relative flex flex-col items-center">
            {isRendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-lg">
                <svg
                  className="size-6 animate-spin text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="rounded-lg bg-white shadow-lg transition-all"
            />
          </div>
        ) : (
          <div className="h-full w-full max-w-3xl overflow-auto rounded-xl border border-slate-200 bg-white p-6 font-mono text-xs text-slate-800 shadow-xs whitespace-pre-wrap leading-relaxed">
            {extractedText || 'Mengekstrak teks dokumen...'}
          </div>
        )}
      </div>
    </div>
  );
}
