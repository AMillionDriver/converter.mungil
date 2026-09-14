# ENVIRONMENT VARIABLES: Converter_File

Dokumen ini mendefinisikan daftar *Environment Variables* (Variabel Lingkungan) yang dibutuhkan untuk menjalankan aplikasi ini baik di tahap *Development* maupun *Production*.

🚨 **ATURAN MUTLAK (SECURITY RULE):** 
AI Agent dan Developer DILARANG KERAS menaruh kredensial asli di dalam file kode. Semua nilai sensitif harus dipanggil melalui variabel lingkungan (contoh: `process.env.TURNSTILE_SECRET` atau `os.getenv('TURNSTILE_SECRET')`). File `.env` WAJIB dimasukkan ke dalam `.gitignore`.

---

## 1. Server & Application Config (Konfigurasi Utama)
Variabel untuk mengatur bagaimana server berjalan.

* `NODE_ENV` / `APP_ENV`
  * **Deskripsi:** Status lingkungan aplikasi.
  * **Nilai Valid:** `development` | `production`
  * **Default:** `development`
* `PORT`
  * **Deskripsi:** Port lokal tempat server backend berjalan.
  * **Default:** `3000` atau `8080`
* `ALLOWED_ORIGIN`
  * **Deskripsi:** Domain frontend yang diizinkan menembak API backend ini (CORS Policy).
  * **Contoh:** `https://mungil.my.id` (Gunakan `*` atau `http://localhost:3000` saat development).

## 2. Processing & Storage Limits (Batas Pemrosesan)
Variabel untuk menjaga agar server gratisan tidak *overload* atau kehabisan memori.

* `MAX_FILE_SIZE_MB`
  * **Deskripsi:** Batas maksimal ukuran file yang boleh diunggah pengguna.
  * **Default:** `1024` (artinya 1 GB).
* `TEMP_DIR_PATH`
  * **Deskripsi:** Lokasi folder sementara (buffer) untuk menyimpan file sebelum dan sesudah konversi.
  * **Default:** `./tmp/uploads` atau `/tmp` (di sistem Linux).
* `CLEANUP_INTERVAL_MINS`
  * **Deskripsi:** Waktu (dalam menit) seberapa sering sistem akan menghapus file lama yang nyangkut di folder temporary.
  * **Default:** `15`

## 3. Security & Anti-Bot (Keamanan)
Variabel integrasi keamanan pihak ketiga.

* `TURNSTILE_SITE_KEY`
  * **Deskripsi:** Kunci publik (Public Key) Cloudflare Turnstile yang ditaruh di sisi Frontend/HTML (Aman jika terlihat publik).
  * **Wajib:** Ya
* `TURNSTILE_SECRET_KEY`
  * **Deskripsi:** Kunci rahasia (Private Key) Cloudflare Turnstile untuk validasi token di sisi Backend API. (SANGAT RAHASIA).
  * **Wajib:** Ya
* `RATE_LIMIT_WINDOW_MINS`
  * **Deskripsi:** Jendela waktu untuk batasan *rate limiting* (dalam menit).
  * **Default:** `60` (1 jam).
* `RATE_LIMIT_MAX_REQ`
  * **Deskripsi:** Jumlah maksimal konversi yang diizinkan per IP dalam satu jendela waktu.
  * **Default:** `10`

---

## 📝 Template `.env.example`
AI Agent wajib membuat file `.env.example` di *root* proyek berdasarkan kerangka di bawah ini agar developer manusia bisa menyalinnya menjadi file `.env` lokal:

```env
# APP CONFIG
NODE_ENV=development
PORT=3000
ALLOWED_ORIGIN=http://localhost:3000

# STORAGE & PROCESSING
MAX_FILE_SIZE_MB=1024
TEMP_DIR_PATH=./tmp
CLEANUP_INTERVAL_MINS=15

# SECURITY & RATE LIMIT
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
RATE_LIMIT_WINDOW_MINS=60
RATE_LIMIT_MAX_REQ=10