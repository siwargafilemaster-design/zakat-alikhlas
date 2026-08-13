// ==========================================
// KONFIGURASI API (JEMBATAN KE APPSCRIPT)
// ==========================================
const URL_API = "https://script.google.com/macros/s/AKfycbyGI36OLej6uyib5fPVegZPRJi9y7_Vh0mYcF-0jSskH8oLm7OmDp8hSiAAlSQZU1Ez/exec";

async function panggilAPI(action, ...args) {
  const res = await fetch(URL_API, {
    method: "POST",
    body: JSON.stringify({ action: action, args: args })
  });
  const json = await res.json();
  if (json.status === "error") throw new Error(json.message);
  return json.data;
}

// ==========================================
// ONLOAD
// ==========================================
window.onload = function() {
  setupDropdownTahun();
  muatDataPublik();

  if (localStorage.getItem('zakatLogin') === 'true') {
    document.getElementById('viewPublik').classList.remove('active');
    document.getElementById('btnNavLogin').style.display = 'none';
    document.getElementById('btnNavLogout').style.display = 'inline-block';
    document.getElementById('viewPanitia').classList.add('active');

    muatTabelMustahik();
    muatTabelBelanja();
    aturFormBelanja();

    panggilAPI('getKonfigurasi').then(function(conf) {
      globalConfig = conf;
      document.getElementById('hargaBeliBeras').value = conf.hargaBeras;
      kalkulasiZakat();
      generateRincianNama();
      // Default: tampilkan Beranda
      bukaTab('tabBeranda', document.getElementById('btnTabBeranda'));
    }).catch(function(err) {
      console.error('Gagal ambil konfigurasi:', err);
    });
  }
};

function setupDropdownTahun() {
  var selectPublik = document.getElementById('pilihTahun');
  var selectPanitia = document.getElementById('pilihTahunPanitia');
  var tahunSekarang = new Date().getFullYear();
  var options = "";
  for (var i = tahunSekarang - 3; i <= tahunSekarang + 1; i++) {
    var selected = (i === tahunSekarang) ? "selected" : "";
    options += `<option value="${i}" ${selected}>${i}</option>`;
  }
  if (selectPublik) selectPublik.innerHTML = options;
  if (selectPanitia) selectPanitia.innerHTML = options;
}

// ==========================================
// MESIN WAKTU (UBAH TAHUN PANITIA)
// ==========================================
function ubahTahunPanitia() {
  var tahunDipilih = document.getElementById('pilihTahunPanitia').value;
  if (typeof globalConfig !== 'undefined') globalConfig.tahunAktif = tahunDipilih;

  if (typeof muatBerandaPanitia === 'function') muatBerandaPanitia();
  if (typeof muatDataPenyerahan === 'function') muatDataPenyerahan();
  if (typeof muatTabelMustahik === 'function') muatTabelMustahik();
  if (typeof muatTabelBelanja === 'function') muatTabelBelanja();

  Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Menampilkan data tahun ' + tahunDipilih, showConfirmButton: false, timer: 1500 });
}

function muatDataPublik() {
  var tahunDipilih = document.getElementById('pilihTahun').value;
  if (window._publikSiap) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Memuat data tahun ' + tahunDipilih, showConfirmButton: false, timer: 1500 });
  }
  window._publikSiap = true;
  document.getElementById('tabelMuzakki').innerHTML = '<div class="empty-hint">Memuat data...</div>';
  document.getElementById('tabelTersalurkan').innerHTML = '<div class="empty-hint">Memuat data...</div>';

  panggilAPI('getLaporanZakat', tahunDipilih)
    .then(updateUIWarga)
    .catch(function(error) {
      document.getElementById('tabelMuzakki').innerHTML = '<div class="empty-hint" style="color:#ef4444;">Gagal memuat data: ' + error.message + '</div>';
      document.getElementById('tabelTersalurkan').innerHTML = '<div class="empty-hint" style="color:#ef4444;">Gagal memuat data.</div>';
    });
}

// ==========================================
// RENDER PUBLIK (KARTU + BOTTOM SHEET)
// ==========================================
function updateUIWarga(data) {
  var berasBersih = parseFloat(data.beras.toFixed(2));
  document.getElementById('valBeras').innerHTML = berasBersih.toString().replace('.', ',') + ' <span class="satuan">Kg</span>';
  document.getElementById('valUang').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.uang);
  document.getElementById('valMuzakki').innerText = data.totalJiwa + " Jiwa";
  document.getElementById('valTersalurkan').innerText = data.berasTersalurkan.toFixed(2) + " Kg";

  window._muzakki = data.listMuzakki || [];
  window._tersalur = data.listTersalurkan || [];

  var elM = document.getElementById('tabelMuzakki');
  if (!data.listMuzakki || data.listMuzakki.length === 0) {
    elM.innerHTML = '<div class="empty-hint">Belum ada data penerimaan zakat di tahun ini.</div>';
  } else {
    elM.innerHTML = data.listMuzakki.map(function(row, i) {
      var qty = row.bentuk === "Uang" ?
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(row.jumlah) :
        (row.jumlah.toString().replace('.', ',') + " Kg");
      var warna = (row.jenis === "Infaq") ? "#2f80ed" : "#11998e";
      var subInfo = row.jenis + (row.jiwa > 0 ? " · " + row.jiwa + " jiwa" : "");
      return (
        '<div class="rowcard" onclick="bukaDetailMuzakki(' + i + ')">' +
          '<div class="who"><div class="avatar">' + inisial(row.nama) + '</div>' +
            '<div class="txt"><b>' + row.nama + '</b><small>' + subInfo + '</small></div></div>' +
          '<div class="right"><div class="amt"><b style="color:' + warna + '">' + qty + '</b><small>' + row.bentuk + '</small></div>' +
            '<i class="fa-solid fa-chevron-right chev"></i></div>' +
        '</div>'
      );
    }).join('');
  }

  var elT = document.getElementById('tabelTersalurkan');
  if (!data.listTersalurkan || data.listTersalurkan.length === 0) {
    elT.innerHTML = '<div class="empty-hint">Belum ada data penyaluran kepada Mustahik.</div>';
  } else {
    elT.innerHTML = data.listTersalurkan.map(function(row, i) {
      var namaSensor = sensorNama(row.nama);
      return (
        '<div class="rowcard" onclick="bukaDetailTersalur(' + i + ')">' +
          '<div class="who"><div class="avatar">' + inisial(namaSensor) + '</div>' +
            '<div class="txt"><b>' + namaSensor + '</b><small>' + row.tanggal + '</small></div></div>' +
          '<div class="right"><div class="amt"><b style="color:var(--secondary)">' + row.jumlah + ' Kg</b><small>Beras</small></div>' +
            '<i class="fa-solid fa-chevron-right chev"></i></div>' +
        '</div>'
      );
    }).join('');
  }
}

// ---- Helper inisial avatar ----
function inisial(nama) {
  if (!nama) return "?";
  var p = nama.trim().split(/\s+/);
  if (p.length === 1) return p[0].substring(0, 2).toUpperCase();
  return (p[0][0] + p[1][0]).toUpperCase();
}

// ---- Kontrol Bottom Sheet ----
function bukaSheet(html) {
  document.getElementById('sheetIsi').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('show');
  document.getElementById('sheetDetail').classList.add('show');
}
function tutupSheet() {
  document.getElementById('sheetOverlay').classList.remove('show');
  document.getElementById('sheetDetail').classList.remove('show');
}

// ---- Detail Muzakki (Publik) ----
function bukaDetailMuzakki(i) {
  var row = (window._muzakki || [])[i];
  if (!row) return;
  var qty = row.bentuk === "Uang" ?
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(row.jumlah) :
    (row.jumlah.toString().replace('.', ',') + " Kg");
  var html =
    '<div class="s-head"><div class="avatar">' + inisial(row.nama) + '</div>' +
      '<div><b>' + row.nama + '</b><small>Detail Penyetoran Zakat</small></div></div>' +
    '<div class="kv"><span>Tanggal</span><b>' + row.tanggal + '</b></div>' +
    '<div class="kv"><span>Jenis</span><b>' + row.jenis + '</b></div>' +
    '<div class="kv"><span>Bentuk</span><b>' + row.bentuk + '</b></div>' +
    '<div class="kv"><span>Jumlah</span><b>' + qty + '</b></div>';
  if (row.jenis === "Zakat Fitrah" && row.jiwa > 0 && row.rincian) {
    var namaJiwa = row.rincian.split(/\n/).map(function(s){ return s.replace(/^[0-9]+\.\s*/, '').trim(); }).filter(Boolean);
    if (namaJiwa.length) {
      html += '<div class="jiwa-title">Ditunaikan untuk ' + row.jiwa + ' jiwa</div>';
      html += namaJiwa.map(function(n){ return '<div class="jiwa"><i class="fa-solid fa-user"></i> ' + n + '</div>'; }).join('');
    }
  }
  bukaSheet(html);
}

// ---- Detail Tersalurkan (Publik) ----
function bukaDetailTersalur(i) {
  var row = (window._tersalur || [])[i];
  if (!row) return;
  var namaSensor = sensorNama(row.nama);
  var html =
    '<div class="s-head"><div class="avatar">' + inisial(namaSensor) + '</div>' +
      '<div><b>' + namaSensor + '</b><small>Detail Penyaluran</small></div></div>' +
    '<div class="kv"><span>Tanggal Diserahkan</span><b>' + row.tanggal + '</b></div>' +
    '<div class="kv"><span>Beras Diberikan</span><b>' + row.jumlah + ' Kg</b></div>';
  bukaSheet(html);
}

// ==========================================
// PENCARIAN (pintar: kartu atau tabel)
// ==========================================
function cariTabel(inputId, tbodyId) {
  var input = document.getElementById(inputId).value.toLowerCase();
  var wadah = document.getElementById(tbodyId);
  if (!wadah) return;

  var kartu = wadah.getElementsByClassName('rowcard');
  if (kartu.length > 0 || wadah.classList.contains('list-cards')) {
    for (var k = 0; k < kartu.length; k++) {
      var nama = (kartu[k].querySelector('.who b') || {}).textContent || "";
      var cocok = nama.toLowerCase().indexOf(input) > -1;
      kartu[k].style.display = cocok ? "" : "none";
      kartu[k].style.background = (cocok && input !== "") ? "#fef9c3" : "";
    }
    return;
  }

  var rows = wadah.getElementsByTagName('tr');
  for (var i = 0; i < rows.length; i++) {
    var tdNama = rows[i].getElementsByTagName('td')[1];
    if (tdNama) {
      var teksNama = tdNama.textContent || tdNama.innerText;
      if (teksNama.toLowerCase().indexOf(input) > -1) {
        rows[i].style.display = "";
        if (input !== "") rows[i].classList.add("highlight-row"); else rows[i].classList.remove("highlight-row");
      } else {
        rows[i].style.display = "none"; rows[i].classList.remove("highlight-row");
      }
    }
  }
}

// ==========================================
// MODAL LOGIN
// ==========================================
function bukaModalLogin() {
  document.getElementById('modalLogin').classList.add('active');
  document.getElementById('inputPin').focus();
}
function tutupModalLogin() {
  document.getElementById('modalLogin').classList.remove('active');
  document.getElementById('inputPin').value = '';
  document.getElementById('msgLogin').innerText = '';
}

// ==========================================
// NAVIGASI TAB
// ==========================================
function bukaTab(tabId, element) {
  var contents = document.getElementsByClassName('tab-content');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
  var btns = document.getElementsByClassName('tab-btn');
  for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');

  document.getElementById(tabId).classList.add('active');
  if (element) element.classList.add('active');

  if (tabId === 'tabPenerima') muatDataPenyerahan();
  else if (tabId === 'tabBeranda') muatBerandaPanitia();
  else if (tabId === 'tabPengaturan') muatPengaturan();
}

// ==========================================
// LAYAR CATAT ZAKAT (overlay penuh)
// ==========================================
function bukaCatat() {
  document.getElementById('layarCatat').classList.add('show');
  if (globalConfig && globalConfig.uangFitrah) { kalkulasiZakat(); generateRincianNama(); }
}
function tutupCatat() {
  document.getElementById('layarCatat').classList.remove('show');
}

// ==========================================
// VARIABEL GLOBAL & ALERT
// ==========================================
var globalConfig = {};

function tampilAlert(id, pesan, tipe) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerText = pesan;
  el.className = "alert " + tipe;
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}

// ==========================================
// FORM: CATAT ZAKAT & RINCIAN NAMA
// ==========================================
function generateRincianNama() {
  var jumlah = parseInt(document.getElementById('jumlahJiwa').value) || 1;
  var wadah = document.getElementById('listRincian');
  var kontainer = document.getElementById('containerRincian');
  var namaKK = document.getElementById('namaKK').value;

  var jenis = document.getElementById('jenisZakat').value;
  if (jenis !== "Zakat Fitrah" && jenis !== "Fidyah") { kontainer.classList.remove('active'); return; }

  kontainer.classList.add('active');
  wadah.innerHTML = '';
  for (var i = 1; i <= jumlah; i++) {
    var defaultVal = (i === 1 && namaKK !== "") ? namaKK : "";
    wadah.innerHTML += `
      <div class="rincian-item">
        <input type="text" class="input-rincian" placeholder="Nama Anggota Ke-${i}" value="${defaultVal}" required>
      </div>`;
  }
}

document.getElementById('namaKK').addEventListener('input', function() {
  var rincianInputs = document.getElementsByClassName('input-rincian');
  if (rincianInputs.length > 0) rincianInputs[0].value = this.value;
});

function kalkulasiZakat() {
  var jenis = document.getElementById('jenisZakat').value;
  var bentuk = document.getElementById('bentukZakat').value;
  var jumlah = parseInt(document.getElementById('jumlahJiwa').value) || 1;
  var elTotal = document.getElementById('totalDibayar');
  var elGrupJiwa = document.getElementById('grupJumlahJiwa');
  var labelJiwa = elGrupJiwa.querySelector('label');
  var elHint = document.getElementById('hintHitung');

  if (!globalConfig.uangFitrah) return;

  if (jenis === "Zakat Fitrah") {
    elGrupJiwa.style.display = 'block';
    labelJiwa.innerText = "Jumlah Jiwa (Tanggungan)";
    if (document.getElementById('containerRincian')) document.getElementById('containerRincian').style.display = 'block';
    generateRincianNama();
    var tarifUang = globalConfig.uangFitrah;
    var tarifBeras = globalConfig.berasFitrah;
    elTotal.value = bentuk === "Uang" ? jumlah * tarifUang : (jumlah * tarifBeras).toFixed(2);
    elHint.innerHTML = "<i>*Tarif Zakat: " + (bentuk === "Uang" ? "Rp " + tarifUang : tarifBeras + " Kg") + " / jiwa</i>";
    elHint.style.display = 'block';
  } else if (jenis === "Fidyah") {
    elGrupJiwa.style.display = 'block';
    labelJiwa.innerText = "Jumlah Hari (Hutang Puasa)";
    if (document.getElementById('containerRincian')) document.getElementById('containerRincian').style.display = 'none';
    var rincianInputs = document.getElementsByClassName('input-rincian');
    for (var i = 0; i < rincianInputs.length; i++) rincianInputs[i].required = false;
    elTotal.readOnly = false;
    elHint.style.display = 'block';
    var tarifFidyahUang = globalConfig.fidyahUang || 0;
    var tarifFidyahBeras = globalConfig.fidyahBeras || 0;
    elTotal.value = bentuk === "Uang" ? jumlah * tarifFidyahUang : (jumlah * tarifFidyahBeras).toFixed(2);
    elHint.innerHTML = "<i>*Berdasarkan tarif Fidyah: " + (bentuk === "Uang" ? "Rp " + tarifFidyahUang : tarifFidyahBeras + " Kg") + " / hari</i>";
  } else {
    elGrupJiwa.style.display = 'none';
    if (document.getElementById('containerRincian')) document.getElementById('containerRincian').style.display = 'none';
    var rincianInputs2 = document.getElementsByClassName('input-rincian');
    for (var j = 0; j < rincianInputs2.length; j++) rincianInputs2[j].required = false;
    elTotal.readOnly = false;
    elTotal.value = '';
    elTotal.placeholder = "Ketik nominal " + (bentuk === "Uang" ? "Rupiah" : "Kg") + " di sini";
    elHint.style.display = 'none';
  }
  deteksiInfaqOtomatis();
}

function deteksiInfaqOtomatis() {
  var jenis = document.getElementById('jenisZakat').value;
  var bentuk = document.getElementById('bentukZakat').value;
  var jumlahJiwa = parseInt(document.getElementById('jumlahJiwa').value) || 0;
  var nominalInput = parseFloat(document.getElementById('totalDibayar').value) || 0;
  var elHint = document.getElementById('hintHitung');

  if (jenis === "Zakat Fitrah" && bentuk === "Uang") {
    var kewajiban = jumlahJiwa * globalConfig.uangFitrah;
    if (nominalInput > kewajiban) {
      var selisih = nominalInput - kewajiban;
      elHint.innerHTML = `<b style="color: #11998e;">✓ Zakat: Rp ${kewajiban.toLocaleString('id-ID')}</b><br>` +
                         `<b style="color: #2f80ed;">✓ Infaq: Rp ${selisih.toLocaleString('id-ID')}</b>`;
      document.getElementById('totalDibayar').setAttribute('data-infaq', selisih);
    } else {
      document.getElementById('totalDibayar').setAttribute('data-infaq', 0);
    }
  }
}

document.getElementById('totalDibayar').addEventListener('input', deteksiInfaqOtomatis);

function submitZakat(e) {
  e.preventDefault();
  var btn = document.getElementById('btnSubmitZakat');
  btn.disabled = true; btn.innerText = "Memproses & Mengirim WA...";

  var rincianArr = [];
  var rincianInputs = document.getElementsByClassName('input-rincian');
  for (var i = 0; i < rincianInputs.length; i++) rincianArr.push(rincianInputs[i].value);

  var nominalTotal = document.getElementById('totalDibayar').value;
  var nilaiInfaq = document.getElementById('totalDibayar').getAttribute('data-infaq') || 0;

  var dataZakat = {
    namaKK: document.getElementById('namaKK').value,
    noWa: document.getElementById('noWa').value,
    jenisZakat: document.getElementById('jenisZakat').value,
    bentukZakat: document.getElementById('bentukZakat').value,
    jumlahJiwa: (document.getElementById('jenisZakat').value === 'Zakat Fitrah' || document.getElementById('jenisZakat').value === 'Fidyah') ? document.getElementById('jumlahJiwa').value : 0,
    rincianNama: rincianArr,
    totalDibayar: nominalTotal,
    nominalInfaq: nilaiInfaq
  };

  panggilAPI('simpanZakat', dataZakat)
    .then(function(res) {
      document.getElementById('formZakat').reset();
      kalkulasiZakat();
      btn.disabled = false; btn.innerText = "Simpan & Kirim Resi WA";
      tutupCatat();
      if (typeof muatBerandaPanitia === 'function') muatBerandaPanitia();
      Swal.fire({ toast:true, position:'top-end', icon:'success', title:res.message, showConfirmButton:false, timer:2600 });
    })
    .catch(function(err) {
      tampilAlert('alertZakat', 'Gagal: ' + err.message, 'error');
      btn.disabled = false; btn.innerText = "Simpan & Kirim Resi WA";
    });
}

// ==========================================
// FORM: MUSTAHIK & PENYERAHAN
// ==========================================
function submitMustahik(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button');
  btn.disabled = true; btn.innerText = "Menyimpan...";
  var data = { nama: document.getElementById('namaMustahik').value, alamat: document.getElementById('alamatMustahik').value };

  panggilAPI('simpanPenerimaBaru', data)
    .then(function(msg) {
      tampilAlert('alertMustahik', msg, 'success');
      document.getElementById('formMustahik').reset();
      btn.disabled = false; btn.innerText = "Simpan Calon Mustahik";
      muatDataPenyerahan();
      muatTabelMustahik();
    })
    .catch(function(err) {
      tampilAlert('alertMustahik', 'Gagal: ' + err.message, 'error');
      btn.disabled = false; btn.innerText = "Simpan Calon Mustahik";
    });
}

function muatDataPenyerahan() {
  var tahunAktif = typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString();
  var tahunSekarang = new Date().getFullYear().toString();
  var isMasaLalu = (tahunAktif !== tahunSekarang);

  var dropdown = document.getElementById('pilihMustahik');
  var inputBeras = document.getElementById('jatahBerasFinal');
  var btnSerah = document.querySelector('#formPenyerahan button');
  var btnMustahik = document.querySelector('#formMustahik button');

  if (isMasaLalu) {
    dropdown.innerHTML = '<option value="">-- Terkunci (Mode Riwayat) --</option>';
    dropdown.disabled = true;
    inputBeras.value = "0"; inputBeras.readOnly = true;
    if (btnSerah) { btnSerah.disabled = true; btnSerah.innerText = "Terkunci (Data Masa Lalu)"; btnSerah.style.backgroundColor = "#94a3b8"; }
    if (btnMustahik) { btnMustahik.disabled = true; btnMustahik.innerText = "Terkunci (Data Masa Lalu)"; btnMustahik.style.backgroundColor = "#94a3b8"; }
    return;
  } else {
    dropdown.disabled = false; inputBeras.readOnly = false;
    if (btnSerah) { btnSerah.disabled = false; btnSerah.innerText = "Konfirmasi Diserahkan"; btnSerah.style.backgroundColor = "var(--primary)"; }
    if (btnMustahik) { btnMustahik.disabled = false; btnMustahik.innerText = "Simpan Calon Mustahik"; btnMustahik.style.backgroundColor = "var(--primary)"; }
  }

  dropdown.innerHTML = '<option value="">-- Memuat data... --</option>';
  inputBeras.value = "Menghitung...";

  panggilAPI('getDaftarPenerima', "Belum Diserahkan", tahunAktif).then(function(list) {
    if (list.length === 0) {
      dropdown.innerHTML = '<option value="">-- Semua Mustahik Sudah Menerima --</option>';
    } else {
      dropdown.innerHTML = '<option value="">-- Pilih Nama --</option>';
      list.forEach(function(item) { dropdown.innerHTML += `<option value="${item.id}">${item.nama} (${item.alamat})</option>`; });
    }
  }).catch(function(err) { dropdown.innerHTML = '<option value="">-- Gagal memuat --</option>'; });

  panggilAPI('getSaranPembagian', tahunAktif).then(function(saran) {
    inputBeras.value = saran.saranBeras;
  }).catch(function(err) { inputBeras.value = "0"; });
}

function submitPenyerahan(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button');
  btn.disabled = true; btn.innerText = "Mengeksekusi...";

  var data = {
    idPenerima: document.getElementById('pilihMustahik').value,
    jatahBerasFinal: document.getElementById('jatahBerasFinal').value,
    tahunAktif: typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString()
  };

  panggilAPI('prosesPenyerahanZakat', data)
    .then(function(msg) {
      tampilAlert('alertPenyerahan', msg, 'success');
      btn.disabled = false; btn.innerText = "Konfirmasi Diserahkan";
      muatDataPenyerahan(); muatTabelMustahik(); muatBerandaPanitia();
    })
    .catch(function(error) {
      tampilAlert('alertPenyerahan', 'Gagal: ' + error.message, 'danger');
      btn.disabled = false; btn.innerText = "Konfirmasi Diserahkan";
    });
}

// ==========================================
// DAFTAR MUSTAHIK (KARTU + SHEET AKSI)
// ==========================================
function muatTabelMustahik() {
  var tbody = document.getElementById('bodyTabelMustahik');
  var btnRefresh = document.getElementById('btnRefreshMustahik');
  if (btnRefresh) { btnRefresh.disabled = true; btnRefresh.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  tbody.innerHTML = '<div class="empty-hint"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data master...</div>';
  var tahunAktif = typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString();

  panggilAPI('getDaftarMasterMustahik', tahunAktif)
    .then(function(data) {
      if (btnRefresh) { btnRefresh.disabled = false; btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>'; }

      window._mustahik = data || [];
      window._mustahikMasaLalu = (tahunAktif !== new Date().getFullYear().toString());

      if (data.length === 0) {
        tbody.innerHTML = '<div class="empty-hint">Belum ada data master mustahik. Silakan input di atas.</div>';
        return;
      }

      tbody.innerHTML = data.map(function(item, index) {
        var sudah = /Sudah|✅/.test(item.statusHtml || "");
        var pill = sudah ? '<span class="badge-status st-sudah">Sudah</span>' : '<span class="badge-status st-belum">Belum</span>';
        return (
          '<div class="rowcard" onclick="bukaDetailMustahik(' + index + ')">' +
            '<div class="who"><div class="avatar">' + inisial(item.nama) + '</div>' +
              '<div class="txt"><b>' + item.nama + '</b><small>' + item.alamat + '</small></div></div>' +
            '<div class="right">' + pill + '<i class="fa-solid fa-chevron-right chev"></i></div>' +
          '</div>'
        );
      }).join('');
    })
    .catch(function(error) {
      if (btnRefresh) { btnRefresh.disabled = false; btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>'; }
      tbody.innerHTML = '<div class="empty-hint" style="color:#ef4444;">Gagal memuat data: ' + error.message + '</div>';
    });
}

function bukaDetailMustahik(i) {
  var item = (window._mustahik || [])[i];
  if (!item) return;
  var sudah = /Sudah|✅/.test(item.statusHtml || "");
  var pill = sudah ? '<span class="badge-status st-sudah">Sudah Diserahkan</span>' : '<span class="badge-status st-belum">Belum Menerima</span>';

  var html =
    '<div class="s-head"><div class="avatar">' + inisial(item.nama) + '</div>' +
      '<div><b>' + item.nama + '</b><small>Data Mustahik</small></div></div>' +
    '<div class="kv"><span>Alamat / RT</span><b>' + item.alamat + '</b></div>' +
    '<div class="kv"><span>Jatah Beras</span><b>' + item.jatah + ' Kg</b></div>' +
    '<div class="kv"><span>Status</span><b>' + pill + '</b></div>';

  if (!window._mustahikMasaLalu) {
    var namaAman = (item.nama || '').replace(/'/g, "\\'");
    var alamatAman = (item.alamat || '').replace(/'/g, "\\'");
    html +=
      '<div class="sheet-actions">' +
        '<button class="act-edit" onclick="tutupSheet(); editMustahik(\'' + item.id + '\',' + item.baris + ',\'' + namaAman + '\',\'' + alamatAman + '\')"><i class="fa-solid fa-pen"></i> Edit</button>' +
        '<button class="act-del" onclick="tutupSheet(); hapusMustahik(\'' + item.id + '\',' + item.baris + ')"><i class="fa-solid fa-trash"></i> Hapus</button>' +
      '</div>';
  } else {
    html += '<div class="empty-hint" style="margin-top:10px;">Mode riwayat — aksi terkunci.</div>';
  }
  bukaSheet(html);
}

// ==========================================
// FORM: BELANJA BERAS (KONVERSI)
// ==========================================
function aturFormBelanja() {
  var kategori = document.getElementById("kategoriBelanja").value;
  var sectionBeras = document.getElementById("sectionBeras");
  var judul = document.getElementById("judulBelanja");
  var deskripsi = document.getElementById("deskripsiBelanja");
  var ketInput = document.getElementById("ketBelanja");
  var hargaInput = document.getElementById("hargaBeliBeras");
  var berasInput = document.getElementById("berasDidapat");

  ketInput.readOnly = false;
  ketInput.style.backgroundColor = "#ffffff";

  if (kategori === "Beras") {
    judul.innerHTML = "Konversi Uang ke Beras";
    deskripsi.innerHTML = "Catat pembelian stok beras dari uang zakat.";
    sectionBeras.style.display = "block";
    hargaInput.required = true;
    ketInput.placeholder = "Cth: Beli Beras di Agen Sembako Lalung";
    ketInput.value = "";
  } else if (kategori === "Setor") {
    judul.innerHTML = "Penyerahan Sisa Saldo (Tutup Buku)";
    deskripsi.innerHTML = "Menolkan saldo Panitia & menyerahkan sisa dana ke Kas Masjid.";
    sectionBeras.style.display = "none";
    hargaInput.required = false;
    ketInput.value = "Penyerahan Infaq ke Masjid (Tutup Buku)";
    ketInput.readOnly = true;
    ketInput.style.backgroundColor = "#f1f5f9";
    hargaInput.value = ""; berasInput.value = 0;
  } else {
    judul.innerHTML = "Pencatatan Belanja Operasional";
    deskripsi.innerHTML = "Catat pengeluaran selain beras (plastik, ATK, konsumsi, dll).";
    sectionBeras.style.display = "none";
    hargaInput.required = false;
    ketInput.placeholder = "Cth: Beli Plastik 5 Pack di Toko Berkah";
    ketInput.value = "";
    hargaInput.value = ""; berasInput.value = 0;
  }
}

function kalkulasiBelanja() {
  var kategori = document.getElementById("kategoriBelanja").value;
  if (kategori !== "Beras") return;
  var uang = parseFloat(document.getElementById("uangDipakai").value) || 0;
  var harga = parseFloat(document.getElementById("hargaBeliBeras").value) || 0;
  var inputBeras = document.getElementById("berasDidapat");
  inputBeras.value = harga > 0 ? (uang / harga).toFixed(2) : 0;
}

function submitBelanja(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button');
  btn.disabled = true; btn.innerText = "Mencatat & Mengunggah...";

  var fileInput = document.getElementById('strukBelanja');
  var file = fileInput.files[0];

  var data = {
    nominalUang: document.getElementById('uangDipakai').value,
    hargaBeli: document.getElementById('hargaBeliBeras').value,
    totalBerasDidapat: document.getElementById('berasDidapat').value,
    keterangan: document.getElementById('ketBelanja').value,
    namaFile: "", fileTipe: "", fileBase64: ""
  };

  if (file) {
    var reader = new FileReader();
    reader.onload = function(event) {
      data.fileBase64 = event.target.result.split(',')[1];
      data.namaFile = file.name;
      data.fileTipe = file.type;
      kirimDataBelanjaKeServer(data, btn);
    };
    reader.readAsDataURL(file);
  } else {
    kirimDataBelanjaKeServer(data, btn);
  }
}

function kirimDataBelanjaKeServer(data, btn) {
  panggilAPI('simpanBelanjaBeras', data)
    .then(function(msg) {
      tampilAlert('alertBelanja', msg, 'success');
      document.getElementById('formBelanja').reset();
      if (typeof globalConfig !== 'undefined' && globalConfig.hargaBeras) document.getElementById('hargaBeliBeras').value = globalConfig.hargaBeras;
      btn.disabled = false; btn.innerText = "Simpan Catatan Belanja";
      if (typeof muatBerandaPanitia === 'function') muatBerandaPanitia();
      if (typeof muatTabelBelanja === 'function') muatTabelBelanja();
      if (typeof aturFormBelanja === 'function') aturFormBelanja();
    })
    .catch(function(error) {
      tampilAlert('alertBelanja', 'Gagal: ' + error.message, 'danger');
      btn.disabled = false; btn.innerText = "Simpan Catatan Belanja";
    });
}

// ==========================================
// BERANDA PANITIA (KARTU + SHEET)
// ==========================================
function muatBerandaPanitia() {
  document.getElementById('adminValBeras').innerHTML = "Memuat...";
  document.getElementById('adminValUang').innerHTML = "Memuat...";
  document.getElementById('adminValMuzakki').innerHTML = "Memuat...";
  document.getElementById('adminValTersalurkan').innerHTML = "Memuat...";
  document.getElementById('adminTabelMuzakki').innerHTML = '<div class="empty-hint">Memuat data...</div>';
  document.getElementById('adminTabelTersalurkan').innerHTML = '<div class="empty-hint">Memuat data...</div>';

  var tahunAktif = globalConfig.tahunAktif || new Date().getFullYear();

  panggilAPI('getLaporanZakat', tahunAktif)
    .then(function(data) {
      var berasBersih = parseFloat(data.beras.toFixed(2));
      var salurBersih = parseFloat(data.berasTersalurkan.toFixed(2));

      document.getElementById('adminValBeras').innerHTML = berasBersih.toString().replace('.', ',') + ' <span class="satuan">Kg</span>';
      document.getElementById('adminValUang').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.uang);
      document.getElementById('adminValMuzakki').innerHTML = data.totalJiwa + ' <span class="satuan">Jiwa</span>';
      document.getElementById('adminValTersalurkan').innerHTML = salurBersih.toString().replace('.', ',') + ' <span class="satuan">Kg</span>';

      window._admMuzakki = data.listMuzakki || [];
      var elAM = document.getElementById('adminTabelMuzakki');
      if (!data.listMuzakki || data.listMuzakki.length === 0) {
        elAM.innerHTML = '<div class="empty-hint">Belum ada data penerimaan zakat.</div>';
      } else {
        elAM.innerHTML = data.listMuzakki.map(function(row, i) {
          var qty = row.bentuk === "Uang" ?
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(row.jumlah) :
            (row.jumlah.toString().replace('.', ',') + " Kg");
          var warna = (row.jenis === "Infaq") ? "#2f80ed" : "#11998e";
          var subInfo = row.jenis + (row.jiwa > 0 ? " · " + row.jiwa + " jiwa" : "");
          return (
            '<div class="rowcard" onclick="bukaDetailAdmMuzakki(' + i + ')">' +
              '<div class="who"><div class="avatar">' + inisial(row.nama) + '</div>' +
                '<div class="txt"><b>' + row.nama + '</b><small>' + subInfo + '</small></div></div>' +
              '<div class="right"><div class="amt"><b style="color:' + warna + '">' + qty + '</b><small>' + row.bentuk + '</small></div>' +
                '<i class="fa-solid fa-chevron-right chev"></i></div>' +
            '</div>'
          );
        }).join('');
      }

      window._admTersalur = data.listTersalurkan || [];
      var elAT = document.getElementById('adminTabelTersalurkan');
      if (!data.listTersalurkan || data.listTersalurkan.length === 0) {
        elAT.innerHTML = '<div class="empty-hint">Belum ada data penyaluran.</div>';
      } else {
        elAT.innerHTML = data.listTersalurkan.map(function(row, i) {
          return (
            '<div class="rowcard" onclick="bukaDetailAdmTersalur(' + i + ')">' +
              '<div class="who"><div class="avatar">' + inisial(row.nama) + '</div>' +
                '<div class="txt"><b>' + row.nama + '</b><small>' + row.tanggal + '</small></div></div>' +
              '<div class="right"><div class="amt"><b style="color:var(--secondary)">' + row.jumlah.toString().replace('.', ',') + ' Kg</b><small>Beras</small></div>' +
                '<i class="fa-solid fa-chevron-right chev"></i></div>' +
            '</div>'
          );
        }).join('');
      }
    })
    .catch(function(error) {
      document.getElementById('adminTabelMuzakki').innerHTML = '<div class="empty-hint" style="color:#ef4444;">Gagal memuat data: ' + error.message + '</div>';
      document.getElementById('adminTabelTersalurkan').innerHTML = '<div class="empty-hint" style="color:#ef4444;">Gagal memuat data.</div>';
    });
}

function bukaDetailAdmMuzakki(i) {
  var row = (window._admMuzakki || [])[i];
  if (!row) return;
  var qty = row.bentuk === "Uang" ?
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(row.jumlah) :
    (row.jumlah.toString().replace('.', ',') + " Kg");
  var html =
    '<div class="s-head"><div class="avatar">' + inisial(row.nama) + '</div>' +
      '<div><b>' + row.nama + '</b><small>Detail Penyetoran Zakat</small></div></div>' +
    '<div class="kv"><span>Tanggal</span><b>' + row.tanggal + '</b></div>' +
    '<div class="kv"><span>Jenis</span><b>' + row.jenis + '</b></div>' +
    '<div class="kv"><span>Bentuk</span><b>' + row.bentuk + '</b></div>' +
    '<div class="kv"><span>Jumlah</span><b>' + qty + '</b></div>';
  if (row.jenis === "Zakat Fitrah" && row.jiwa > 0 && row.rincian) {
    var namaJiwa = row.rincian.split(/\n/).map(function(s){ return s.replace(/^[0-9]+\.\s*/, '').trim(); }).filter(Boolean);
    if (namaJiwa.length) {
      html += '<div class="jiwa-title">Ditunaikan untuk ' + row.jiwa + ' jiwa</div>';
      html += namaJiwa.map(function(n){ return '<div class="jiwa"><i class="fa-solid fa-user"></i> ' + n + '</div>'; }).join('');
    }
  }
  bukaSheet(html);
}

function bukaDetailAdmTersalur(i) {
  var row = (window._admTersalur || [])[i];
  if (!row) return;
  var html =
    '<div class="s-head"><div class="avatar">' + inisial(row.nama) + '</div>' +
      '<div><b>' + row.nama + '</b><small>Detail Penyaluran</small></div></div>' +
    '<div class="kv"><span>Tanggal Diserahkan</span><b>' + row.tanggal + '</b></div>' +
    '<div class="kv"><span>Beras Diberikan</span><b>' + row.jumlah.toString().replace('.', ',') + ' Kg</b></div>';
  bukaSheet(html);
}

// ==========================================
// LOGIN / LOGOUT
// ==========================================
function prosesLogin() {
  var pin = document.getElementById('inputPin').value;
  if (!pin) return;
  var btn = document.getElementById('btnLoginSubmit');
  btn.innerText = "Mengecek..."; btn.disabled = true;

  panggilAPI('prosesLogin', pin).then(function(response) {
    if (response.status === "success") {
      tutupModalLogin();
      localStorage.setItem('zakatLogin', 'true');
      document.getElementById('viewPublik').classList.remove('active');
      document.getElementById('btnNavLogin').style.display = 'none';
      document.getElementById('btnNavLogout').style.display = 'inline-block';
      document.getElementById('viewPanitia').classList.add('active');

      panggilAPI('getKonfigurasi').then(function(conf) {
        globalConfig = conf;
        document.getElementById('hargaBeliBeras').value = conf.hargaBeras;
        kalkulasiZakat(); generateRincianNama();
        muatTabelMustahik(); muatTabelBelanja(); aturFormBelanja();
        // Default: tampilkan Beranda
        bukaTab('tabBeranda', document.getElementById('btnTabBeranda'));
      }).catch(function(err) { console.error(err); });
    } else {
      btn.innerText = "Masuk"; btn.disabled = false;
      document.getElementById('msgLogin').innerText = response.message;
    }
  }).catch(function(err) {
    btn.innerText = "Masuk"; btn.disabled = false;
    document.getElementById('msgLogin').innerText = 'Gagal terhubung: ' + err.message;
  });
}

function prosesLogout() {
  localStorage.removeItem('zakatLogin');
  document.getElementById('viewPanitia').classList.remove('active');
  document.getElementById('viewPublik').classList.add('active');
  document.getElementById('btnNavLogout').style.display = 'none';
  document.getElementById('btnNavLogin').style.display = 'inline-block';
  muatDataPublik();
}

// ==========================================
// PENGATURAN
// ==========================================
function muatPengaturan() {
  document.getElementById('setUangFitrah').value = globalConfig.uangFitrah || '';
  document.getElementById('setBerasFitrah').value = globalConfig.berasFitrah || '';
  document.getElementById('setFidyahUang').value = globalConfig.fidyahUang || '';
  document.getElementById('setFidyahBeras').value = globalConfig.fidyahBeras || '';
  document.getElementById('setHargaBeras').value = globalConfig.hargaBeras || '';
  document.getElementById('setTahunAktif').value = globalConfig.tahunAktif || new Date().getFullYear();
}

function submitPengaturan(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button');
  btn.disabled = true; btn.innerText = "Menyimpan...";

  var dataConf = {
    uangFitrah: document.getElementById('setUangFitrah').value,
    berasFitrah: document.getElementById('setBerasFitrah').value,
    fidyahUang: document.getElementById('setFidyahUang').value,
    fidyahBeras: document.getElementById('setFidyahBeras').value,
    hargaBeras: document.getElementById('setHargaBeras').value,
    tahunAktif: document.getElementById('setTahunAktif').value
  };

  panggilAPI('updateKonfigurasi', dataConf).then(function(msg) {
    tampilAlert('alertPengaturan', msg, 'success');
    btn.disabled = false; btn.innerText = "Simpan Pengaturan";
    globalConfig.uangFitrah = parseFloat(dataConf.uangFitrah.replace(',', '.'));
    globalConfig.berasFitrah = parseFloat(dataConf.berasFitrah.replace(',', '.'));
    globalConfig.fidyahUang = parseFloat(dataConf.fidyahUang.replace(',', '.'));
    globalConfig.fidyahBeras = parseFloat(dataConf.fidyahBeras.replace(',', '.'));
    globalConfig.hargaBeras = parseFloat(dataConf.hargaBeras.replace(',', '.'));
    globalConfig.tahunAktif = dataConf.tahunAktif;
    kalkulasiZakat();
  }).catch(function(err) {
    tampilAlert('alertPengaturan', 'Gagal: ' + err.message, 'error');
    btn.disabled = false; btn.innerText = "Simpan Pengaturan";
  });
}

// ==========================================
// CETAK LAPORAN PDF
// ==========================================
function prosesCetakPDF() {
  var tahun = typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString();
  Swal.fire({ title: 'Membuat Laporan PDF...', html: 'Menyusun data transaksi tahun <b>' + tahun + '</b>.<br>Mohon tunggu.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

  panggilAPI('generateLaporanPDF', tahun)
    .then(function(base64Data) {
      var a = document.createElement('a');
      a.href = "data:application/pdf;base64," + base64Data;
      a.download = "LPJ_Zakat_Masjid_Al_Ikhlas_" + tahun + ".pdf";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      Swal.fire({ icon: 'success', title: 'Alhamdulillah!', text: 'Laporan PDF tahun ' + tahun + ' berhasil diunduh.', confirmButtonColor: '#11998e' });
    })
    .catch(function(err) { Swal.fire({ icon: 'error', title: 'Gagal Mencetak!', text: err.message }); });
}

// ==========================================
// EDIT MUSTAHIK
// ==========================================
function editMustahik(id, baris, namaLama, alamatLama) {
  Swal.fire({
    title: 'Edit Data Mustahik',
    html: `
      <div style="text-align:left; margin-bottom:10px;">
        <label style="font-weight:bold; font-size:14px; color:#475569;">Nama Calon Penerima:</label>
        <input id="swal-input-nama" class="swal2-input" value="${namaLama}" style="width:90%; margin:5px auto; display:block; font-size:15px;">
      </div>
      <div style="text-align:left;">
        <label style="font-weight:bold; font-size:14px; color:#475569;">Alamat / RT:</label>
        <input id="swal-input-alamat" class="swal2-input" value="${alamatLama}" style="width:90%; margin:5px auto; display:block; font-size:15px;">
      </div>`,
    showCancelButton: true, confirmButtonText: '<i class="fa-solid fa-save"></i> Simpan Perubahan',
    cancelButtonText: 'Batal', confirmButtonColor: '#f59e0b', cancelButtonColor: '#64748b', focusConfirm: false,
    preConfirm: () => {
      const namaBaru = document.getElementById('swal-input-nama').value;
      const alamatBaru = document.getElementById('swal-input-alamat').value;
      if (!namaBaru.trim() || !alamatBaru.trim()) { Swal.showValidationMessage('Kolom Nama dan Alamat tidak boleh kosong!'); return false; }
      return { namaBaru: namaBaru.trim(), alamatBaru: alamatBaru.trim() };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const { namaBaru, alamatBaru } = result.value;
      if (namaBaru === namaLama && alamatBaru === alamatLama) return;
      Swal.fire({ title: 'Menyimpan Perubahan...', html: 'Mohon tunggu.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      panggilAPI('updateMasterMustahik', baris, namaBaru, alamatBaru)
        .then(function(msg) {
          Swal.fire({ icon: 'success', title: 'Berhasil!', text: msg, timer: 2000, showConfirmButton: false });
          muatTabelMustahik();
          if (typeof muatDataPenyerahan === 'function') muatDataPenyerahan();
        })
        .catch(function(error) { Swal.fire('Gagal!', 'Terjadi kesalahan: ' + error.message, 'error'); });
    }
  });
}

// ==========================================
// HAPUS MUSTAHIK
// ==========================================
function hapusMustahik(id, baris) {
  Swal.fire({
    title: 'Hapus Master Data?', text: "Data mustahik ini akan dihapus permanen dari daftar referensi!",
    icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="fa-solid fa-trash"></i> Ya, Hapus Permanen!', cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'Sedang Menghapus...', html: 'Mohon tunggu.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      panggilAPI('deleteMasterMustahik', baris)
        .then(function(msg) {
          Swal.fire('Terhapus!', msg, 'success');
          muatTabelMustahik();
          if (typeof muatDataPenyerahan === 'function') muatDataPenyerahan();
        })
        .catch(function(error) { Swal.fire('Gagal!', 'Terjadi kesalahan: ' + error.message, 'error'); });
    }
  });
}

// ==========================================
// RIWAYAT PENGELUARAN (KARTU + SHEET)
// ==========================================
function muatTabelBelanja() {
  var tbody = document.getElementById('bodyTabelBelanja');
  var btnRefresh = document.getElementById('btnRefreshBelanja');
  if (btnRefresh) { btnRefresh.disabled = true; btnRefresh.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  tbody.innerHTML = '<div class="empty-hint"><i class="fa-solid fa-spinner fa-spin"></i> Memuat riwayat...</div>';
  var tahunAktif = typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString();

  panggilAPI('getRiwayatBelanja', tahunAktif)
    .then(function(data) {
      if (btnRefresh) { btnRefresh.disabled = false; btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>'; }

      window._belanja = data || [];
      if (data.length === 0) {
        tbody.innerHTML = '<div class="empty-hint">Belum ada riwayat pengeluaran tahun ini.</div>';
        return;
      }

      tbody.innerHTML = data.map(function(item, i) {
        var uangFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.uang);
        var adaBeras = !(item.beras == 0 || item.beras == "0");
        var sub = item.keterangan || "-";
        var kanan = adaBeras
          ? '<b style="color:#11998e">+' + item.beras.toString().replace('.', ',') + ' Kg</b>'
          : '<b style="color:#ef4444">-' + uangFormat + '</b>';
        return (
          '<div class="rowcard" onclick="bukaDetailBelanja(' + i + ')">' +
            '<div class="who"><div class="avatar"><i class="fa-solid fa-receipt"></i></div>' +
              '<div class="txt"><b>' + sub + '</b><small>' + item.tanggal + '</small></div></div>' +
            '<div class="right"><div class="amt">' + kanan + '<small>' + (adaBeras ? 'Beras' : 'Keluar') + '</small></div>' +
              '<i class="fa-solid fa-chevron-right chev"></i></div>' +
          '</div>'
        );
      }).join('');
    })
    .catch(function(error) {
      if (btnRefresh) { btnRefresh.disabled = false; btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>'; }
      tbody.innerHTML = '<div class="empty-hint" style="color:#ef4444;">Gagal memuat data: ' + error.message + '</div>';
    });
}

function bukaDetailBelanja(i) {
  var item = (window._belanja || [])[i];
  if (!item) return;
  var uangFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.uang);
  var adaBeras = !(item.beras == 0 || item.beras == "0");

  var html =
    '<div class="s-head"><div class="avatar"><i class="fa-solid fa-receipt"></i></div>' +
      '<div><b>' + (item.keterangan || 'Pengeluaran') + '</b><small>Detail Pengeluaran</small></div></div>' +
    '<div class="kv"><span>Tanggal</span><b>' + item.tanggal + '</b></div>' +
    '<div class="kv"><span>Uang Dipakai</span><b style="color:#ef4444">-' + uangFormat + '</b></div>';
  if (adaBeras) html += '<div class="kv"><span>Beras Didapat</span><b style="color:#11998e">+' + item.beras.toString().replace('.', ',') + ' Kg</b></div>';
  html += '<div class="kv"><span>Keterangan</span><b>' + (item.keterangan || '-') + '</b></div>';

  if (item.struk && item.struk.trim() !== "") {
    html += '<div class="sheet-actions"><a class="act-view" href="' + item.struk + '" target="_blank"><i class="fa-solid fa-eye"></i> Lihat Struk</a></div>';
  } else {
    html += '<div class="empty-hint" style="margin-top:10px;">Tanpa bukti struk.</div>';
  }
  bukaSheet(html);
}

// ==========================================
// GANTI PIN PANITIA
// ==========================================
function submitGantiPin(e) {
  e.preventDefault();
  var pinLama = document.getElementById('pinLama').value;
  var pin1 = document.getElementById('pinBaru').value;
  var pin2 = document.getElementById('pinKonfirmasi').value;

  if (pin1 !== pin2) { Swal.fire('Gagal!', 'PIN Baru dan Konfirmasi tidak cocok!', 'error'); return; }

  var btn = document.getElementById('btnGantiPin');
  btn.disabled = true; btn.innerText = "Memverifikasi...";

  panggilAPI('updatePinPanitia', pinLama, pin1)
    .then(function(msg) {
      Swal.fire('Berhasil!', msg, 'success');
      document.getElementById('formGantiPin').reset();
      btn.disabled = false; btn.innerText = "Simpan PIN Baru";
    })
    .catch(function(err) {
      Swal.fire('Akses Ditolak!', err.message, 'error');
      btn.disabled = false; btn.innerText = "Simpan PIN Baru";
    });
}

// ==========================================
// SENSOR PENGUNJUNG UNIK
// ==========================================
(function() {
  var idPengunjung = localStorage.getItem('siwarga_visitor_id');
  if (!idPengunjung) {
    idPengunjung = 'WARGA-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('siwarga_visitor_id', idPengunjung);
  }
  panggilAPI('catatPengunjungUnik', idPengunjung).catch(function(){});
})();

// ==========================================
// SENSOR NAMA PENERIMA
// ==========================================
function sensorNama(namaLengkap) {
  if (!namaLengkap) return "";
  var kata = namaLengkap.split(" ");
  var hasil = kata.map(function(k) {
    if (k.length === 0) return "";
    if (k.length === 1) return k + "*";
    return k.charAt(0) + "*".repeat(k.length - 1);
  });
  return hasil.join(" ");
}



