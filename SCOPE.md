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

--phase 3---

# PHASE 3 — WASM Engine Implementation 🚀

Dokumen ini melanjutkan **Phase 2** (Client-Side Conversion Engine architecture). Fokus Phase 3: **integrasi engine WASM nyata**, ganti mock "Converted Content" dengan file output asli yang bisa di-download.

**Status awal Phase 3:**
- ✅ Phase 1 (UI/UX) — selesai
- ✅ Phase 2 (Architecture: Registry, Loader, Cache, Worker) — selesai
- 🎯 **Phase 3 (Real WASM Engines)** — target

---

## PRINSIP PHASE 3

1. **Satu engine, satu module.** Jangan monolith. Tiap conversion family punya folder sendiri.
2. **Tidak semua bisa client-side.** Pilih engine yang realistis dulu, fallback ke backend untuk yang rumit.
3. **Output harus byte-valid.** File hasil harus bisa dibuka di aplikasi aslinya (VLC, Photoshop, MS Word, dsb).
4. **Ukur, jangan asumsi.** Setiap engine punya bottleneck berbeda — RAM, CPU, GPU, atau network.
5. **Cache itu asset.** Sekali download engine, harus persist. Jangan download ulang tiap session.

---

## STRATEGI PEMILIHAN ENGINE

Sebelum coding, tentukan prioritas berdasarkan:

| Kriteria | Bobot |
|---|---|
| **Demand user** (mana yang paling sering dipakai) | 🔴 High |
| **Feasibility WASM** (bisa jalan di browser atau tidak) | 🔴 High |
| **Ukuran engine** (semakin kecil semakin bagus) | 🟡 Medium |
| **Kualitas output** (hasil harus valid & mirip aslinya) | 🟡 Medium |
| **Kompleksitas integrasi** | 🟢 Low |

### Tabel Engine Prioritas

| Prioritas | Conversion | Engine Kandidat | Ukuran | Feasible? |
|---|---|---|---|---|
| 🥇 P1 | PNG/JPG → WebP | `@jsquash/webp` / `libwebp-wasm` | ~300 KB | ✅ Yes |
| 🥇 P1 | PNG ↔ JPG | Canvas API native | 0 KB | ✅ Yes |
| 🥇 P1 | Image resize | Canvas API / `@jsquash/resize` | ~50 KB | ✅ Yes |
| 🥈 P2 | MP4 → WebM | `ffmpeg.wasm` | ~30 MB | ✅ Yes |
| 🥈 P2 | MP4 → MP3 | `ffmpeg.wasm` (shared) | 0 KB (reuse) | ✅ Yes |
| 🥈 P2 | Audio convert (WAV/MP3/OGG) | `ffmpeg.wasm` (shared) | 0 KB (reuse) | ✅ Yes |
| 🥉 P3 | PDF merge/split | `pdf-lib` | ~500 KB | ✅ Yes |
| 🥉 P3 | Image → PDF | `pdf-lib` + Canvas | ~500 KB | ✅ Yes |
| 🥉 P3 | EXIF read/write | `exifr` + `piexifjs` | ~200 KB | ✅ Yes |
| 🏅 P4 | PDF → DOCX | Tidak ada yang bagus | — | ❌ Backend |
| 🏅 P4 | DOCX → PDF | Tidak ada yang bagus | — | ❌ Backend |
| 🏅 P4 | HTML → PDF | `pdf-lib` (limited) | — | ⚠️ Partial |
| 🏅 P4 | Archive (zip/tar) | `fflate` | ~30 KB | ✅ Yes |

**Filosofi:** 80% demand user bisa di-cover dengan **5 engine utama**. Sisanya fallback backend.

---

## CHAPTER 3.1 · Engine Foundation & Shared Infrastructure

**Tujuan:** setup infrastruktur dasar sebelum integrasi engine spesifik.

### Pekerjaan
- Install `ffmpeg.wasm` core package (`@ffmpeg/ffmpeg`, `@ffmpeg/core`)
- Install engine library ringan (`@jsquash/webp`, `@jsquash/jpeg`, `@jsquash/png`, `pdf-lib`, `fflate`, `exifr`)
- Setup `SharedArrayBuffer` & `crossOriginIsolated`
- Konfigurasi Vite headers (COOP/COEP) untuk dev & build
- Setup `EngineContext` — dependency injection untuk semua engine
- Setup `EngineLogger` — log per engine (success, fail, waktu, ukuran output)
- Setup folder structure

### Struktur Folder
```
src/
├── engines/
│   ├── shared/
│   │   ├── EngineContext.ts
│   │   ├── EngineLogger.ts
│   │   ├── blob-utils.ts
│   │   └── wasm-loader.ts
│   ├── image/
│   │   ├── image.worker.ts
│   │   ├── png-webp.ts
│   │   ├── jpg-webp.ts
│   │   └── resize.ts
│   ├── video/
│   │   ├── video.worker.ts
│   │   └── ffmpeg-wrapper.ts
│   ├── document/
│   │   ├── document.worker.ts
│   │   └── pdf-merge.ts
│   └── archive/
│       └── zip.ts
```

### Vite Config — COOP/COEP
```ts
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
```

### Selesai ketika
- ✅ Satu test worker (misal resize image) jalan via `postMessage`
- ✅ SharedArrayBuffer tersedia (`self.crossOriginIsolated === true`)
- ✅ Log engine muncul di console

---

## CHAPTER 3.2 · Image Engine (P1 — MVP)

**Tujuan:** fungsionalitas dasar conversion image client-side, tanpa backend.

### Pekerjaan
- Integrasi `@jsquash/webp` untuk encode PNG/JPG → WebP
- Integrasi `@jsquash/jpeg` untuk decode/encode JPEG
- Integrasi `@jsquash/png` untuk decode/encode PNG
- Native Canvas API untuk resize & format konversi tanpa WASM
- Worker wrapper (`image.worker.ts`) — accept File, return Blob
- Progress: 0% (load engine) → 50% (decode) → 90% (encode) → 100%
- Error handling per format

### Supported Conversions
| Input | Output | Engine | Note |
|---|---|---|---|
| PNG | WebP | `@jsquash/webp` | Lossy/Lossless option |
| JPG | WebP | `@jsquash/webp` | Quality 0-100 |
| PNG | JPG | Canvas API | Background fill putih |
| JPG | PNG | Canvas API | Lossless |
| WebP | PNG | `@jsquash/png` | Lossless |
| PNG/JPG | PNG/JPG (resize) | Canvas API | Preserve aspect ratio option |

### Interface
```ts
interface ImageConvertOptions {
  quality?: number;        // 1-100, default 80
  maxWidth?: number;       // resize bound
  maxHeight?: number;
  preserveAspect?: boolean; // default true
  background?: string;     // hex, default #FFFFFF for JPG output
}
```

### Output
```ts
{
  blob: Blob,
  mime: 'image/webp' | 'image/jpeg' | 'image/png',
  filename: 'photo.webp',
  originalSize: 1234567,
  convertedSize: 234567,
  compressionRatio: 0.19,
}
```

### Selesai ketika
- ✅ User upload PNG 5 MB → dapat WebP 500 KB yang valid (bisa dibuka di browser)
- ✅ Resize 4000×3000 → 1920×1440 dengan aspect ratio benar
- ✅ Batch 10 file jalan tanpa memory leak
- ✅ 0 request ke backend

---

## CHAPTER 3.3 · FFmpeg.wasm Engine (P2 — Video & Audio)

**Tujuan:** video/audio conversion di browser pakai FFmpeg WASM.

### Pekerjaan
- Load `@ffmpeg/ffmpeg` + `@ffmpeg/core` (~30 MB) via EngineLoader
- Simpan di Cache Storage — sekali download, reuse selamanya
- Wrapper `ffmpeg-wrapper.ts` dengan API promise-based
- Worker `video.worker.ts` — handle FFmpeg instance
- Progress listener — `ffmpeg.on('progress', ...)`
- Memory management: `FS.unlink()` untuk file di MEMFS FFmpeg

### Supported Conversions
| Input | Output | Note |
|---|---|---|
| MP4 | WebM | VP9 / VP8 encode |
| MP4 | MP3 | Extract audio |
| MP4 | GIF | Short clip, max 10s |
| WebM | MP4 | H.264 (butuh encoder) |
| MOV | MP4 | Remux / transcode |
| MKV | MP4 | Remux |
| WAV | MP3 | Audio convert |
| MP3 | OGG | Audio convert |
| M4A | MP3 | Audio convert |

### Wrapper Design
```ts
class FFmpegEngine {
  private ffmpeg: FFmpeg;
  private loaded: boolean = false;

  async load(onProgress?: (p: number) => void): Promise<void>;

  async convert(
    file: File,
    args: string[],
    outputName: string,
    onProgress?: (p: number) => void
  ): Promise<Blob>;

  async cleanup(): Promise<void>;
}
```

### Contoh Command
```ts
// MP4 → WebM
['-i', 'input.mp4', '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', 'output.webm']

// MP4 → MP3
['-i', 'input.mp4', '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 'output.mp3']

// MP4 → GIF (5 detik mulai 00:00)
['-i', 'input.mp4', '-t', '5', '-vf', 'fps=15,scale=480:-1', 'output.gif']
```

### Selesai ketika
- ✅ MP4 50 MB → WebM 20 MB dalam < 60 detik di laptop mid-range
- ✅ Progress bar update real-time
- ✅ Cancel works (terminate worker + FFmpeg exit)
- ✅ Memory tidak naik terus setelah 5 conversion berturut-turut

### Catatan Penting
- ⚠️ **FFmpeg.wasm butuh SharedArrayBuffer** → wajib COOP/COEP header
- ⚠️ **iOS Safari ~1 GB limit** — fallback ke backend untuk file > 500 MB
- ⚠️ **Single-threaded** by default — untuk multi-thread butuh `@ffmpeg/core-mt` (lebih besar)
- ⚠️ **Mobile performance** jauh lebih lambat — deteksi device class dulu

---

## CHAPTER 3.4 · PDF Engine (P3)

**Tujuan:** operasi PDF client-side (merge, split, rotate, image → PDF).

### Pekerjaan
- Integrasi `pdf-lib` (~500 KB minified)
- Worker `document.worker.ts`
- Support basic PDF operations (NO text extraction/OCR)

### Supported Operations
| Operation | Engine | Note |
|---|---|---|
| Image → PDF | `pdf-lib` | PNG/JPG → single-page PDF |
| Multiple Image → PDF | `pdf-lib` | Batch → multi-page |
| Merge PDF | `pdf-lib` | Combine 2+ PDF files |
| Split PDF | `pdf-lib` | Extract page range |
| Rotate PDF | `pdf-lib` | Rotate 90/180/270 |
| Reorder Pages | `pdf-lib` | UI drag-drop |

### Interface
```ts
interface PdfOperation {
  type: 'merge' | 'split' | 'rotate' | 'image-to-pdf';
  files: File[];
  options: {
    pages?: number[];      // for split
    angle?: 90 | 180 | 270; // for rotate
    pageSize?: 'A4' | 'Letter' | 'auto';
  };
}
```

### Selesai ketika
- ✅ Merge 3 PDF jadi 1, total 20 MB dalam < 3 detik
- ✅ Split PDF halaman 3-7
- ✅ Image → PDF dengan layout yang rapi
- ✅ Output bisa dibuka di Adobe Reader / browser

---

## CHAPTER 3.5 · Archive Engine (P4)

**Tujuan:** bikin & extract archive ringan di browser.

### Pekerjaan
- Integrasi `fflate` (~30 KB) — lebih kecil dari JSZip
- Worker `archive.worker.ts`
- Progress per file

### Supported
| Operation | Note |
|---|---|
| Files → ZIP | Compress multi-file |
| ZIP → Extract | Extract archive |
| Files → TAR | Alternative format |

### Selesai ketika
- ✅ Zip 10 file jadi 1 (size ~50% dari total)
- ✅ Extract ZIP → dapat file asli
- ✅ Progress: file 3/10, 45%

---

## CHAPTER 3.6 · Metadata / EXIF Engine (P5)

**Tujuan:** read/write/delete metadata image.

### Pekerjaan
- Integrasi `exifr` (read) + `piexifjs` (write) atau `exifr` saja untuk read-only
- UI panel untuk edit metadata (kamera, tanggal, GPS, dll)

### Supported
| Operation | Note |
|---|---|
| Read EXIF | Camera, date, GPS, ISO, aperture |
| Strip EXIF | Hapus semua metadata (privacy) |
| Edit basic | Kamera model, date, copyright |

### Selesai ketika
- ✅ Upload JPG → tampil EXIF lengkap
- ✅ Strip EXIF → file baru tanpa metadata
- ✅ Verify dengan `exiftool` command line

---

## CHAPTER 3.7 · Real Output & Download Flow

**Tujuan:** ganti mock "Converted Content" dengan file output asli.

### Pekerjaan
- Ganti mock di `ConversionResult.tsx` dengan Blob dari worker
- Implement `ObjectURL` lifecycle:
  ```ts
  const url = URL.createObjectURL(blob);
  // ... gunakan untuk download
  URL.revokeObjectURL(url); // cleanup
  ```
- Download button → trigger `a.download` attribute
- Multiple output → download as ZIP
- Preview inline (image, video) — pakai `Blob` → object URL
- Cleanup on unmount

### UI States
| State | UI |
|---|---|
| `idle` | Dropzone |
| `loading-engine` | "Preparing converter..." + progress |
| `converting` | Progress bar + file name |
| `done` | Preview + Download button |
| `error` | Error message + Retry |
| `cancelled` | Back to idle |

### Selesai ketika
- ✅ Klik "Convert" → dapat file asli, bisa buka di app eksternal
- ✅ Object URL di-revoke setelah download
- ✅ Batch output → ZIP download

---

## CHAPTER 3.8 · Engine-Specific Error Handling

**Tujuan:** error per engine punya penanganan berbeda.

### Error Categories
| Category | Contoh | Handling |
|---|---|---|
| **Unsupported format** | User upload `.psd` ke engine image | Toast: "Format tidak didukung" |
| **Corrupt file** | PDF rusak / MP4 broken | Toast: "File rusak atau tidak valid" |
| **Out of memory** | Video 2 GB di device 2 GB RAM | Fallback ke backend (atau reject) |
| **WASM load fail** | Network error saat download engine | Retry dengan exponential backoff |
| **Conversion timeout** | File > 500 MB | Cancel + rekomendasi backend |
| **Browser not supported** | Safari < 15 tidak support WASM | Show compat warning |
| **Engine version mismatch** | Cached engine lama | Auto-update + clear cache |

### Selesai ketika
- ✅ Error message informatif, bukan "Something went wrong"
- ✅ Semua error code terdokumentasi
- ✅ Retry tidak duplicate job

---

## CHAPTER 3.9 · Capability Detection

**Tujuan:** deteksi apakah device user bisa jalanin engine tertentu.

### Pekerjaan
- Cek `WebAssembly` support
- Cek `SharedArrayBuffer` support (untuk FFmpeg)
- Cek `navigator.hardwareConcurrency` (min 2 core)
- Cek `navigator.deviceMemory` (min 4 GB)
- Cek **Web Worker** support
- Cek **Cache Storage API** support
- Cek **IndexedDB** support
- Detect iOS/Android (special handling)
- Detect battery status (jangan convert kalau low battery)

### Capability Matrix
```ts
{
  wasm: true,
  sab: false,           // → fallback untuk FFmpeg
  worker: true,
  cache: true,
  indexedDB: true,
  memory: 4,            // GB
  cores: 4,
  isMobile: true,
  isIOS: false,
  tier: 'medium',       // 'low' | 'medium' | 'high'
}
```

### Behavior
| Tier | Image | Video | PDF |
|---|---|---|---|
| **High** (desktop) | ✅ All | ✅ All | ✅ All |
| **Medium** (mid mobile) | ✅ All | ⚠️ < 50 MB | ✅ All |
| **Low** (low mobile) | ✅ Basic | ❌ Backend | ✅ Basic |

### Selesai ketika
- ✅ Device low-end tidak crash saat buka app
- ✅ UI menyesuaikan (fitur disabled kalau tidak capable)

---

## CHAPTER 3.10 · Performance Profiling

**Tujuan:** ukur engine performance secara konsisten.

### Metrik
| Metrik | Target | Cara Ukur |
|---|---|---|
| **Engine load time** | < 5 detik | `performance.now()` sebelum-sesudah |
| **Conversion time** | < 30 detik (10 MB) | Timer per engine |
| **Memory peak** | < 500 MB | `performance.memory` (Chrome) |
| **Cache hit rate** | > 90% | Log tiap request |
| **Success rate** | > 95% | Log per conversion |
| **Output size ratio** | Ideal < 80% | `outputSize / inputSize` |

### Selesai ketika
- ✅ Ada dashboard internal atau log file buat analisa
- ✅ Threshold alert jika engine di luar spec

---

## CHAPTER 3.11 · Cross-Browser Testing

**Tujuan:** verify engine jalan di semua target browser.

### Browser Matrix
| Browser | Version | Priority |
|---|---|---|
| Chrome Desktop | Latest | 🥇 P1 |
| Chrome Android | Latest | 🥇 P1 |
| Firefox Desktop | Latest | 🥈 P2 |
| Safari Desktop | 16+ | 🥈 P2 |
| Safari iOS | 16+ | 🥈 P2 |
| Edge | Latest | 🥉 P3 |
| Brave | Latest | 🥉 P3 |

### Test Case per Browser
- [ ] Upload image → convert
- [ ] Upload video → convert
- [ ] Engine cache persists after refresh
- [ ] Engine cache persists after browser restart
- [ ] Worker tidak freeze UI
- [ ] Download file valid

### Selesai ketika
- ✅ 95% test cases pass di Chrome
- ✅ Compat warning di browser yang tidak support

---

## CHAPTER 3.12 · Engine Versioning & Updates

**Tujuan:** bisa update engine tanpa rusakin cache user lama.

### Pekerjaan
- Registry punya field `version` (semver)
- Cache key include version: `engine:png-webp:v1.2.0`
- Auto-invalidate kalau versi di registry > versi cached
- Force refresh button (manual)
- Migration path kalau engine deprecated

### Selesai ketika
- ✅ Update engine → user dapet versi baru otomatis
- ✅ Tidak ada konflik antar versi

---

## CHAPTER 3.13 · Security Hardening

**Tujuan:** audit keamanan engine WASM.

### Pekerjaan
- **Subresource Integrity (SRI)** untuk engine WASM — hash check
- **Content Security Policy** — block inline script
- **Sandbox worker** — tidak akses DOM, tidak akses network sembarangan
- **Input sanitization** — filename, MIME type, magic byte
- **DoS protection** — limit file size, limit concurrent conversion
- **ZIP bomb protection** — limit extract size
- **Engine tampering detection** — hash compare

### Selesai ketika
- ✅ Semua engine punya checksum
- ✅ CSP aktif di production
- ✅ No XSS via filename

---

## CHAPTER 3.14 · Observability & Analytics

**Tujuan:** data untuk improve product, bukan buat stalk user.

### Yang Dikumpulkan
```ts
{
  engineId: 'png-webp',
  engineVersion: '1.2.0',
  success: true,
  durationMs: 1873,
  inputSize: 5234567,
  outputSize: 789123,
  ratio: 0.15,
  browser: 'Chrome',
  os: 'Windows',
  deviceTier: 'high',
  cacheHit: true,
  error?: null,
}
```

### Yang TIDAK Dikumpulkan
- ❌ File user
- ❌ Filename original
- ❌ EXIF content
- ❌ IP address
- ❌ Conversion output

### Selesai ketika
- ✅ Dashboard aggregate: engine popular, success rate, avg time
- ✅ Zero PII in logs

---

## CHAPTER 3.15 · Testing Strategy

### Test Levels
| Level | Coverage |
|---|---|
| **Unit** | Setiap engine function (input → output valid) |
| **Integration** | Worker ↔ Main thread protocol |
| **Browser** | Cross-browser matrix |
| **Performance** | Regresi setelah update |
| **Security** | Fuzzing input file |
| **Regression** | Setiap release |

### Test Files
```
fixtures/
├── images/
│   ├── tiny.png         (1 KB)
│   ├── small.jpg        (500 KB)
│   ├── medium.png       (5 MB)
│   ├── large.jpg        (20 MB)
│   └── corrupt.jpg      (invalid)
├── videos/
│   ├── short.mp4        (5 MB, 10s)
│   ├── medium.mp4       (50 MB, 60s)
│   └── large.mp4        (500 MB, 10min)
├── pdfs/
│   ├── single.pdf       (100 KB)
│   ├── multi.pdf        (5 MB, 20 pages)
│   └── corrupt.pdf
└── archives/
    ├── small.zip        (1 MB)
    └── bomb.zip         (malicious)
```

### Selesai ketika
- ✅ Test coverage > 70%
- ✅ Semua fixture valid

---

## CHAPTER 3.16 · Documentation

**Tujuan:** dokumentasi untuk kontributor & user.

### Pekerjaan
- `README.md` — setup dev, cara build, cara test
- `CONTRIBUTING.md` — cara nambah engine baru
- `docs/engine-template.md` — template engine baru
- `docs/architecture.md` — diagram alur conversion
- JSDoc untuk semua public API

### Selesai ketika
- ✅ Dev baru bisa nambah engine dalam < 1 jam
- ✅ Docs up-to-date di setiap release

---

## CHAPTER 3.17 · Deployment & Rollout

**Tujuan:** release Phase 3 ke production.

### Rollout Plan
| Stage | Audience | Metrics |
|---|---|---|
| **Stage 1** | Internal (lu sendiri) | Smoke test |
| **Stage 2** | 5% user | Error rate, latency |
| **Stage 3** | 25% user | Success rate, conversion count |
| **Stage 4** | 100% user | Full rollout |

### Checklist Production
- [ ] HTTPS only
- [ ] CSP header
- [ ] Security headers (COOP/COEP)
- [ ] Turnstile aktif
- [ ] Rate limiting
- [ ] Feature flags
- [ ] Monitoring (Sentry / LogRocket)
- [ ] Rollback plan
- [ ] Documentation live
- [ ] Status page (kalau ada)

### Selesai ketika
- ✅ Phase 3 stable di production 1 minggu tanpa critical bug
- ✅ Rollback procedure tested

---

## MILESTONE PHASE 3

| Milestone | Target | Deliverable |
|---|---|---|
| **M1: Image Engine** | Week 1 | PNG/JPG ↔ WebP, resize |
| **M2: Real Output** | Week 2 | File asli bisa di-download |
| **M3: FFmpeg Engine** | Week 3-4 | MP4 → WebM, MP4 → MP3 |
| **M4: PDF Engine** | Week 5 | Merge, split, image → PDF |
| **M5: Polish** | Week 6 | Error handling, UI, capability detection |
| **M6: Beta Release** | Week 7 | Public beta |
| **M7: GA** | Week 8 | General availability |

---

## PRIORITAS IMPLEMENTASI (Urutan Coding)

**Week 1 — Image basics:**
1. Setup `EngineContext` + Worker + Logger
2. `png-webp` engine — proof of concept
3. `jpg-webp` engine
4. `resize` engine (Canvas API)
5. Real output + download flow

**Week 2 — Image polish + PDF:**
6. `merge-pdf` engine
7. `image-to-pdf` engine
8. Batch conversion
9. Error handling per engine

**Week 3-4 — FFmpeg:**
10. FFmpeg.wasm integration
11. Video worker + progress
12. MP4 → WebM
13. MP4 → MP3
14. Cancel + retry

**Week 5-6 — Extra:**
15. Archive (zip/tar)
16. EXIF read/write
17. Capability detection
18. Performance optimization

**Week 7-8 — Release:**
19. Testing matrix
20. Docs
21. Beta rollout
22. GA

---

## YANG TIDAK DILAKUKAN DI PHASE 3

❌ **PDF → DOCX** (butuh backend, kompleks)
❌ **DOCX → PDF** (butuh backend)
❌ **OCR** (butuh Tesseract + training data, di Phase 4)
❌ **Video editing advanced** (trim, filter, watermark — Phase 4)
❌ **AI-powered conversion** (upscale, background removal — Phase 5)
❌ **Server-side converter full** (Phase 4)

---

## FILOSOFI PHASE 3

```
"Convert locally first. Fallback when necessary."

Kalau bisa di browser → browser.
Kalau tidak bisa → backend.
Kalau tidak bisa dua-duanya → jujur ke user.
```

**Backend tetap ringan.** Phase 3 fokus bikin browser jadi converter. Backend cuma:
- Auth
- Quota
- Turnstile
- Fallback (kalau local fail)
- Analytics

---

## NEXT PHASE (Preview)

**Phase 4:** Server-side fallback untuk PDF ↔ DOCX, OCR, archive kompleks, video editing.
**Phase 5:** AI-powered (upscale, background removal, subtitle generation).
**Phase 6:** API access + CLI tool + integration (Zapier, Make).

---

**END OF PHASE 3**

> 🗿 *"Kalau engine-nya bisa jalan di browser, kenapa harus upload ke server?"*