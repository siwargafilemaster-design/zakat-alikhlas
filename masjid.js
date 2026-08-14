// ==========================================================
// masjid.js — Modul Info Masjid (Super-App Masjid Al Ikhlas)
// Phase 2: Waktu Sholat & Tanggal.
// Phase 3: Kas Masjid (saldo, ringkasan, running text, form catat).
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
    mjMuatKas();                              // Phase 3
    setInterval(mjTandaiBerikutnya, 30000);
  }
};

// Format Rupiah (dipakai beberapa tempat)
function mjRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
}

// ==========================================================
// WAKTU SHOLAT & TANGGAL (Phase 2)
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

function mjTampilTanggal(data) {
  const h = data.date.hijri;
  const namaBulan = MJ_BULAN[h.month.en] || h.month.en;
  document.getElementById('mjMasehi').textContent = data.date.readable;
  document.getElementById('mjHijriId').textContent = h.day + ' ' + namaBulan + ' ' + h.year + ' H';
  document.getElementById('mjHijriAr').textContent = mjAngkaArab(h.day) + ' ' + h.month.ar + ' ' + mjAngkaArab(h.year) + ' هـ';
}

function mjAngkaArab(angka) {
  const arab = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(angka).replace(/[0-9]/g, function(d){ return arab[d]; });
}

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

function mjBersihkanJam(str) { return String(str).trim().split(' ')[0]; }
function mjKeMenit(jam) {
  const b = mjBersihkanJam(jam).split(':');
  return parseInt(b[0], 10) * 60 + parseInt(b[1], 10);
}

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

  document.querySelectorAll('.mj-prayer').forEach(function(el){ el.classList.remove('now'); });
  const target = document.querySelector('.waktu-' + berikutnya.kunci);
  if (target) target.classList.add('now');

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
// KAS MASJID (Phase 3)
// Memakai panggilAPI() milik zakat.js (fungsi global, sudah dimuat lebih dulu).
// ==========================================================
async function mjMuatKas() {
  try {
    const kas = await panggilAPI('getKasMasjid');
    document.getElementById('mjSaldo').textContent = mjRupiah(kas.saldoTotal);
    document.getElementById('mjSaldoAwal').textContent = mjRupiah(kas.saldoAwalBulan);
    document.getElementById('mjMasuk').textContent = '+' + mjRupiah(kas.bulanMasuk);
    document.getElementById('mjKeluar').textContent = '−' + mjRupiah(kas.bulanKeluar);
    mjRenderTicker(kas.riwayat);
  } catch (error) {
    const s = document.getElementById('mjSaldo');
    if (s) s.textContent = 'Gagal memuat';
  }
}

// Bangun running text (teks berjalan) dari daftar transaksi bulan ini.
// Isi digandakan 2x agar animasi berulang mulus (tanpa "sambungan").
function mjRenderTicker(riwayat) {
  const wadah = document.getElementById('mjTicker');
  if (!riwayat || riwayat.length === 0) {
    wadah.innerHTML = '<div class="mj-ticker-track" style="padding:0 14px;">Belum ada transaksi bulan ini.</div>';
    return;
  }
  const nf = new Intl.NumberFormat('id-ID');
  const satu = riwayat.map(function(r) {
    const tanda = (r.jenis === 'masuk') ? '+' : '−';
    const kelas = (r.jenis === 'masuk') ? 'in' : 'out';
    return '<span class="mj-ti ' + kelas + '">' + r.keterangan + ' ' + tanda + nf.format(r.jumlah) + '</span>'
         + '<span class="mj-tdot">•</span>';
  }).join('');
  wadah.innerHTML = '<div class="mj-ticker-track">' + satu + satu + '</div>';
}

// --- Form catat kas (sementara terbuka; dikunci login takmir di Phase 4) ---
function mjBukaFormKas() {
  document.getElementById('mjFormOv').classList.add('on');
  document.getElementById('mjForm').classList.add('on');
}
function mjTutupFormKas() {
  document.getElementById('mjFormOv').classList.remove('on');
  document.getElementById('mjForm').classList.remove('on');
}
async function mjSubmitKas() {
  const jenis = document.getElementById('mjJenis').value;
  const jumlah = document.getElementById('mjJumlah').value;
  const keterangan = document.getElementById('mjKet').value;
  if (!jumlah || !keterangan) {
    Swal.fire({ toast:true, position:'top-end', icon:'warning', title:'Jumlah & keterangan wajib diisi', showConfirmButton:false, timer:2000 });
    return;
  }
  const btn = document.getElementById('mjBtnSave');
  btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    await panggilAPI('simpanTransaksiKas', { jenis: jenis, jumlah: jumlah, keterangan: keterangan });
    mjTutupFormKas();
    document.getElementById('mjJumlah').value = '';
    document.getElementById('mjKet').value = '';
    mjMuatKas();  // segarkan saldo & running text
    Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Transaksi tersimpan', showConfirmButton:false, timer:2000 });
  } catch (error) {
    Swal.fire({ icon:'error', title:'Gagal', text: error.message });
  }
  btn.disabled = false; btn.textContent = 'Simpan';
}

// ==========================================================
// NAVIGASI antar modul (masjid <-> zakat)
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


