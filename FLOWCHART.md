# USER JOURNEY & FLOWCHART: Converter_File

Dokumen ini mendefinisikan alur interaksi pengguna (*user journey*) dari pertama kalimasuk, proses konversi, autentikasi OAuth, hingga pembelian langganan premium dengan verifikasi pembayaran ganda.

---

## 1. High-Level System Flow (Mermaid)

```mermaid
graph TD
    %% Entry & Turnstile
    A[User Akses Web] --> B{Cloudflare Turnstile Check}
    B -->|Fail / Bot| B1[Block / Retry]
    B -->|Pass / Human| C[Dashboard Utama: Drag & Drop / Convert]

    %% Auth Flow
    C -->|Klik Login Google di Header| D[Redirect Google OAuth]
    D -->|Auth Success| E[Callback / Session Set]
    E --> C

    %% Subscription & Payment Flow
    C -->|User Login ingin Upgrade| F[Klik Tombol Subscription]
    F --> G[Halaman Pricing / Plans]
    G -->|Pilih Plan & Klik Beli| H[Redirect Payment Gateway / QRIS Display]
    H -->|User Bayar via QRIS| I[Payment Gateway Callback / Webhook ke Backend]
    I --> J{Backend Double-Verify ke PG API}
    J -->|Invalid / Pending| K[Status Pending / Failed UI]
    J -->|Valid / Settled Verified| L[Upgrade Status User jadi Premium di DB]
    L --> C
2. Detailed Step-by-Step Breakdown
Fase A: Akses & Keamanan Gerbang (Entry)
User masuk ke web: Mengakses root domain (mungil.my.id).

Cloudflare Turnstile: Sistem menyajikan tantangan anti-bot ringan ("I'm not a robot").

Jika gagal: Ditahan / diminta ulang.

Jika lolos: Sesi/token divalidasi, lanjut ke Dashboard.

Dashboard Utama: Menampilkan area Drag-and-Drop, pemilih format (converter tool), dan status tamu (guest). Pengguna bisa langsung convert file gratis sesuai batasan guest.

Fase B: Autentikasi Google OAuth
Trigger Login: Di header, pengguna klik tombol "Login" (atau ikon profil/masuk).

OAuth Flow: Sistem melempar ke Google OAuth 2.0 / Firebase Auth / NextAuth (sesuai setup backend).

Callback & Session: Token diverifikasi server, data user disimpan/dicocokkan di database lokal.

Return to Dashboard: Halaman me-refresh / state berubah jadi Logged-in user (menampilkan email/nama user di header, riwayat, atau kuota tersimpan).

Fase C: Monetisasi & Double-Verification Subscription
Navigasi Subscription: User yang sudah login klik tombol Subscription / Upgrade to Pro.

Plan Selection: Masuk ke halaman pilihan paket (misal: Bulanan/Tahunan) dengan rincian benefit (limit file >1GB, kecepatan prioritas, tanpa iklan).

Checkout & QRIS:

User klik "Beli / Bayar".

Backend membuat invoice ke Payment Gateway (Midtrans/Xendit/Tripay).

Frontend merender payload pembayaran (QRIS image / VA number).

Payment Processing: User melakukan pembayaran di aplikasi banking/ewallet mereka.

Double-Verification (Security Core):

Step 1 (Webhook/Callback): Payment gateway mengirim sinyal notification ke endpoint backend.

Step 2 (API Polling/Query Verification): Backend tidak boleh langsung percaya webhook mentah. Backend wajib menembak API Query/Check Status resmi ke server Payment Gateway menggunakan Server Key rahasia untuk memastikan transaksi benar-benar settled/paid.

Grant Premium: Setelah verifikasi ganda valid, backend mengupdate role/subscription_status user di database menjadi premium.

Sync UI: Dashboard memperbarui status badge user dari Free menjadi Pro secara real-time.

3. Error / Edge Case Handlers
QRIS Timeout / Expired: Jika waktu bayar habis, tampilkan status expired dan beri tombol "Generate QRIS Baru".

Double Payment / Fraud Spike: Rate-limit endpoint pembuatan invoice pembayaran maksimal 3x per jam per user untuk menghindari spam request ke payment gateway.