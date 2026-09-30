import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { PdfPageEngine } from '../engines/document/pdf-page-engine';
import { DownloadManager } from '../lib/download-manager';

if (typeof globalThis !== 'undefined') {
  (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
}

interface PageItem {
  id: string;
  originalIndex: number; // 0-indexed position in source PDF, or -1 for blank page
  rotation: number; // 0, 90, 180, 270
  selected: boolean;
  isBlank?: boolean;
}

export interface PdfPageApplyMeta {
  isExtracted: boolean;
  pageCount: number;
  extractedIndices?: number[];
}

interface PdfPageManagerModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (updatedFile: File, meta?: PdfPageApplyMeta) => void;
}

export function PdfPageManagerModal({
  file,
  isOpen,
  onClose,
  onApply,
}: PdfPageManagerModalProps) {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [originalTotalPages, setOriginalTotalPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [zoomPageIndex, setZoomPageIndex] = useState<number | null>(null);
  const [zoomLoading, setZoomLoading] = useState<boolean>(false);

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize and Render Thumbnails
  useEffect(() => {
    if (!isOpen || !file) {
      setPages([]);
      setThumbnails({});
      setIsLoading(true);
      return;
    }

    let active = true;
    setIsLoading(true);
    setStatusMessage(null);

    (async () => {
      try {
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
          disableFontFace: true,
        }).promise;

        if (!active) return;
        pdfDocRef.current = doc;
        setOriginalTotalPages(doc.numPages);

        const initialPages: PageItem[] = [];
        for (let i = 0; i < doc.numPages; i++) {
          initialPages.push({
            id: `page-${i}-${Date.now()}`,
            originalIndex: i,
            rotation: 0,
            selected: false,
          });
        }
        setPages(initialPages);

        // Generate thumbnails progressively
        const thumbs: Record<number, string> = {};
        for (let i = 1; i <= doc.numPages; i++) {
          if (!active) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.35 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            await page.render({
              canvasContext: ctx,
              canvas,
              viewport,
            }).promise;
            thumbs[i - 1] = canvas.toDataURL('image/webp', 0.8);
            if (active) {
              setThumbnails((prev) => ({ ...prev, [i - 1]: thumbs[i - 1] }));
            }
          }
        }
      } catch (err) {
        console.warn('[PdfPageManager] Gagal memuat thumbnail PDF:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [file, isOpen]);

  // Global Keyboard Navigation for Lightbox & Modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (zoomPageIndex !== null) {
        if (e.key === 'Escape') {
          setZoomPageIndex(null);
        } else if (e.key === 'ArrowLeft') {
          setZoomPageIndex((prev) =>
            prev !== null && prev > 0 ? prev - 1 : prev
          );
        } else if (e.key === 'ArrowRight') {
          setZoomPageIndex((prev) =>
            prev !== null && prev < pages.length - 1 ? prev + 1 : prev
          );
        }
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, zoomPageIndex, pages.length, onClose]);

  // Render High-Res Page in Lightbox
  useEffect(() => {
    if (zoomPageIndex === null || !pdfDocRef.current) return;
    const pageItem = pages[zoomPageIndex];
    if (!pageItem || pageItem.isBlank) return;

    let active = true;
    setZoomLoading(true);

    (async () => {
      try {
        const page = await pdfDocRef.current!.getPage(
          pageItem.originalIndex + 1
        );
        if (!active) return;

        const scale = 1.75;
        const viewport = page.getViewport({
          scale,
          rotation: pageItem.rotation,
        });

        const canvas = zoomCanvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          await page.render({
            canvasContext: ctx,
            canvas,
            viewport,
          }).promise;
        }
      } catch (err) {
        console.warn('[PdfPageManager] Gagal me-render zoom halaman:', err);
      } finally {
        if (active) setZoomLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [zoomPageIndex, pages]);

  // Insert Blank Page Action
  const handleInsertBlankPage = (atIndex?: number) => {
    const newBlank: PageItem = {
      id: `blank-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      originalIndex: -1,
      rotation: 0,
      selected: false,
      isBlank: true,
    };
    setPages((prev) => {
      const next = [...prev];
      if (
        typeof atIndex === 'number' &&
        atIndex >= 0 &&
        atIndex <= next.length
      ) {
        next.splice(atIndex, 0, newBlank);
      } else {
        next.push(newBlank);
      }
      return next;
    });
  };

  // Page Actions
  const handleRotatePage = (index: number, degreesToAdd: number) => {
    setPages((prev) => {
      const next = [...prev];
      const cur = next[index].rotation;
      next[index] = {
        ...next[index],
        rotation: (cur + degreesToAdd + 360) % 360,
      };
      return next;
    });
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      alert('Dokumen PDF harus memiliki minimal 1 halaman.');
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (zoomPageIndex !== null) {
      if (pages.length - 1 <= 0) {
        setZoomPageIndex(null);
      } else if (zoomPageIndex >= pages.length - 1) {
        setZoomPageIndex(pages.length - 2);
      }
    }
  };

  const handleMoveLeft = (index: number) => {
    if (index <= 0) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const handleMoveRight = (index: number) => {
    if (index >= pages.length - 1) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleToggleSelect = (index: number) => {
    setPages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  // Bulk Actions
  const handleSelectAll = (selectAll: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: selectAll })));
  };

  const handleRotateSelected = (degreesToAdd: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.selected
          ? { ...p, rotation: (p.rotation + degreesToAdd + 360) % 360 }
          : p
      )
    );
  };

  const handleRotateAll = (degreesToAdd: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + degreesToAdd + 360) % 360,
      }))
    );
  };

  const handleDeleteSelected = () => {
    const remaining = pages.filter((p) => !p.selected);
    if (remaining.length === 0) {
      alert('Tidak dapat menghapus semua halaman. Minimal sisakan 1 halaman.');
      return;
    }
    setPages(remaining);
  };

  const handleReset = () => {
    if (!originalTotalPages) return;
    const initialPages: PageItem[] = [];
    for (let i = 0; i < originalTotalPages; i++) {
      initialPages.push({
        id: `page-${i}-${Date.now()}`,
        originalIndex: i,
        rotation: 0,
        selected: false,
      });
    }
    setPages(initialPages);
  };

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setPages((prev) => {
      const next = [...prev];
      const [draggedItem] = next.splice(draggedIndex, 1);
      next.splice(index, 0, draggedItem);
      return next;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Apply Changes to Parent
  const handleApplyChanges = useCallback(
    async (extractSelectedOnly = false) => {
      if (!file) return;

      const targetPages = extractSelectedOnly
        ? pages.filter((p) => p.selected)
        : pages;

      if (targetPages.length === 0) {
        alert('Pilih minimal 1 halaman untuk disimpan.');
        return;
      }

      setIsProcessing(true);
      setStatusMessage('Memproses susunan dan rotasi halaman PDF...');

      try {
        const operations = targetPages.map((p) => ({
          originalIndex: p.originalIndex,
          rotation: p.rotation,
          isBlank: p.isBlank,
        }));

        const resultBlob = await PdfPageEngine.processPages(file, operations);

        const newFileName = extractSelectedOnly
          ? file.name.replace(
              /\.[^/.]+$/,
              `_ekstrak_${targetPages.length}hal.pdf`
            )
          : file.name.replace(/\.[^/.]+$/, '_diedit.pdf');

        const updatedFile = new File([resultBlob], newFileName, {
          type: 'application/pdf',
          lastModified: Date.now(),
        });

        const meta: PdfPageApplyMeta = {
          isExtracted: extractSelectedOnly,
          pageCount: targetPages.length,
          extractedIndices: extractSelectedOnly
            ? targetPages
                .map((p) => p.originalIndex + 1)
                .filter((num) => num > 0)
            : undefined,
        };

        onApply(updatedFile, meta);
        onClose();
      } catch (err) {
        alert(
          err instanceof Error
            ? err.message
            : 'Gagal memproses halaman dokumen PDF.'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [file, pages, onApply, onClose]
  );

  // Direct Download
  const handleDownload = async (extractSelectedOnly = false) => {
    if (!file) return;

    const targetPages = extractSelectedOnly
      ? pages.filter((p) => p.selected)
      : pages;

    if (targetPages.length === 0) {
      alert('Pilih minimal 1 halaman untuk diunduh.');
      return;
    }

    setIsProcessing(true);
    try {
      const operations = targetPages.map((p) => ({
        originalIndex: p.originalIndex,
        rotation: p.rotation,
        isBlank: p.isBlank,
      }));

      const resultBlob = await PdfPageEngine.processPages(file, operations);
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = extractSelectedOnly
        ? file.name.replace(/\.[^/.]+$/, '_halaman_terpilih.pdf')
        : file.name.replace(/\.[^/.]+$/, '_diedit.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengunduh berkas PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Pages as ZIP
  const handleDownloadZip = async (extractSelectedOnly = false) => {
    if (!file) return;

    const targetPages = extractSelectedOnly
      ? pages.filter((p) => p.selected)
      : pages;

    if (targetPages.length === 0) {
      alert('Pilih minimal 1 halaman untuk diunduh.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(
      `Memecah ${targetPages.length} halaman menjadi file PDF terpisah...`
    );

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const zipEntries: Array<{ name: string; blob: Blob }> = [];

      for (let i = 0; i < targetPages.length; i++) {
        const p = targetPages[i];
        setStatusMessage(
          `Memproses halaman ${i + 1} dari ${targetPages.length}...`
        );

        const singlePageBlob = await PdfPageEngine.processPages(file, [
          {
            originalIndex: p.originalIndex,
            rotation: p.rotation,
            isBlank: p.isBlank,
          },
        ]);

        const pageNum = String(i + 1).padStart(
          String(targetPages.length).length > 2 ? 3 : 2,
          '0'
        );
        const entryName = `${baseName}_hal_${pageNum}.pdf`;

        zipEntries.push({
          name: entryName,
          blob: singlePageBlob,
        });
      }

      setStatusMessage('Mengemas ke dalam arsip ZIP...');
      const zipFilename = extractSelectedOnly
        ? `${baseName}_halaman_terpilih_${Date.now()}.zip`
        : `${baseName}_semua_halaman_${Date.now()}.zip`;

      await DownloadManager.downloadZip(zipEntries, zipFilename);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal mengunduh halaman PDF sebagai ZIP.'
      );
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  if (!isOpen || !file) return null;

  const selectedCount = pages.filter((p) => p.selected).length;
  const isAllSelected = pages.length > 0 && selectedCount === pages.length;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative flex flex-col w-full max-w-6xl h-[90vh] max-h-[900px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6">
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
                  d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Kelola Halaman PDF — {file.name}
              </h3>
              <p className="text-xs text-slate-500">
                Atur urutan, putar (rotate), hapus, atau ekstrak halaman dokumen secara visual.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Tutup"
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

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 text-xs">
          {/* Left stats & selection */}
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700">
              <span className="font-bold text-slate-900">{pages.length}</span>{' '}
              Halaman {selectedCount > 0 && `(${selectedCount} dipilih)`}
            </span>

            <div className="h-4 w-px bg-slate-200" />

            <button
              type="button"
              onClick={() => handleSelectAll(!isAllSelected)}
              className="font-medium text-indigo-600 hover:text-indigo-800 transition"
            >
              {isAllSelected ? 'Batalkan Pilihan' : 'Pilih Semua'}
            </button>
          </div>

          {/* Right batch actions */}
          <div className="flex items-center gap-2">
            {selectedCount > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleRotateSelected(90)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition"
                  title="Putar 90° searah jarum jam untuk halaman terpilih"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <span>Putar Terpilih</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 hover:bg-rose-100 transition"
                  title="Hapus halaman yang dicentang"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                  <span>Hapus Terpilih ({selectedCount})</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleRotateAll(90)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition"
                title="Putar semua halaman 90°"
              >
                <svg
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span>Putar Semua Halaman (90°)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleInsertBlankPage()}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-xs"
              title="Sisipkan satu lembar kosong baru ke akhir dokumen"
            >
              <svg
                className="size-3.5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <span>+ Sisipkan Lembar Kosong</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
              title="Kembalikan urutan dan rotasi ke awal"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Thumbnail Grid Viewport */}
        <main className="flex-1 overflow-auto bg-slate-100/70 p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
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
              <span className="text-sm font-medium">
                Mempersiapkan pratinjau halaman PDF...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((p, index) => {
                const thumbUrl = thumbnails[p.originalIndex];
                const isDragging = draggedIndex === index;
                const isOver = dragOverIndex === index;

                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    className={`group relative flex flex-col rounded-xl border bg-white shadow-xs transition-all duration-150 select-none ${
                      p.selected
                        ? 'border-indigo-500 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${isDragging ? 'opacity-40 scale-95' : ''} ${
                      isOver ? 'border-indigo-400 bg-indigo-50/30' : ''
                    }`}
                  >
                    {/* Top Card Bar */}
                    <div className="flex items-center justify-between p-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={p.selected}
                          onChange={() => handleToggleSelect(index)}
                          className="size-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-slate-700">
                          #{index + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                        {p.rotation > 0 && (
                          <span className="rounded bg-indigo-50 text-indigo-600 px-1 py-0.2 font-semibold">
                            {p.rotation}°
                          </span>
                        )}
                        <span>
                          {p.isBlank ? '(Kosong)' : `(Hal. ${p.originalIndex + 1})`}
                        </span>
                      </div>
                    </div>

                    {/* Canvas Thumbnail Area */}
                    <div
                      onDoubleClick={() => setZoomPageIndex(index)}
                      className="group/thumb relative flex h-48 w-full items-center justify-center p-3 overflow-hidden cursor-pointer bg-slate-50"
                      title="Klik ganda atau klik tombol Perbesar untuk melihat halaman penuh"
                    >
                      {p.isBlank ? (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-4 border border-dashed border-slate-300 rounded-lg bg-white size-full">
                          <svg
                            className="size-8 text-slate-300 mb-1"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                            />
                          </svg>
                          <span className="text-[11px] font-semibold text-slate-600">
                            Lembar Kosong
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            Blank Page
                          </span>
                        </div>
                      ) : thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`Halaman ${index + 1}`}
                          style={{
                            transform: `rotate(${p.rotation}deg)`,
                          }}
                          className="max-h-full max-w-full rounded shadow-sm object-contain transition-transform duration-200"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <svg
                            className="size-8 mb-1 animate-pulse"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                            />
                          </svg>
                          <span className="text-[10px]">Memuat...</span>
                        </div>
                      )}

                      {/* Hover Overlay with Perbesar Button */}
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomPageIndex(index);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-xs hover:bg-white transition active:scale-95"
                        >
                          <svg
                            className="size-3.5 text-indigo-600"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                            />
                          </svg>
                          <span>Perbesar</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="flex items-center justify-between p-1.5 border-t border-slate-100 bg-white rounded-b-xl">
                      {/* Move Reorder */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveLeft(index)}
                          disabled={index <= 0}
                          title="Geser ke kiri"
                          className="inline-flex size-6 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <svg
                            className="size-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveRight(index)}
                          disabled={index >= pages.length - 1}
                          title="Geser ke kanan"
                          className="inline-flex size-6 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <svg
                            className="size-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Rotate Buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleRotatePage(index, -90)}
                          title="Putar -90° (Kiri)"
                          className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <svg
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRotatePage(index, 90)}
                          title="Putar +90° (Kanan)"
                          className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <svg
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Insert Blank & Delete */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleInsertBlankPage(index + 1)}
                          title="Sisipkan lembar kosong setelah halaman ini"
                          className="inline-flex size-6 items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <svg
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePage(index)}
                          title="Hapus halaman ini"
                          className="inline-flex size-6 items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <svg
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isProcessing ? (
              <span className="font-medium text-indigo-600 animate-pulse">
                {statusMessage || 'Sedang memproses dokumen...'}
              </span>
            ) : (
              <span>
                Tips: Seret (drag & drop) kartu untuk menyusun ulang posisi halaman.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Split / Extract button if pages are selected */}
            {selectedCount > 0 && selectedCount < pages.length && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleApplyChanges(true)}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition active:scale-95 shadow-xs"
                title="Gunakan hanya halaman terpilih ini di antrean konverter"
              >
                Gunakan {selectedCount} Halaman Saja (Ekstrak ke Konverter)
              </button>
            )}

            {/* Download Pages as ZIP button */}
            <button
              type="button"
              disabled={isProcessing || pages.length === 0}
              onClick={() =>
                handleDownloadZip(
                  selectedCount > 0 && selectedCount < pages.length
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition active:scale-95 shadow-xs"
              title={
                selectedCount > 0 && selectedCount < pages.length
                  ? `Pecah dan unduh ${selectedCount} halaman terpilih sebagai file PDF terpisah dalam format ZIP`
                  : 'Pecah dan unduh semua halaman sebagai file PDF terpisah dalam format ZIP'
              }
            >
              <svg
                className="size-3.5 text-indigo-600 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
              <span>
                {selectedCount > 0 && selectedCount < pages.length
                  ? `Unduh (${selectedCount}) Halaman .ZIP`
                  : 'Unduh Halaman (.ZIP)'}
              </span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleDownload(false)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 shadow-xs"
              title="Unduh dokumen lengkap sebagai satu file PDF"
            >
              Unduh Langsung (PDF)
            </button>

            <button
              type="button"
              disabled={isProcessing || pages.length === 0}
              onClick={() => handleApplyChanges(false)}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition active:scale-95 shadow-xs disabled:opacity-50"
            >
              Terapkan Perubahan
            </button>
          </div>
        </footer>
      </div>

      {/* Lightbox / Full-page Zoom Modal */}
      {zoomPageIndex !== null && pages[zoomPageIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex flex-col items-center justify-between p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setZoomPageIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-4xl flex items-center justify-between text-white shrink-0 py-2 px-3 sm:px-4 rounded-xl bg-slate-900/85 border border-slate-800 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-200">
                Halaman {zoomPageIndex + 1} dari {pages.length}
                {pages[zoomPageIndex].isBlank && (
                  <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Lembar Kosong
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-400">
                ({pages[zoomPageIndex].rotation}°)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Rotate Left */}
              <button
                type="button"
                onClick={() => handleRotatePage(zoomPageIndex, -90)}
                title="Putar -90° (Kiri)"
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9 15-6-6m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                  />
                </svg>
              </button>

              {/* Rotate Right */}
              <button
                type="button"
                onClick={() => handleRotatePage(zoomPageIndex, 90)}
                title="Putar +90° (Kanan)"
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"
                  />
                </svg>
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              {/* Close Lightbox */}
              <button
                type="button"
                onClick={() => setZoomPageIndex(null)}
                title="Tutup Pratinjau (ESC)"
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 transition"
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
          </div>

          {/* Center Stage with Prev / Canvas / Next */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-between gap-2 sm:gap-4 my-auto overflow-hidden py-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Page Button */}
            <button
              type="button"
              disabled={zoomPageIndex === 0}
              onClick={() =>
                setZoomPageIndex((prev) =>
                  prev !== null && prev > 0 ? prev - 1 : prev
                )
              }
              title="Halaman Sebelumnya (←)"
              className="shrink-0 size-10 sm:size-12 rounded-full bg-slate-900/80 hover:bg-indigo-600 disabled:opacity-25 disabled:hover:bg-slate-900/80 text-white flex items-center justify-center transition border border-slate-700 shadow-xl"
            >
              <svg
                className="size-5 sm:size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </button>

            {/* Document Content */}
            <div className="relative flex items-center justify-center flex-1 max-h-[78vh] overflow-auto">
              {pages[zoomPageIndex].isBlank ? (
                <div className="flex flex-col items-center justify-center w-[380px] h-[520px] max-w-[85vw] max-h-[75vh] bg-white rounded-lg shadow-2xl border-2 border-dashed border-slate-300 p-8 text-center select-none animate-in zoom-in-95 duration-150">
                  <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
                    <svg
                      className="size-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-slate-800">
                    Lembar Halaman Kosong
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-xs">
                    Halaman ini disisipkan sebagai lembar kosong putih dan akan disertakan saat diekspor.
                  </p>
                </div>
              ) : (
                <div className="relative flex items-center justify-center max-w-full max-h-full">
                  {zoomLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs rounded-lg z-10">
                      <div className="size-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <canvas
                    ref={zoomCanvasRef}
                    className="max-w-[85vw] max-h-[75vh] object-contain rounded-lg shadow-2xl bg-white transition-opacity duration-200"
                    style={{ opacity: zoomLoading ? 0.4 : 1 }}
                  />
                </div>
              )}
            </div>

            {/* Next Page Button */}
            <button
              type="button"
              disabled={zoomPageIndex === pages.length - 1}
              onClick={() =>
                setZoomPageIndex((prev) =>
                  prev !== null && prev < pages.length - 1 ? prev + 1 : prev
                )
              }
              title="Halaman Berikutnya (→)"
              className="shrink-0 size-10 sm:size-12 rounded-full bg-slate-900/80 hover:bg-indigo-600 disabled:opacity-25 disabled:hover:bg-slate-900/80 text-white flex items-center justify-center transition border border-slate-700 shadow-xl"
            >
              <svg
                className="size-5 sm:size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>

          {/* Bottom Bar Hints */}
          <div className="text-center text-xs text-slate-400 shrink-0 py-1">
            Gunakan tombol panah keyboard <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">←</kbd> dan <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">→</kbd> untuk berpindah halaman • Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">ESC</kbd> untuk keluar
          </div>
        </div>
      )}
    </div>
  );
}
