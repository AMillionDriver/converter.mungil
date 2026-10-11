import { useState, useEffect } from 'react';
import { ObservabilityManager } from '../lib/observability-manager';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyDiagnostics = async () => {
    try {
      const diag = ObservabilityManager.exportDiagnostics();
      await navigator.clipboard.writeText(diag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Gagal menyalin ke papan klip. Silakan periksa izin browser.');
    }
  };

  const faqs = [
    {
      q: 'Apakah berkas saya diunggah ke server pihak ketiga?',
      a: 'Sama sekali tidak. Seluruh pemrosesan (Gambar, Dokumen PDF, Word, CSV, TXT, JSON) dieksekusi 100% secara lokal di browser Anda menggunakan WebAssembly (WASM) dan Web Workers. Berkas Anda tidak pernah dikirimkan atau disimpan di server mana pun.',
    },
    {
      q: 'Berapa batasan ukuran berkas yang dapat dikonversi?',
      a: 'Batas ukuran teoretis adalah 1 GB. Namun, karena pemrosesan berjalan di dalam peramban (client-side), batasan riil ditentukan oleh kapasitas memori RAM bebas pada perangkat Anda.',
    },
    {
      q: 'Bagaimana cara mengatur halaman dokumen PDF?',
      a: 'Setelah memilih berkas PDF, klik tombol "Kelola Halaman". Anda dapat memutar orientasi, menghapus halaman, mengubah urutan dengan drag-and-drop, menyisipkan lembar kosong, melihat pratinjau resolusi tinggi, atau mengunduh seluruh lembar sebagai arsip ZIP terpisah.',
    },
    {
      q: 'Apakah struktur tabel CSV terjaga saat dikonversi ke Excel atau Word?',
      a: 'Ya. Mesin konversi CSV ke XLSX secara otomatis menyematkan frozen header row, auto-fit lebar kolom, dan filter data. Konversi CSV ke DOCX secara cerdas mengaktifkan orientasi Landscape jika kolom lebih dari lima untuk mencegah teks terpotong.',
    },
  ];

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
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <div className="flex items-center gap-3">
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
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pusat Bantuan & Dukungan
              </h3>
              <p className="text-xs text-slate-500">
                Informasi penggunaan, tanya jawab, dan kontak pengembang.
              </p>
            </div>
          </div>

          <button
            aria-label="Tutup modal bantuan"
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

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* FAQ Accordion */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h4>
            <div className="space-y-2">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div
                    key={faq.q}
                    className="rounded-xl border border-slate-200 overflow-hidden bg-white transition"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
                    >
                      <span>{faq.q}</span>
                      <svg
                        className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-indigo-600' : ''
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
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1 text-xs leading-relaxed text-slate-600 border-t border-slate-100 bg-slate-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Diagnostic & Contact Section */}
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Mengalami Kendala Teknis atau Bug?
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Salin informasi diagnostik perangkat Anda untuk disertakan saat
                  melaporkan kendala kepada tim kami.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyDiagnostics}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition active:scale-95 shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                }`}
              >
                {copied ? (
                  <>
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
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    <span>Disalin!</span>
                  </>
                ) : (
                  <>
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
                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                      />
                    </svg>
                    <span>Salin Diagnostik</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs text-slate-500">
              <span>Email Resmi Dukungan:</span>
              <a
                href="mailto:support@mungil.my.id?subject=Laporan%20Kendala%20Flowy%20Converter"
                className="font-semibold text-indigo-600 hover:underline"
              >
                support@mungil.my.id
              </a>
            </div>
          </section>
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
