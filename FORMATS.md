# SUPPORTED FORMATS & CONVERSION MATRIX: Converter_File

Dokumen ini mendefinisikan matriks konversi file yang didukung oleh sistem, batasan ukuran, dan *engine* (library) pemroses di backend. AI Agent **WAJIB** merujuk pada daftar ini saat membuat antarmuka *dropdown* pilihan ekstensi file dan logika validasi.

---

## 1. Global Constraints (Batasan Umum)
* **Maximum File Size:** `1024 MB` (1 GB) untuk pengguna gratis (Free Tier).
* **Blocked Extensions (Blacklist):** Dilarang keras memproses ekstensi file *executable*, *script*, atau *system files* seperti: `.exe, .bat, .sh, .php, .js, .apk, .msi, .dll, .sys`.
* **Corrupted File Handling:** Jika file tidak bisa dibaca oleh mesin konversi (corrupt/rusak), sistem harus langsung menghentikan proses, menghapus file dari `/tmp`, dan mengembalikan status HTTP `422 Unprocessable Entity` dengan pesan error: "File korup atau format tidak didukung".

---

## 2. Image Conversion Matrix (Gambar)
**Engine Backend:** `Pillow` (Python) atau `Sharp` (Node.js).

| Input Format | Didukung untuk dikonversi menjadi (Output) |
| :--- | :--- |
| `.jpg` / `.jpeg` | `.png`, `.webp`, `.pdf` |
| `.png` | `.jpg`, `.webp`, `.pdf`, `.ico` |
| `.webp` | `.jpg`, `.png`, `.pdf` |
| `.bmp` | `.jpg`, `.png`, `.webp` |

* **Catatan Khusus:** Konversi dari `.png` ke `.jpg` harus menghilangkan *alpha channel* (transparansi) dan menggantinya dengan background warna solid (putih).

---

## 3. Audio Conversion Matrix (Suara)
**Engine Backend:** `FFmpeg`.

| Input Format | Didukung untuk dikonversi menjadi (Output) |
| :--- | :--- |
| `.mp3` | `.wav`, `.ogg`, `.aac` |
| `.wav` | `.mp3`, `.ogg`, `.aac` |
| `.m4a` | `.mp3`, `.wav` |
| `.ogg` | `.mp3`, `.wav` |

* **Catatan Khusus:** Kualitas *bitrate* output audio diatur ke standar `192kbps` atau `128kbps` kecuali pengguna meminta sebaliknya (jika ada opsi lanjutan nanti).

---

## 4. Video Conversion Matrix (Video)
**Engine Backend:** `FFmpeg`.

| Input Format | Didukung untuk dikonversi menjadi (Output) |
| :--- | :--- |
| `.mp4` | `.avi`, `.mkv`, `.webm`, `.mp3` (Ekstrak Audio) |
| `.mkv` | `.mp4`, `.avi`, `.mp3` (Ekstrak Audio) |
| `.mov` | `.mp4`, `.webm`, `.mp3` (Ekstrak Audio) |
| `.webm` | `.mp4`, `.mp3` (Ekstrak Audio) |

* **Catatan Khusus:** Konversi video sangat memakan CPU. Terapkan batasan resolusi maksimal ke `1080p` untuk menghindari *server overload*.

---

## 5. Document / Text Matrix (Dokumen)
**Engine Backend:** `Pandoc` atau `PDF2Go` (atau library yang disesuaikan).

| Input Format | Didukung untuk dikonversi menjadi (Output) |
| :--- | :--- |
| `.pdf` | `.docx` (Experimental), `.txt` |
| `.docx` | `.pdf`, `.txt` |
| `.txt` | `.pdf`, `.docx` |
| `.csv` | `.json`, `.xlsx` |
| `.json` | `.csv` |

---

## 6. Validasi MIME-Type (Frontend & Backend)
Setiap kali *user* memilih file, frontend (HTML5 `accept` attribute) dan backend **wajib** memvalidasi MIME-Type asli dari file, bukan hanya string ekstensi namanya.
Contoh pemetaan:
* `.jpg` -> `image/jpeg`
* `.pdf` -> `application/pdf`
* `.mp4` -> `video/mp4`
* `.json` -> `application/json`