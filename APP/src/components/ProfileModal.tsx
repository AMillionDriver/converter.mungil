import { useState, useEffect } from 'react';
import {
  CapabilityDetector,
  type DeviceCapabilityMatrix,
} from '../lib/capability-detector';
import { ObservabilityManager } from '../lib/observability-manager';
import { CacheManager } from '../lib/cache-manager';
import { StorageManager } from '../lib/storage-manager';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'specs' | 'limits';
}

export function ProfileModal({
  isOpen,
  onClose,
  defaultTab = 'specs',
}: ProfileModalProps) {
  const [capabilities, setCapabilities] =
    useState<DeviceCapabilityMatrix | null>(null);
  const [activeTab, setActiveTab] = useState<'specs' | 'limits'>(defaultTab);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(defaultTab);

    void CapabilityDetector.detect().then((matrix) => {
      setCapabilities(matrix);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, defaultTab, onClose]);

  if (!isOpen) return null;

  const handleClearCache = async () => {
    try {
      setIsClearing(true);
      await CacheManager.clear();
      await StorageManager.clearAll();
      ObservabilityManager.clearMetrics();
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 2500);
    } catch {
      alert('Gagal membersihkan cache lokal.');
    } finally {
      setIsClearing(false);
    }
  };

  const summary = ObservabilityManager.getMetricsSummary();

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative flex flex-col w-full max-w-xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
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
                  d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </div>
            <div className="min-w-0 pr-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Profil Perangkat & Kapasitas Memori
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Informasi arsitektur lokal, alokasi memori, dan status cache.
              </p>
            </div>
          </div>

          <button
            aria-label="Tutup modal profil"
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
        </header>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'specs'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Spesifikasi & Cache
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('limits')}
            className={`pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'limits'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Kapasitas & Batasan 1GB
          </button>
        </div>

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'specs' ? (
            <>
              {/* Matrix Card */}
              <section className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Kemampuan Perangkat Terdeteksi
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[11px]">
                      RAM Perangkat
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      ~{capabilities?.memory || 4} GB
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[11px]">
                      CPU Cores
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {capabilities?.cores || 2} Core
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[11px]">
                      Tier Performa
                    </span>
                    <span className="font-bold text-indigo-600 capitalize text-sm">
                      {capabilities?.tier || 'Standard'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[11px]">
                      WebAssembly
                    </span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {capabilities?.wasm ? 'Didukung' : 'Tidak'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[11px]">
                      Web Worker
                    </span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {capabilities?.worker ? 'Didukung' : 'Tidak'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[11px]">
                      IndexedDB
                    </span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {capabilities?.indexedDB ? 'Tersedia' : 'Tidak'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Conversion Statistics */}
              <section className="rounded-xl border border-slate-200 p-4 bg-white space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Statistik Konversi Sesi Ini
                </span>
                <div className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100">
                  <span>Total Berkas Diproses:</span>
                  <span className="font-semibold text-slate-900">
                    {summary.total} berkas
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100">
                  <span>Tingkat Keberhasilan:</span>
                  <span className="font-semibold text-emerald-600">
                    {summary.total > 0
                      ? `${Math.round((summary.successCount / summary.total) * 100)}%`
                      : '100%'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 py-1">
                  <span>Total Volume Data:</span>
                  <span className="font-semibold text-slate-900">
                    {(summary.totalBytesProcessed / (1024 * 1024)).toFixed(2)}{' '}
                    MB
                  </span>
                </div>
              </section>

              {/* Cache Management */}
              <section className="rounded-xl border border-rose-100 bg-rose-50/30 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Bersihkan Cache Engine & Data Lokal
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Menghapus biner engine tersimpan dan menyetel ulang
                      riwayat diagnostik.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isClearing}
                    onClick={handleClearCache}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition active:scale-95 disabled:opacity-50"
                  >
                    {clearSuccess
                      ? 'Berhasil Dibersihkan!'
                      : isClearing
                        ? 'Membersihkan...'
                        : 'Bersihkan Cache'}
                  </button>
                </div>
              </section>
            </>
          ) : (
            /* Tab: Kapasitas & Batasan */
            <section className="space-y-4 text-xs leading-relaxed text-slate-600">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
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
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                  <span>100% Bebas Kuota Server (Zero-Cost Architecture)</span>
                </div>
                <p>
                  Flowy Converter tidak menggunakan server backend berbayar
                  untuk memproses berkas Anda. Semua mesin konversi dikompilasi
                  menjadi WebAssembly (WASM) dan berjalan di lingkungan
                  terisolasi (sandbox) pada peramban Anda.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Bagaimana Batasan Ukuran Berkas Ditentukan?
                </h4>
                <ul className="list-disc list-inside space-y-1.5 pl-1">
                  <li>
                    <strong className="text-slate-800">
                      Bukan Batasan Akun:
                    </strong>{' '}
                    Anda tidak memerlukan pendaftaran akun atau biaya langganan
                    untuk mengonversi berkas besar.
                  </li>
                  <li>
                    <strong className="text-slate-800">
                      Tergantung Memori RAM:
                    </strong>{' '}
                    Batas teoretis 1 GB bergantung pada kapasitas RAM bebas di
                    perangkat Anda. Pemrosesan berkas PDF ratusan megabita
                    membutuhkan memori RAM sekitar 2–3x lipat dari ukuran berkas
                    selama proses dekompresi.
                  </li>
                  <li>
                    <strong className="text-slate-800">
                      Tips untuk Berkas Sangat Besar:
                    </strong>{' '}
                    Tutup tab peramban yang tidak digunakan untuk mengalokasikan
                    ruang memori yang cukup bagi Web Worker.
                  </li>
                </ul>
              </div>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95"
          >
            Tutup
          </button>
        </footer>
      </div>
    </div>
  );
}
