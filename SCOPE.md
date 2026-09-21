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
* Setup server handling (Node.js/Python) yang compatible dengan sistem serverlees vercel.
* Integrasi *file buffer* & *temporary storage*.
* Eksekusi *core conversion tools* (FFmpeg, ImageMagick, Pandoc, dll).
* Penghapusan file otomatis (Auto-cleanup).

Konsepnya:

                    ┌──────────────────────┐
                    │    Backend / API     │
                    │                      │
                    │ Auth / Quota         │
                    │ Turnstile            │
                    │ Engine manifest      │
                    │ Feature flags        │
                    │ Fallback conversion  │
                    └──────────┬───────────┘
                               │
                         hanya bila perlu
                               │
                               ▼
┌───────────────────────────────────────────────────────┐
│                    BROWSER USER                       │
│                                                       │
│  Frontend                                             │
│     ↓                                                 │
│  pilih "PDF → Word"                                  │
│     ↓                                                 │
│  cek Engine Cache                                     │
│     ├── sudah ada ✅                                  │
│     │      ↓                                          │
│     │   langsung proses                               │
│     │                                                 │
│     └── belum ada ❌                                  │
│            ↓                                          │
│       download engine                                │
│       JS + WASM                                      │
│            ↓                                          │
│       Service Worker / Cache                         │
│            ↓                                          │
│       simpan engine                                   │
│            ↓                                          │
│       proses lokal                                    │
│                                                       │
│  File user tidak perlu naik ke server                 │
└───────────────────────────────────────────────────────┘
Jadi "lempar script sekali" itu bisa

Misalnya pertama kali user memilih:

PDF → DOCX

frontend cek:

engine: pdf-docx
version: 1.0.0

Cache belum ada.

Maka:

Browser
  ↓
download pdf-docx.js
download pdf-docx.wasm
  ↓
Cache Storage
  ↓
Web Worker
  ↓
convert PDF → DOCX

Untuk pemakaian berikutnya:

PDF → DOCX

Cache HIT ✅

tidak perlu download engine lagi
tidak perlu backend conversion
tidak perlu upload file

Service Worker + Cache Storage memang cocok untuk menyimpan resource Request/Response dan menyajikannya kembali dari cache pada request berikutnya.

Bahkan lebih bagus kalau engine dipisah per kemampuan

Jangan kirim seluruh converter ke browser sejak awal.

Misalnya:

engines/
├── image/
│   ├── png-webp/
│   ├── jpg-webp/
│   └── png-jpg/
│
├── video/
│   ├── mp4-webm/
│   ├── mp4-mp3/
│   └── mov-mp4/
│
├── document/
│   ├── docx-pdf/
│   ├── html-pdf/
│   └── md-docx/
│
└── archive/
    ├── zip/
    └── tar/

Jadi user pertama kali cuma mengunduh yang benar-benar dia butuhkan.

Misalnya:

User A:
PDF → Word

mendownload:

pdf-docx engine

User B:

MP4 → WebM

mendownload:

ffmpeg video engine

Tidak ada alasan User B harus mengunduh engine PDF. 🗿

Gunakan Web Worker untuk conversion

Ini penting.

Jangan melakukan conversion berat di main browser thread:

UI
 ↓
FFmpeg
 ↓
browser freeze 🗿

Lebih baik:

UI Thread
   │
   │ postMessage()
   ▼
Web Worker
   │
   ├── WASM
   ├── conversion
   └── progress
   │
   ▼
UI

Jadi slider, tombol, animasi, dan progress bar tetap responsif.

ffmpeg.wasm, misalnya, memang dirancang untuk menjalankan FFmpeg melalui WebAssembly di browser, sehingga pola ini cocok untuk media processing client-side.

Backend-mu akhirnya jadi sangat kecil

Backend tidak perlu:

❌ menerima file 500 MB
❌ menyimpan file user
❌ menjalankan FFmpeg setiap request
❌ menjadi bottleneck conversion

Backend cukup mengurus:

✅ Login
✅ Subscription / Free / Pro
✅ Turnstile validation
✅ Rate limiting
✅ Feature entitlement
✅ Engine manifest/version
✅ Analytics/usage yang memang diperlukan
✅ Server-side fallback

Untuk file besar, ini juga menghindari masalah payload serverless. Vercel Function misalnya punya batas request body 4.5 MB, sehingga direct client-side processing memang jauh lebih cocok daripada mengirim file 1 GB ke Function.

Cache engine-nya pakai apa?

Aku akan pakai dua lapisan.

1. Cache Storage

Untuk:

.js
.wasm
.worker.js

Misalnya:

flowy-engines-v1
├── pdf-docx.js
├── pdf-docx.wasm
├── ffmpeg-core.js
└── ffmpeg-core.wasm

Service Worker bisa menyimpan dan melayani resource tersebut dari cache.

2. IndexedDB

Untuk metadata:

{
  "engine": "pdf-docx",
  "version": "1.2.0",
  "installed": true,
  "installedAt": 1789540000000
}

dan kalau nanti kamu membutuhkan penyimpanan Blob/file sementara di browser, IndexedDB memang ditujukan untuk data terstruktur berukuran lebih besar, termasuk Blob/file.

Tapi file user tidak harus disimpan permanen di IndexedDB. Untuk conversion biasa, lebih aman:

File
↓
RAM / temporary object
↓
Web Worker
↓
Output
↓
download
↓
hapus reference
Ada satu detail penting

"Sekali download" berarti:

sekali per browser/device/cache, bukan sekali untuk seluruh dunia.

Misalnya:

Laptop Chrome
PDF→Word engine
✅ sudah cache

HP Chrome
❌ download lagi

Laptop Firefox
❌ download lagi

User clear site data
❌ download lagi

Browser juga bisa membersihkan storage berdasarkan quota/eviction, jadi aplikasi tidak boleh menganggap cache akan bertahan selamanya.

Karena itu engine harus selalu punya:

cache miss
→ download ulang

dan itu harus transparan bagi user.

Aku akan bikin Engine Registry

Ini bagian yang bakal membuat arsitekturmu enak dikembangkan.

Misalnya backend/frontend punya manifest:

{
  "pdf:docx": {
    "version": "1.2.0",
    "script": "/engines/pdf-docx/index.js",
    "wasm": "/engines/pdf-docx/core.wasm",
    "size": 18400000
  },
  "mp4:webm": {
    "version": "2.0.1",
    "script": "/engines/video/index.js",
    "wasm": "/engines/video/core.wasm",
    "size": 42000000
  }
}

Frontend:

convert("pdf", "docx")
       ↓
EngineRegistry.resolve()
       ↓
CacheManager.get()
       ↓
HIT?
 ├─ yes → execute
 └─ no  → download → cache → execute

Sekarang kamu tinggal tambah engine:

pdf → docx
pdf → jpg
jpg → webp
png → webp
mp4 → webm
mp4 → mp3

tanpa mengubah seluruh aplikasi.

Untuk Flowy, aku malah akan kasih nama konsepnya

Local Conversion Engine.

Jadi UI bisa memberi tahu user:

⚡ Local Processing

Your file is processed directly on your device.

No upload required.

Kemudian:

PDF → Word
Engine:
LOCAL

Status:
Cached ✅

Atau first time:

Preparing converter...

Downloading PDF → Word engine
18.2 MB / 18.2 MB

Ready ✅

Setelah itu:

PDF → Word
Processing locally...
73%

Ini menurutku jauh lebih menarik sebagai selling point daripada:

"kami punya backend FFmpeg."

Karena user mendapatkan privacy + bandwidth saving + backend cost yang lebih rendah.

Tapi ada satu jebakan besar: "semua conversion bisa client-side"

Tidak.

Beberapa conversion relatif cocok untuk browser:

JPG → WebP
PNG → WebP
Image resize
Image metadata
MP4 → WebM
MP4 → MP3
Audio conversion

tergantung library/WASM dan keterbatasan device.

Sedangkan:

PDF → DOCX
DOCX → PDF
Excel → complex format
PSD → complex format
AI → complex format

bisa jauh lebih rumit dari sekadar menjalankan converter dalam WASM.

Jadi arsitekturnya sebaiknya:

                Conversion Request
                       ↓
              Can run locally?
                 /          \
               YES           NO
                ↓             ↓
        Local WASM Engine   Backend
                ↓             ↓
             output         output

Bahkan kalau client-side engine gagal:

Local conversion
      ↓
error / unsupported
      ↓
optional server fallback

Jadi backend tetap ada, tetapi bukan jalur default.

Maka Phase 2-mu sebaiknya diubah menjadi
PHASE 2: Client-Side Conversion Engine

2.1 Conversion Engine Registry
2.2 Engine Loader
2.3 Engine Version Manager
2.4 Service Worker Cache
2.5 Web Worker Processing
2.6 First Engine Integration
2.7 Progress Reporting
2.8 Output Handling
2.9 Temporary Memory Management
2.10 Backend Control Plane
2.11 Turnstile / Abuse Protection
2.12 Quota & Feature Entitlement
2.13 Optional Backend Fallback
2.14 Error Recovery
2.15 Compatibility Testing
2.16 Performance Testing
2.17 Cache Invalidation
2.18 Production Deployment

Jadi sekarang Flowy punya filosofi:

                FLOWY CONVERTER

             "Convert locally first"

                       │
              ┌────────┴────────┐
              │                 │
         CLIENT SIDE        BACKEND
              │                 │
        WASM Engines       Auth / Quota
        Web Workers        Turnstile
        Cache              Manifest
        Local Files        Fallback
              │                 │
              └────────┬────────┘
                       │
                    Result

Dan menurutku ini lebih unik daripada arsitektur converter biasa.

Backend-mu sibuk mengatur lalu lintas, sementara CPU user yang melakukan pekerjaan berat. 🗿⚙️

Untuk targetmu yang menyebut maksimum 1 GB, pendekatan ini juga jauh lebih masuk akal daripada mengirim file tersebut ke Vercel Function. Vercel sendiri menyarankan client-side upload untuk file besar karena limit payload Function.

Satu batas desain yang harus kamu pegang erat: jangan menyimpan file user atau hasil conversion sebagai sesuatu yang permanen hanya demi cache engine. Cache yang tahan lama adalah converter engine-nya, bukan data pribadi user. IndexedDB/Cache Storage tetap berada di bawah kebijakan storage browser dan bisa dihapus/di-evict.

----

PHASE 2 · Client-Side Conversion Engine
CHAPTER 2.1 · Backend Foundation

Tujuan: menyiapkan backend minimal sebagai control plane, bukan sebagai mesin converter.

Pekerjaan
Setup Node.js / TypeScript API
Environment configuration
API routing
Error handling dasar
Health check
Secret management
Struktur folder backend
CORS policy
Response format standar
Endpoint awal
GET  /api/health
GET  /api/engines
POST /api/turnstile/verify
GET  /api/user/limits
Selesai ketika
Frontend
   ↓
/api/health
   ↓
200 OK

dan tidak ada conversion sama sekali di sini.

CHAPTER 2.2 · Engine Registry

Tujuan: membuat sistem yang tahu converter apa saja yang tersedia.

Contoh:

{
  "image:png:webp": {
    "version": "1.0.0",
    "type": "wasm",
    "size": 12400000
  },
  "video:mp4:webm": {
    "version": "1.1.0",
    "type": "wasm",
    "size": 48000000
  }
}
Pekerjaan
Engine ID
Input format
Output format
Version
Download URL
File size
Hash/checksum
Capability metadata
Minimum browser requirement
Selesai ketika

Frontend bisa bertanya:

"PDF → DOCX tersedia?"

dan registry menjawab:

YES
version 1.0.0
CHAPTER 2.3 · Engine Loader

Tujuan: frontend bisa mengambil engine saat dibutuhkan.

Flow:

User pilih PDF → DOCX
        ↓
Registry
        ↓
Engine belum ada
        ↓
Download
        ↓
Verify
        ↓
Install
Pekerjaan
Dynamic loading
Download progress
Integrity verification
Version checking
Retry
Resume download bila memungkinkan
Error state
UI
Preparing converter...

Downloading engine
[████████░░] 82%

Verifying...
Installing...
Ready ✅
Selesai ketika

Engine dapat dimuat tanpa reload halaman.

CHAPTER 2.4 · Persistent Engine Cache

Tujuan: engine tidak didownload terus-menerus.

Gunakan:

Cache Storage
+
IndexedDB

Pemisahannya:

Cache Storage
→ JS / WASM / Worker assets

IndexedDB
→ metadata engine
Pekerjaan
Cache key
Versioning
Cache hit/miss
Engine metadata
Cache invalidation
Broken cache recovery
Storage cleanup
Flow
Request engine
      ↓
Cache?
 ├── HIT  → gunakan
 └── MISS → download → verify → cache
Selesai ketika
First visit  → download
Second visit → 0 download

selama cache tersedia.

CHAPTER 2.5 · Web Worker Runtime

Tujuan: conversion tidak membuat UI freeze.

Arsitektur:

Main Thread
    │
    │ postMessage()
    ▼
Web Worker
    │
    ├── Load engine
    ├── Read file
    ├── Convert
    └── Report progress
    │
    ▼
Main Thread
Pekerjaan
Worker lifecycle
Message protocol
Transferable objects
Error propagation
Cancellation
Progress event
Worker restart
Selesai ketika

Conversion 100+ MB tetap membuat UI responsif.

CHAPTER 2.6 · File Intake & Validation

Tujuan: memastikan file yang masuk memang file yang didukung.

Pekerjaan
File size validation
MIME validation
Extension validation
Magic-byte/signature validation
Filename sanitization
Duplicate handling
Batch validation

Contoh:

photo.webp
↓
extension ✅
mime ✅
signature ✅
size ✅

baru diteruskan ke engine.

Selesai ketika

File invalid ditolak sebelum engine bekerja.

CHAPTER 2.7 · First Conversion Engine

Jangan langsung bikin 20 converter.

Pilih satu conversion family dulu.

Misalnya:

PNG → WebP
JPG → WebP
WebP → PNG
Pekerjaan
Integrasi library/WASM
Input adapter
Output adapter
Progress
Error handling
Memory cleanup
Selesai ketika
File
 ↓
Local Engine
 ↓
Output
 ↓
Download

100% tanpa backend.

CHAPTER 2.8 · Conversion Pipeline

Setelah satu engine stabil, buat generic pipeline.

Input
 ↓
Validation
 ↓
Engine Resolver
 ↓
Engine Loader
 ↓
Worker
 ↓
Conversion
 ↓
Output Validation
 ↓
Download
Pekerjaan
Pipeline abstraction
Engine interface
Operation config
Input/output lifecycle
Batch processing

Contoh interface:

interface ConversionEngine {
  id: string;

  supports(input: string, output: string): boolean;

  load(): Promise<void>;

  convert(
    file: File,
    options?: Record<string, unknown>
  ): Promise<Blob>;
}
Selesai ketika

Converter kedua bisa ditambahkan tanpa mengubah core pipeline.

CHAPTER 2.9 · Progress, Cancel & Recovery

Tujuan: UX converter terasa matang.

State:

queued
loading-engine
processing
finalizing
completed
failed
cancelled
Fitur
Progress
Cancel
Retry
Restart worker
Partial failure handling
Multi-file status

Contoh:

3 / 5 files

✅ image1.png
✅ image2.png
⏳ image3.png 67%
⏸ image4.png
❌ image5.png
CHAPTER 2.10 · Output & Download

Tujuan: hasil conversion aman dan mudah diambil.

Pekerjaan
Blob lifecycle
Filename generation
Correct MIME type
Download button
Batch ZIP bila diperlukan
Memory release
Auto cleanup

Flow:

Blob
 ↓
Object URL
 ↓
Download
 ↓
revokeObjectURL()

Jangan menyimpan file hasil lebih lama daripada yang diperlukan.

CHAPTER 2.11 · Turnstile & Abuse Control

Di sini backend mulai benar-benar dipakai.

Pekerjaan
Turnstile server-side verification
Rate limiting
Session validation
Abuse detection
API protection

Tetapi perlu dibedakan:

Client-side conversion
→ tidak perlu mengirim file ke backend

Turnstile lebih cocok dipakai ketika user meminta resource/server feature seperti:

engine download tertentu
server fallback
account action
heavy feature
CHAPTER 2.12 · Account, Quota & Entitlement

Untuk model:

Free
Pro
Pekerjaan
Login
User ID
Plan
Feature permission
Daily quota
Batch limit
Metadata operation quota

Contoh:

Free
5 files/batch
5 metadata operations/day

Pro
20 files/batch
30 metadata operations/day

Server menjadi sumber kebenaran untuk entitlement, bukan UI.

CHAPTER 2.13 · Optional Backend Fallback

Ini penting.

Kalau browser tidak mampu melakukan conversion:

Local engine
      ↓
Unsupported?
      ↓
Optional backend fallback

Contoh:

JPG → WebP
→ Client ✅

PDF → DOCX
→ Client ❌
→ Backend ✅

Jadi backend menjadi:

fallback

bukan:

default path
CHAPTER 2.14 · Additional Engines

Baru di sini mulai memperluas kemampuan.

Image
PNG
JPG
WEBP
AVIF
GIF
Video
MP4
WEBM
MOV
MKV
MP3
WAV
Document
PDF
DOCX
TXT
MD
HTML

Tapi setiap engine dibuat sebagai module terpisah.

engines/
├── image/
├── video/
└── document/
CHAPTER 2.15 · Metadata / EXIF

Setelah conversion dasar stabil:

Read metadata
Edit metadata
Delete metadata

Flow:

File
 ↓
Metadata parser
 ↓
UI
 ↓
Modify
 ↓
Output

Ini bisa tetap client-side selama library yang dibutuhkan tersedia.

CHAPTER 2.16 · Performance & Memory

Ini bakal penting banget untuk target:

20 MB
100 MB
500 MB
1 GB
Ukur
RAM usage
CPU usage
Conversion time
Engine load time
Cache hit rate
Browser compatibility

Terutama:

1 GB video

di HP murah bisa jauh lebih brutal daripada angka ukuran filenya kelihatan. 🗿

Jadi harus ada capability detection:

device/browser capable?
        ↓
YES → local
NO  → fallback / reject
CHAPTER 2.17 · Security Hardening

Di tahap ini serang aplikasi milikmu sendiri secara terkontrol.

Cek:

XSS
CSRF
Path traversal
Malicious filename
Malformed file
Oversized file
ZIP bomb
Worker abuse
API abuse
Unauthorized entitlement

Dan khusus client-side:

engine tampering
manifest tampering
cache poisoning

Hash/versioning engine menjadi penting.

CHAPTER 2.18 · Observability

Jangan logging file user.

Yang dikumpulkan:

conversion type
engine version
success/failure
processing time
browser
device class
cache hit/miss

Contoh:

PNG → WebP
Engine 1.3.0
Cached ✅
Time 1.8s
Success ✅

Ini nantinya membantu menjawab:

"Converter mana yang paling sering digunakan?"

dan:

"Engine mana yang paling sering crash?"

CHAPTER 2.19 · Testing

Bagi testing menjadi:

Unit
Integration
Browser
Performance
Security
Regression

Matrix:

Chrome
Firefox
Edge
Safari
Android Chrome
iOS Safari

Dan file:

1 KB
1 MB
10 MB
100 MB
500 MB
1 GB
CHAPTER 2.20 · Production Release

Terakhir baru:

Local
 ↓
Preview
 ↓
Production
Checklist
[ ] HTTPS
[ ] CSP
[ ] Security headers
[ ] Turnstile
[ ] Rate limit
[ ] Quota
[ ] Engine registry
[ ] Engine cache
[ ] Worker processing
[ ] Error monitoring
[ ] Cleanup
[ ] Fallback
[ ] Browser testing
[ ] Large-file testing

---
---end of phase 2---