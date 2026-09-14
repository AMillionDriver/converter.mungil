# TESTING & QUALITY ASSURANCE (QA): Converter_File

Dokumen ini mendefinisikan standar pengujian, *linting*, dan *formatting* kode untuk memastikan aplikasi bebas dari *bug*, konsisten, dan memiliki struktur kelas *Enterprise*. Semua kode **WAJIB** melewati standar ini sebelum di-deploy.

---

## 1. Code Formatting & Linting (Anti-Slop Guard)
Kita menggunakan kombinasi alat standar industri untuk memaksa penulisan kode yang rapi.

* **Formatter: `Prettier`**
  * Menangani gaya visual (spasi, indentasi, panjang baris).
  * **Aturan Default:** Indentasi 2 spasi, `singleQuote: true`, `semi: true` (wajib titik koma), `trailingComma: 'es5'`.
  * AI Agent wajib membuat file `.prettierrc` berdasarkan aturan ini.
* **Linter: `ESLint` (Airbnb Configuration)**
  * Menangani logika dan kualitas kode JavaScript/TypeScript.
  * Menggunakan `eslint-config-airbnb-base` (untuk backend) dan `eslint-config-airbnb` (jika menggunakan React/Frontend framework).
  * **Zero Tolerance:** Tidak boleh ada peringatan (Warning) atau Error dari ESLint yang diabaikan menggunakan komentar `// eslint-disable-next-line` kecuali dalam kondisi darurat yang terdokumentasi.

## 2. Testing Strategy (Strategi Pengujian)
Untuk mencegah error saat *user* melakukan konversi, sistem harus diuji secara otomatis.

* **Unit Testing (Logic & Backend):** 
  * **Framework:** `Vitest` atau `Jest`.
  * **Fokus Pengujian:** 
    1. Fungsi validasi *Magic Number* (memastikan file palsu terdeteksi).
    2. Kalkulator ukuran file (memastikan logic pembatasan 1GB berjalan).
    3. Generator nama file UUID (memastikan nama file selalu acak).
* **End-to-End (E2E) Testing (Frontend UI):**
  * **Framework:** `Playwright` atau `Cypress`.
  * **Fokus Pengujian:**
    1. Mensimulasikan *user* melakukan *drag-and-drop* file ke area Dropzone.
    2. Memastikan tombol "Pilih File" berubah status menjadi *disabled* saat proses *upload* berjalan.
    3. Memastikan error muncul jika file melebih batas 1GB.

## 3. Pre-commit Hook (Gatekeeper)
Untuk memastikan tidak ada kode rusak yang masuk ke *repository*, kita menggunakan **Husky** dan **lint-staged**.

* **Alur Kerja (Workflow):**
  1. Developer/AI Agent menjalankan perintah `git commit`.
  2. **Husky** otomatis mencegat proses commit tersebut.
  3. **lint-staged** menjalankan `Prettier` dan `ESLint` HANYA pada file yang diubah.
  4. Jika ada kode yang melanggar aturan Airbnb atau Prettier, *commit* akan **DIGAGALKAN** secara otomatis (Aborted). Kode harus diperbaiki terlebih dahulu.

## 4. Manual QA Checklist (Fase 1: Frontend)
Sebelum Phase 1 selesai, ceklis manual ini harus dipenuhi:
- [ ] Tampilan di-tes pada resolusi *Mobile* (360px), *Tablet* (768px), dan *Desktop* (1080p+).
- [ ] Interaksi tombol (Hover, Active, Focus) merespons dengan transisi halus `0.2s`.
- [ ] Konsol browser (F12) bersih dari error berwarna merah.
- [ ] Widget Turnstile (Cloudflare) muncul (render) dengan sempurna di dalam kontainernya.