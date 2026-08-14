// ==========================================================
// masjid.js — Modul Info Masjid (Super-App Masjid Al Ikhlas)
// Phase 2: Waktu Sholat & Tanggal.
// Phase 3: Kas Masjid (saldo, ringkasan, running text, form catat).
// Phase 4: Login Takmir (kunci tombol catat kas).
// ==========================================================

// --- Konfigurasi lokasi (Lalung, Karanganyar) ---
const MJ_LAT = -7.6;
const MJ_LON = 110.95;
const MJ_METODE = 20;   // 20 = KEMENAG Indonesia

// Nama bulan Hijriah (Indonesia), dipetakan dari NOMOR bulan (1-12).
// Pakai nomor, bukan nama, agar kebal dari tanda baca khusus dari API (ī, ʿ, dst).
const MJ_BULAN = {
  1:"Muharram",     2:"Safar",         3:"Rabiul Awal",   4:"Rabiul Akhir",
  5:"Jumadil Awal", 6:"Jumadil Akhir", 7:"Rajab",         8:"Sya'ban",
  9:"Ramadhan",    10:"Syawal",       11:"Dzulqa'dah",   12:"Dzulhijjah"
};

// --- Teks pembuka running text kas ---
const MJ_TICKER_PEMBUKA = "📢 Informasi Saldo Kas Masjid Al Ikhlas";

// ==========================================================
// DAFTAR QUOTE (berganti otomatis tiap hari)
// Cara edit: tambah / hapus / ubah baris di bawah. Satu baris = satu quote.
// Jangan lupa tanda kutip di awal & akhir, dan koma di ujung tiap baris.
// ==========================================================
const MJ_QUOTES = [
  "Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai (QS. Al-Baqarah: 261)",
  "Barangsiapa membangun masjid karena Allah, Allah akan membangunkan untuknya yang serupa di surga (HR. Bukhari & Muslim)",
  "Sedekah tidak akan mengurangi harta (HR. Muslim)",
  "Tangan di atas lebih baik daripada tangan di bawah (HR. Bukhari & Muslim)",
  "Siapa yang memberi kelapangan bagi seorang mukmin, Allah akan melapangkannya di hari kiamat (HR. Muslim)",
  "Harta yang paling dicintai adalah yang diinfakkan di jalan kebaikan",
  "Bersegeralah bersedekah, sebab bala tidak dapat mendahului sedekah (HR. Baihaqi)",
  "Naungan bagi seorang mukmin di hari kiamat adalah sedekahnya (HR. Ahmad)",
  "Sesungguhnya sedekah itu memadamkan murka Tuhan (HR. Tirmidzi)",
  "Setiap kebaikan adalah sedekah (HR. Bukhari)",
  "Infakkanlah hartamu, jangan menghitung-hitungnya (HR. Bukhari)",
  "Orang yang menanggung anak yatim, ia bersamaku di surga (HR. Bukhari)",
  "Kamu tidak akan meraih kebajikan sebelum menginfakkan sebagian harta yang kamu cintai (QS. Ali Imran: 92)",
  "Allah senantiasa menolong hamba selama hamba menolong saudaranya (HR. Muslim)",
  "Sedekah paling utama adalah yang diberikan saat kamu sehat dan cinta harta (HR. Bukhari)",
  "Jauhilah api neraka walau hanya dengan bersedekah sebutir kurma (HR. Bukhari)",
  "Setiap ruas tulang manusia wajib bersedekah setiap hari (HR. Bukhari & Muslim)",
  "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain (HR. Ath-Thabrani)",
  "Apa yang ada di sisimu akan lenyap, dan apa yang ada di sisi Allah kekal (QS. An-Nahl: 96)",
  "Barangsiapa memberi makan orang berbuka, ia mendapat pahala seperti orang yang berpuasa itu (HR. Tirmidzi)",
  "Senyummu kepada saudaramu adalah sedekah (HR. Tirmidzi)",
  "Sesungguhnya yang memakmurkan masjid Allah hanyalah orang yang beriman kepada Allah dan hari akhir (QS. At-Taubah: 18)",
  "Amal yang paling dicintai Allah adalah yang paling konsisten walau sedikit (HR. Bukhari & Muslim)",
  "Siapa menunjukkan kebaikan, ia mendapat pahala seperti pelakunya (HR. Muslim)",
  "Infak di jalan Allah dilipatgandakan hingga tujuh ratus kali (QS. Al-Baqarah: 261)",
  "Doa malaikat tiap pagi: Ya Allah, berilah ganti bagi yang berinfak (HR. Bukhari & Muslim)",
  "Tidaklah harta berkurang karena sedekah, justru bertambah (HR. Tirmidzi)",
  "Mukmin yang bergaul dan sabar atas gangguan lebih baik daripada yang menyendiri (HR. Tirmidzi)",
  "Barangsiapa melapangkan kesulitan orang lain, Allah lapangkan kesulitannya (HR. Muslim)",
  "Sedekah yang paling utama adalah memberi minum (HR. Ahmad)"
];

let mjTimings = null;   // simpan waktu sholat untuk dipakai berulang (countdown)

// ==========================================================
// Titik masuk modul masjid
// ==========================================================
const Masjid = {
  init() {
    mjMuatWaktuSholat();
    mjMuatKas();                  // Phase 3
    mjTerapkanModeTakmir();       // Phase 4: sesuaikan tampilan dgn status login
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
  const namaBulan = MJ_BULAN[h.month.number] || h.month.en;
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

// Pilih quote berdasarkan HARI (berganti otomatis tiap hari, sama di semua HP).
// Caranya: hitung "hari ke-berapa dalam setahun", lalu ambil sisa bagi (modulo)
// dengan jumlah quote. Sisa bagi berputar 0,1,2,... otomatis tiap hari.
function mjQuoteHariIni() {
  const now = new Date();
  const awalTahun = new Date(now.getFullYear(), 0, 0);
  const hariKe = Math.floor((now - awalTahun) / 86400000);  // 86400000 ms = 1 hari
  const index = hariKe % MJ_QUOTES.length;
  return MJ_QUOTES[index];
}

// Bangun running text: PEMBUKA • transaksi... • QUOTE HARI INI •
// Isi digandakan 2x agar animasi berulang mulus (tanpa "sambungan").
function mjRenderTicker(riwayat) {
  const wadah = document.getElementById('mjTicker');
  const nf = new Intl.NumberFormat('id-ID');
  const titik = '<span class="mj-tdot">•</span>';

  // 1) Pembuka (pengumuman) — warna emas
  let isi = '<span class="mj-ti" style="color:#fbbf24; font-weight:800;">' + MJ_TICKER_PEMBUKA + '</span>' + titik;

  // 2) Transaksi bulan ini
  if (riwayat && riwayat.length > 0) {
    isi += riwayat.map(function (r) {
      const tanda = (r.jenis === 'masuk') ? '+' : '−';
      const kelas = (r.jenis === 'masuk') ? 'in' : 'out';
      return '<span class="mj-ti ' + kelas + '">' + r.keterangan + ' ' + tanda + nf.format(r.jumlah) + '</span>' + titik;
    }).join('');
  } else {
    isi += '<span class="mj-ti">Belum ada transaksi bulan ini</span>' + titik;
  }

  // 3) Quote hari ini (penutup) — miring & lembut
  isi += '<span class="mj-ti" style="font-style:italic; color:#d1fae5;">' + mjQuoteHariIni() + '</span>' + titik;

  wadah.innerHTML = '<div class="mj-ticker-track">' + isi + isi + '</div>';
}

// --- Form catat kas ---
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
    // Sertakan PIN takmir — backend memverifikasi sebelum menulis.
    await panggilAPI('simpanTransaksiKas', {
      jenis: jenis, jumlah: jumlah, keterangan: keterangan,
      pin: localStorage.getItem('pinTakmir')
    });
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
// LOGIN TAKMIR (Phase 4)
// Gerbang sederhana: PIN diverifikasi server, status disimpan di HP takmir.
// ==========================================================
function mjIsTakmir() {
  return !!localStorage.getItem('pinTakmir');
}

// Sesuaikan tampilan: tombol Catat Kas & label tombol login.
function mjTerapkanModeTakmir() {
  const aktif = mjIsTakmir();
  const btnCatat = document.getElementById('mjBtnCatatKas');
  if (btnCatat) btnCatat.style.display = aktif ? 'block' : 'none';
  const btnLogin = document.getElementById('mjLoginBtn');
  if (btnLogin) btnLogin.innerHTML = aktif
    ? '<i class="fa-solid fa-right-from-bracket"></i> Keluar'
    : '<i class="fa-solid fa-user-shield"></i> Takmir';
}

// Tombol Takmir: kalau sudah login → menu (ubah PIN / keluar); kalau belum → form login.
async function mjToggleTakmir() {
  if (mjIsTakmir()) {
    const r = await Swal.fire({
      title: 'Mode Takmir', icon: 'info',
      showDenyButton: true, showCancelButton: true,
      confirmButtonText: 'Ubah PIN', denyButtonText: 'Keluar', cancelButtonText: 'Tutup',
      confirmButtonColor: '#064e3b', denyButtonColor: '#ef4444'
    });
    if (r.isConfirmed) { mjUbahPinTakmir(); }
    else if (r.isDenied) {
      localStorage.removeItem('pinTakmir');
      mjTerapkanModeTakmir();
      Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Keluar mode takmir', showConfirmButton:false, timer:1800 });
    }
    return;
  }

  const { value: pin } = await Swal.fire({
    title: 'Login Takmir',
    input: 'password',
    inputLabel: 'Masukkan PIN takmir',
    inputPlaceholder: '••••',
    showCancelButton: true,
    confirmButtonText: 'Masuk',
    confirmButtonColor: '#064e3b'
  });
  if (!pin) return;

  try {
    const res = await panggilAPI('loginTakmir', { pin: pin });
    if (res.ok) {
      localStorage.setItem('pinTakmir', pin);
      mjTerapkanModeTakmir();
      Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Selamat datang, Takmir', showConfirmButton:false, timer:2000 });
    } else {
      Swal.fire({ icon:'error', title:'Gagal', text: res.pesan || 'PIN salah' });
    }
  } catch (error) {
    Swal.fire({ icon:'error', title:'Gagal', text: error.message });
  }
}

// Ubah PIN takmir (verifikasi PIN lama di server).
async function mjUbahPinTakmir() {
  const { value: form } = await Swal.fire({
    title: 'Ubah PIN Takmir',
    html:
      '<input id="mjPinLama" type="password" class="swal2-input" placeholder="PIN lama">' +
      '<input id="mjPinBaru" type="password" class="swal2-input" placeholder="PIN baru">',
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    confirmButtonColor: '#064e3b',
    preConfirm: function () {
      const lama = document.getElementById('mjPinLama').value;
      const baru = document.getElementById('mjPinBaru').value;
      if (!lama || !baru) { Swal.showValidationMessage('Kedua PIN wajib diisi'); return false; }
      return { pinLama: lama, pinBaru: baru };
    }
  });
  if (!form) return;

  try {
    const pesan = await panggilAPI('updatePinTakmir', { pinLama: form.pinLama, pinBaru: form.pinBaru });
    // PIN aktif di HP ini ikut diperbarui agar tetap bisa mencatat kas.
    localStorage.setItem('pinTakmir', form.pinBaru);
    Swal.fire({ icon:'success', title:'Berhasil', text: pesan });
  } catch (error) {
    Swal.fire({ icon:'error', title:'Gagal', text: error.message });
  }
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



