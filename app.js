// ==========================================
// KONFIGURASI API (JEMBATAN KE APPSCRIPT)
// ==========================================
const URL_API = "https://script.google.com/macros/s/AKfycbyGI36OLej6uyib5fPVegZPRJi9y7_Vh0mYcF-0jSskH8oLm7OmDp8hSiAAlSQZU1Ez/exec";

// Pengganti google.script.run. Selalu balikkan Promise.
// - withSuccessHandler  -> .then
// - withFailureHandler  -> .catch
async function panggilAPI(action, ...args) {
  const res = await fetch(URL_API, {
    method: "POST",
    // Sengaja TANPA header Content-Type -> dianggap "teks biasa"
    // -> browser tidak minta preflight -> AppScript tidak bingung
    body: JSON.stringify({ action: action, args: args })
  });
  const json = await res.json();
  if (json.status === "error") throw new Error(json.message);
  return json.data;
}

// ==========================================
// LOGIKA BERANDA WARGA (PUBLIK)
// ==========================================
window.onload = function() {
  setupDropdownTahun();
  muatDataPublik();

  // CEK CACHE LOGIN
  if (localStorage.getItem('zakatLogin') === 'true') {
    document.getElementById('viewPublik').classList.remove('active');
    document.getElementById('btnNavLogin').style.display = 'none';
    document.getElementById('btnNavLogout').style.display = 'inline-block';
    document.getElementById('viewPanitia').classList.add('active');

    // Data ini HANYA dimuat di belakang layar jika yang buka web adalah Panitia
    muatTabelMustahik();
    muatTabelBelanja();
    aturFormBelanja();

    panggilAPI('getKonfigurasi').then(function(conf) {
      globalConfig = conf;
      document.getElementById('hargaBeliBeras').value = conf.hargaBeras;
      kalkulasiZakat();
      generateRincianNama();

      // KUNCI FIX 1: Paksa diam di Tab Catat Zakat!
      bukaTab('tabCatat', document.getElementById('btnTabCatat'));
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
  // Menampilkan 3 tahun ke belakang sampai 1 tahun ke depan
  for (var i = tahunSekarang - 3; i <= tahunSekarang + 1; i++) {
    var selected = (i === tahunSekarang) ? "selected" : "";
    options += `<option value="${i}" ${selected}>${i}</option>`;
  }

  if (selectPublik) selectPublik.innerHTML = options;
  if (selectPanitia) selectPanitia.innerHTML = options;
}

// ==========================================
// FUNGSI MESIN WAKTU (UBAH TAHUN PANITIA)
// ==========================================
function ubahTahunPanitia() {
  var tahunDipilih = document.getElementById('pilihTahunPanitia').value;

  if (typeof globalConfig !== 'undefined') {
    globalConfig.tahunAktif = tahunDipilih;
  }

  if (typeof muatBerandaPanitia === 'function') muatBerandaPanitia();
  if (typeof muatDataPenyerahan === 'function') muatDataPenyerahan();
  if (typeof muatTabelMustahik === 'function') muatTabelMustahik();
  if (typeof muatTabelBelanja === 'function') muatTabelBelanja();

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'info',
    title: 'Menampilkan data tahun ' + tahunDipilih,
    showConfirmButton: false,
    timer: 1500
  });
}

function muatDataPublik() {
  var tahunDipilih = document.getElementById('pilihTahun').value;

  document.getElementById('tabelMuzakki').innerHTML = '<tr><td colspan="5" style="text-align: center;">Memuat data...</td></tr>';
  document.getElementById('tabelTersalurkan').innerHTML = '<tr><td colspan="3" style="text-align: center;">Memuat data...</td></tr>';

  panggilAPI('getLaporanZakat', tahunDipilih)
    .then(updateUIWarga)
    .catch(function(error) {
      document.getElementById('tabelMuzakki').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Gagal memuat data: ' + error.message + '</td></tr>';
      document.getElementById('tabelTersalurkan').innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Gagal memuat data.</td></tr>';
    });
}

function updateUIWarga(data) {
  var berasBersih = parseFloat(data.beras.toFixed(2));

  document.getElementById('valBeras').innerHTML = berasBersih.toString().replace('.', ',') + ' <span style="font-size: 1.2rem;">Kg</span>';

  var rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.uang);
  document.getElementById('valUang').innerText = rupiah;

  document.getElementById('valMuzakki').innerText = data.totalJiwa + " Jiwa";
  document.getElementById('valTersalurkan').innerText = data.berasTersalurkan.toFixed(2) + " Kg Disalurkan";

  var tbodyMuzakki = document.getElementById('tabelMuzakki');
  tbodyMuzakki.innerHTML = "";

  if (data.listMuzakki.length === 0) {
    tbodyMuzakki.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">Belum ada data penerimaan zakat di tahun ini.</td></tr>';
  } else {
    data.listMuzakki.forEach(function(row) {
      var warnaNominal = (row.jenis === "Zakat Fitrah") ? "#11998e" : "#2f80ed";

      var teksRincian = "";
      if (row.jenis === "Zakat Fitrah" && row.jiwa > 0) {
        var namaBerjejer = row.rincian ? row.rincian.replace(/\n/g, ", ").replace(/[0-9]+\.\s*/g, "") : "";
        teksRincian = `
          <br>
          <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">
            <i class="fa-solid fa-users"></i> ${row.jiwa} Jiwa ${namaBerjejer !== "-" && namaBerjejer !== "" ? `(${namaBerjejer})` : ""}
          </span>
        `;
      }

      var qty = row.bentuk === "Uang" ?
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(row.jumlah) :
        row.jumlah + " Kg";

      tbodyMuzakki.innerHTML += `
        <tr>
          <td>${row.tanggal}</td>
          <td style="font-weight:bold;">
            ${row.nama}
            ${teksRincian}
          </td>
          <td>${row.jenis}</td>
          <td>${row.bentuk}</td>
          <td class="nominal" style="color: ${warnaNominal}; font-weight: bold;">${qty}</td>
        </tr>
      `;
    });
  }

  var tbodyTersalurkan = document.getElementById('tabelTersalurkan');
  tbodyTersalurkan.innerHTML = "";

  if (data.listTersalurkan.length === 0) {
    tbodyTersalurkan.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #64748b;">Belum ada data penyaluran kepada Mustahik.</td></tr>';
  } else {
    data.listTersalurkan.forEach(function(row) {
      tbodyTersalurkan.innerHTML += `
        <tr>
          <td>${row.tanggal}</td>
          <td style="font-weight:bold;">${sensorNama(row.nama)}</td>
          <td class="nominal">${row.jumlah} Kg</td>
        </tr>
      `;
    });
  }
}

// ==========================================
// FITUR PENCARIAN & HIGHLIGHT TABEL
// ==========================================
function cariTabel(inputId, tbodyId) {
  var input = document.getElementById(inputId).value.toLowerCase();
  var tbody = document.getElementById(tbodyId);
  var rows = tbody.getElementsByTagName('tr');

  for (var i = 0; i < rows.length; i++) {
    var tdNama = rows[i].getElementsByTagName('td')[1];

    if (tdNama) {
      var teksNama = tdNama.textContent || tdNama.innerText;

      if (teksNama.toLowerCase().indexOf(input) > -1) {
        rows[i].style.display = "";
        if (input !== "") {
          rows[i].classList.add("highlight-row");
        } else {
          rows[i].classList.remove("highlight-row");
        }
      } else {
        rows[i].style.display = "none";
        rows[i].classList.remove("highlight-row");
      }
    }
  }
}

// Kontrol Modal Login
function bukaModalLogin() {
  document.getElementById('modalLogin').classList.add('active');
  document.getElementById('inputPin').focus();
}

function tutupModalLogin() {
  document.getElementById('modalLogin').classList.remove('active');
  document.getElementById('inputPin').value = '';
  document.getElementById('msgLogin').innerText = '';
}

function bukaTab(tabId, element) {
  var contents = document.getElementsByClassName('tab-content');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');

  var btns = document.getElementsByClassName('tab-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');

  document.getElementById(tabId).classList.add('active');
  element.classList.add('active');

  // Trigger Otomatis
  if(tabId === 'tabPenerima') muatDataPenyerahan();
  else if (tabId === 'tabBeranda') muatBerandaPanitia();
  else if (tabId === 'tabPengaturan') muatPengaturan();
}

// ==========================================
// VARIABEL GLOBAL & KONTROL UI PANITIA
// ==========================================
var globalConfig = {}; // Untuk menyimpan data dari CONF_ZAKAT

function tampilAlert(id, pesan, tipe) {
  var el = document.getElementById(id);
  el.innerText = pesan;
  el.className = "alert " + tipe;
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}

// ==========================================
// LOGIKA FORM: CATAT ZAKAT & RINCIAN NAMA
// ==========================================
function generateRincianNama() {
  var jumlah = parseInt(document.getElementById('jumlahJiwa').value) || 1;
  var wadah = document.getElementById('listRincian');
  var kontainer = document.getElementById('containerRincian');
  var namaKK = document.getElementById('namaKK').value;

  var jenis = document.getElementById('jenisZakat').value;
  if (jenis !== "Zakat Fitrah" && jenis !== "Fidyah") {
    kontainer.classList.remove('active');
    return;
  }

  kontainer.classList.add('active');
  wadah.innerHTML = '';

  for (var i = 1; i <= jumlah; i++) {
    var defaultVal = (i === 1 && namaKK !== "") ? namaKK : "";
    wadah.innerHTML += `
      <div class="rincian-item">
        <input type="text" class="input-rincian" placeholder="Nama Anggota Ke-${i}" value="${defaultVal}" required>
      </div>
    `;
  }
}

// Event listener agar orang pertama update kalau nama KK diketik
document.getElementById('namaKK').addEventListener('input', function() {
  var rincianInputs = document.getElementsByClassName('input-rincian');
  if(rincianInputs.length > 0) {
    rincianInputs[0].value = this.value;
  }
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

    if (document.getElementById('containerRincian')) {
      document.getElementById('containerRincian').style.display = 'none';
    }

    var rincianInputs = document.getElementsByClassName('input-rincian');
    for (var i = 0; i < rincianInputs.length; i++) {
      rincianInputs[i].required = false;
    }

    elTotal.readOnly = false;
    elHint.style.display = 'block';

    var tarifFidyahUang = globalConfig.fidyahUang || 0;
    var tarifFidyahBeras = globalConfig.fidyahBeras || 0;
    elTotal.value = bentuk === "Uang" ? jumlah * tarifFidyahUang : (jumlah * tarifFidyahBeras).toFixed(2);
    elHint.innerHTML = "<i>*Berdasarkan tarif Fidyah: " + (bentuk === "Uang" ? "Rp " + tarifFidyahUang : tarifFidyahBeras + " Kg") + " / hari</i>";

  } else {
    // Zakat Mal & Infaq
    elGrupJiwa.style.display = 'none';

    if (document.getElementById('containerRincian')) {
      document.getElementById('containerRincian').style.display = 'none';
    }

    var rincianInputs = document.getElementsByClassName('input-rincian');
    for (var i = 0; i < rincianInputs.length; i++) {
      rincianInputs[i].required = false;
    }

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
  for (var i = 0; i < rincianInputs.length; i++) {
    rincianArr.push(rincianInputs[i].value);
  }

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
      tampilAlert('alertZakat', res.message, 'success');
      document.getElementById('formZakat').reset();
      kalkulasiZakat();
      btn.disabled = false; btn.innerText = "Simpan & Kirim Resi WA";
    })
    .catch(function(err) {
      tampilAlert('alertZakat', 'Gagal: ' + err.message, 'error');
      btn.disabled = false; btn.innerText = "Simpan & Kirim Resi WA";
    });
}

// ==========================================
// LOGIKA FORM: MUSTAHIK & PENYERAHAN
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

  // KUNCI KEAMANAN: Matikan Form jika melihat masa lalu
  if (isMasaLalu) {
    dropdown.innerHTML = '<option value="">-- Terkunci (Mode Riwayat) --</option>';
    dropdown.disabled = true;
    inputBeras.value = "0";
    inputBeras.readOnly = true;
    if(btnSerah) { btnSerah.disabled = true; btnSerah.innerText = "Terkunci (Data Masa Lalu)"; btnSerah.style.backgroundColor = "#94a3b8"; }
    if(btnMustahik) { btnMustahik.disabled = true; btnMustahik.innerText = "Terkunci (Data Masa Lalu)"; btnMustahik.style.backgroundColor = "#94a3b8"; }
    return;
  } else {
    dropdown.disabled = false;
    inputBeras.readOnly = false;
    if(btnSerah) { btnSerah.disabled = false; btnSerah.innerText = "Konfirmasi Diserahkan"; btnSerah.style.backgroundColor = "var(--primary)"; }
    if(btnMustahik) { btnMustahik.disabled = false; btnMustahik.innerText = "Simpan Calon Mustahik"; btnMustahik.style.backgroundColor = "var(--primary)"; }
  }

  dropdown.innerHTML = '<option value="">-- Memuat data... --</option>';
  inputBeras.value = "Menghitung...";

  panggilAPI('getDaftarPenerima', "Belum Diserahkan", tahunAktif).then(function(list) {
    if(list.length === 0) {
      dropdown.innerHTML = '<option value="">-- Semua Mustahik Sudah Menerima --</option>';
    } else {
      dropdown.innerHTML = '<option value="">-- Pilih Nama --</option>';
      list.forEach(function(item) {
        dropdown.innerHTML += `<option value="${item.id}">${item.nama} (${item.alamat})</option>`;
      });
    }
  }).catch(function(err) {
    dropdown.innerHTML = '<option value="">-- Gagal memuat --</option>';
  });

  // Kirim tahun aktif ke mesin saran pembagian
  panggilAPI('getSaranPembagian', tahunAktif).then(function(saran) {
    inputBeras.value = saran.saranBeras;
  }).catch(function(err) {
    inputBeras.value = "0";
  });
}

function submitPenyerahan(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.innerText = "Mengeksekusi...";

  var data = {
    idPenerima: document.getElementById('pilihMustahik').value,
    jatahBerasFinal: document.getElementById('jatahBerasFinal').value,
    tahunAktif: typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString()
  };

  panggilAPI('prosesPenyerahanZakat', data)
    .then(function(msg) {
      tampilAlert('alertPenyerahan', msg, 'success');
      btn.disabled = false;
      btn.innerText = "Konfirmasi Diserahkan";
      muatDataPenyerahan();
      muatTabelMustahik();
      muatBerandaPanitia();
    })
    .catch(function(error) {
      tampilAlert('alertPenyerahan', 'Gagal: ' + error.message, 'danger');
      btn.disabled = false;
      btn.innerText = "Konfirmasi Diserahkan";
    });
}

// ==========================================
// FUNGSI MUAT TABEL MASTER MUSTAHIK
// ==========================================
function muatTabelMustahik() {
  var tbody = document.getElementById('bodyTabelMustahik');
  var btnRefresh = document.getElementById('btnRefreshMustahik');

  if (btnRefresh) {
    btnRefresh.disabled = true;
    btnRefresh.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...';
    btnRefresh.style.backgroundColor = '#e0f2fe';
    btnRefresh.style.color = '#0284c7';
    btnRefresh.style.cursor = 'wait';
  }

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Sedang mengambil data master...</td></tr>';

  var tahunAktif = typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString();

  panggilAPI('getDaftarMasterMustahik', tahunAktif)
    .then(function(data) {

      if (btnRefresh) {
        btnRefresh.disabled = false;
        btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh Data';
        btnRefresh.style.backgroundColor = '#f1f5f9';
        btnRefresh.style.color = '#475569';
        btnRefresh.style.cursor = 'pointer';
      }

      tbody.innerHTML = "";

      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">Belum ada data master mustahik. Silakan input di atas.</td></tr>';
        return;
      }

      data.forEach(function(item, index) {
        var isMasaLalu = (tahunAktif !== new Date().getFullYear().toString());
        var btnAksi = `<span style="color: #94a3b8; font-size: 12px; font-style: italic;">Dikunci</span>`;

        if (!isMasaLalu) {
          btnAksi = `
            <button onclick="editMustahik('${item.id}', ${item.baris}, '${item.nama.replace(/'/g, "\\'")}', '${item.alamat.replace(/'/g, "\\'")}')" style="background: #f59e0b; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px;" title="Edit Data">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="hapusMustahik('${item.id}', ${item.baris})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Hapus Data">
              <i class="fa-solid fa-trash"></i>
            </button>
          `;
        }

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; text-align: center;">${index + 1}</td>
            <td style="padding: 12px 10px; font-weight: bold; color: #334155;">${item.nama}</td>
            <td style="padding: 12px 10px; color: #475569;">${item.alamat}</td>
            <td style="padding: 12px 10px; text-align: right; font-weight: bold; color: #3b82f6;">${item.jatah} Kg</td>
            <td style="padding: 12px 10px; text-align: center;">${item.statusHtml}</td>
            <td style="padding: 12px 10px; text-align: center;">${btnAksi}</td>
          </tr>
        `;
      });
    })
    .catch(function(error) {
      if (btnRefresh) {
        btnRefresh.disabled = false;
        btnRefresh.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Gagal';
        btnRefresh.style.backgroundColor = '#fee2e2';
        btnRefresh.style.color = '#ef4444';
        btnRefresh.style.cursor = 'pointer';
      }
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Gagal memuat data: ${error.message}</td></tr>`;
    });
}

// ==========================================
// LOGIKA FORM: BELANJA BERAS (KONVERSI)
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
    deskripsi.innerHTML = "Gunakan form ini setelah panitia membelanjakan uang zakat untuk membeli stok beras tambahan.";
    sectionBeras.style.display = "block";
    hargaInput.required = true;
    ketInput.placeholder = "Cth: Beli Beras di Agen Sembako Lalung";
    ketInput.value = "";

  } else if (kategori === "Setor") {
    judul.innerHTML = "Penyerahan Sisa Saldo (Tutup Buku)";
    deskripsi.innerHTML = "Gunakan ini untuk menolkan saldo akhir Panitia Zakat dan menyerahkan sisa dana ke Kas Masjid.";
    sectionBeras.style.display = "none";
    hargaInput.required = false;

    ketInput.value = "Penyerahan Infaq ke Masjid (Tutup Buku)";
    ketInput.readOnly = true;
    ketInput.style.backgroundColor = "#f1f5f9";

    hargaInput.value = "";
    berasInput.value = 0;

  } else {
    judul.innerHTML = "Pencatatan Belanja Operasional";
    deskripsi.innerHTML = "Gunakan form ini untuk mencatat pengeluaran selain beras (seperti plastik, ATK, atau kebutuhan lainnya).";
    sectionBeras.style.display = "none";
    hargaInput.required = false;
    ketInput.placeholder = "Cth: Beli Plastik 5 Pack di Toko Berkah";
    ketInput.value = "";

    hargaInput.value = "";
    berasInput.value = 0;
  }
}

function kalkulasiBelanja() {
  var kategori = document.getElementById("kategoriBelanja").value;
  if (kategori !== "Beras") return;

  var uang = parseFloat(document.getElementById("uangDipakai").value) || 0;
  var harga = parseFloat(document.getElementById("hargaBeliBeras").value) || 0;
  var inputBeras = document.getElementById("berasDidapat");

  if (harga > 0) {
    var hasil = uang / harga;
    inputBeras.value = hasil.toFixed(2);
  } else {
    inputBeras.value = 0;
  }
}

function submitBelanja(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.innerText = "Mencatat & Mengunggah...";

  var fileInput = document.getElementById('strukBelanja');
  var file = fileInput.files[0];

  var data = {
    nominalUang: document.getElementById('uangDipakai').value,
    hargaBeli: document.getElementById('hargaBeliBeras').value,
    totalBerasDidapat: document.getElementById('berasDidapat').value,
    keterangan: document.getElementById('ketBelanja').value,
    namaFile: "",
    fileTipe: "",
    fileBase64: ""
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

// ==========================================
// FUNGSI PENGIRIM KE SERVER (DIPISAH AGAR RAPI)
// ==========================================
function kirimDataBelanjaKeServer(data, btn) {
  panggilAPI('simpanBelanjaBeras', data)
    .then(function(msg) {
      tampilAlert('alertBelanja', msg, 'success');
      document.getElementById('formBelanja').reset();

      if (typeof globalConfig !== 'undefined' && globalConfig.hargaBeras) {
        document.getElementById('hargaBeliBeras').value = globalConfig.hargaBeras;
      }

      btn.disabled = false;
      btn.innerText = "Simpan Catatan Belanja";

      if (typeof muatBerandaPanitia === 'function') {
        muatBerandaPanitia();
      }
      if (typeof muatTabelBelanja === 'function') {
        muatTabelBelanja();
      }
      if (typeof aturFormBelanja === 'function') {
        aturFormBelanja();
      }
    })
    .catch(function(error) {
      tampilAlert('alertBelanja', 'Gagal: ' + error.message, 'danger');
      btn.disabled = false;
      btn.innerText = "Simpan Catatan Belanja";
    });
}

// ==========================================
// BERANDA PANITIA & PENGATURAN
// ==========================================
function muatBerandaPanitia() {
  document.getElementById('adminValBeras').innerHTML = "Memuat...";
  document.getElementById('adminValUang').innerHTML = "Memuat...";
  document.getElementById('adminValMuzakki').innerHTML = "Memuat...";
  document.getElementById('adminValTersalurkan').innerHTML = "Memuat...";
  document.getElementById('adminTabelMuzakki').innerHTML = '<tr><td colspan="5" class="text-center">Memuat data...</td></tr>';
  document.getElementById('adminTabelTersalurkan').innerHTML = '<tr><td colspan="3" class="text-center">Memuat data...</td></tr>';

  var tahunAktif = globalConfig.tahunAktif || new Date().getFullYear();

  panggilAPI('getLaporanZakat', tahunAktif)
    .then(function(data) {
      var berasBersih = parseFloat(data.beras.toFixed(2));
      var salurBersih = parseFloat(data.berasTersalurkan.toFixed(2));

      document.getElementById('adminValBeras').innerHTML = berasBersih.toString().replace('.', ',') + ' <span class="satuan">Kg</span>';
      document.getElementById('adminValUang').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.uang);
      document.getElementById('adminValMuzakki').innerHTML = data.totalJiwa + ' <span class="satuan">Jiwa</span>';
      document.getElementById('adminValTersalurkan').innerHTML = salurBersih.toString().replace('.', ',') + ' <span class="satuan">Kg</span>';

      var tbodyMuzakki = document.getElementById('adminTabelMuzakki');
      tbodyMuzakki.innerHTML = "";

      if (data.listMuzakki.length === 0) {
        tbodyMuzakki.innerHTML = '<tr><td colspan="5" class="text-center" style="color: #64748b;">Belum ada data penerimaan zakat.</td></tr>';
      } else {
        data.listMuzakki.forEach(function(row) {
          var warnaNominal = (row.jenis === "Zakat Fitrah") ? "#11998e" : "#2f80ed";

          var teksRincian = "";
          if (row.jenis === "Zakat Fitrah" && row.jiwa > 0) {
            var namaBerjejer = row.rincian ? row.rincian.replace(/\n/g, ", ").replace(/[0-9]+\.\s*/g, "") : "";
            teksRincian = `
              <br>
              <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">
                <i class="fa-solid fa-users"></i> ${row.jiwa} Jiwa ${namaBerjejer !== "-" && namaBerjejer !== "" ? `(${namaBerjejer})` : ""}
              </span>
            `;
          }

          var qty = row.bentuk === "Uang" ?
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(row.jumlah) :
            row.jumlah.toString().replace('.', ',') + " Kg";

          tbodyMuzakki.innerHTML += `
            <tr>
              <td>${row.tanggal}</td>
              <td style="font-weight:bold;">
                ${row.nama}
                ${teksRincian}
              </td>
              <td>${row.jenis}</td>
              <td>${row.bentuk}</td>
              <td class="nominal" style="color: ${warnaNominal}; font-weight: bold;">${qty}</td>
            </tr>
          `;
        });
      }

      var tbodyTersalurkan = document.getElementById('adminTabelTersalurkan');
      tbodyTersalurkan.innerHTML = "";

      if (data.listTersalurkan.length === 0) {
        tbodyTersalurkan.innerHTML = '<tr><td colspan="3" class="text-center" style="color: #64748b;">Belum ada data penyaluran.</td></tr>';
      } else {
        data.listTersalurkan.forEach(function(row) {
          var jumlahBeras = row.jumlah.toString().replace('.', ',');
          tbodyTersalurkan.innerHTML += `
            <tr>
              <td>${row.tanggal}</td>
              <td style="font-weight:bold;">${row.nama}</td>
              <td class="nominal">${jumlahBeras} Kg</td>
            </tr>
          `;
        });
      }
    })
    .catch(function(error) {
      document.getElementById('adminTabelMuzakki').innerHTML = '<tr><td colspan="5" class="text-center" style="color: red;">Gagal memuat data: ' + error.message + '</td></tr>';
      document.getElementById('adminTabelTersalurkan').innerHTML = '<tr><td colspan="3" class="text-center" style="color: red;">Gagal memuat data.</td></tr>';
    });
}

function prosesLogin() {
  var pin = document.getElementById('inputPin').value;
  if(!pin) return;

  var btn = document.getElementById('btnLoginSubmit');
  btn.innerText = "Mengecek..."; btn.disabled = true;

  panggilAPI('prosesLogin', pin).then(function(response) {
    if(response.status === "success") {
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

        // KUNCI FIX 2: Paksa diam di Tab Catat Zakat!
        bukaTab('tabCatat', document.getElementById('btnTabCatat'));
      }).catch(function(err){ console.error(err); });

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
// FUNGSI CETAK LAPORAN PDF (SWEETALERT2 & MESIN WAKTU)
// ==========================================
function prosesCetakPDF() {
  var tahun = typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString();

  Swal.fire({
    title: 'Membuat Laporan PDF...',
    html: 'Sedang menyusun data transaksi tahun <b>' + tahun + '</b>.<br>Mohon tunggu sebentar.',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  panggilAPI('generateLaporanPDF', tahun)
    .then(function(base64Data) {
      var a = document.createElement('a');
      a.href = "data:application/pdf;base64," + base64Data;
      a.download = "LPJ_Zakat_Masjid_Al_Ikhlas_" + tahun + ".pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      Swal.fire({
        icon: 'success',
        title: 'Alhamdulillah!',
        text: 'Laporan PDF tahun ' + tahun + ' berhasil diunduh.',
        confirmButtonColor: '#11998e'
      });
    })
    .catch(function(err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mencetak!',
        text: err.message
      });
    });
}

// ==========================================
// FUNGSI EDIT MUSTAHIK (VIA SWEETALERT2)
// ==========================================
function editMustahik(id, baris, namaLama, alamatLama) {
  Swal.fire({
    title: 'Edit Data Mustahik',
    html: `
      <div style="text-align: left; margin-bottom: 10px;">
        <label style="font-weight: bold; font-size: 14px; color: #475569;">Nama Calon Penerima:</label>
        <input id="swal-input-nama" class="swal2-input" value="${namaLama}" style="width: 90%; margin: 5px auto; display: block; font-size: 15px;">
      </div>
      <div style="text-align: left;">
        <label style="font-weight: bold; font-size: 14px; color: #475569;">Alamat / RT:</label>
        <input id="swal-input-alamat" class="swal2-input" value="${alamatLama}" style="width: 90%; margin: 5px auto; display: block; font-size: 15px;">
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="fa-solid fa-save"></i> Simpan Perubahan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#64748b',
    focusConfirm: false,
    preConfirm: () => {
      const namaBaru = document.getElementById('swal-input-nama').value;
      const alamatBaru = document.getElementById('swal-input-alamat').value;

      if (!namaBaru.trim() || !alamatBaru.trim()) {
        Swal.showValidationMessage('Kolom Nama dan Alamat tidak boleh kosong!');
        return false;
      }
      return { namaBaru: namaBaru.trim(), alamatBaru: alamatBaru.trim() };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const { namaBaru, alamatBaru } = result.value;

      if (namaBaru === namaLama && alamatBaru === alamatLama) return;

      Swal.fire({
        title: 'Menyimpan Perubahan...',
        html: 'Mohon tunggu sebentar.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      panggilAPI('updateMasterMustahik', baris, namaBaru, alamatBaru)
        .then(function(msg) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: msg,
            timer: 2000,
            showConfirmButton: false
          });
          muatTabelMustahik();
          if (typeof muatDataPenyerahan === 'function') muatDataPenyerahan();
        })
        .catch(function(error) {
          Swal.fire('Gagal!', 'Terjadi kesalahan: ' + error.message, 'error');
        });
    }
  });
}

// ==========================================
// FUNGSI HAPUS MUSTAHIK (VIA SWEETALERT2)
// ==========================================
function hapusMustahik(id, baris) {
  Swal.fire({
    title: 'Hapus Master Data?',
    text: "Data mustahik ini akan dihapus secara permanen dari daftar referensi!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="fa-solid fa-trash"></i> Ya, Hapus Permanen!',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {

      Swal.fire({
        title: 'Sedang Menghapus...',
        html: 'Mohon tunggu sebentar.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      panggilAPI('deleteMasterMustahik', baris)
        .then(function(msg) {
          Swal.fire('Terhapus!', msg, 'success');
          muatTabelMustahik();
          if (typeof muatDataPenyerahan === 'function') muatDataPenyerahan();
        })
        .catch(function(error) {
          Swal.fire('Gagal!', 'Terjadi kesalahan: ' + error.message, 'error');
        });
    }
  });
}

// ==========================================
// FUNGSI MUAT TABEL RIWAYAT BELANJA
// ==========================================
function muatTabelBelanja() {
  var tbody = document.getElementById('bodyTabelBelanja');
  var btnRefresh = document.getElementById('btnRefreshBelanja');

  if (btnRefresh) {
    btnRefresh.disabled = true;
    btnRefresh.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...';
    btnRefresh.style.backgroundColor = '#e0f2fe';
    btnRefresh.style.color = '#0284c7';
  }

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Sedang mengambil data...</td></tr>';

  var tahunAktif = typeof globalConfig !== 'undefined' ? globalConfig.tahunAktif : new Date().getFullYear().toString();

  panggilAPI('getRiwayatBelanja', tahunAktif)
    .then(function(data) {
      if (btnRefresh) {
        btnRefresh.disabled = false;
        btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh';
        btnRefresh.style.backgroundColor = '#f1f5f9';
        btnRefresh.style.color = '#475569';
      }

      tbody.innerHTML = "";

      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">Belum ada riwayat konversi beras tahun ini.</td></tr>';
        return;
      }

      data.forEach(function(item) {
        var uangFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.uang);

        var btnStruk = '<span style="color: #94a3b8; font-size: 12px;">Tanpa Struk</span>';
        if (item.struk && item.struk.trim() !== "") {
          btnStruk = `
            <a href="${item.struk}" target="_blank" style="background: #10b981; color: white; padding: 5px 10px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; display: inline-block;">
              <i class="fa-solid fa-eye"></i> Lihat
            </a>`;
        }

        var nilaiBeras = item.beras;

        var tampilanBeras = (nilaiBeras == 0 || nilaiBeras == "0")
            ? `<span style="color: #94a3b8;">-</span>`
            : `<span style="color: #11998e;">+ ${nilaiBeras.toString().replace('.', ',')} Kg</span>`;

        tbody.innerHTML += `
<tr style="border-bottom: 1px solid #f1f5f9;">
  <td style="padding: 12px 10px; color: #475569; font-size: 13px;">${item.tanggal}</td>
  <td style="padding: 12px 10px; text-align: right; font-weight: bold; color: #ef4444;">- ${uangFormat}</td>

  <td style="padding: 12px 10px; text-align: right; font-weight: bold;">
    ${tampilanBeras}
  </td>

  <td style="padding: 12px 10px; color: #334155;">${item.keterangan}</td>
  <td style="padding: 12px 10px; text-align: center;">${btnStruk}</td>
</tr>
`;
      });
    })
    .catch(function(error) {
      if (btnRefresh) {
        btnRefresh.disabled = false;
        btnRefresh.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Gagal';
        btnRefresh.style.backgroundColor = '#fee2e2';
        btnRefresh.style.color = '#ef4444';
      }
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Gagal memuat data: ${error.message}</td></tr>`;
    });
}

// ==========================================
// FUNGSI GANTI PIN PANITIA (DENGAN VERIFIKASI)
// ==========================================
function submitGantiPin(e) {
  e.preventDefault();
  var pinLama = document.getElementById('pinLama').value;
  var pin1 = document.getElementById('pinBaru').value;
  var pin2 = document.getElementById('pinKonfirmasi').value;

  if (pin1 !== pin2) {
    Swal.fire('Gagal!', 'PIN Baru dan Konfirmasi tidak cocok!', 'error');
    return;
  }

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
// SENSOR PENGUNJUNG UNIK (Berjalan otomatis)
// ==========================================
(function() {
  var idPengunjung = localStorage.getItem('siwarga_visitor_id');

  if (!idPengunjung) {
    idPengunjung = 'WARGA-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('siwarga_visitor_id', idPengunjung);
  }

  // Lapor ke server tiap web dibuka. Fire-and-forget (abaikan error).
  panggilAPI('catatPengunjungUnik', idPengunjung).catch(function(){});
})();

// ==========================================
// MESIN SENSOR NAMA PENERIMA ZAKAT (Versi Huruf Depan Saja)
// ==========================================
function sensorNama(namaLengkap) {
  if (!namaLengkap) return "";

  var kata = namaLengkap.split(" ");

  var hasil = kata.map(function(k) {
    if (k.length === 0) return "";
    if (k.length === 1) return k + "*";

    var hurufPertama = k.charAt(0);
    var bintang = "*".repeat(k.length - 1);
    return hurufPertama + bintang;
  });

  return hasil.join(" ");
}
