# SECURITY POLICY & ARCHITECTURE: Converter_File

Dokumen ini mendefinisikan standar keamanan (Security Guardrails) untuk aplikasi Converter_File. Semua agen AI dan developer **WAJIB** mengimplementasikan lapisan keamanan ini untuk mencegah eksploitasi, DDoS, dan kebocoran server dengan memanfaatkan solusi **Zero-Cost (Gratis namun setara Enterprise)**.

---

## 1. Edge Security & Anti-Bot (Cloudflare Free Tier)
Semua lalu lintas (traffic) harus melewati *proxy* Cloudflare sebelum menyentuh server asal (Origin Server).

* **Cloudflare Turnstile:** 
  * Wajib dipasang pada halaman frontend tepat sebelum proses *upload* dieksekusi.
  * Turnstile digunakan sebagai pengganti reCAPTCHA (karena lebih ringan, gratis tanpa batas, dan ramah privasi).
  * Backend API **TIDAK BOLEH** memproses file jika token Turnstile dari frontend tidak valid.
* **Cloudflare WAF & DDoS Protection:** 
  * Manfaatkan WAF gratis Cloudflare untuk memblokir IP dengan reputasi buruk secara otomatis.
  * Sembunyikan IP Origin Server (Gunakan status "Proxied" / Awan Oranye di DNS Cloudflare).

## 2. File Upload Protection (CRITICAL) 🚨
Keamanan pemrosesan file adalah prioritas absolut. Jangan pernah mempercayai input dari pengguna.

* **Strict MIME-Type & Magic Number Validation:**
  * Dilarang keras hanya memvalidasi file berdasarkan ekstensinya (misal: hanya mengecek `.pdf`).
  * Backend **WAJIB** membaca *Magic Number* (header bit dari file) menggunakan library seperti `file-type` (Node.js) atau `python-magic` (Python) untuk memastikan file tersebut benar-benar asli, bukan *malware/executable* yang di-rename.
* **Filename Sanitization (Cegah Path Traversal):**
  * Jangan gunakan nama file asli dari *user* untuk menyimpan file di server.
  * *User* bisa saja mengirim file bernama `../../../etc/passwd`.
  * **Rule:** Hasilkan nama file acak menggunakan UUID/Hash (misal: `73a2b1-file.pdf`) saat menyimpan di *temporary storage*.
* **Payload Size Limit:**
  * Batasi ukuran *body request* dan ukuran *upload* maksimal sesuai spesifikasi (misal: `1GB`).
  * Blokir file yang melebihi batas ini sedini mungkin di level *Reverse Proxy* (misal: Nginx `client_max_body_size`) sebelum file ter-load ke memori/RAM aplikasi.

## 3. Rate Limiting (Cegah Spam & Server Crash)
Karena kita menghindari biaya *scaling* server, *rate limiting* harus ketat.

* **API Rate Limiter:** 
  * Implementasikan *rate limiting* di level aplikasi (contoh: `express-rate-limit` di Node.js atau `slowapi` di Python/FastAPI).
  * **Aturan Default:** Batasi maksimal *X* kali konversi per IP dalam *Y* menit (contoh: maksimal 10 konversi per jam untuk pengguna gratis/anonim).
* **Concurrent Processing Limit:**
  * Jangan biarkan *engine* FFmpeg/alat konversi memproses ratusan file secara bersamaan karena akan membuat CPU server 100% dan *crash*.
  * Gunakan sistem *Queue* (antrean) lokal agar pemrosesan berjalan berurutan (*FIFO - First In First Out*).

## 4. Data Privacy & Auto-Cleanup (Zero-Trust Storage)
Server kita bukan Google Drive. Jangan simpan data orang!

* **Auto-Delete (Cron/Timer):** 
  * File sumber (input) dan file hasil konversi (output) **WAJIB DIHAPUS OTOMATIS** maksimal 15-30 menit setelah proses konversi selesai.
  * Tambahkan *script cron job* atau *background worker* cadangan yang berjalan setiap 1 jam untuk menyapu bersih folder `/tmp` atau `/uploads` (mencegah *storage* penuh jika ada proses yang gagal/nyangkut).
* **Isolation (File Eksekusi):**
  * Folder penyimpanan sementara (`/tmp/uploads`) tidak boleh memiliki izin eksekusi (`chmod -x`). Hal ini untuk memastikan skrip jahat (.php/.sh) tidak bisa dijalankan oleh server.

## 5. Secure HTTP Headers
Backend harus mengirimkan *Security Headers* standar pada setiap *response*:
* Gunakan library `Helmet` (jika Node.js) atau seting manual.
* Wajib terapkan:
  * `X-Content-Type-Options: nosniff`
  * `X-Frame-Options: DENY` (Mencegah web di-embed via iframe / Clickjacking).
  * `Strict-Transport-Security` (HSTS).
  * Sembunyikan header `X-Powered-By`.