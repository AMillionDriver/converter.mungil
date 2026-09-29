import { useEffect } from 'react';
import type { MetadataDiffItem } from '../engines/image/exif-engine';

interface MetadataDiffModalProps {
  isOpen: boolean;
  diffs: MetadataDiffItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function MetadataDiffModal({
  isOpen,
  diffs,
  onConfirm,
  onCancel,
}: MetadataDiffModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <h2
              id="diff-modal-title"
              className="text-lg font-bold tracking-tight text-slate-900"
            >
              Konfirmasi Perubahan Metadata
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Data metadata berikut telah dimodifikasi atau dibersihkan dari
              file asli.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup modal"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Diff Table */}
        <div className="my-5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-3.5 py-2.5">
                  Properti
                </th>
                <th scope="col" className="px-3.5 py-2.5">
                  Sebelum
                </th>
                <th scope="col" className="px-3.5 py-2.5">
                  Sesudah
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 bg-white">
              {diffs.map((diff) => (
                <tr key={diff.key} className="hover:bg-slate-50/50">
                  <td className="px-3.5 py-2.5 font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{diff.label}</span>
                      {diff.type === 'removed' && (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 border border-rose-200">
                          Hapus
                        </span>
                      )}
                      {diff.type === 'added' && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                          Baru
                        </span>
                      )}
                      {diff.type === 'modified' && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 border border-amber-200">
                          Ubah
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="px-3.5 py-2.5 text-slate-500 font-mono text-[11px] truncate max-w-[120px]"
                    title={diff.before}
                  >
                    {diff.before}
                  </td>
                  <td
                    className={`px-3.5 py-2.5 font-mono text-[11px] truncate max-w-[140px] ${
                      diff.type === 'removed'
                        ? 'text-rose-600 line-through'
                        : 'text-indigo-700 font-semibold'
                    }`}
                    title={diff.after}
                  >
                    {diff.after}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
          >
            Batal & Edit Lagi
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
          >
            Lanjut Konversi
          </button>
        </div>
      </div>
    </div>
  );
}
