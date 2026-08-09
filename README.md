# 🕌 Zakat Al Ikhlas

Aplikasi web (PWA) untuk mengelola **penerimaan dan penyaluran zakat fitrah** di Masjid Al Ikhlas, Griya Gamersi Lalung RT 05 RW 13, Karanganyar.

Dibuat agar panitia zakat bisa mencatat, menghitung, dan melaporkan zakat dengan cepat dari HP — sekaligus memberi **transparansi** kepada warga lewat halaman publik yang bisa dilihat siapa saja.

> "Ambillah zakat dari sebagian harta mereka, dengan zakat itu kamu membersihkan dan mensucikan mereka." — QS. At-Taubah: 103

---

## ✨ Fitur

### Untuk Warga (Publik — tanpa login)
- Melihat total **beras & uang** zakat yang terkumpul secara real-time
- Daftar **Muzakki** (penyetor zakat) yang transparan
- Daftar **penyaluran** kepada Mustahik (nama disamarkan demi privasi)
- Pencarian nama & pilih tahun

### Untuk Panitia (setelah login PIN)
- **Catat zakat**: Fitrah, Mal, Fidyah, Infaq — dengan **perhitungan otomatis** dan deteksi infaq
- **Kirim resi WhatsApp** otomatis ke penyetor
- **Pendataan Mustahik** & eksekusi penyerahan (dengan saran pembagian beras)
- **Pencatatan pengeluaran** (konversi uang ke beras, belanja operasional, tutup buku) + upload struk
- **Laporan Pertanggungjawaban (LPJ)** siap cetak dalam format PDF
- **Mesin waktu**: kelola & lihat data per tahun
- Ganti PIN keamanan

---

## 📱 Progressive Web App (PWA)

Aplikasi ini bisa **dipasang di layar HP** seperti aplikasi native (Add to Home Screen), dengan ikon sendiri, tampilan layar penuh, dan pemuatan cepat berkat *service worker*.

Catatan: data zakat tetap membutuhkan koneksi internet (diambil real-time). Yang di-*cache* untuk kecepatan adalah kerangka aplikasinya.

---

## 🏗️ Arsitektur

Aplikasi ini memisahkan **tampilan** dari **logika & data** — pola yang membuatnya ringan, aman, dan mudah dirawat:

```
┌─────────────┐      fetch() JSON      ┌──────────────────┐
│   FRONTEND  │  ───────────────────▶  │     BACKEND      │
│  (Vercel)   │                        │ Google AppScript │
│ HTML/CSS/JS │  ◀───────────────────  │        +         │
│    (PWA)    │       data JSON        │  Google Sheets   │
└─────────────┘                        └──────────────────┘
```

- **Frontend** (repo ini): file statis HTML/CSS/JS murni — tanpa framework — di-hosting di **Vercel** sebagai PWA.
- **Backend**: **Google Apps Script** berperan sebagai API JSON, dengan **Google Sheets** sebagai basis data. (Kode backend berada di project Apps Script terpisah, bukan di repo ini.)
- Notifikasi WhatsApp memakai layanan **Fonnte**.

---

## 🛠️ Teknologi

- HTML, CSS, JavaScript (vanilla — tanpa framework)
- PWA: Web App Manifest + Service Worker
- [SweetAlert2](https://sweetalert2.github.io/) untuk dialog
- [Font Awesome](https://fontawesome.com/) untuk ikon
- Google Fonts: **Plus Jakarta Sans** (UI) & **Amiri** (kaligrafi Arab)
- Backend: Google Apps Script + Google Sheets
- Hosting: Vercel

---

## 📂 Struktur Berkas

```
zakat-alikhlas/
├── index.html          # Struktur halaman (publik + panitia)
├── style.css           # Gaya tampilan (tema hijau-emas)
├── app.js              # Logika frontend & pemanggilan API
├── manifest.json       # Identitas PWA
├── service-worker.js   # Cache untuk mode offline/instan
├── al-ikhlas.png       # Logo
├── icon-192.png        # Ikon PWA
├── icon-512.png        # Ikon PWA
└── README.md
```

---

## 🚀 Ingin Memakai untuk Masjid Anda?

Silakan! Aplikasi ini open source (lihat Lisensi). Langkah umum:

1. **Fork / salin** repo ini.
2. Siapkan **backend Apps Script** sendiri: buat Google Sheets sebagai database, tulis fungsi-fungsi API (penerimaan, penyaluran, LPJ, dll.), lalu *deploy* sebagai Web App (Execute as: Me, Who has access: Anyone). Salin URL `/exec`-nya.
3. Di `app.js`, ganti nilai **`URL_API`** dengan URL `/exec` milik Anda.
4. Ganti logo & ikon (`al-ikhlas.png`, `icon-192.png`, `icon-512.png`) serta identitas masjid di `index.html`.
5. Hubungkan repo ke **Vercel** — selesai, aplikasi otomatis live setiap kali Anda `git push`.

> Catatan jujur: repo ini berisi **frontend** saja. Bagian backend (Apps Script + struktur Sheets) perlu Anda siapkan sendiri sesuai kebutuhan masjid Anda.

### Tips pengembangan
Setiap kali mengubah `style.css` / `app.js` / `index.html`, naikkan angka `CACHE_NAME` di `service-worker.js` (mis. `zakat-v6` → `zakat-v7`) agar perangkat pengguna mengambil versi terbaru.

---

## 🤝 Kontribusi

Masukan, laporan bug, dan ide perbaikan sangat diterima — silakan buka *Issue* atau *Pull Request*.

---

## 👤 Pembuat

**Edi Susilo** — untuk Panitia Zakat Masjid Al Ikhlas, Karanganyar.

Dibangun bertahap dengan sepenuh hati, semoga bermanfaat dan menjadi amal jariyah. 🤲

---

## 📄 Lisensi

Dirilis di bawah **Lisensi MIT** — bebas digunakan, disalin, dan diadaptasi, termasuk oleh masjid atau lembaga lain, dengan tetap menyertakan atribusi. Lihat berkas `LICENSE` untuk detail.
