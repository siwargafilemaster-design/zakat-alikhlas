// ==========================================================
// masjid.js — Modul Info Masjid (Super-App Masjid Al Ikhlas)
// Phase 2: Waktu Sholat & Tanggal.
// ==========================================================

// --- Konfigurasi lokasi (Lalung, Karanganyar) ---
const MJ_LAT = -7.6;
const MJ_LON = 110.95;
const MJ_METODE = 20;   // 20 = KEMENAG Indonesia

// Nama bulan Hijriah dalam bahasa Indonesia
const MJ_BULAN = {
  "Muharram":"Muharram", "Safar":"Safar", "Rabi al-awwal":"Rabiul Awal",
  "Rabi al-thani":"Rabiul Akhir", "Jumada al-awwal":"Jumadil Awal",
  "Jumada al-thani":"Jumadil Akhir", "Rajab":"Rajab", "Shaʿban":"Sya'ban",
  "Ramadan":"Ramadhan", "Shawwal":"Syawal", "Dhu al-Qiʿdah":"Dzulqa'dah",
  "Dhu al-Hijjah":"Dzulhijjah"
};

let mjTimings = null;   // simpan waktu sholat untuk dipakai berulang (countdown)

// ==========================================================
// Titik masuk modul masjid
// ==========================================================
const Masjid = {
  init() {
    mjMuatWaktuSholat();
    // Perbarui penanda "sholat berikutnya" tiap 30 detik
    setInterval(mjTandaiBerikutnya, 30000);
  }
};

// ==========================================================
// Ambil waktu sholat + tanggal dari Aladhan
// ==========================================================
async function mjMuatWaktuSholat() {
  const url = 'https://api.aladhan.com/v1/timings'
            + '?latitude='  + MJ_LAT
            + '&longitude=' + MJ_LON
            + '&method='    + MJ_METODE;
  try {
    const respons = await fetch(url);
    const json = await respons.json();
    const data = json.data;
    mjTimings = data.timings;

    mjTampilTanggal(data);
    mjTampilPrayers(data.timings);
    mjTandaiBerikutnya();
  } catch (error) {
    const p = document.getElementById('mjPrayers');
    if (p) p.innerHTML = '<div class="mj-loading" style="color:#ef4444;">Gagal memuat waktu sholat: ' + error.message + '</div>';
  }
}

// ==========================================================
// Tampilkan kartu tanggal (Masehi → Hijriah Indonesia → Hijriah Arab)
// ==========================================================
function mjTampilTanggal(data) {
  const h = data.date.hijri;
  const namaBulan = MJ_BULAN[h.month.en] || h.month.en;

  document.getElementById('mjMasehi').textContent = data.date.readable;
  document.getElementById('mjHijriId').textContent = h.day + ' ' + namaBulan + ' ' + h.year + ' H';
  document.getElementById('mjHijriAr').textContent = mjAngkaArab(h.day) + ' ' + h.month.ar + ' ' + mjAngkaArab(h.year) + ' هـ';
}

// Ubah angka Latin (1448) → angka Arab (١٤٤٨)
function mjAngkaArab(angka) {
  const arab = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(angka).replace(/[0-9]/g, function(d){ return arab[d]; });
}

// ==========================================================
// Tampilkan strip waktu sholat (Imsak + 5 waktu)
// ==========================================================
function mjTampilPrayers(t) {
  const daftar = [
    { nama: 'Imsak',   kunci: 'Imsak',   ikon: 'fa-mug-hot',          ims:true },
    { nama: 'Subuh',   kunci: 'Fajr',    ikon: 'fa-cloud-sun' },
    { nama: 'Dzuhur',  kunci: 'Dhuhr',   ikon: 'fa-sun' },
    { nama: 'Ashar',   kunci: 'Asr',     ikon: 'fa-cloud-sun' },
    { nama: 'Maghrib', kunci: 'Maghrib', ikon: 'fa-moon' },
    { nama: 'Isya',    kunci: 'Isha',    ikon: 'fa-star-and-crescent' }
  ];
  const wadah = document.getElementById('mjPrayers');
  wadah.innerHTML = daftar.map(function(item) {
    const jam = mjBersihkanJam(t[item.kunci]);
    const kelas = 'mj-prayer' + (item.ims ? ' ims' : '') + ' waktu-' + item.kunci;
    return '<div class="' + kelas + '">'
         +   '<div class="pi"><i class="fa-solid ' + item.ikon + '"></i></div>'
         +   '<div class="pn">' + item.nama + '</div>'
         +   '<div class="pt">' + jam + '</div>'
         + '</div>';
  }).join('');
}

// Buang embel-embel " (WIB)" bila ada
function mjBersihkanJam(str) {
  return String(str).trim().split(' ')[0];
}

// "HH:MM" → menit sejak tengah malam (untuk perbandingan waktu)
function mjKeMenit(jam) {
  const b = mjBersihkanJam(jam).split(':');
  return parseInt(b[0], 10) * 60 + parseInt(b[1], 10);
}

// ==========================================================
// Tandai waktu sholat berikutnya + hitung mundur
// ==========================================================
function mjTandaiBerikutnya() {
  if (!mjTimings) return;

  const urut = [
    { nama: 'Subuh',   kunci: 'Fajr' },
    { nama: 'Dzuhur',  kunci: 'Dhuhr' },
    { nama: 'Ashar',   kunci: 'Asr' },
    { nama: 'Maghrib', kunci: 'Maghrib' },
    { nama: 'Isya',    kunci: 'Isha' }
  ];

  const now = new Date();
  const menitSekarang = now.getHours() * 60 + now.getMinutes();

  let berikutnya = null;
  for (let i = 0; i < urut.length; i++) {
    if (mjKeMenit(mjTimings[urut[i].kunci]) > menitSekarang) { berikutnya = urut[i]; break; }
  }

  let lintasHari = false;
  if (!berikutnya) { berikutnya = urut[0]; lintasHari = true; }

  // Bersihkan tanda lama, pasang tanda baru
  document.querySelectorAll('.mj-prayer').forEach(function(el){ el.classList.remove('now'); });
  const target = document.querySelector('.waktu-' + berikutnya.kunci);
  if (target) target.classList.add('now');

  // Sisa waktu
  const menitSholat = mjKeMenit(mjTimings[berikutnya.kunci]);
  let selisih = menitSholat - menitSekarang;
  if (lintasHari) selisih = (24 * 60 - menitSekarang) + menitSholat;

  const jamSisa = Math.floor(selisih / 60);
  const menitSisa = selisih % 60;
  const teksSisa = (jamSisa > 0 ? jamSisa + ' jam ' : '') + menitSisa + ' menit lagi';

  document.getElementById('mjNextBox').style.display = 'flex';
  document.getElementById('mjNextNama').textContent = berikutnya.nama;
  document.getElementById('mjNextJam').textContent = mjBersihkanJam(mjTimings[berikutnya.kunci]);
  document.getElementById('mjNextSisa').textContent = teksSisa;
}

// ==========================================================
// NAVIGASI antar modul (masjid <-> zakat)
// Versi dasar Phase 2. Deep link #zakat & integrasi penuh menyusul di Phase 7.
// ==========================================================
function bukaModulZakat() {
  document.getElementById('appMasjid').style.display = 'none';
  document.getElementById('appZakat').style.display = 'block';
  window.scrollTo(0, 0);
}
function bukaBerandaMasjid() {
  document.getElementById('appZakat').style.display = 'none';
  document.getElementById('appMasjid').style.display = 'block';
  window.scrollTo(0, 0);
}

// ==========================================================
// Aktifkan modul masjid saat halaman dimuat.
// (Pakai addEventListener, BUKAN window.onload — zakat.js sudah pakai itu.)
// ==========================================================
window.addEventListener('load', function () {
  Masjid.init();
});

