# DESIGN RULES & UI GUIDELINES: Converter_File

Dokumen ini berisi aturan baku (System Design) untuk Frontend. Semua agen AI atau developer yang menulis kode CSS/HTML di proyek ini **WAJIB** mematuhi variabel dan aturan di bawah ini untuk menjaga konsistensi visual dan mencegah hasil desain yang "slop" (murahan/berantakan) dan design dimulai dari mobile first terlebih dahalu setelah rapi barulah eskalasi ke tampilan tablet dan desktop.

---

## 1. Color Palette (Sistem Warna)
Gunakan warna-warna ini (atau jadikan CSS Variables `:root`) agar tampilan aplikasi profesional dan modern.
* **Primary Colors (Brand & Action):**
  * Primary Blue: `#4F46E5` (Untuk tombol utama "Pilih File" dan link aktif).
  * Primary Hover: `#4338CA` (State saat tombol di-hover).
* **Background & Surface:**
  * App Background: `#F9FAFB` (Abu-abu sangat terang agar area konversi terlihat menonjol).
  * Card/Container Surface: `#FFFFFF` (Putih bersih untuk header, kotak dropzone, dan area konten utama).
  * Footer Background: `#F3F4F6` atau `#1F2937` (Tergantung mode terang/gelap).
* **Text & Typography Colors:**
  * Heading Text: `#111827` (Hitam pekat/Dark Slate).
  * Body Text: `#4B5563` (Abu-abu gelap agar nyaman dibaca).
  * Muted Text (Disclaimer/Footer): `#9CA3AF`.
  * Border Lines: `#E5E7EB` (Garis pemisah yang sangat halus).

## 2. Typography (Aturan Teks)
* **Font Family:** Gunakan `Inter`, `Roboto`, atau *System UI* sans-serif.
* **Hierarchy:**
  * `h1`: 24px - 32px, Font Weight: Bold (700) -> Judul utama alat.
  * `h2` - `h3`: 18px - 20px, Font Weight: Semi-Bold (600) -> Sub-judul / Title Footer.
  * `p` (Body): 16px, Font Weight: Normal (400) -> Teks paragraf biasa.
  * `small`: 12px - 14px -> Teks ukuran file maksimal, *disclaimer*, copyright.

## 3. Iconography & Assets (ANTI-SLOP RULE) 🚨
* **NO EMOJIS:** DILARANG KERAS menggunakan emoji bawaan OS (seperti 📁, 🚀, ⚙️, ✨) sebagai ikon UI.
* **Standar Ikon:** Wajib menggunakan library SVG profesional berdesain minimalis dan konsisten (seperti **Lucide Icons**, **Heroicons**, atau **Phosphor Icons**).
* **Implementasi:** Gunakan format `<svg>` murni (inline SVG) atau integrasi library CDN yang rapi.
* **Ukuran Ikon:** Gunakan ukuran seragam (contoh: `20x20` atau `24x24`) dengan `stroke-width: 1.5` atau `2`. Jangan gunakan ikon *filled* dan *outlined* secara campur aduk.

## 4. Spacing & Layouting
* **Sistem Spacing:** Gunakan kelipatan 4px atau 8px (contoh: 8px, 16px, 24px, 32px) untuk `margin` dan `padding`. Jangan gunakan angka ganjil/acak.
* **Border Radius:** 
  * `8px` untuk tombol dan input form.
  * `12px` atau `16px` untuk kontainer besar (seperti Dropzone area).
* **Shadows (Bayangan):** Dilarang menggunakan shadow hitam pekat (seperti `box-shadow: 5px 5px black`). Gunakan shadow modern yang sangat halus: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);`

## 5. Spesifikasi Komponen Khusus
* **Dropzone (Area Pilih File):**
  * Harus memiliki border putus-putus (*dashed border*) berukuran `2px` dengan warna `#D1D5DB`.
  * Saat state `drag-over` (file diseret ke atasnya), background berubah sedikit menjadi biru muda (`#EEF2FF`) dan border menjadi biru tebal (`#4F46E5`).
* **Tombol Interaksi (Buttons):**
  * Wajib memiliki transisi (*transition*) `0.2s ease-in-out` pada *background-color* dan *transform*.
  * Kursor harus berubah menjadi `pointer`.
  * Dilarang membuat tombol dengan efek 3D berlebihan atau gradient mencolok. Tetap flat dan modern.
* **Ad Banners (Kolom Kiri & Kanan):**
  * Lebar maksimal (max-width) untuk kolom iklan desktop adalah `160px - 300px`.
  * Berikan border halus dan teks "Advertisement" berukuran 12px warna `#9CA3AF` yang di-center secara vertikal dan horizontal.

## 6. Responsive Breakpoints
Gunakan Media Queries standar ini untuk menyesuaikan layout:
* **Mobile (`max-width: 768px`):** 
  * Header menu disembunyikan (masuk ke ikon menu hamburger SVG).
  * Layout 3 kolom FreeConvert **dijadikan 1 kolom (stacking)**. Kolom iklan (kiri/kanan) dipindah ke paling bawah atau disembunyikan.
  * Footer Fat (Hostinger) diubah menjadi akordeon atau ditumpuk vertikal 1 kolom.
* **Tablet (`769px - 1024px`):** Layout semi-fluid.
* **Desktop (`min-width: 1025px`):** Layout standar 3 kolom, container dibatasi maksimal lebar (max-width) `1200px` atau `1440px` di tengah layar (`margin: 0 auto`).

## 7. Clean Code Rules
* **No Inline CSS:** Jangan gunakan atribut `style="..."` di dalam tag HTML. Semuanya harus berada di file CSS eksternal atau menggunakan utility classes yang disepakati.
* **Semantic HTML:** Gunakan tag semantik seperti `<header>`, `<main>`, `<aside>` (untuk iklan), dan `<footer>`. Dilarang membuat layout yang hanya berisi tumpukan `<div>` (div soup).