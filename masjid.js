// ==========================================================
// masjid.js — Modul Info Masjid (Super-App Masjid Al Ikhlas)
// Diisi bertahap sesuai roadmap. Phase 1: kerangka saja.
// ==========================================================

// Namespace sederhana: semua fungsi masjid "dibungkus" dalam objek Masjid
// agar tidak bentrok dengan nama fungsi di zakat.js.
const Masjid = {

  // Titik masuk modul masjid. Nanti dipanggil saat halaman masjid tampil.
  init() {
    console.log('✅ Modul Masjid siap (Phase 1 — kerangka).');
    // Phase 2 nanti: panggil ambilWaktuSholat() & tampilkan tanggal di sini.
  }

};

// ==========================================================
// CATATAN PENTING (akan relevan mulai Phase 2):
// zakat.js sudah memakai `window.onload`. JANGAN memakai `window.onload`
// lagi di sini — keduanya akan saling menimpa (yang terakhir menang).
// Gunakan addEventListener seperti di bawah — ini boleh dipakai berkali-kali
// tanpa saling menimpa.
// ==========================================================
window.addEventListener('load', function () {
  // Phase 1: belum melakukan apa-apa yang terlihat (sengaja).
  // Masjid.init();   // ← baris ini diaktifkan di Phase 2
});
