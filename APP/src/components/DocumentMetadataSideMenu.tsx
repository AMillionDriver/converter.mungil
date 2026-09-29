import type { ChangeEvent } from 'react';
import type { DocumentMetadata } from '../engines/document/document-metadata-engine';

interface DocumentMetadataSideMenuProps {
  documentMeta: DocumentMetadata;
  onUpdateField: (
    key: keyof DocumentMetadata,
    value: string | Date | undefined
  ) => void;
  onStripAll: () => void;
  onReset: () => void;
  hasChanges: boolean;
  fileInfo: {
    name: string;
    size: number;
    format: string;
    pageCount?: number;
  };
}

export function DocumentMetadataSideMenu({
  documentMeta,
  onUpdateField,
  onStripAll,
  onReset,
  hasChanges,
  fileInfo,
}: DocumentMetadataSideMenuProps) {
  const getDateTimeLocalValue = (val: string | Date | undefined): string => {
    if (!val) return '';
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
  };

  const handleInputChange = (
    field: keyof DocumentMetadata,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onUpdateField(field, e.target.value);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <svg
            className="size-4 text-indigo-600"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Metadata Dokumen
          </h2>
        </div>
        {hasChanges && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
            Ada Perubahan
          </span>
        )}
      </div>

      {/* 1. Ringkasan File Dokumen */}
      <div className="space-y-1.5 text-xs">
        <span className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">
          Informasi Berkas
        </span>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">Nama File:</span>
          <span className="font-medium text-slate-800 truncate max-w-[150px]">
            {fileInfo.name}
          </span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">Ukuran:</span>
          <span className="font-medium text-slate-800">
            {(fileInfo.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
        {fileInfo.pageCount !== undefined && (
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Total Halaman:</span>
            <span className="font-semibold text-indigo-600">
              {fileInfo.pageCount} Hal
            </span>
          </div>
        )}
      </div>

      {/* 2. Informasi Kepemilikan & Identitas Dokumen */}
      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <span className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">
          Identitas & Penulis
        </span>

        <div>
          <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
            Judul Dokumen (Title)
          </label>
          <input
            type="text"
            value={documentMeta.title || ''}
            onChange={(e) => handleInputChange('title', e)}
            placeholder="Contoh: Laporan Akhir 2026"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
            Penulis / Pembuat (Author / Creator)
          </label>
          <input
            type="text"
            value={documentMeta.author || ''}
            onChange={(e) => handleInputChange('author', e)}
            placeholder="Nama penulis atau instansi..."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
            Subjek / Perihal (Subject)
          </label>
          <input
            type="text"
            value={documentMeta.subject || ''}
            onChange={(e) => handleInputChange('subject', e)}
            placeholder="Subjek pembahasan dokumen..."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
            Kata Kunci / Tag (Keywords)
          </label>
          <input
            type="text"
            value={documentMeta.keywords || ''}
            onChange={(e) => handleInputChange('keywords', e)}
            placeholder="Pisahkan dengan koma (misal: laporan, 2026, resmi)"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>
      </div>

      {/* 3. Atribusi Aplikasi & Tanggal */}
      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <span className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">
          Aplikasi & Riwayat Waktu
        </span>

        <div>
          <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
            Aplikasi Pembuat (Producer / Software)
          </label>
          <input
            type="text"
            value={documentMeta.producer || 'Mungil Converter'}
            onChange={(e) => handleInputChange('producer', e)}
            placeholder="Mungil Converter"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-slate-600 mb-1">
            Tanggal Pembuatan Dokumen (Creation Date)
          </label>
          <input
            type="datetime-local"
            value={getDateTimeLocalValue(documentMeta.creationDate)}
            onChange={(e) => onUpdateField('creationDate', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        {/* Quick Date Buttons */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() =>
              onUpdateField('creationDate', new Date().toISOString())
            }
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition active:scale-95"
          >
            Sekarang
          </button>
          {documentMeta.creationDate && (
            <button
              type="button"
              onClick={() => onUpdateField('creationDate', undefined)}
              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-100 transition active:scale-95"
            >
              Hapus Tanggal
            </button>
          )}
        </div>
      </div>

      {/* 4. Aksi Sanitasi & Privasi */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onStripAll}
          className="w-full rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 active:scale-98"
        >
          Bersihkan Semua Metadata Dokumen
        </button>

        {hasChanges && (
          <button
            type="button"
            onClick={onReset}
            className="w-full text-center text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            Kembalikan ke Asli
          </button>
        )}
      </div>
    </div>
  );
}
