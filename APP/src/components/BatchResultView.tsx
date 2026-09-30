import { useState } from 'react';
import { DownloadManager } from '../lib/download-manager';

export interface ConvertedBatchItem {
  id: string;
  originalName: string;
  filename: string;
  blob: Blob;
  mimeType: string;
  size: number;
}

interface BatchResultViewProps {
  results: ConvertedBatchItem[];
  onReset: () => void;
  onPreview?: (file: File) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function BatchResultView({
  results,
  onReset,
  onPreview,
}: BatchResultViewProps) {
  const [isZipping, setIsZipping] = useState(false);
  const totalSize = results.reduce((acc, r) => acc + r.size, 0);

  const handleDownloadAllZip = async () => {
    if (results.length === 0 || isZipping) return;
    try {
      setIsZipping(true);
      const zipEntries = results.map((r) => ({
        name: r.filename,
        blob: r.blob,
      }));
      await DownloadManager.downloadZip(
        zipEntries,
        `flowy-converted-${Date.now()}.zip`
      );
    } catch (err) {
      alert(
        `Gagal membuat file ZIP: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadSingle = async (item: ConvertedBatchItem) => {
    await DownloadManager.download(item.blob, {
      filename: item.filename,
      mimeType: item.mimeType,
    });
  };

  const handlePreviewSingle = (item: ConvertedBatchItem) => {
    if (!onPreview) return;
    const file = new File([item.blob], item.filename, {
      type: item.mimeType,
    });
    onPreview(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-left">
      {/* Header Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
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
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Konversi Selesai!
            </h2>
            <p className="text-xs text-slate-500">
              {results.length} file berhasil diproses ({formatBytes(totalSize)})
            </p>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
          >
            Konversi File Baru
          </button>
          <button
            type="button"
            disabled={isZipping}
            onClick={handleDownloadAllZip}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            <svg
              className="size-4 shrink-0"
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
            <span>{isZipping ? 'Mengemas ZIP...' : 'Unduh Semua (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Converted Files List */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Daftar File Hasil
          </span>
          <span className="text-xs text-slate-400">{results.length} Item</span>
        </div>

        <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/50 p-1">
          {results.map((item) => {
            const ext = item.filename.split('.').pop()?.toUpperCase() || 'FILE';
            return (
              <li
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 hover:bg-white rounded-lg transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-mono text-[10px] font-bold text-indigo-700 border border-indigo-100">
                    {ext}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {item.filename}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatBytes(item.size)} • dari {item.originalName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {onPreview && (
                    <button
                      type="button"
                      onClick={() => handlePreviewSingle(item)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition active:scale-95"
                      title="Lihat Pratinjau"
                    >
                      <svg
                        className="size-3.5 text-slate-500"
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
                      <span>Pratinjau</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(item)}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition active:scale-95"
                    title="Unduh File Ini"
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
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                    <span>Unduh</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>Semua file diproses 100% lokal di browsermu</span>
        <button
          type="button"
          onClick={handleDownloadAllZip}
          className="text-indigo-600 font-semibold hover:underline"
        >
          Unduh Semua Arsip (.zip)
        </button>
      </div>
    </div>
  );
}
