# SCOPE & ROADMAP: Converter_File

Dokumen ini mendefinisikan batasan, fase pengembangan, dan spesifikasi arsitektur proyek. 
Pengembangan dibagi menjadi beberapa fase, dengan **Phase 1** berfokus sepenuhnya pada UI/UX, Layouting, dan Interaksi Frontend.

---

## PHASE 1: Frontend Architecture & UI/UX Design
Fokus utama pada fase ini adalah membangun antarmuka statis yang responsif, terstruktur, dan siap diintegrasikan dengan backend engine nantinya.

### 1. Komponen Header (Referensi: Cloudflare)
Header harus bersifat minimalis, fungsional, dan tidak mendistraksi.
* **Layout:** Flexbox, *sticky top* (tetap di atas saat di-scroll).
* **Bagian Kiri:** Logo aplikasi dan nama proyek.
* **Bagian Tengah:** Indikator status/domain (contoh: `mungil.my.id`) disertai badge status (contoh: `Free` atau `Pro`).
* **Bagian Kanan:** Menu utilitas dasar seperti tombol "Ask AI", "Support", dan ikon Profile pengguna.

### 2. Komponen Main Content (Referensi: FreeConvert)
Area utama tempat pengguna berinteraksi dengan alat konversi file.
* **Sistem Grid (Desktop):** Menggunakan layout 3 kolom (Kiri - Tengah - Kanan).
  * **Kolom Kiri (Banner Ad):** Space vertikal untuk penempatan iklan (Ads).
  * **Kolom Tengah (Core Tool):** Area utama dengan ukuran dominan. Berisi:
    * Judul layanan (H1) yang jelas (misal: "Konversikan file dengan mudah").
    * Kotak *Drag-and-Drop* besar dengan tombol utama "Pilih File" yang mencolok.
    * Teks pendukung di bawah tombol: Batas ukuran file (misal: "Ukuran file maksimum 1GB") dan tautan pendaftaran.
    * Teks *disclaimer* kecil mengenai Ketentuan Penggunaan (Syarat & Ketentuan).
  * **Kolom Kanan (Banner Ad):** Space vertikal untuk penempatan iklan (Ads).
* **Responsive Behavior (Mobile):** Kolom iklan di kiri dan kanan disembunyikan atau dipindahkan ke bagian bawah (*stacking*) agar kotak konversi tetap penuh di tengah layar smartphone.

### 3. Komponen Footer (Referensi: Hostinger)
Menggunakan gaya "Fat Footer" (Footer tebal) untuk menampung banyak informasi pendukung tanpa mengganggu konten utama.
* **Hierarki Informasi:** Dibagi menjadi 4-5 kolom teks yang dikelompokkan berdasarkan kategori (contoh: *Alat Konversi, Perusahaan, Informasi Hukum, Bantuan*).
* **Tampilan Bawah (Bottom Bar):** 
  * Ikon logo aplikasi (kiri bawah).
  * Deretan ikon tombol media sosial (kanan bawah) yang familiar.
  * Ikon logo metode pembayaran yang didukung.
* **Link Krusial:** Wajib mencantumkan tautan ke Kebijakan Privasi, Syarat dan Ketentuan, dan Hubungi Kami.

### 4. Elemen Interaksi & Keamanan UI
* **State Interaksi Tombol:** Animasi *hover*, *active*, dan *disabled* pada tombol utama ("Pilih File").
* **Area Dropzone:** Perubahan warna/border saat file ditarik (*dragged over*) ke area kotak konversi.
* **Cloudflare Turnstile:** Menyediakan slot UI (container) untuk widget anti-bot/Captcha dari Cloudflare Turnstile yang akan dimuat sebelum proses upload dimulai (untuk mencegah spam).

---

## PHASE 2: Backend Integration & Conversion Engine (TBA)
*(Fase ini akan dikerjakan setelah Phase 1 selesai dan divalidasi)*
* Setup server handling (Node.js/Python).
* Integrasi *file buffer* & *temporary storage*.
* Eksekusi *core conversion tools* (FFmpeg, ImageMagick, Pandoc, dll).
* Penghapusan file otomatis (Auto-cleanup).