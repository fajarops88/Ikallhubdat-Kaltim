/* ==========================================================================
   admin.js — Panel Pengurus (inti)
   Data utama dimuat 1× (adm.boot) → semua menu dirender dari memori (instan),
   disegarkan di latar (SWR). Aksi verifikasi bersifat optimistis.
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, ic, img, bg, fmt, UI, api, apiQ, Store, Sesi, Router, Kta, LS, daftar, hariIni } = IKH;
  const LABEL = { nama: 'Nama lengkap', nomor_taruna: 'NIT', angkatan: 'Angkatan', prodi: 'Program studi', tahun_kelulusan: 'Tahun lulus', status_kepegawaian: 'Status kepegawaian', instansi: 'Instansi', jabatan_terakhir: 'Jabatan terakhir', no_hp: 'Nomor WhatsApp', email: 'Email', jenis_kelamin: 'Jenis kelamin', tempat_lahir: 'Tempat lahir', tanggal_lahir: 'Tanggal lahir', kota_domisili: 'Domisili', alamat: 'Alamat', foto_id: 'Pas foto' };
  const FIELD = ['nama', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'no_hp', 'email', 'kota_domisili', 'alamat', 'nomor_taruna', 'angkatan', 'prodi', 'tahun_kelulusan', 'status_kepegawaian', 'instansi', 'jabatan_terakhir'];

  /* ---------------- Turunan data ---------------- */
  const statusKartu = (a) => a.status_verifikasi !== 'Disetujui' ? a.status_verifikasi : a.status_anggota === 'Nonaktif' ? 'Nonaktif' : (!IKH.seumurHidup(a) && a.masa_berlaku_kartu && a.masa_berlaku_kartu < hariIni() ? 'Kedaluwarsa' : 'Aktif');
  /* v1.6.0: tidak ada lagi PDF/"usang" — kartu selalu digambar dari data terbaru. Yang dipantau: siapa pengesahnya.
     true = pengesah tercatat di kartu berbeda dari ketua di Pengaturan saat ini (mis. setelah ganti ketua). */
  const sahBeda = (a, st) => !!(st.KETUA_NAMA && a.kta_sah_pada && String(a.kta_sah_oleh || '') !== String(st.KETUA_NAMA));
  function D() {
    const d = Store.adm || { anggota: [], pengajuan: [], akun: [], setting: {}, log: [] };
    const ang = d.anggota;
    return {
      d, st: d.setting || {},
      menunggu: ang.filter((a) => a.status_verifikasi === 'Menunggu Verifikasi').sort((x, y) => String(x.tgl_daftar).localeCompare(String(y.tgl_daftar))),
      alumni: ang.filter((a) => a.status_verifikasi === 'Disetujui'),
      chg: d.pengajuan.filter((p) => p.status === 'Menunggu').sort((x, y) => String(x.diajukan_pada).localeCompare(String(y.diajukan_pada))),
      cari: (id) => ang.find((a) => a.id_record === id)
    };
  }
  IKH.adm = { D, statusKartu, sahBeda };

  /* ---------------- Layout ---------------- */
  const MENU = [
    ['MENU UTAMA'], ['/admin', 'Dasbor', 'dashboard'], ['/admin/verifikasi', 'Verifikasi Pendaftaran', 'how_to_reg', 'reg'], ['/admin/perubahan', 'Perubahan Data', 'edit_note', 'chg'],
    ['/admin/alumni', 'Data Alumni', 'groups'], ['/admin/kta', 'Kartu Digital KTA', 'badge'], ['/admin/rekap', 'Rekap & Laporan', 'summarize'],
    ['KONTEN & KOMUNIKASI'], ['/admin/beranda', 'Kelola Beranda', 'newspaper'], ['/admin/notifikasi', 'WhatsApp & Notifikasi', 'campaign'], ['/admin/crm', 'CRM Kontak', 'contacts'],
    ['SISTEM'], ['/admin/pengaturan', 'Pengaturan', 'settings'], ['/admin/impor', 'Impor Data Lama', 'upload_file'], ['/admin/log', 'Log Aktivitas', 'history'], ['/admin/arsip', 'Arsip', 'inventory_2']
  ];
  function layout() {
    return '<div class="adm"><aside class="side" id="side" aria-label="Menu Pengurus"><div class="top" id="s-top"></div><nav id="s-nav"></nav><div class="bot" id="s-bot"></div></aside>' +
      '<div class="adm-body" style="min-width:0"><header class="adm-top"><button class="btn btn-ghost btn-icon btn-sm burger" id="s-burger" aria-label="Buka menu" style="display:none">' + ic('menu') + '</button>' +
      '<div class="crumb" id="s-crumb"></div><div class="grow"></div><button class="sync" id="sync" title="Segarkan data dari server"><span class="dot"></span><span id="sync-t">Memuat…</span>' + ic('refresh', 'sm') + '</button>' +
      '<a class="btn btn-ghost btn-sm" href="#/" title="Lihat situs publik">' + ic('open_in_new', 'sm') + '<span class="hide-sm">Situs</span></a></header>' +
      '<main id="main" class="adm-main" tabindex="-1"></main></div></div>';
  }
  function bingkai(aktif, judul) {
    const x = D(), st = x.st, me = Sesi.me || {};
    $('#s-top').innerHTML = '<span class="lg" ' + IKH.logoBg(st, 160) + '></span>' + '<div><div class="t1">SIM ' + esc(st.ORG_SINGKAT || 'IKALLHUBDAT') + '</div><div class="t2">Panel Pengurus ' + IKH.chipVersi('gelap') + '</div></div>';
    const n = { reg: x.menunggu.length, chg: x.chg.length };
    // Peran ganda: Pengurus juga bisa membuka data alumni & KTA miliknya (bukan untuk akses darurat)
    const menu = me.darurat ? MENU : MENU.concat([['AKUN SAYA'], ['/anggota', 'Data & KTA Saya', 'badge']]);
    $('#s-nav').innerHTML = menu.map((m) => m.length === 1 ? '<div class="grp">' + m[0] + '</div>' : '<a href="#' + m[0] + '" class="' + (m[0] === aktif ? 'on' : '') + '">' + ic(m[2]) + '<span>' + m[1] + '</span>' + (m[3] && n[m[3]] ? '<span class="count">' + n[m[3]] + '</span>' : '') + '</a>').join('');
    $('#s-bot').innerHTML = UI.ava(me.nama || 'P', '', '') + '<div class="grow" style="min-width:0"><div class="nm trunc">' + esc(me.nama || me.email) + '</div><div class="rl">' + (me.darurat ? 'Akses Darurat' : 'Pengurus') + '</div></div><button id="s-out" aria-label="Keluar" title="Keluar">' + ic('logout') + '</button>';
    $('#s-crumb').innerHTML = '<span>' + esc(st.ORG_SINGKAT || 'IKALLHUBDAT') + '</span>' + ic('chevron_right', 'sm') + '<b>' + esc(judul) + '</b>';
    $('#s-out').onclick = async () => { if (!(await UI.konfirmasi('Keluar dari Panel Pengurus?', { ya: 'Keluar' })).ok) return; api('auth.logout', {}); Sesi.keluar(); };
    $('#sync').onclick = () => Store.admBoot(true);
    const side = $('#side'), burger = $('#s-burger');
    burger.style.display = window.innerWidth <= 1024 ? 'inline-flex' : 'none';
    burger.onclick = () => { side.classList.add('open'); const sc = document.createElement('div'); sc.className = 'side-scrim'; sc.onclick = () => { side.classList.remove('open'); sc.remove(); }; document.body.appendChild(sc); };
    $$('#s-nav a').forEach((a) => a.addEventListener('click', () => { side.classList.remove('open'); const sc = $('.side-scrim'); if (sc) sc.remove(); }));
    IKH.Sync.tampil();
  }
  let _rid = 0;
  /** render(main, x, awal): awal=true saat pertama dibuka, false saat data disegarkan di latar */
  async function halaman(aktif, judul, render) {
    IKH.judul(judul);
    const rid = ++_rid;
    IKH.pasangLayout('adm', layout);
    const main = $('#main');
    let awal = true;
    const hidup = () => rid === _rid && document.body.contains(main);
    const gambar = () => { if (!hidup() || !Store.adm) return; bingkai(aktif, judul); try { render(main, D(), awal); } catch (e) { console.error(e); main.innerHTML = '<div class="alert bad">' + ic('error') + '<div>Gagal menampilkan halaman: ' + esc(e.message) + '</div></div>'; } awal = false; };
    Store.muatAdmLokal();
    const p = Store.admBoot();
    if (Store.adm) gambar(); else { bingkai(aktif, judul); main.innerHTML = '<div class="card">' + UI.skel(8) + '</div>'; }
    const ev = () => { if (hidup()) gambar(); else document.removeEventListener('ikh:adm', ev); };
    document.addEventListener('ikh:adm', ev);
    await p;
    if (!Store.adm && rid === _rid) main.innerHTML = '<div class="alert bad">' + ic('error') + '<div>Data tidak dapat dimuat. Periksa koneksi lalu klik indikator sinkron di kanan atas.</div></div>';
    // prefetch menu sekunder saat browser senggang (jatuh dalam 1 batch)
    const prefetch = () => { IKH.ambil('konten', 'adm.konten', {}, 60000); IKH.ambil('notifr', 'notif.ringkas', {}, 60000, { tanpaLokal: true }); };
    if (window.requestIdleCallback) window.requestIdleCallback(prefetch, { timeout: 2500 }); else setTimeout(prefetch, 1200);
  }
  IKH.halamanAdm = halaman;
  const ph = (ikon, judul, sub, kanan) => '<div class="ph"><div class="ttl"><span class="ico">' + ic(ikon) + '</span><div><h1>' + esc(judul) + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div></div>' + (kanan ? '<div class="row wrap">' + kanan + '</div>' : '') + '</div>';
  IKH.ph = ph;
  const opsi = (list, pilih, semua) => (semua !== false ? '<option value="">' + esc(semua || 'Semua') + '</option>' : '') + list.map((x) => '<option ' + (String(x) === String(pilih) ? 'selected' : '') + '>' + esc(x) + '</option>').join('');
  IKH.opsi = opsi;
  const uniq = (arr) => Array.from(new Set(arr.filter((x) => x !== '' && x !== undefined && x !== null))).sort((a, b) => String(a).localeCompare(String(b), 'id', { numeric: true }));
  IKH.uniq = uniq;
  const personCell = (a) => '<div class="person">' + UI.ava(a.nama, a.foto_id) + '<div style="min-width:0"><div class="nm trunc">' + esc(a.nama) + '</div><div class="sb trunc">' + esc(a.email || a.no_hp || a.id_record) + '</div></div></div>';

  /* ======================= DASBOR ======================= */
  function dasbor() {
    return halaman('/admin', 'Dasbor', (main, x) => {
      const ak = x.alumni.filter((a) => { const s = fmt.sisaHari(a.masa_berlaku_kartu); return statusKartu(a) === 'Aktif' && s !== null && s <= 30; });
      const beda = x.alumni.filter((a) => sahBeda(a, x.st));
      const aktif = x.alumni.filter((a) => statusKartu(a) === 'Aktif').length;
      const baruMinggu = x.d.anggota.filter((a) => a.tgl_daftar && Date.now() - new Date(a.tgl_daftar).getTime() < 7 * 864e5).length;
      main.innerHTML = ph('dashboard', 'Dasbor Pengurus', 'Ringkasan keanggotaan ' + esc(x.st.ORG_NAMA || ''), '<a class="btn btn-gold btn-sm" href="#/admin/rekap">' + ic('summarize', 'sm') + 'Rekap Cepat</a>') +
        '<div class="grid g4">' +
        kpi('w', 'how_to_reg', 'Pendaftaran Masuk', 'Menunggu Verifikasi', x.menunggu.length, 'berkas', '+' + baruMinggu + ' dalam 7 hari', '#/admin/verifikasi') +
        kpi('', 'edit_note', 'Pembaruan Mandiri', 'Perubahan Data', x.chg.length, 'pengajuan', 'Menunggu persetujuan', '#/admin/perubahan') +
        kpi('o', 'groups', 'Basis Data', 'Alumni Terverifikasi', x.alumni.length, 'orang', aktif + ' KTA aktif', '#/admin/alumni') +
        kpi('g', 'event_busy', 'Siklus Keanggotaan', 'KTA ≤ 30 Hari', ak.length, 'anggota', 'Perlu pengingat', '#/admin/kta?f=30') + '</div>' +
        kartuPeta() +
        '<div class="grid mt-lg" style="grid-template-columns:minmax(0,1fr) 340px;align-items:start" id="dg">' +
        '<div class="col gap-lg"><section class="card"><div class="card-h"><div><h3 class="row"><span class="dot"></span>Antrean Verifikasi Pendaftaran</h3><div class="sub">Pendaftar terlama tampil lebih dulu</div></div><a class="btn btn-ghost btn-sm" href="#/admin/verifikasi">Lihat semua' + ic('arrow_forward', 'sm') + '</a></div>' +
        (x.menunggu.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama alumni</th><th>NIT</th><th>Prodi & angkatan</th><th>Tanggal daftar</th><th></th></tr></thead><tbody>' +
          x.menunggu.slice(0, 6).map((a) => '<tr class="clk" data-go="/admin/verifikasi?id=' + esc(a.id_record) + '"><td>' + '<div class="person">' + UI.ava(a.nama, a.foto_id) + '<div><div class="nm">' + esc(a.nama) + '</div><div class="sb">' + esc(a.instansi || '-') + '</div></div></div></td><td class="mono">' + esc(a.nomor_taruna) + '</td><td>' + esc(a.prodi) + '<div class="small muted">Angk. ' + esc(a.angkatan) + ' • Lulus ' + esc(a.tahun_kelulusan) + '</div></td><td class="small">' + fmt.relatif(a.tgl_daftar) + '</td><td class="act"><span class="btn btn-ghost btn-xs">Tinjau' + ic('chevron_right', 'sm') + '</span></td></tr>').join('') + '</tbody></table></div>' : UI.kosong('Tidak ada pendaftaran yang menunggu. 🎉', 'task_alt')) + '</section>' +
        '<section class="card"><div class="card-h"><div><h3 class="row"><span class="dot info"></span>Pengajuan Perubahan Data Mandiri</h3><div class="sub">Data resmi berubah setelah disetujui</div></div><a class="btn btn-ghost btn-sm" href="#/admin/perubahan">Lihat semua' + ic('arrow_forward', 'sm') + '</a></div>' +
        (x.chg.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Anggota</th><th>Isian diubah</th><th>Diajukan</th><th></th></tr></thead><tbody>' +
          x.chg.slice(0, 5).map((p) => '<tr class="clk" data-go="/admin/perubahan?id=' + esc(p.id_pengajuan) + '"><td><b>' + esc(p.nama) + '</b><div class="small muted mono">' + esc(p.id_pengajuan) + '</div></td><td><span class="badge b-gold">' + esc(p.field_diubah) + '</span></td><td class="small">' + fmt.relatif(p.diajukan_pada) + '</td><td class="act"><span class="btn btn-ghost btn-xs">' + ic('visibility', 'sm') + 'Periksa</span></td></tr>').join('') + '</tbody></table></div>' : UI.kosong('Tidak ada pengajuan perubahan.', 'task_alt')) + '</section></div>' +
        '<div class="col gap-lg"><section class="card navy card-b"><div class="row between mb"><div class="kicker" style="color:#B9C6E4">Aksi Cepat Pengurus</div>' + ic('bolt') + '</div><div class="quick">' +
        '<a href="#/admin/kta' + (beda.length ? '?f=sah' : '?f=') + '"><span class="ico">' + ic('badge') + '</span><span class="grow"><b>Kartu Digital KTA</b><span class="s">' + (beda.length ? beda.length + ' kartu disahkan ketua sebelumnya' : 'Pratinjau, simpan & sahkan ulang') + '</span></span>' + ic('chevron_right', 'sm') + '</a>' +
        '<a href="#/admin/rekap"><span class="ico g">' + ic('table_view') + '</span><span class="grow"><b>Ekspor Rekap Excel/PDF</b><span class="s">Filter per prodi/angkatan/status</span></span>' + ic('chevron_right', 'sm') + '</a>' +
        '<a href="#/admin/kta?f=30"><span class="ico o">' + ic('notifications') + '</span><span class="grow"><b>Pengingat Masa Berlaku</b><span class="s">' + ak.length + ' anggota ≤ 30 hari</span></span>' + ic('chevron_right', 'sm') + '</a></div></section>' +
        '<section class="card"><div class="card-h"><h4>Status Integrasi</h4><span id="int-st" class="badge b-mute">memeriksa…</span></div><div class="card-b" id="int-b">' + UI.skel(3) + '</div></section>' +
        '<section class="card"><div class="card-h"><h4>Aktivitas Terakhir</h4><a class="small" href="#/admin/log">Log lengkap</a></div><div class="card-b feed" style="padding-top:.25rem;padding-bottom:.25rem">' +
        (x.d.log.length ? x.d.log.slice(0, 8).map((l) => '<div class="it"><span class="dot ' + (/TOLAK|HAPUS|GAGAL|ARSIP/.test(l.aksi) ? 'bad' : /SETUJ|PULIH/.test(l.aksi) ? 'ok' : 'navy') + '"></span><div><b>' + esc(l.aksi.replace(/_/g, ' ').toLowerCase()) + '</b> ' + esc(l.entitas || '') + '<div class="w">' + esc(l.aktor) + ' • ' + fmt.relatif(l.waktu) + '</div></div></div>').join('') : '<p class="small muted">Belum ada aktivitas.</p>') + '</div></section></div></div>';
      if (window.innerWidth < 1180) $('#dg').style.gridTemplateColumns = '1fr';
      $$('[data-go]', main).forEach((tr) => tr.onclick = () => Router.go(tr.dataset.go));
      $$('.kpi', main).forEach((k) => k.onclick = () => Router.go(k.dataset.href));
      gambarPeta();
      IKH.ambil('notifr', 'notif.ringkas', {}, 60000, { tanpaLokal: true }).then((n) => {
        const b = $('#int-b'); if (!b || !n) return;
        $('#int-st').className = 'badge ' + (n.emailAktif ? 'b-ok' : 'b-wait'); $('#int-st').textContent = n.emailAktif ? 'Normal' : 'Email nonaktif';
        b.innerHTML = '<div class="kv"><div>Database</div><div><span class="badge b-ok">Google Sheets aktif</span></div><div>Sisa kuota email hari ini</div><div class="tnum">' + n.kuotaEmail + '</div>' +
          '<div>Notifikasi email</div><div>' + (n.emailAktif ? 'Aktif' : 'Nonaktif') + '</div><div>WhatsApp (Fonnte)</div><div>' + (n.waAktif ? 'Aktif' : 'Nonaktif') + '</div><div>Antrean notifikasi</div><div>' + (n.antrianAda ? '<span class="badge b-wait">ada antrean</span>' : 'kosong') + '</div>' +
          '<div>Versi aplikasi / server</div><div>' + IKH.chipVersi() + ' <span class="small muted">server v' + esc(IKH.Versi.server || '-') + '</span></div></div>' +
          '<a class="btn btn-ghost btn-sm btn-block mt" href="#/admin/notifikasi">' + ic('campaign', 'sm') + 'Kelola Notifikasi</a>';
      });
    });
  }
  const kpi = (k, ikon, t, h, n, sat, ft, href) => '<div class="card kpi ' + k + '" data-href="' + href.slice(1) + '" role="link" tabindex="0"><span class="ico">' + ic(ikon) + '</span><div class="t">' + t + '</div><div class="h">' + h + '</div><div class="n tnum">' + fmt.angka(n) + '<small>' + sat + '</small></div><div class="ft"><span>' + ft + '</span>' + ic('chevron_right', 'sm') + '</div></div>';

  /* ======================= PETA SEBARAN DOMISILI ======================= */
  const DOM = [['6472', 'Kota Samarinda'], ['6471', 'Kota Balikpapan'], ['6474', 'Kota Bontang'], ['6402', 'Kabupaten Kutai Kartanegara'], ['6408', 'Kabupaten Kutai Timur'],
    ['6407', 'Kabupaten Kutai Barat'], ['6411', 'Kabupaten Mahakam Ulu'], ['6401', 'Kabupaten Paser'], ['6409', 'Kabupaten Penajam Paser Utara'], ['6403', 'Kabupaten Berau']];
  const NAMA_DOM = {}; DOM.forEach((d) => { NAMA_DOM[d[0]] = d[1]; });
  NAMA_DOM.LUAR = 'Luar Kalimantan Timur'; NAMA_DOM.KOSONG = 'Domisili belum diisi'; NAMA_DOM['?'] = 'Tidak dikenali';
  const ALIAS_DOM = { samarinda: '6472', smd: '6472', balikpapan: '6471', bpp: '6471', bontang: '6474', kutaikartanegara: '6402', kukar: '6402', tenggarong: '6402',
    kutaitimur: '6408', kutim: '6408', sangatta: '6408', sangata: '6408', kutaibarat: '6407', kubar: '6407', sendawar: '6407', mahakamulu: '6411', mahulu: '6411',
    paser: '6401', pasir: '6401', tanahgrogot: '6401', penajampaserutara: '6409', ppu: '6409', penajam: '6409', berau: '6403', tanjungredeb: '6403' };
  const ALIAS_PANJANG = Object.keys(ALIAS_DOM).filter((k) => k.length >= 5).sort((a, b) => b.length - a.length);
  /** Teks domisili bebas (data lama/impor) → kode kab/kota BPS, 'LUAR', '?' atau '' */
  function kodeDomisili(v) {
    const s = String(v || '').toLowerCase().replace(/\b(kabupaten|kab|kota|kotamadya|kodya)\b\.?/g, '').replace(/[^a-z]/g, '');
    if (!s) return '';
    if (ALIAS_DOM[s]) return ALIAS_DOM[s];
    if (/luar(kaltim|kalimantantimur|provinsi|daerah)/.test(s) || /^luar/.test(s)) return 'LUAR';
    for (const k of ALIAS_PANJANG) if (s.indexOf(k) > -1) return ALIAS_DOM[k];
    return '?';
  }
  IKH.kodeDomisili = kodeDomisili; IKH.NAMA_DOM = NAMA_DOM; IKH.DOM = DOM;
  const PT = { mode: 'alumni' };
  function kartuPeta() {
    return '<section class="card mt-lg" id="pt-card"><div class="card-h"><div><h3 class="row">' + ic('map') + 'Peta Sebaran Alumni per Domisili</h3><div class="sub">Jumlah per kabupaten/kota di Kalimantan Timur • klik wilayah untuk melihat daftar alumninya</div></div>' +
      '<div class="seg" id="pt-mode" role="tablist" aria-label="Data yang dipetakan"><button data-m="alumni" class="' + (PT.mode === 'alumni' ? 'on' : '') + '">Alumni terverifikasi</button><button data-m="semua" class="' + (PT.mode === 'semua' ? 'on' : '') + '">Semua data</button></div></div>' +
      '<div class="card-b peta-wrap"><div class="peta" id="pt-peta">' + UI.skel(6) + '</div><div id="pt-list"></div></div></section>';
  }
  function hitungPeta() {
    const x = D();
    const src = PT.mode === 'alumni' ? x.alumni : x.d.anggota.filter((a) => a.status_verifikasi !== 'Ditolak');
    const n = {}, tak = {};
    src.forEach((a) => { const k = kodeDomisili(a.kota_domisili) || 'KOSONG'; n[k] = (n[k] || 0) + 1; if (k === '?') tak[a.kota_domisili] = (tak[a.kota_domisili] || 0) + 1; });
    return { n, tak, total: src.length };
  }
  async function gambarPeta() {
    const box = $('#pt-peta'); if (!box) return;
    $$('#pt-mode [data-m]').forEach((b) => b.onclick = () => { PT.mode = b.dataset.m; $$('#pt-mode [data-m]').forEach((y) => y.classList.toggle('on', y === b)); gambarPeta(); });
    let P;
    try { P = await IKH.Peta.muat(); } catch (e) { box.innerHTML = UI.kosong('Peta gagal dimuat. Periksa koneksi.', 'map'); return; }
    if (!$('#pt-peta')) return;
    const h = hitungPeta(), n = h.n;
    const dalam = P.wilayah.reduce((t, w) => t + (n[w.kode] || 0), 0);
    const persen = (v) => h.total ? Math.round(v / h.total * 1000) / 10 : 0;
    box.innerHTML = IKH.Peta.html(P, n, { klik: true, aria: 'Peta sebaran ' + (PT.mode === 'alumni' ? 'alumni terverifikasi' : 'seluruh data') + ' per kabupaten/kota di Kalimantan Timur' });
    const rows = P.wilayah.map((w) => ({ k: w.kode, nama: w.nama, v: n[w.kode] || 0 })).sort((a, b) => b.v - a.v || a.nama.localeCompare(b.nama));
    const baris = (k, nama, v, cls) => '<tr class="clk ' + (cls || '') + '" data-k="' + k + '"><td>' + esc(nama) + '</td><td class="right tnum b">' + fmt.angka(v) + '</td><td style="width:34%"><div class="progress"><i style="width:' + (h.total ? Math.max(v ? 3 : 0, v / h.total * 100) : 0) + '%"></i></div></td><td class="right tnum muted small">' + persen(v) + '%</td></tr>';
    $('#pt-list').innerHTML = '<div class="row between mb"><span class="small muted">' + fmt.angka(h.total) + ' orang • ' + fmt.angka(dalam) + ' di Kaltim (' + persen(dalam) + '%)</span><button class="btn btn-ghost btn-xs" id="pt-xls">' + ic('table_view', 'sm') + 'Ekspor</button></div>' +
      '<div class="tbl-wrap"><table class="tbl pt-tbl"><thead><tr><th>Kabupaten / Kota</th><th class="right">Jumlah</th><th></th><th class="right">%</th></tr></thead><tbody>' +
      rows.map((r) => baris(r.k, r.nama, r.v)).join('') +
      (n.LUAR ? baris('LUAR', NAMA_DOM.LUAR, n.LUAR, 'pt-x') : '') + (n.KOSONG ? baris('KOSONG', NAMA_DOM.KOSONG, n.KOSONG, 'pt-x') : '') + (n['?'] ? baris('?', NAMA_DOM['?'], n['?'], 'pt-x') : '') + '</tbody></table></div>' +
      (n['?'] ? '<p class="tiny muted mt mb-0">Tidak dikenali: ' + Object.keys(h.tak).slice(0, 8).map((t) => '"' + esc(t) + '" (' + h.tak[t] + ')').join(', ') + (Object.keys(h.tak).length > 8 ? ', …' : '') + '. Perbaiki isian domisili di Data Alumni.</p>' : '') +
      (n.KOSONG && h.total && n.KOSONG / h.total > 0.3 ? '<div class="alert warn small mt">' + ic('info', 'sm') + '<div>' + persen(n.KOSONG) + '% data belum mengisi domisili, sehingga peta belum mewakili seluruh anggota.</div></div>' : '');
    const buka = (k) => Router.go('/admin/alumni?dom=' + encodeURIComponent(k) + (PT.mode === 'alumni' ? '&st=terverifikasi' : ''));
    const sorot = IKH.Peta.pasang(box, {
      tip: (k) => '<b>' + esc(NAMA_DOM[k]) + '</b><br>' + fmt.angka(n[k] || 0) + ' orang • ' + persen(n[k] || 0) + '%',
      klik: buka,
      sorot: (k, on) => $$('#pt-list tr[data-k="' + k + '"]').forEach((el) => el.classList.toggle('on', on))
    });
    $$('#pt-list tr[data-k]').forEach((tr) => { tr.onclick = () => buka(tr.dataset.k); tr.onmouseenter = () => sorot(tr.dataset.k, true); tr.onmouseleave = () => sorot(tr.dataset.k, false); });
    $('#pt-xls').onclick = () => IKH.Ekspor.excel(rows.concat(['LUAR', 'KOSONG', '?'].filter((k) => n[k]).map((k) => ({ k, nama: NAMA_DOM[k], v: n[k] })))
      .map((r) => ({ 'Kabupaten/Kota': r.nama, Jumlah: r.v, 'Persen (%)': persen(r.v) })), 'Sebaran-Domisili-' + hariIni(), 'Sebaran');
  }

  /* ======================= VERIFIKASI PENDAFTARAN ======================= */
  const VS = { sel: null, q: '', prodi: '', tab: 'menunggu' };
  function verifikasi(p, q) {
    if (q && q.get('id')) { VS.sel = q.get('id'); VS.tab = 'menunggu'; }
    return halaman('/admin/verifikasi', 'Verifikasi Pendaftaran', (main, x, awal) => {
      if (awal) {
        main.innerHTML = ph('how_to_reg', 'Verifikasi Pendaftaran Anggota Baru', 'Tinjau kelengkapan data & berkas, lalu setujui untuk menerbitkan nomor anggota, akun, dan KTA digital.') +
          '<div class="split"><section class="card"><div class="tabs"><button data-tab="menunggu">Antrean <span class="count" id="v-n"></span></button><button data-tab="riwayat">Riwayat</button></div>' +
          '<div class="toolbar"><div class="inp-ic cari">' + ic('search') + '<input class="inp" id="v-q" placeholder="Cari nama, NIT, instansi…" value="' + esc(VS.q) + '"></div><select class="inp" id="v-prodi" style="max-width:100%"></select></div><div class="qlist" id="v-list"></div></section>' +
          '<section class="card" id="v-det" style="overflow:hidden"></section></div>';
        $('#v-q').oninput = IKH.debounce((e) => { VS.q = e.target.value; daftarV(); }, 200);
        $('#v-prodi').onchange = (e) => { VS.prodi = e.target.value; daftarV(); };
        $$('[data-tab]', main).forEach((b) => b.onclick = () => { VS.tab = b.dataset.tab; VS.sel = null; daftarV(); });
      }
      daftarV();
    });
  }
  function sumberV() {
    const x = D();
    const src = VS.tab === 'menunggu' ? x.menunggu : x.d.anggota.filter((a) => a.tgl_verifikasi && a.status_verifikasi !== 'Menunggu Verifikasi').sort((a, b) => String(b.tgl_verifikasi).localeCompare(String(a.tgl_verifikasi))).slice(0, 100);
    const q = VS.q.toLowerCase();
    return src.filter((a) => (!VS.prodi || a.prodi === VS.prodi) && (!q || [a.nama, a.nomor_taruna, a.instansi, a.email, a.id_record].join(' ').toLowerCase().indexOf(q) > -1));
  }
  function daftarV() {
    const x = D(), list = sumberV(), el = $('#v-list'); if (!el) return;
    $$('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === VS.tab));
    $('#v-n').textContent = x.menunggu.length;
    const ps = $('#v-prodi'); if (ps) ps.innerHTML = opsi(uniq(x.d.anggota.map((a) => a.prodi)), VS.prodi, 'Semua program studi');
    if (!VS.sel || !list.find((a) => a.id_record === VS.sel)) VS.sel = list[0] ? list[0].id_record : null;
    el.innerHTML = list.length ? list.map((a) => '<div class="qitem ' + (a.id_record === VS.sel ? 'on' : '') + '" data-id="' + esc(a.id_record) + '" role="button" tabindex="0"><div class="ft" ' + (a.foto_id ? bg(a.foto_id, 160) : '') + '>' + (a.foto_id ? '' : ic('person')) + '</div><div class="grow" style="min-width:0"><div class="row between"><span class="nm trunc">' + esc(a.nama) + '</span>' + UI.badgeStatus(VS.tab === 'menunggu' ? 'Menunggu' : a.status_verifikasi) + '</div>' +
      '<div class="mt mono">NIT ' + esc(a.nomor_taruna || '-') + ' • Angk. ' + esc(a.angkatan || '-') + '</div><div class="mt trunc">' + esc(a.prodi || '') + '</div><div class="mt">' + ic('calendar_month', 'sm') + ' ' + fmt.waktu(VS.tab === 'menunggu' ? a.tgl_daftar : a.tgl_verifikasi) + '</div></div></div>').join('')
      : UI.kosong(VS.tab === 'menunggu' ? 'Antrean kosong — semua pendaftaran sudah diproses.' : 'Belum ada riwayat.', 'task_alt');
    $$('.qitem', el).forEach((it) => { const go = () => { VS.sel = it.dataset.id; $$('.qitem', el).forEach((y) => y.classList.toggle('on', y === it)); detailV(); if (window.innerWidth <= 1024) $('#v-det').scrollIntoView({ behavior: 'smooth' }); }; it.onclick = go; it.onkeydown = (e) => { if (e.key === 'Enter') go(); }; });
    detailV();
  }
  function detailV() {
    const el = $('#v-det'); if (!el) return;
    const x = D(), a = VS.sel && x.cari(VS.sel);
    if (!a) { el.innerHTML = UI.kosong('Pilih pendaftar di sebelah kiri.', 'how_to_reg'); return; }
    const berkas = (() => { try { return JSON.parse(a.berkas_json || '[]'); } catch (e) { return []; } })();
    const dup = x.d.anggota.filter((b) => b.id_record !== a.id_record && b.status_verifikasi !== 'Ditolak' && ((a.no_hp && b.no_hp === a.no_hp) || (b.nama && String(b.nama).toLowerCase().replace(/[^a-z]/g, '') === String(a.nama).toLowerCase().replace(/[^a-z]/g, ''))));
    const k2 = (rows) => '<div class="kv2">' + rows.map((r) => '<div><div class="k">' + esc(r[0]) + '</div><div class="v">' + (r[2] ? r[1] : esc(r[1] || '-')) + '</div></div>').join('') + '</div>';
    const menunggu = a.status_verifikasi === 'Menunggu Verifikasi';
    el.innerHTML = '<div class="detail-h"><div class="ft" ' + (a.foto_id ? bg(a.foto_id, 300) : '') + ' id="v-ft" title="Perbesar foto"></div><div class="grow"><div class="k">TINJAU BERKAS PENDAFTAR <span class="mono" style="color:#B9C6E4">#' + esc(a.id_record) + '</span></div><h2>' + esc(a.nama) + '</h2><div class="s">Terdaftar ' + fmt.waktu(a.tgl_daftar) + ' • ' + esc(a.sumber || 'Pendaftaran Mandiri') + '</div></div>' + UI.badgeStatus(a.status_verifikasi) + '</div>' +
      (dup.length ? '<div class="alert warn" style="border-radius:0;border-left:0;border-right:0">' + ic('warning') + '<div><b>Kemungkinan data ganda:</b> ' + dup.map((b) => esc(b.nama) + ' (' + esc(b.id_record) + ', ' + esc(b.status_verifikasi) + ')').join('; ') + '</div></div>' : '') +
      '<div class="sect"><h4>' + ic('person') + '1. Data Pribadi & Kontak</h4>' + k2([['Jenis kelamin', a.jenis_kelamin], ['Tempat, tanggal lahir', [a.tempat_lahir, a.tanggal_lahir ? fmt.tgl(a.tanggal_lahir, true) : ''].filter(Boolean).join(', ')],
        ['Nomor WhatsApp', a.no_hp ? esc(a.no_hp) + ' <a class="badge b-ok" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(a.no_hp).replace(/^0/, '62')) + '">' + ic('chat', 'sm') + 'Chat</a>' : '-', true], ['Email', a.email], ['Domisili', a.kota_domisili], ['Alamat', a.alamat]]) + '</div>' +
      '<div class="sect"><h4>' + ic('school') + '2. Data Akademik Kedinasan</h4>' + k2([['Nomor Induk Taruna', '<span class="mono">' + esc(a.nomor_taruna || '-') + '</span>', true], ['Angkatan', a.angkatan], ['Program studi', a.prodi], ['Tahun lulus', a.tahun_kelulusan]]) + '</div>' +
      '<div class="sect"><h4>' + ic('work') + '3. Kepegawaian & Penempatan</h4>' + k2([['Status kepegawaian', a.status_kepegawaian], ['Instansi', a.instansi], ['Jabatan terakhir', a.jabatan_terakhir]]) + '</div>' +
      '<div class="sect"><h4>' + ic('folder_open') + '4. Dokumen Pendukung <span class="muted small" style="font-weight:500">' + (berkas.length + (a.foto_id ? 1 : 0)) + ' berkas</span></h4><div class="berkas">' +
      (a.foto_id ? '<div class="bk"><div class="im" ' + bg(a.foto_id, 300) + '></div><b class="small">Pas foto KTA</b><button class="btn btn-ghost btn-xs" data-bk="' + esc(a.foto_id) + '">' + ic('visibility', 'sm') + 'Lihat</button></div>' : '') +
      berkas.map((b) => '<div class="bk"><div class="im">' + ic(b.tipe === 'application/pdf' ? 'picture_as_pdf' : 'image', 'xl') + '</div><b class="small trunc" title="' + esc(b.nama) + '">' + esc(b.nama) + '</b><button class="btn btn-ghost btn-xs" data-bk="' + esc(b.id) + '">' + ic('visibility', 'sm') + 'Lihat berkas</button></div>').join('') +
      (!berkas.length && !a.foto_id ? '<p class="small muted">Tidak ada berkas.</p>' : '') + '</div></div>' +
      (a.catatan_verifikasi ? '<div class="sect"><h4>' + ic('description') + 'Catatan verifikasi</h4><p class="mb-0">' + esc(a.catatan_verifikasi) + '</p><p class="small muted mb-0">Oleh ' + esc(a.diverifikasi_oleh || '-') + ' • ' + fmt.waktu(a.tgl_verifikasi) + '</p></div>' : '') +
      (menunggu ? '<div class="sect" style="border:0"><div class="alert gold">' + ic('bolt') + '<div><b>Saat disetujui, sistem otomatis:</b> (1) menerbitkan nomor anggota, (2) membuat akun & mengirim kata sandi awal ke email, (3) membuat KTA PDF ber-QR dan melampirkannya di email, (4) mengirim WhatsApp bila aktif.</div></div></div>' +
        '<div class="sticky-act"><button class="btn btn-danger" id="v-tolak">' + ic('cancel') + 'Tolak</button><button class="btn btn-primary" id="v-setuju">' + ic('verified') + 'Setujui & Terbitkan KTA</button></div>'
        : (a.status_verifikasi === 'Disetujui' ? '<div class="sticky-act"><a class="btn btn-ghost" href="#/admin/alumni?id=' + esc(a.id_record) + '">' + ic('person') + 'Buka di Data Alumni</a></div>' : ''));
    const ft = $('#v-ft', el); if (ft && a.foto_id) ft.onclick = () => UI.lightbox(img(a.foto_id, 1200), a.nama);
    $$('[data-bk]', el).forEach((b) => b.onclick = () => lihatBerkas(a.id_record, b.dataset.bk, b));
    if (menunggu) {
      $('#v-setuju').onclick = () => setujuiReg(a);
      $('#v-tolak').onclick = () => tolakReg(a);
    }
  }
  async function lihatBerkas(idRec, fileId, btn) {
    const r = await UI.tombol(btn, () => api('adm.berkas', { id_record: idRec, file_id: fileId }));
    if (!r.ok) return UI.toast(r.msg, 'bad');
    if (/^image\//.test(r.data.tipe)) UI.lightbox('data:' + r.data.tipe + ';base64,' + r.data.data, r.data.nama);
    else IKH.bukaB64(r.data.data, r.data.tipe);
  }
  IKH.lihatBerkas = lihatBerkas;
  async function setujuiReg(a) {
    const k = await UI.konfirmasi('Setujui pendaftaran <b>' + esc(a.nama) + '</b> dan terbitkan KTA digital? Masa berlaku default ' + esc(D().st.MASA_BERLAKU_TAHUN || '3') + ' tahun.', { judul: 'Setujui Pendaftaran', ya: 'Setujui & Terbitkan', input: { label: 'Catatan (opsional)', ph: 'Mis. berkas lengkap', tipe: 'input' } });
    if (!k.ok) return;
    const lama = Object.assign({}, a);
    Store.patchAnggota({ id_record: a.id_record, status_verifikasi: 'Disetujui', tgl_verifikasi: new Date().toISOString(), catatan_verifikasi: k.nilai });   // optimistis
    VS.sel = null; daftarV(); bingkai('/admin/verifikasi', 'Verifikasi Pendaftaran');
    UI.toast('Memproses persetujuan ' + a.nama + '…', 'ok', 1800);
    const r = await api('adm.reg.setuju', { id_record: a.id_record, catatan: k.nilai });
    if (r.ok) { Store.patchAnggota(r.data.anggota); UI.toast(r.msg); }
    else { Store.patchAnggota(lama); UI.toast('Gagal menyetujui ' + a.nama + ': ' + r.msg, 'bad', 6000); }
    if (Router.parse().path === '/admin/verifikasi') { daftarV(); bingkai('/admin/verifikasi', 'Verifikasi Pendaftaran'); }
  }
  async function tolakReg(a) {
    const k = await UI.konfirmasi('Tolak pendaftaran <b>' + esc(a.nama) + '</b>? Alasan akan dikirim ke pendaftar.', { judul: 'Tolak Pendaftaran', ya: 'Tolak Pendaftaran', bahaya: true, input: { label: 'Alasan penolakan', wajib: true, ph: 'Mis. NIT tidak sesuai ijazah; mohon unggah ijazah yang jelas' } });
    if (!k.ok) return;
    const lama = Object.assign({}, a);
    Store.patchAnggota({ id_record: a.id_record, status_verifikasi: 'Ditolak', catatan_verifikasi: k.nilai, tgl_verifikasi: new Date().toISOString() });
    VS.sel = null; daftarV(); bingkai('/admin/verifikasi', 'Verifikasi Pendaftaran');
    const r = await api('adm.reg.tolak', { id_record: a.id_record, catatan: k.nilai });
    if (r.ok) { Store.patchAnggota(r.data.anggota); UI.toast(r.msg); } else { Store.patchAnggota(lama); UI.toast(r.msg, 'bad', 6000); }
    if (Router.parse().path === '/admin/verifikasi') daftarV();
  }

  /* ======================= PERUBAHAN DATA ======================= */
  const PS = { sel: null, tab: 'menunggu', q: '' };
  const parse = (s) => { try { return typeof s === 'string' ? JSON.parse(s || '{}') : (s || {}); } catch (e) { return {}; } };
  function perubahan(p, q) {
    if (q && q.get('id')) { PS.sel = q.get('id'); PS.tab = 'menunggu'; }
    return halaman('/admin/perubahan', 'Perubahan Data', (main, x, awal) => {
      if (awal) {
        main.innerHTML = ph('edit_note', 'Verifikasi Perubahan Data', 'Pengajuan pembaruan data dari anggota. Data resmi diperbarui hanya bila disetujui.') +
          '<div class="split"><section class="card"><div class="tabs"><button data-tab="menunggu">Menunggu <span class="count" id="c-n"></span></button><button data-tab="riwayat">Riwayat</button></div>' +
          '<div class="toolbar"><div class="inp-ic cari">' + ic('search') + '<input class="inp" id="c-q" placeholder="Cari nama / ID pengajuan…"></div></div><div class="qlist" id="c-list"></div></section><section class="card" id="c-det" style="overflow:hidden"></section></div>';
        $('#c-q').oninput = IKH.debounce((e) => { PS.q = e.target.value.toLowerCase(); daftarC(); }, 200);
        $$('[data-tab]', main).forEach((b) => b.onclick = () => { PS.tab = b.dataset.tab; PS.sel = null; daftarC(); });
      }
      daftarC();
    });
  }
  function daftarC() {
    const x = D(), el = $('#c-list'); if (!el) return;
    $$('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === PS.tab));
    $('#c-n').textContent = x.chg.length;
    const src = (PS.tab === 'menunggu' ? x.chg : x.d.pengajuan.filter((p) => p.status !== 'Menunggu').sort((a, b) => String(b.diputuskan_pada).localeCompare(String(a.diputuskan_pada))))
      .filter((p) => !PS.q || (p.nama + ' ' + p.id_pengajuan + ' ' + p.field_diubah).toLowerCase().indexOf(PS.q) > -1);
    if (!PS.sel || !src.find((p) => p.id_pengajuan === PS.sel)) PS.sel = src[0] ? src[0].id_pengajuan : null;
    el.innerHTML = src.length ? src.map((p) => { const a = x.cari(p.id_record) || {}; return '<div class="qitem ' + (p.id_pengajuan === PS.sel ? 'on' : '') + '" data-id="' + esc(p.id_pengajuan) + '" role="button" tabindex="0"><div class="ft" ' + (a.foto_id ? bg(a.foto_id, 160) : '') + '>' + (a.foto_id ? '' : ic('person')) + '</div><div class="grow" style="min-width:0"><div class="row between"><span class="nm trunc">' + esc(p.nama) + '</span>' + UI.badgeStatus(p.status) + '</div><div class="mt mono">' + esc(p.id_pengajuan) + '</div><div class="mt trunc">' + esc(p.field_diubah) + '</div><div class="mt">' + fmt.relatif(p.diajukan_pada) + '</div></div></div>'; }).join('') : UI.kosong('Tidak ada pengajuan.', 'task_alt');
    $$('.qitem', el).forEach((it) => { const go = () => { PS.sel = it.dataset.id; $$('.qitem', el).forEach((y) => y.classList.toggle('on', y === it)); detailC(); }; it.onclick = go; it.onkeydown = (e) => { if (e.key === 'Enter') go(); }; });
    detailC();
  }
  function detailC() {
    const el = $('#c-det'); if (!el) return;
    const x = D(), p = PS.sel && x.d.pengajuan.find((y) => y.id_pengajuan === PS.sel);
    if (!p) { el.innerHTML = UI.kosong('Pilih pengajuan di sebelah kiri.', 'edit_note'); return; }
    const a = x.cari(p.id_record) || {}, baru = parse(p.data_baru), lama = parse(p.data_lama), keys = Object.keys(baru).filter((k) => k[0] !== '_');
    const sel = (k, v) => k === 'foto_id' ? (v ? '<img src="' + esc(img(v, 200)) + '" alt="" style="width:64px;border-radius:8px;cursor:zoom-in" data-zoom="' + esc(v) + '">' : '-') : esc(v || '-');
    el.innerHTML = '<div class="detail-h"><div class="ft" ' + (a.foto_id ? bg(a.foto_id, 300) : '') + '></div><div class="grow"><div class="k">PENGAJUAN PERUBAHAN DATA <span class="mono" style="color:#B9C6E4">#' + esc(p.id_pengajuan) + '</span></div><h2>' + esc(p.nama) + '</h2><div class="s">' + esc(a.id_member || p.id_record) + ' • diajukan ' + fmt.waktu(p.diajukan_pada) + '</div></div>' + UI.badgeStatus(p.status) + '</div>' +
      '<div class="sect"><h4>' + ic('compare_arrows') + 'Rincian Perubahan</h4><div class="tbl-wrap"><table class="diff"><thead><tr><th>Isian</th><th>Data resmi saat pengajuan</th><th>Diajukan menjadi</th></tr></thead><tbody>' +
      keys.map((k) => '<tr><td>' + esc(LABEL[k] || k) + '</td><td class="lama">' + sel(k, lama[k]) + '</td><td class="baru">' + sel(k, baru[k]) + '</td></tr>').join('') + '</tbody></table></div>' +
      (baru._alasan ? '<div class="alert info mt">' + ic('info') + '<div><b>Keterangan anggota:</b> ' + esc(baru._alasan) + '</div></div>' : '') + '</div>' +
      '<div class="sect"><h4>' + ic('badge') + 'Data resmi saat ini</h4><div class="kv2">' + [['Nomor anggota', a.id_member], ['Instansi', a.instansi], ['Jabatan', a.jabatan_terakhir], ['WhatsApp', a.no_hp], ['Email', a.email], ['Status', statusKartu(a)]].map((r) => '<div><div class="k">' + r[0] + '</div><div class="v">' + esc(r[1] || '-') + '</div></div>').join('') + '</div></div>' +
      (p.status !== 'Menunggu' ? '<div class="sect" style="border:0"><p class="mb-0"><b>Keputusan:</b> ' + esc(p.status) + (p.catatan ? ' — ' + esc(p.catatan) : '') + '</p><p class="small muted mb-0">' + esc(p.diputuskan_oleh || '') + ' • ' + fmt.waktu(p.diputuskan_pada) + '</p></div>' :
        '<div class="sticky-act"><button class="btn btn-danger" id="c-tolak">' + ic('cancel') + 'Tolak</button><button class="btn btn-primary" id="c-setuju">' + ic('check_circle') + 'Setujui Perubahan</button></div>');
    $$('[data-zoom]', el).forEach((im) => im.onclick = () => UI.lightbox(img(im.dataset.zoom, 1200), 'Foto'));
    if (p.status === 'Menunggu') {
      $('#c-setuju').onclick = async () => {
        const k = await UI.konfirmasi('Setujui perubahan data <b>' + esc(p.nama) + '</b>? Data resmi langsung diperbarui' + (keys.some((z) => ['nama', 'foto_id', 'prodi', 'angkatan', 'nomor_taruna', 'instansi'].indexOf(z) > -1) ? ' dan KTA akan dibuat ulang saat diunduh' : '') + '.', { ya: 'Setujui', input: { label: 'Catatan (opsional)', tipe: 'input' } });
        if (!k.ok) return;
        const lama2 = Object.assign({}, p);
        Store.patchPengajuan({ id_pengajuan: p.id_pengajuan, status: 'Disetujui', catatan: k.nilai, diputuskan_pada: new Date().toISOString() });
        PS.sel = null; daftarC(); bingkai('/admin/perubahan', 'Perubahan Data');
        const r = await api('adm.chg.setuju', { id_pengajuan: p.id_pengajuan, catatan: k.nilai });
        if (r.ok) { Store.patchPengajuan(r.data.pengajuan); Store.patchAnggota(r.data.anggota); UI.toast(r.msg); }
        else { Store.patchPengajuan(lama2); UI.toast(r.msg, 'bad', 6000); }
        if (Router.parse().path === '/admin/perubahan') daftarC();
      };
      $('#c-tolak').onclick = async () => {
        const k = await UI.konfirmasi('Tolak pengajuan <b>' + esc(p.nama) + '</b>? Alasan dikirim ke anggota.', { ya: 'Tolak', bahaya: true, input: { label: 'Alasan penolakan', wajib: true } });
        if (!k.ok) return;
        const lama2 = Object.assign({}, p);
        Store.patchPengajuan({ id_pengajuan: p.id_pengajuan, status: 'Ditolak', catatan: k.nilai, diputuskan_pada: new Date().toISOString() });
        PS.sel = null; daftarC(); bingkai('/admin/perubahan', 'Perubahan Data');
        const r = await api('adm.chg.tolak', { id_pengajuan: p.id_pengajuan, catatan: k.nilai });
        if (r.ok) { Store.patchPengajuan(r.data.pengajuan); UI.toast(r.msg); } else { Store.patchPengajuan(lama2); UI.toast(r.msg, 'bad', 6000); }
        if (Router.parse().path === '/admin/perubahan') daftarC();
      };
    }
  }

  /* ======================= DATA ALUMNI ======================= */
  const AS = { q: '', prodi: '', angkatan: '', status: '', dom: '', jn: '', tbl: null };
  function alumni(p, q) {
    const buka = q && q.get('id'), tambahSaya = q && q.get('tambah') === '1';
    if (q && q.get('dom') !== null) { AS.dom = q.get('dom'); AS.status = q.get('st') === 'terverifikasi' ? '' : AS.status; AS.hanyaVer = q.get('st') === 'terverifikasi'; } else AS.hanyaVer = false;
    return halaman('/admin/alumni', 'Data Alumni', (main, x, awal) => {
      const data = x.d.anggota.map((a) => Object.assign({}, a, { _st: statusKartu(a), _jn: IKH.jenisAgt(a) }));
      if (awal || !AS.tbl || !$('#al-tbl')) {
        main.innerHTML = ph('groups', 'Data Alumni', fmt.angka(x.alumni.length) + ' terverifikasi • ' + fmt.angka(x.d.anggota.length) + ' total data', '<button class="btn btn-ghost btn-sm" id="al-xls">' + ic('table_view', 'sm') + 'Ekspor Excel</button><button class="btn btn-primary btn-sm" id="al-add">' + ic('person_add', 'sm') + 'Tambah Manual</button>') +
          '<section class="card"><div class="toolbar"><div class="inp-ic cari">' + ic('search') + '<input class="inp" id="al-q" placeholder="Cari nama, NIT, nomor anggota, instansi, email…" value="' + esc(AS.q) + '"></div>' +
          '<select class="inp" id="al-prodi" style="width:auto"></select><select class="inp" id="al-angk" style="width:auto"></select><select class="inp" id="al-dom" style="width:auto" aria-label="Domisili"></select><select class="inp" id="al-st" style="width:auto">' + opsi(['Aktif', 'Kedaluwarsa', 'Nonaktif', 'Menunggu Verifikasi', 'Ditolak'], AS.status, 'Semua status') + '</select><select class="inp" id="al-jn" style="width:auto" aria-label="Jenis anggota">' + opsi(['Biasa', 'Luar Biasa', 'Kehormatan'], AS.jn, 'Semua jenis') + '</select></div><div id="al-tbl"></div></section>';
        AS.tbl = IKH.Tabel($('#al-tbl'), {
          data, idKey: 'id_record', per: 25, cari: (a) => [a.nama, a.nomor_taruna, a.id_member, a.instansi, a.email, a.no_hp, a.prodi, a._jn].join(' '),
          kolom: [{ k: 'nama', label: 'Anggota', render: personCell }, { k: 'id_member', label: 'No. Anggota', render: (a) => '<span class="mono">' + esc(a.id_member || '-') + '</span>' },
            { k: 'angkatan', label: 'NIT / Angk.', render: (a) => '<span class="mono">' + esc(a.nomor_taruna || '-') + '</span><div class="small muted">Angk. ' + esc(a.angkatan || '-') + '</div>' },
            { k: 'prodi', label: 'Program studi' }, { k: 'instansi', label: 'Instansi', render: (a) => esc(a.instansi || '-') + '<div class="small muted">' + esc(a.jabatan_terakhir || '') + '</div>' },
            { k: '_st', label: 'Status', render: (a) => UI.badgeStatus(a._st) + (a._jn !== 'Biasa' ? '<div class="mt-0">' + IKH.badgeJenis(a, true) + '</div>' : '') }, { k: 'masa_berlaku_kartu', label: 'Berlaku s.d.', render: (a) => IKH.masaTeks(a) },
            { label: '', kelas: 'act', sort: false, render: () => '<button class="btn btn-ghost btn-xs" data-act="lihat">' + ic('visibility', 'sm') + '</button> <button class="btn btn-ghost btn-xs" data-act="ubah">' + ic('edit', 'sm') + '</button>' }],
          onRow: (a) => drawerAlumni(a.id_record), onAksi: (act, a) => act === 'ubah' ? formAlumni(a.id_record) : drawerAlumni(a.id_record)
        });
        $('#al-q').oninput = IKH.debounce((e) => { AS.q = e.target.value; AS.tbl.cari(AS.q); }, 200);
        ['al-prodi', 'al-angk', 'al-st', 'al-dom', 'al-jn'].forEach((id) => $('#' + id).onchange = () => { AS.prodi = $('#al-prodi').value; AS.angkatan = $('#al-angk').value; AS.status = $('#al-st').value; AS.dom = $('#al-dom').value; AS.jn = $('#al-jn').value; AS.hanyaVer = false; saringA(); });
        $('#al-add').onclick = () => formAlumni(null);
        $('#al-xls').onclick = () => IKH.Ekspor.excel(AS.tbl.hasil().map(baris), 'Data-Alumni-' + hariIni(), 'Alumni');
        if (AS.q) AS.tbl.cari(AS.q);
      } else AS.tbl.set(data);
      $('#al-prodi').innerHTML = opsi(uniq(x.d.anggota.map((a) => a.prodi)), AS.prodi, 'Semua prodi');
      $('#al-angk').innerHTML = opsi(uniq(x.d.anggota.map((a) => a.angkatan)), AS.angkatan, 'Semua angkatan');
      $('#al-dom').innerHTML = '<option value="">Semua domisili</option>' + DOM.concat([['LUAR', NAMA_DOM.LUAR], ['KOSONG', NAMA_DOM.KOSONG], ['?', NAMA_DOM['?']]]).map((d) => '<option value="' + d[0] + '" ' + (AS.dom === d[0] ? 'selected' : '') + '>' + esc(d[1]) + '</option>').join('');
      $('#al-st').value = AS.status;
      saringA();
      if (buka && awal) drawerAlumni(buka);
      if (tambahSaya && awal) { const me = Sesi.me || {}; formAlumni(null, { email: me.email || '', nama: me.nama || '' }); }
    });
  }
  function saringA() { if (AS.tbl) AS.tbl.saring((a) => (!AS.prodi || a.prodi === AS.prodi) && (!AS.angkatan || String(a.angkatan) === AS.angkatan) && (!AS.status || a._st === AS.status) && (!AS.hanyaVer || a.status_verifikasi === 'Disetujui') && (!AS.dom || (kodeDomisili(a.kota_domisili) || 'KOSONG') === AS.dom) && (!AS.jn || a._jn === AS.jn)); }
  const baris = (a) => ({ 'No. Anggota': a.id_member, Nama: a.nama, NIT: a.nomor_taruna, Angkatan: a.angkatan, 'Program Studi': a.prodi, 'Tahun Lulus': a.tahun_kelulusan, 'Status Kepegawaian': a.status_kepegawaian, Instansi: a.instansi, Jabatan: a.jabatan_terakhir, 'No. WhatsApp': a.no_hp, Email: a.email, 'Jenis Kelamin': a.jenis_kelamin, Domisili: a.kota_domisili, Status: statusKartu(a), 'Jenis Anggota': IKH.jenisAgt(a), 'Berlaku s.d.': IKH.seumurHidup(a) ? 'Seumur hidup' : a.masa_berlaku_kartu, 'Tgl Penetapan Jenis': a.tgl_penetapan || '', 'No. SK Penetapan': a.no_sk_penetapan || '', 'ID Registrasi': a.id_record });
  IKH.barisAlumni = baris;
  function drawerAlumni(id) {
    const x = D(), a = x.cari(id); if (!a) return UI.toast('Data tidak ditemukan.', 'bad');
    const akun = x.d.akun.find((k) => k.email === String(a.email || '').toLowerCase()) || x.d.akun.find((k) => k.id_record && k.id_record === a.id_record);
    const sc = document.createElement('div'); sc.className = 'scrim'; sc.style.placeItems = 'stretch end'; sc.style.padding = '0';
    const s = statusKartu(a);
    sc.innerHTML = '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Detail alumni"><div class="modal-h"><h3>Detail Alumni</h3><button class="btn btn-ghost btn-icon btn-sm" data-x aria-label="Tutup">' + ic('close') + '</button></div>' +
      '<div class="modal-b" style="flex:1"><div class="row gap-lg">' + UI.ava(a.nama, a.foto_id, 'lg sq') + '<div><h3 class="mb-0">' + esc(a.nama) + '</h3><div class="mono small">' + esc(a.id_member || a.id_record) + '</div><div class="row wrap mt">' + UI.badgeStatus(s) + (a.status_verifikasi === 'Disetujui' ? IKH.badgeJenis(a) : '') + (akun ? '<span class="badge ' + (akun.peran === 'pengurus' ? 'b-navy' : 'b-info') + '">' + (akun.peran === 'pengurus' ? 'Akun Pengurus' : 'Akun') + ' ' + esc(akun.status) + '</span>' : '<span class="badge b-mute">Belum punya akun</span>') + '</div></div></div>' +
      (a.status_verifikasi === 'Disetujui' ? '<div class="mt-lg" style="max-width:420px">' + Kta.depan(a, x.st) + '</div>' : '') +
      '<h4 class="mt-lg">Data Lengkap</h4><div class="kv">' + FIELD.map((k) => '<div>' + LABEL[k] + '</div><div>' + esc(a[k] || '-') + '</div>').join('') +
      '<div>Jenis anggota</div><div>' + esc('Anggota ' + IKH.jenisAgt(a)) + (a.tgl_penetapan ? '<div class="small muted">Ditetapkan ' + fmt.tgl(a.tgl_penetapan, true) + (a.no_sk_penetapan ? ' • SK ' + esc(a.no_sk_penetapan) : '') + (a.ket_penetapan ? '<br>' + esc(a.ket_penetapan) : '') + '</div>' : '') + '</div>' +
      '<div>Masa berlaku</div><div>' + IKH.masaTeks(a, true) + '</div>' + (a.kta_sah_pada ? '<div>Pengesahan KTA</div><div>' + esc(a.kta_sah_oleh || '(nama ketua belum diisi)') + '<div class="small muted">' + esc(a.kta_sah_jabatan || '') + ' • ' + fmt.tgl(a.kta_sah_pada, true) + '</div></div>' : '') + '<div>Tanggal daftar</div><div>' + fmt.waktu(a.tgl_daftar) + '</div><div>Diverifikasi</div><div>' + (a.tgl_verifikasi ? fmt.waktu(a.tgl_verifikasi) + ' • ' + esc(a.diverifikasi_oleh || '') : '-') + '</div><div>Sumber data</div><div>' + esc(a.sumber || '-') + '</div><div>Login terakhir</div><div>' + (akun && akun.login_terakhir ? fmt.waktu(akun.login_terakhir) : '-') + '</div></div></div>' +
      '<div class="modal-f"><button class="btn btn-danger" data-a="arsip">' + ic('inventory_2', 'sm') + 'Arsipkan</button>' + (akun ? '<button class="btn btn-ghost" data-a="reset">' + ic('lock_reset', 'sm') + 'Reset Sandi</button>' : '') +
      (a.status_verifikasi === 'Disetujui' ? '<button class="btn btn-ghost" data-a="jenis">' + ic('workspace_premium', 'sm') + 'Jenis Anggota</button><button class="btn btn-ghost" data-a="kta">' + ic('badge', 'sm') + 'Kartu Digital</button>' : '') + '<button class="btn btn-primary" data-a="ubah">' + ic('edit', 'sm') + 'Ubah Data</button></div></aside>';
    document.body.appendChild(sc);
    const tutup = () => sc.remove();
    sc.addEventListener('mousedown', (e) => { if (e.target === sc) tutup(); });
    $('[data-x]', sc).onclick = tutup;
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { tutup(); document.removeEventListener('keydown', k); } });
    $$('[data-a]', sc).forEach((b) => b.onclick = async () => {
      const act = b.dataset.a;
      if (act === 'ubah') { tutup(); formAlumni(id); }
      if (act === 'kta') pratinjau(a);
      if (act === 'jenis') formJenis(a, () => { tutup(); drawerAlumni(id); });
      if (act === 'reset') { const r = await UI.tombol(b, () => resetSandi(akun.email)); }
      if (act === 'arsip') {
        const k = await UI.konfirmasi('Pindahkan <b>' + esc(a.nama) + '</b> ke arsip? Akun login dinonaktifkan. Data dapat dipulihkan dari menu Arsip.', { bahaya: true, ya: 'Arsipkan', input: { label: 'Alasan', tipe: 'input' } });
        if (!k.ok) return;
        tutup(); Store.hapusAnggota(id); document.dispatchEvent(new CustomEvent('ikh:adm'));
        const r = await api('adm.alumni.hapus', { id_record: id, alasan: k.nilai });
        if (!UI.hasil(r)) Store.admBoot(true);
      }
    });
  }
  IKH.drawerAlumni = drawerAlumni;
  /** Tetapkan Anggota Luar Biasa / Kehormatan, atau kembalikan ke Biasa (v1.3.0, butuh backend v1.3.0) */
  function formJenis(a, selesai) {
    if (IKH.butuhServer('1.3.0', 'Penetapan jenis anggota')) return;
    const kini = IKH.jenisAgt(a), hari = hariIni(), thB = Number(D().st.MASA_BERLAKU_TAHUN) || 3;
    const plus = (ymd, n) => { const p = String(ymd || hari).split('-'); return (Number(p[0]) + n) + '-' + p[1] + '-' + p[2]; };
    const PIL = [['Luar Biasa', 'Alumni senior atau purna tugas. KTA berlaku 5 tahun sejak tanggal penetapan.'],
      ['Kehormatan', 'Alumni yang berjasa menonjol bagi organisasi, almamater, atau transportasi darat. KTA berlaku seumur hidup.'],
      ['Biasa', 'Cabut status ' + (kini === 'Biasa' ? 'khusus' : 'Anggota ' + kini) + '. KTA berlaku ' + thB + ' tahun sejak tanggal pencabutan.']];
    const awal = kini === 'Biasa' ? 'Luar Biasa' : 'Biasa';
    UI.modal({ judul: 'Jenis Anggota — ' + a.nama, isi:
      '<div class="col gap-lg"><div class="row wrap small muted">Saat ini: ' + IKH.badgeJenis(a) + (a.tgl_penetapan ? '<span>sejak ' + fmt.tgl(a.tgl_penetapan, true) + '</span>' : '') + '</div>' +
      '<div class="col" role="radiogroup" aria-label="Jenis anggota baru">' + PIL.map((p) => '<label class="cek' + (p[0] === kini ? ' muted' : '') + '"><input type="radio" name="jn" value="' + p[0] + '"' + (p[0] === awal ? ' checked' : '') + (p[0] === kini ? ' disabled' : '') + '><span><b>' + (p[0] === 'Biasa' ? 'Kembalikan ke Anggota Biasa' : 'Anggota ' + p[0]) + '</b>' + (p[0] === kini ? ' (saat ini)' : '') + '<br><span class="small muted">' + esc(p[1]) + '</span></span></label>').join('') + '</div>' +
      '<div class="form-grid"><div class="fld"><label for="jn-tgl" id="jn-tgl-l">Tanggal penetapan</label><input class="inp" type="date" id="jn-tgl" value="' + hari + '" max="' + hari + '"></div>' +
      '<div class="fld" id="jn-sk-f"><label for="jn-sk">Nomor SK penetapan <span class="muted">(opsional)</span></label><input class="inp" id="jn-sk" maxlength="100" placeholder="mis. SK/01/DPD-IKH/2026"></div></div>' +
      '<div class="fld"><label for="jn-als" id="jn-als-l">Alasan penetapan *</label><textarea class="inp" id="jn-als" rows="2" maxlength="300" placeholder="Tercatat di Log Aktivitas"></textarea></div>' +
      '<div class="alert info small" id="jn-info" aria-live="polite"></div></div>',
      onBuka: (md) => {
        const upd = () => {
          const j = ($('[name=jn]:checked', md) || {}).value, tgl = $('#jn-tgl', md).value || hari, cabut = j === 'Biasa';
          $('#jn-tgl-l', md).textContent = cabut ? 'Tanggal pencabutan' : 'Tanggal penetapan';
          $('#jn-als-l', md).textContent = cabut ? 'Alasan pencabutan *' : 'Alasan penetapan *';
          $('#jn-sk-f', md).classList.toggle('hide', cabut);
          const masa = j === 'Kehormatan' ? 'berlaku <b>seumur hidup</b>' : 'berlaku s.d. <b>' + fmt.tgl(plus(tgl, j === 'Luar Biasa' ? 5 : thB), true) + '</b>';
          $('#jn-info', md).innerHTML = ic('info') + '<div>KTA baru ' + masa + '. Kartu digital & pengesahannya <b>langsung diperbarui</b>. Nomor anggota, QR verifikasi, akun login, dan hak anggota tidak berubah.</div>';
        };
        $$('[name=jn]', md).forEach((r) => r.onchange = upd); $('#jn-tgl', md).onchange = upd; upd();
      },
      tombol: [{ teks: 'Batal' }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (md) => {
        const j = ($('[name=jn]:checked', md) || {}).value, als = $('#jn-als', md).value.trim(), tgl = $('#jn-tgl', md).value;
        if (!j) { UI.toast('Pilih jenis anggota.', 'warn'); return false; }
        if (!tgl || tgl > hari) { UI.toast('Isi tanggal yang tidak melewati hari ini.', 'warn'); $('#jn-tgl', md).focus(); return false; }
        if (!als) { UI.toast(j === 'Biasa' ? 'Tulis alasan pencabutan.' : 'Tulis alasan penetapan.', 'warn'); $('#jn-als', md).focus(); return false; }
        const r = await api('adm.alumni.jenis', { id_record: a.id_record, jenis: j, tanggal: tgl, no_sk: j === 'Biasa' ? '' : $('#jn-sk', md).value.trim(), alasan: als });
        if (!UI.hasil(r)) return false;
        Store.patchAnggota(r.data.anggota); document.dispatchEvent(new CustomEvent('ikh:adm'));
        if (selesai) selesai();
        return true;
      } }] });
  }
  IKH.formJenis = formJenis;
  async function resetSandi(email) {
    if (!(await UI.konfirmasi('Buat kata sandi sementara untuk <b>' + esc(email) + '</b>? Semua sesi akun itu akan berakhir.', { ya: 'Buat Sandi Sementara' })).ok) return;
    const r = await api('adm.akun.reset', { email });
    if (!r.ok) return UI.toast(r.msg, 'bad');
    tampilSandi(email, r.data.sandi, r.msg);
  }
  function tampilSandi(email, sandi, msg) {
    UI.modal({ judul: 'Kata Sandi Sementara', isi: '<div class="alert warn">' + ic('warning') + '<div>' + esc(msg || 'Catat sekarang — hanya tampil sekali.') + '</div></div><div class="kv mt"><div>Email</div><div>' + esc(email) + '</div><div>Kata sandi</div><div class="mono" style="font-size:18px">' + esc(sandi) + '</div></div><p class="small muted mt mb-0">Pemilik akun wajib menggantinya saat pertama masuk.</p>',
      tombol: [{ teks: 'Salin', ikon: 'content_copy', aksi: () => { UI.salin(sandi); return false; } }, { teks: 'Selesai', kelas: 'btn-primary' }] });
  }
  IKH.tampilSandi = tampilSandi;
  function formAlumni(id, awalIsi) {
    const x = D(), a = id ? x.cari(id) : (awalIsi || {}), me = Sesi.me || {};
    if (id && !a) return;
    const F = IKH.formAlumni(x.st, a);
    let foto = null;
    UI.modal({ judul: id ? 'Ubah Data Alumni' : 'Tambah Alumni Manual', lebar: 'lg', isi:
      '<form id="fa" novalidate><h4 class="row">' + ic('person', 'sm') + 'Identitas & Kontak</h4>' + F.identitas + '<hr class="sep"><h4 class="row">' + ic('school', 'sm') + 'Akademik</h4>' + F.akademik + '<hr class="sep"><h4 class="row">' + ic('work', 'sm') + 'Kepegawaian</h4>' + F.kepegawaian +
      '<hr class="sep"><h4 class="row">' + ic('badge', 'sm') + 'Keanggotaan</h4><div class="form-grid"><div class="fld"><label>Pas foto</label><label class="upload"><input type="file" id="fa-foto" accept="image/*"><span class="pv" id="fa-pv" ' + (a.foto_id ? bg(a.foto_id, 200) : '') + '>' + (a.foto_id ? '' : ic('photo_camera')) + '</span><span class="small">Pilih foto (opsional)</span></label></div>' +
      '<div class="col">' + (id ? '<div class="fld"><label for="fa-st">Status anggota</label><select class="inp" id="fa-st">' + opsi(['Aktif', 'Nonaktif', 'Kedaluwarsa'], a.status_anggota, false) + '</select></div>' : '') +
      '<div class="fld"><label for="fa-masa">Berlaku s.d.</label><input class="inp" type="date" id="fa-masa" value="' + esc(IKH.seumurHidup(a) ? '' : a.masa_berlaku_kartu || '') + '"' + (IKH.seumurHidup(a) ? ' disabled' : '') + '><span class="hint">' + (IKH.seumurHidup(a) ? 'Seumur hidup (Anggota Kehormatan). Ubah lewat tombol Jenis Anggota.' : id ? (IKH.jenisAgt(a) === 'Luar Biasa' ? 'Anggota Luar Biasa: 5 tahun sejak penetapan.' : '') : 'Kosongkan untuk default ' + esc(x.st.MASA_BERLAKU_TAHUN || 3) + ' tahun.') + '</span></div>' +
      '<div class="fld"><label for="fa-idm">Nomor anggota</label><input class="inp mono" id="fa-idm" value="' + esc(a.id_member || '') + '" placeholder="Otomatis bila kosong"></div></div></div>' +
      (!id ? '<div class="col mt"><label class="cek"><input type="checkbox" id="fa-aktif" checked><span>Langsung aktif (terbitkan nomor anggota tanpa antrean verifikasi)</span></label><label class="cek"><input type="checkbox" id="fa-akun" checked><span>Buat akun login & kirim email berisi kata sandi awal + KTA (bila email diisi)</span></label></div>' +
        (me.darurat ? '' : '<div class="alert info small mt">' + ic('link', 'sm') + '<div>Data Anda sendiri? Isi email dengan email akun Pengurus Anda (<b>' + esc(me.email || '') + '</b>). Data ini otomatis terhubung ke akun Anda dan bisa dibuka di menu <b>Data & KTA Saya</b> — tanpa akun atau kata sandi kedua.</div></div>') : '') + '</form>',
      tombol: [{ teks: 'Batal' }, { teks: id ? 'Simpan Perubahan' : 'Tambah Alumni', kelas: 'btn-primary', aksi: async (md) => {
        const frm = $('#fa', md), o = IKH.ambilForm(frm, FIELD);
        if (!IKH.validasiForm(frm, o, ['nama'])) return false;
        if (o.no_hp) o.no_hp = IKH.hp08(o.no_hp);
        if ($('#fa-st', md)) o.status_anggota = $('#fa-st', md).value;
        if ($('#fa-masa', md).value) o.masa_berlaku_kartu = $('#fa-masa', md).value;
        if ($('#fa-idm', md).value.trim()) o.id_member = $('#fa-idm', md).value.trim();
        const body = { data: o, foto: foto };
        if (id) body.id_record = id; else { body.langsung_aktif = $('#fa-aktif', md).checked; body.buat_akun = $('#fa-akun', md).checked; }
        const r = await api('adm.alumni.simpan', body);
        if (!UI.hasil(r)) return false;
        Store.patchAnggota(r.data.anggota); document.dispatchEvent(new CustomEvent('ikh:adm'));
        if (!id || r.data.taut) Store.admBoot(true);
        if (r.data.taut && r.data.taut === me.email) { LS.del('agt_' + me.email); Store.agt = null; }
        return true;
      } }],
      onBuka: (md) => { $('#fa-foto', md).onchange = async (e) => { try { foto = await IKH.bacaGambar(e.target.files[0], 800, 0.86); $('#fa-pv', md).style.backgroundImage = 'url(' + foto.data + ')'; $('#fa-pv', md).innerHTML = ''; } catch (er) { UI.toast(er.message, 'bad'); } }; }
    });
  }

  /* ======================= KTA ======================= */
  const KS = { f: '', q: '', tbl: null };
  function kta(p, q) {
    if (q && q.get('f') !== null) KS.f = q.get('f');
    if (['', 'sah', '30', 'exp', 'non', 'lb', 'kh'].indexOf(KS.f) === -1) KS.f = '';      // mis. tautan lama ?f=usang
    return halaman('/admin/kta', 'Kartu Digital KTA', (main, x, awal) => {
      const data = x.alumni.map((a) => Object.assign({}, a, { _st: statusKartu(a), _beda: sahBeda(a, x.st), _jn: IKH.jenisAgt(a), _sisa: IKH.seumurHidup(a) ? null : fmt.sisaHari(a.masa_berlaku_kartu) }));
      const n = { sah: data.filter((a) => a._beda).length, 30: data.filter((a) => a._st === 'Aktif' && a._sisa !== null && a._sisa <= 30).length, exp: data.filter((a) => a._st === 'Kedaluwarsa').length, non: data.filter((a) => a._st === 'Nonaktif').length,
        lb: data.filter((a) => a._jn === 'Luar Biasa').length, kh: data.filter((a) => a._jn === 'Kehormatan').length };
      if (awal || !$('#k-tbl')) {
        main.innerHTML = ph('badge', 'Manajemen KTA Digital', 'Pratinjau & simpan kartu, perpanjang masa berlaku, sahkan ulang, dan kirim pengingat kedaluwarsa.') +
          '<section class="card"><div class="toolbar" id="k-chips"></div><div class="toolbar"><div class="inp-ic cari">' + ic('search') + '<input class="inp" id="k-q" placeholder="Cari nama / nomor anggota…" value="' + esc(KS.q) + '"></div></div>' +
          '<div class="bulkbar hide" id="k-bulk"><b id="k-bn"></b><button class="btn btn-ghost btn-xs" data-b="semua">Pilih semua hasil</button><span class="grow"></span>' +
          '<button class="btn btn-primary btn-xs" data-b="perpanjang">' + ic('event_available', 'sm') + 'Perpanjang</button><button class="btn btn-ghost btn-xs" data-b="sahkan">' + ic('verified_user', 'sm') + 'Sahkan Ulang</button>' +
          '<button class="btn btn-ghost btn-xs" data-b="ingat">' + ic('notifications', 'sm') + 'Kirim Pengingat</button><button class="btn btn-text btn-xs" data-b="batal">Batal pilih</button></div><div id="k-tbl"></div></section>';
        KS.tbl = IKH.Tabel($('#k-tbl'), {
          data, idKey: 'id_record', pilih: true, per: 25, cari: (a) => [a.nama, a.id_member, a.nomor_taruna, a._jn].join(' '),
          kolom: [{ k: 'nama', label: 'Anggota', render: personCell }, { k: 'id_member', label: 'No. Anggota', render: (a) => '<span class="mono">' + esc(a.id_member) + '</span>' }, { k: '_st', label: 'Status', render: (a) => UI.badgeStatus(a._st) + (a._jn !== 'Biasa' ? '<div class="mt-0">' + IKH.badgeJenis(a, true) + '</div>' : '') },
            { k: 'masa_berlaku_kartu', label: 'Berlaku s.d.', render: (a) => IKH.masaTeks(a) + '<div class="small ' + (a._sisa !== null && a._sisa <= 30 ? '' : 'muted') + '" style="' + (a._sisa !== null && a._sisa <= 30 ? 'color:var(--bad);font-weight:600' : '') + '">' + (a._sisa === null ? '' : a._sisa < 0 ? 'lewat ' + Math.abs(a._sisa) + ' hari' : a._sisa + ' hari lagi') + '</div>' },
            { k: 'kta_sah_oleh', label: 'Disahkan oleh', render: (a) => a.kta_sah_pada ? '<div class="small' + (a._beda ? ' sah-beda' : '') + '">' + esc(a.kta_sah_oleh || '(nama ketua belum diisi)') + '</div><div class="tiny muted">' + fmt.tgl(a.kta_sah_pada) + (a._beda ? ' • bukan ketua saat ini' : '') + '</div>' : '<span class="tiny muted">—</span>' },
            { label: '', kelas: 'act', sort: false, render: () => '<button class="btn btn-ghost btn-xs" data-act="lihat" title="Pratinjau kartu">' + ic('visibility', 'sm') + '</button> <button class="btn btn-ghost btn-xs" data-act="simpan" title="Simpan kartu (gambar/PDF)">' + ic('download', 'sm') + '</button>' }],
          onPilih: (sel) => { $('#k-bulk').classList.toggle('hide', !sel.length); $('#k-bn').textContent = sel.length + ' dipilih'; },
          onAksi: (act, a) => act === 'simpan' ? IKH.Kartu.simpan(a.id_record) : pratinjau(a)
        });
        $('#k-q').oninput = IKH.debounce((e) => { KS.q = e.target.value; KS.tbl.cari(KS.q); }, 200);
        $$('[data-b]', main).forEach((b) => b.onclick = () => aksiMassalKta(b.dataset.b));
        if (KS.q) KS.tbl.cari(KS.q);
      } else KS.tbl.set(data);
      $('#k-chips').innerHTML = [['', 'Semua', data.length], ['sah', 'Pengesah bukan ketua saat ini', n.sah], ['30', '≤ 30 hari', n[30]], ['exp', 'Kedaluwarsa', n.exp], ['non', 'Nonaktif', n.non], ['lb', 'Luar Biasa', n.lb], ['kh', 'Kehormatan', n.kh]].map((c) => '<button class="chip ' + (KS.f === c[0] ? 'on' : '') + '" data-f="' + c[0] + '">' + c[1] + ' <span class="n">' + c[2] + '</span></button>').join('');
      $$('[data-f]', main).forEach((c) => c.onclick = () => { KS.f = c.dataset.f; kta(); });
      KS.tbl.saring((a) => !KS.f || (KS.f === 'sah' && a._beda) || (KS.f === '30' && a._st === 'Aktif' && a._sisa !== null && a._sisa <= 30) || (KS.f === 'exp' && a._st === 'Kedaluwarsa') || (KS.f === 'non' && a._st === 'Nonaktif') || (KS.f === 'lb' && a._jn === 'Luar Biasa') || (KS.f === 'kh' && a._jn === 'Kehormatan'));
    });
  }
  /** Pratinjau kartu seorang anggota: kedua sisi dengan QR asli (diambil dari server), lalu bisa disimpan. */
  function pratinjau(a) {
    const st = D().st;
    UI.modal({ judul: 'Kartu Digital — ' + a.nama, lebar: 'lg',
      isi: '<div class="grid g2"><div><div class="kicker mb">Sisi depan</div>' + Kta.depan(a, st) + '</div><div><div class="kicker mb">Sisi belakang</div>' + Kta.belakang(a, st) + '</div></div>' +
        '<p class="small muted mt mb-0" id="pv-ket">Memuat QR…</p>',
      tombol: [{ teks: 'Tutup' }, { teks: 'Simpan Kartu', kelas: 'btn-primary', ikon: 'download', aksi: async () => { await IKH.Kartu.simpan(a.id_record); return false; } }],
      onBuka: async (md) => {
        const ket = $('#pv-ket', md);
        if (IKH.butuhServer('1.4.0', 'Kartu digital')) { ket.textContent = 'QR tampil setelah backend diperbarui ke v1.4.0.'; return; }
        const r = await IKH.Kartu.ambil(a.id_record);
        if (!document.body.contains(md)) return;
        if (!r.ok) { ket.textContent = r.msg || 'QR tidak dapat dimuat.'; return; }
        await Kta.pasang(md, r.data);
        ket.innerHTML = 'Disahkan secara elektronik oleh <b>' + esc(r.data.sah.oleh || '(nama ketua belum diisi)') + '</b> (' + esc(r.data.sah.jabatan) + ') pada ' + fmt.tgl(r.data.sah.pada, true) + '. Ketuk QR untuk memperbesar. Anggota melihat kartu yang sama di Ruang Anggota, ditambah jam berjalan.';
      } });
  }
  async function aksiMassalKta(act) {
    if (act === 'semua') return KS.tbl.pilihSemuaHasil();
    if (act === 'batal') return KS.tbl.kosongkanPilihan();
    const sel = KS.tbl.terpilih(); if (!sel.length) return;
    const ids = sel.map((a) => a.id_record);
    if (act === 'sahkan') {
      if (IKH.butuhServer('1.4.0', 'Sahkan ulang KTA')) return;
      const st = D().st;
      if (!st.KETUA_NAMA) return UI.toast('Nama ketua belum diisi. Isi dulu di Pengaturan → Identitas Organisasi.', 'warn', 6000);
      if (!(await UI.konfirmasi('Sahkan ulang <b>' + ids.length + '</b> KTA atas nama <b>' + esc(st.KETUA_NAMA) + '</b> (' + esc(st.KETUA_JABATAN || 'Ketua') + ')?<br><span class="small muted">Nama pengesah & tanggal pengesahan di kartu diganti dengan ketua saat ini. QR pengesahan lama akan terbaca "sudah digantikan". Masa berlaku dan nomor anggota tidak berubah.</span>', { ya: 'Sahkan Ulang' })).ok) return;
      const m = UI.muat('Mengesahkan ulang…');
      const r = await api('adm.kta.sahkan', { ids }); m.tutup();
      if (!UI.hasil(r)) return;
      KS.tbl.kosongkanPilihan(); Store.admBoot(true);
    }
    if (act === 'perpanjang') {
      UI.modal({ judul: 'Perpanjang Masa Berlaku (' + ids.length + ' anggota)', isi: '<div class="col gap-lg"><div class="fld"><label>Tambah masa berlaku</label><div class="seg" id="pp-seg">' + [1, 2, 3, 5].map((t) => '<button type="button" data-t="' + t + '" class="' + (t === 3 ? 'on' : '') + '">+' + t + ' tahun</button>').join('') + '</div><span class="hint">Dihitung dari tanggal berlaku saat ini (atau hari ini bila sudah lewat). Anggota Luar Biasa selalu +5 tahun; Anggota Kehormatan (seumur hidup) dilewati.</span></div>' +
        '<div class="fld"><label for="pp-tgl">…atau tetapkan tanggal</label><input class="inp" type="date" id="pp-tgl"></div><label class="cek"><input type="checkbox" id="pp-n" checked><span>Kirim notifikasi perpanjangan ke anggota</span></label></div>',
        onBuka: (md) => $$('[data-t]', md).forEach((b) => b.onclick = () => $$('[data-t]', md).forEach((x) => x.classList.toggle('on', x === b))),
        tombol: [{ teks: 'Batal' }, { teks: 'Perpanjang', kelas: 'btn-primary', aksi: async (md) => {
          const tgl = $('#pp-tgl', md).value, t = +$('#pp-seg .on', md).dataset.t;
          const r = await api('adm.kta.perpanjang', { ids, tahun: tgl ? 0 : t, masa_berlaku: tgl, kirimNotif: $('#pp-n', md).checked });
          if (!UI.hasil(r)) return false; KS.tbl.kosongkanPilihan(); Store.admBoot(true); return true;
        } }] });
    }
    if (act === 'ingat') {
      if (!(await UI.konfirmasi('Kirim pengingat masa berlaku ke <b>' + ids.length + '</b> anggota (email/WhatsApp sesuai pengaturan notifikasi)?', { ya: 'Kirim' })).ok) return;
      UI.hasil(await api('adm.kta.pengingat', { ids }));
    }
  }
  /** Proses berblok dengan progres (menghindari batas 6 menit Apps Script) */
  async function prosesBlok(ids, ukuran, judul, fn) {
    let selesai = 0, gagal = [], henti = false;
    const sc = document.createElement('div'); sc.className = 'scrim';
    sc.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div class="modal-h"><h3>' + esc(judul) + '</h3></div><div class="modal-b"><div class="progress"><i style="width:0"></i></div><p class="mt mb-0" id="pb-t" aria-live="polite">Memulai…</p><div id="pb-g" class="small" style="color:var(--bad)"></div></div><div class="modal-f"><button class="btn btn-ghost" id="pb-x">Hentikan</button></div></div>';
    document.body.appendChild(sc);
    $('#pb-x', sc).onclick = () => { henti = true; $('#pb-x', sc).textContent = 'Menghentikan…'; };
    let antre = ids.slice();
    while (antre.length && !henti) {
      const blok = antre.splice(0, ukuran);
      const hasil = await fn(blok);
      hasil.forEach((h) => { if (h.ok) selesai++; else if (h.sisa) antre.unshift(h.id); else gagal.push(h); });
      $('i', sc).style.width = Math.round((selesai + gagal.length) / ids.length * 100) + '%';
      $('#pb-t', sc).textContent = selesai + ' dari ' + ids.length + ' selesai' + (gagal.length ? ', ' + gagal.length + ' gagal' : '');
      $('#pb-g', sc).innerHTML = gagal.slice(-5).map((g) => esc(g.id + ': ' + g.msg)).join('<br>');
    }
    $('#pb-x', sc).textContent = 'Tutup'; $('#pb-x', sc).className = 'btn btn-primary'; $('#pb-x', sc).onclick = () => sc.remove();
    UI.toast(selesai + ' berhasil' + (gagal.length ? ', ' + gagal.length + ' gagal' : '') + '.', gagal.length ? 'warn' : 'ok');
  }
  IKH.prosesBlok = prosesBlok;

  /* ======================= REKAP & LAPORAN ======================= */
  const RS = { prodi: '', angkatan: '', status: '', lulus: '', peg: '', jn: '', q: '' };
  function rekap() {
    return halaman('/admin/rekap', 'Rekap & Laporan', (main, x, awal) => {
      if (awal || !$('#r-hasil')) {
        main.innerHTML = ph('summarize', 'Rekap & Laporan Data Alumni', 'Saring data lalu unduh dalam format Excel atau PDF.', '<button class="btn btn-ghost btn-sm" id="r-pdf">' + ic('picture_as_pdf', 'sm') + 'Unduh PDF</button><button class="btn btn-gold btn-sm" id="r-xls">' + ic('table_view', 'sm') + 'Unduh Excel</button>') +
          '<section class="card mb"><div class="toolbar"><div class="inp-ic cari">' + ic('search') + '<input class="inp" id="r-q" placeholder="Cari nama, instansi…"></div><select class="inp" id="r-prodi" style="width:auto"></select><select class="inp" id="r-angk" style="width:auto"></select><select class="inp" id="r-lulus" style="width:auto"></select><select class="inp" id="r-peg" style="width:auto"></select>' +
          '<select class="inp" id="r-st" style="width:auto">' + opsi(['Aktif', 'Kedaluwarsa', 'Nonaktif', 'Menunggu Verifikasi', 'Ditolak'], RS.status, 'Semua status') + '</select><select class="inp" id="r-jn" style="width:auto" aria-label="Jenis anggota">' + opsi(['Biasa', 'Luar Biasa', 'Kehormatan'], RS.jn, 'Semua jenis') + '</select><button class="btn btn-text btn-sm" id="r-reset">Atur ulang</button></div><div id="r-ring" class="card-b sm row wrap gap-lg"></div></section>' +
          '<div class="grid g2 mb" id="r-sum"></div><section class="card"><div class="card-h"><h4>Tabel Data</h4><span class="small muted" id="r-n"></span></div><div id="r-hasil"></div></section>';
        RS.tbl = IKH.Tabel($('#r-hasil'), { data: [], idKey: 'id_record', per: 50, kolom: [{ k: 'nama', label: 'Nama' }, { k: 'id_member', label: 'No. Anggota', render: (a) => '<span class="mono">' + esc(a.id_member || '-') + '</span>' }, { k: 'angkatan', label: 'Angk.' }, { k: 'prodi', label: 'Program studi' }, { k: 'tahun_kelulusan', label: 'Lulus' }, { k: 'status_kepegawaian', label: 'Kepegawaian' }, { k: 'instansi', label: 'Instansi' }, { k: '_st', label: 'Status', render: (a) => UI.badgeStatus(a._st) }] });
        $('#r-q').oninput = IKH.debounce((e) => { RS.q = e.target.value.toLowerCase(); hitungR(); }, 200);
        [['r-prodi', 'prodi'], ['r-angk', 'angkatan'], ['r-lulus', 'lulus'], ['r-peg', 'peg'], ['r-st', 'status'], ['r-jn', 'jn']].forEach((p) => $('#' + p[0]).onchange = (e) => { RS[p[1]] = e.target.value; hitungR(); });
        $('#r-reset').onclick = () => { Object.assign(RS, { prodi: '', angkatan: '', status: '', lulus: '', peg: '', jn: '', q: '' }); $('#r-q').value = ''; rekap(); };
        $('#r-xls').onclick = () => IKH.Ekspor.excel(RS.data.map(baris), 'Rekap-Alumni-' + hariIni(), 'Rekap');
        $('#r-pdf').onclick = () => IKH.Ekspor.pdf({ judul: 'Rekap Data Alumni — ' + (x.st.ORG_NAMA || ''), sub: ringkasFilter() + ' • ' + RS.data.length + ' data', nama: 'Rekap-Alumni-' + hariIni(), rows: RS.data.map((a, i) => Object.assign({ no: i + 1 }, a)),
          kolom: [{ k: 'no', label: 'No' }, { k: 'nama', label: 'Nama' }, { k: 'id_member', label: 'No. Anggota' }, { k: 'nomor_taruna', label: 'NIT' }, { k: 'angkatan', label: 'Angk.' }, { k: 'prodi', label: 'Program Studi' }, { k: 'tahun_kelulusan', label: 'Lulus' }, { k: 'status_kepegawaian', label: 'Kepegawaian' }, { k: 'instansi', label: 'Instansi' }, { k: 'no_hp', label: 'WhatsApp' }, { k: '_st', label: 'Status' }, { k: '_jn', label: 'Jenis' }] });
      }
      const all = x.d.anggota;
      $('#r-prodi').innerHTML = opsi(uniq(all.map((a) => a.prodi)), RS.prodi, 'Semua prodi');
      $('#r-angk').innerHTML = opsi(uniq(all.map((a) => a.angkatan)), RS.angkatan, 'Semua angkatan');
      $('#r-lulus').innerHTML = opsi(uniq(all.map((a) => a.tahun_kelulusan)), RS.lulus, 'Semua tahun lulus');
      $('#r-peg').innerHTML = opsi(uniq(all.map((a) => a.status_kepegawaian)), RS.peg, 'Semua kepegawaian');
      hitungR();
    });
  }
  function ringkasFilter() { return [RS.prodi, RS.angkatan && 'Angkatan ' + RS.angkatan, RS.lulus && 'Lulus ' + RS.lulus, RS.peg, RS.status, RS.jn && 'Anggota ' + RS.jn].filter(Boolean).join(' • ') || 'Semua data'; }
  function hitungR() {
    const x = D();
    RS.data = x.d.anggota.map((a) => Object.assign({}, a, { _st: statusKartu(a), _jn: IKH.jenisAgt(a) })).filter((a) => (!RS.jn || a._jn === RS.jn) && (!RS.prodi || a.prodi === RS.prodi) && (!RS.angkatan || String(a.angkatan) === RS.angkatan) && (!RS.lulus || String(a.tahun_kelulusan) === RS.lulus) && (!RS.peg || a.status_kepegawaian === RS.peg) && (!RS.status || a._st === RS.status) && (!RS.q || [a.nama, a.instansi, a.id_member, a.nomor_taruna].join(' ').toLowerCase().indexOf(RS.q) > -1))
      .sort((a, b) => String(a.angkatan).localeCompare(String(b.angkatan), 'id', { numeric: true }) || String(a.nama).localeCompare(String(b.nama)));
    RS.tbl.set(RS.data); $('#r-n').textContent = fmt.angka(RS.data.length) + ' data • ' + ringkasFilter();
    const cnt = (f) => { const m = {}; RS.data.forEach((a) => { const k = a[f] || '(kosong)'; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort((a, b) => m[b] - m[a]).map((k) => [k, m[k]]); };
    const st = cnt('_st');
    $('#r-ring').innerHTML = '<span><b class="tnum" style="font-size:20px">' + fmt.angka(RS.data.length) + '</b> <span class="muted">data</span></span>' + st.map((s) => '<span>' + UI.badgeStatus(s[0]) + ' <b class="tnum">' + s[1] + '</b></span>').join('');
    const tb = (judul, rows) => '<section class="card"><div class="card-h"><h4>' + judul + '</h4></div><div class="tbl-wrap" style="max-height:260px"><table class="tbl"><thead><tr><th>' + judul.replace('Per ', '') + '</th><th class="right">Jumlah</th><th class="right">%</th></tr></thead><tbody>' + rows.map((r) => '<tr><td>' + esc(r[0]) + '</td><td class="right tnum">' + r[1] + '</td><td class="right tnum muted">' + (RS.data.length ? Math.round(r[1] / RS.data.length * 100) : 0) + '%</td></tr>').join('') + '</tbody></table></div></section>';
    $('#r-sum').innerHTML = tb('Per Program Studi', cnt('prodi')) + tb('Per Angkatan', cnt('angkatan')) + tb('Per Jenis Anggota', cnt('_jn').map((r) => ['Anggota ' + r[0], r[1]]));
  }

  /* ======================= LOG ======================= */
  const LG = { aksi: '', q: '', limit: 500 };
  function log() {
    return halaman('/admin/log', 'Log Aktivitas', async (main, x, awal) => {
      if (!awal && $('#lg-tbl')) return;
      main.innerHTML = ph('history', 'Log Aktivitas (Jejak Audit)', 'Catatan seluruh aksi penting di sistem. Nilai rahasia (sandi/token) tidak pernah dicatat.', '<button class="btn btn-ghost btn-sm" id="lg-xls">' + ic('table_view', 'sm') + 'Ekspor</button><button class="btn btn-ghost btn-sm" id="lg-more">' + ic('history', 'sm') + 'Muat 3.000 terakhir</button>') +
        '<section class="card"><div class="toolbar"><div class="inp-ic cari">' + ic('search') + '<input class="inp" id="lg-q" placeholder="Cari aktor, entitas, detail…"></div><select class="inp" id="lg-aksi" style="width:auto"></select></div><div id="lg-tbl">' + UI.skel(8) + '</div></section>';
      const muat = async (paksa) => {
        const d = await IKH.ambil('log' + LG.limit, 'adm.log', { limit: LG.limit }, 15000, { paksa: paksa, tanpaLokal: true });
        if (!d || !$('#lg-tbl')) return;
        const rows = Store.urai(d.log);
        $('#lg-aksi').innerHTML = opsi(uniq(rows.map((r) => r.aksi)), LG.aksi, 'Semua aksi');
        const t = IKH.Tabel($('#lg-tbl'), { data: rows, idKey: 'id_log', per: 50, cari: (r) => [r.aktor, r.aksi, r.entitas, r.detail].join(' '),
          kolom: [{ k: 'waktu', label: 'Waktu', render: (r) => '<span class="nowrap small">' + fmt.waktu(r.waktu) + '</span>' }, { k: 'aktor', label: 'Aktor', render: (r) => esc(r.aktor) + '<div class="tiny muted">' + esc(r.peran) + '</div>' },
            { k: 'aksi', label: 'Aksi', render: (r) => '<span class="badge ' + (/TOLAK|HAPUS|GAGAL|ARSIP|HENTIKAN/.test(r.aksi) ? 'b-bad' : /SETUJ|PULIH|MASUK/.test(r.aksi) ? 'b-ok' : 'b-info') + '">' + esc(r.aksi) + '</span>' }, { k: 'entitas', label: 'Entitas', render: (r) => '<span class="mono small">' + esc(r.entitas) + '</span>' }, { k: 'detail', label: 'Detail', render: (r) => '<span class="small">' + esc(r.detail) + '</span>' }] });
        if (LG.q) t.cari(LG.q);
        t.saring((r) => !LG.aksi || r.aksi === LG.aksi);
        $('#lg-q').oninput = IKH.debounce((e) => { LG.q = e.target.value; t.cari(LG.q); }, 200);
        $('#lg-aksi').onchange = (e) => { LG.aksi = e.target.value; t.saring((r) => !LG.aksi || r.aksi === LG.aksi); };
        $('#lg-xls').onclick = () => IKH.Ekspor.excel(t.hasil().map((r) => ({ Waktu: fmt.waktu(r.waktu), Aktor: r.aktor, Peran: r.peran, Aksi: r.aksi, Entitas: r.entitas, Detail: r.detail })), 'Log-Aktivitas-' + hariIni(), 'Log');
      };
      $('#lg-more').onclick = () => { LG.limit = 3000; muat(true); };
      muat(false);
    });
  }

  /* ======================= ARSIP ======================= */
  function arsip() {
    return halaman('/admin/arsip', 'Arsip', async (main, x, awal) => {
      if (!awal && $('#ar-tbl')) return;
      main.innerHTML = ph('inventory_2', 'Arsip Data Terhapus', 'Data alumni yang diarsipkan dapat dipulihkan kembali.') + '<section class="card"><div id="ar-tbl">' + UI.skel(6) + '</div></section>';
      const r = await api('adm.arsip.list', {});
      if (!r.ok) return UI.toast(r.msg, 'bad');
      IKH.Tabel($('#ar-tbl'), { data: r.data.arsip, idKey: 'id_arsip', per: 25, kosong: 'Arsip kosong.',
        kolom: [{ k: 'nama', label: 'Nama', render: (a) => '<b>' + esc(a.nama) + '</b><div class="small mono muted">' + esc(a.id_ref) + (a.id_member ? ' • ' + esc(a.id_member) : '') + '</div>' }, { k: 'prodi', label: 'Prodi / Angk.', render: (a) => esc(a.prodi) + '<div class="small muted">Angk. ' + esc(a.angkatan) + '</div>' },
          { k: 'alasan', label: 'Alasan' }, { k: 'dihapus_pada', label: 'Diarsipkan', render: (a) => fmt.waktu(a.dihapus_pada) + '<div class="tiny muted">' + esc(a.dihapus_oleh) + '</div>' },
          { label: '', kelas: 'act', sort: false, render: () => '<button class="btn btn-ghost btn-xs" data-act="pulih" data-busy="…">' + ic('settings_backup_restore', 'sm') + 'Pulihkan</button>' }],
        onAksi: async (act, a, b) => {
          if (!(await UI.konfirmasi('Pulihkan <b>' + esc(a.nama) + '</b> ke Data Alumni?', { ya: 'Pulihkan' })).ok) return;
          const rr = await UI.tombol(b, () => api('adm.arsip.pulih', { id_arsip: a.id_arsip }));
          if (UI.hasil(rr)) { Store.patchAnggota(rr.data.anggota); arsip(); }
        } });
    });
  }

  /* ======================= PENGATURAN ======================= */
  const PG = { tab: 'org' };
  function pengaturan() {
    return halaman('/admin/pengaturan', 'Pengaturan', (main, x, awal) => {
      if (!awal && PG.edit) return;                           // jangan timpa isian yang sedang diubah
      const st = x.st, me = Sesi.me || {};
      const tabs = [['org', 'Identitas Organisasi', 'domain'], ['kta', 'Keanggotaan & KTA', 'badge'], ['akun', 'Akun Pengurus', 'manage_accounts'], ['aman', 'Keamanan', 'shield']];
      const t = (k, label, hint, tipe) => '<div class="fld"><label for="s-' + k + '">' + label + '</label>' + (tipe === 'area' ? '<textarea class="inp" id="s-' + k + '" data-k="' + k + '" rows="6">' + esc(st[k] || '') + '</textarea>' : '<input class="inp" id="s-' + k + '" data-k="' + k + '" type="' + (tipe || 'text') + '" value="' + esc(st[k] || '') + '">') + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
      PG.edit = false;
      main.innerHTML = ph('settings', 'Pengaturan Organisasi & Sistem', 'Identitas organisasi, logo & pengesah KTA, aturan KTA, dan akun Pengurus.') +
        '<section class="card"><div class="tabs">' + tabs.map((tb) => '<button data-tab="' + tb[0] + '" class="' + (PG.tab === tb[0] ? 'on' : '') + '">' + ic(tb[2], 'sm') + tb[1] + '</button>').join('') + '</div>' +
        '<div class="card-b ' + (PG.tab === 'org' ? '' : 'hide') + '" data-p="org"><div class="grid g2"><div class="col gap-lg">' + t('ORG_NAMA', 'Nama organisasi', 'Tercetak di KTA & header.') + t('ORG_NAMA_PANJANG', 'Kepanjangan') + t('ORG_SINGKAT', 'Nama singkat') + t('ORG_ALAMAT', 'Alamat sekretariat') +
        '<div class="grid g2">' + t('ORG_EMAIL', 'Email sekretariat', '', 'email') + t('ORG_TELEPON', 'Telepon') + t('ORG_WA', 'WhatsApp helpdesk', '08…', 'tel') + t('ORG_JAM_LAYANAN', 'Jam layanan') + '</div></div>' +
        '<div class="col gap-lg"><div class="fld"><label>Logo organisasi</label><div class="row gap-lg"><span style="width:84px;height:84px;border-radius:12px;border:1px solid var(--border);background:#fff center/contain no-repeat;' + (st.LOGO_ID ? 'background-image:url(\'' + img(st.LOGO_ID, 200) + '\')' : '') + '" id="lg-pv"></span><div class="col"><label class="btn btn-ghost btn-sm">' + ic('upload', 'sm') + 'Unggah Logo<input type="file" accept="image/png,image/jpeg,image/webp" class="hide" id="up-logo"></label>' + (st.LOGO_ID ? '<button class="btn btn-text btn-sm" id="del-logo">Hapus logo</button>' : '') + '<span class="hint">PNG latar transparan disarankan. Publik.</span></div></div></div>' +
        '<div class="grid g2">' + t('KETUA_NAMA', 'Nama ketua (pengesah KTA)') + t('KETUA_JABATAN', 'Jabatan pengesah') + '</div>' +
        '<div class="alert info small">' + ic('info', 'sm') + '<div>KTA disahkan secara elektronik: nama & jabatan ketua dicatat di kartu saat KTA terbit, diperpanjang, atau datanya berubah, dan dibuktikan dengan QR pengesahan. <b>Mengganti ketua di sini tidak mengubah kartu yang sudah terbit</b> — untuk memperbaruinya, buka Kartu Digital KTA → pilih anggota → Sahkan Ulang.</div></div>' +
        (st.TTD_KETUA_ID ? '<div class="alert warn small">' + ic('warning', 'sm') + '<div>Berkas tanda tangan ketua dari versi sebelumnya masih tersimpan di Drive dan <b>tidak dipakai lagi</b>. <button class="btn btn-text btn-sm" id="del-ttd" type="button">Hapus berkas tanda tangan</button></div></div>' : '') + '</div></div></div>' +
        '<div class="card-b ' + (PG.tab === 'kta' ? '' : 'hide') + '" data-p="kta"><div class="grid g2"><div class="col gap-lg"><div class="grid g2">' + t('MASA_BERLAKU_TAHUN', 'Masa berlaku KTA (tahun)', '1–10 tahun sejak disetujui.', 'number') + t('KTA_PREFIX', 'Awalan nomor anggota', 'Contoh hasil: ' + esc((st.KTA_PREFIX || 'IKH-KT') + '-' + new Date().getFullYear() + '-0001')) + '</div>' +
        '<div class="fld"><label class="switch"><input type="checkbox" id="s-daftar" ' + (st.PENDAFTARAN_DIBUKA !== 'TIDAK' ? 'checked' : '') + '><span class="tr"></span>Formulir pendaftaran publik dibuka</label></div>' +
        t('APP_URL', 'URL aplikasi (GitHub Pages)', 'Dipakai pada QR KTA & tautan email. Terisi otomatis saat Pengurus pertama masuk.', 'url') + t('DAFTAR_KOTA', 'Pilihan domisili (satu per baris)', '', 'area') + '</div>' +
        '<div class="col gap-lg">' + t('DAFTAR_PRODI', 'Daftar program studi (satu per baris)', 'Muncul di formulir & filter.', 'area') + t('DAFTAR_KEPEGAWAIAN', 'Daftar status kepegawaian (satu per baris)', '', 'area') + '</div></div></div>' +
        '<div class="' + (PG.tab === 'akun' ? '' : 'hide') + '" data-p="akun"><div class="toolbar"><span class="grow small muted">Akun Pengurus memiliki akses penuh. Batasi hanya untuk orang yang berwenang.</span><button class="btn btn-primary btn-sm" id="ak-add">' + ic('person_add', 'sm') + 'Tambah Pengurus</button></div><div id="ak-tbl"></div></div>' +
        '<div class="card-b ' + (PG.tab === 'aman' ? '' : 'hide') + '" data-p="aman"><div class="grid g2">' + (me.darurat ?
          '<form class="card card-b col gap-lg" id="f-dar"><h4>Ganti Sandi Akses Darurat</h4><p class="small muted mb-0">Wajib dirotasi setelah pemakaian pertama. Minimal 12 karakter, huruf dan angka.</p><div class="fld"><label for="dar-b">Sandi darurat baru</label><input class="inp" id="dar-b" type="password" autocomplete="new-password"></div><button class="btn btn-primary" type="submit">Simpan Sandi Darurat</button></form>'
          : '<form class="card card-b col gap-lg" id="f-pw"><h4>Ganti Kata Sandi Saya</h4><div class="fld"><label for="pw-l">Kata sandi saat ini</label><input class="inp" id="pw-l" type="password" autocomplete="current-password"></div><div class="fld"><label for="pw-b">Kata sandi baru</label><input class="inp" id="pw-b" type="password" autocomplete="new-password"><span class="hint">Min. 8 karakter, huruf & angka.</span></div><button class="btn btn-primary" type="submit">Simpan</button></form>') +
        '<div class="col gap-lg"><div class="card card-b"><h4>Sesi</h4><p class="small muted">Keluar dari semua perangkat bila Anda curiga akun dipakai orang lain.</p><button class="btn btn-danger" id="out-all">' + ic('logout', 'sm') + 'Keluar dari Semua Perangkat</button></div>' +
        '<div class="card card-b"><h4>Info Sistem</h4><div class="kv"><div>Versi aplikasi</div><div>' + IKH.chipVersi() + '</div><div>Versi server (Apps Script)</div><div>' + (IKH.Versi.server ? 'v' + esc(IKH.Versi.server) : '-') + '</div><div>Data panel dibuat</div><div>' + fmt.waktu(x.d.dibuat) + '</div><div>Sinkron terakhir</div><div>' + fmt.relatif(new Date(Store.admAt).toISOString()) + '</div></div><p class="small muted mt mb-0">Rahasia (token Fonnte, secret sesi, sandi darurat) disimpan di Script Properties Apps Script — tidak di spreadsheet maupun di browser.</p></div></div></div></div>' +
        '<div class="card-f row between wrap ' + (PG.tab === 'org' || PG.tab === 'kta' ? '' : 'hide') + '" id="s-foot"><span class="small muted" id="s-ubah">Tidak ada perubahan.</span><button class="btn btn-primary" id="s-simpan">' + ic('check_circle') + 'Simpan Pengaturan</button></div></section>';
      $$('[data-tab]', main).forEach((b) => b.onclick = () => { PG.tab = b.dataset.tab; $$('[data-tab]', main).forEach((y) => y.classList.toggle('on', y === b)); $$('[data-p]', main).forEach((p) => p.classList.toggle('hide', p.dataset.p !== PG.tab)); $('#s-foot').classList.toggle('hide', !(PG.tab === 'org' || PG.tab === 'kta')); });
      const kartu = $('section.card', main);
      const ubah = () => { if (!$('#s-daftar')) return; const n = $$(IKH.ISIAN, kartu).filter((i) => i.value !== String(st[i.dataset.k] || '')).length + (($('#s-daftar').checked ? 'YA' : 'TIDAK') !== (st.PENDAFTARAN_DIBUKA === 'TIDAK' ? 'TIDAK' : 'YA') ? 1 : 0); $('#s-ubah').textContent = n ? n + ' isian berubah — belum disimpan.' : 'Tidak ada perubahan.'; PG.edit = n > 0; };
      kartu.addEventListener('input', ubah); $('#s-daftar').onchange = ubah;
      $('#s-simpan').onclick = (e) => UI.tombol(e.currentTarget, async () => {
        const pairs = {}; $$(IKH.ISIAN, kartu).forEach((i) => { if (i.value !== String(st[i.dataset.k] || '')) pairs[i.dataset.k] = String(i.value).trim(); });
        const dft = $('#s-daftar').checked ? 'YA' : 'TIDAK'; if (dft !== (st.PENDAFTARAN_DIBUKA === 'TIDAK' ? 'TIDAK' : 'YA')) pairs.PENDAFTARAN_DIBUKA = dft;
        if (!Object.keys(pairs).length) return UI.toast('Tidak ada perubahan.', 'warn');
        const r = await api('adm.setting.simpan', { pairs });
        if (!UI.hasil(r)) return;
        Store.adm.setting = r.data.setting; Store.simpanAdmLokal(); PG.edit = false; Store.pubBoot(true); pengaturan();
      });
      const unggah = (inp, tujuan) => { const el = $(inp, main); if (el) el.onchange = async (e) => {
        try {
          const f = e.target.files[0]; if (!f) return;
          const data = f.type === 'image/png' ? await new Promise((res, rej) => { if (f.size > 3 * 1048576) return rej(new Error('Maks. 3 MB')); const fr = new FileReader(); fr.onload = () => res({ nama: f.name, tipe: f.type, data: fr.result }); fr.readAsDataURL(f); }) : await IKH.bacaGambar(f, 600, 0.9);
          const m = UI.muat('Mengunggah…'); const r = await api('adm.upload', { tujuan, file: data }); m.tutup();
          if (UI.hasil(r) && r.data.setting) { Store.adm.setting = r.data.setting; Store.simpanAdmLokal(); Store.pubBoot(true); pengaturan(); }
        } catch (er) { UI.toast(er.message, 'bad'); }
      }; };
      unggah('#up-logo', 'logo');
      [['#del-logo', 'logo'], ['#del-ttd', 'ttd']].forEach((d) => { const b = $(d[0], main); if (b) b.onclick = async () => { if (!(await UI.konfirmasi(d[1] === 'ttd' ? 'Hapus berkas tanda tangan ketua dari Drive? Berkas ini tidak dipakai lagi oleh aplikasi.' : 'Hapus gambar ini?', { bahaya: true, ya: 'Hapus' })).ok) return; const r = await api('adm.upload', { tujuan: d[1], hapus: true }); if (UI.hasil(r)) { Store.admBoot(true); } }; });
      tabelAkun(main);
      const fp = $('#f-pw', main); if (fp) fp.onsubmit = async (e) => { e.preventDefault(); const r = await UI.tombol($('button', fp), () => api('auth.ganti', { lama: $('#pw-l').value, baru: $('#pw-b').value })); if (UI.hasil(r)) { Sesi.simpan(r.data.token, r.data.me); if (r.data.boot) Store.setAdm(r.data.boot); fp.reset(); } };
      const fd = $('#f-dar', main); if (fd) fd.onsubmit = async (e) => { e.preventDefault(); UI.hasil(await UI.tombol($('button', fd), () => api('adm.darurat.ganti', { baru: $('#dar-b').value }))); fd.reset(); };
      $('#out-all').onclick = async () => { if (!(await UI.konfirmasi('Semua sesi akun Anda akan berakhir, termasuk perangkat ini.', { bahaya: true, ya: 'Keluar dari semua' })).ok) return; await api('auth.logout', { semua: true }); Sesi.keluar(); };
    });
  }
  function tabelAkun(main) {
    const x = D(), me = Sesi.me || {};
    const rows = x.d.akun.filter((a) => a.peran === 'pengurus');
    const alumniDari = (a) => a.id_record ? x.cari(a.id_record) : null;
    IKH.Tabel($('#ak-tbl', main), { data: rows, idKey: 'email', per: 20, kosong: 'Belum ada akun Pengurus. Tambahkan sekarang agar tidak bergantung pada akses darurat.',
      kolom: [{ k: 'nama', label: 'Pengurus', render: (a) => { const al = alumniDari(a); return '<div class="person">' + UI.ava(a.nama, al ? al.foto_id : '') + '<div><div class="nm">' + esc(a.nama) + (a.email === me.email ? ' <span class="badge b-navy">Anda</span>' : '') + '</div><div class="sb">' + esc(a.email) + '</div>' +
          (al ? '<div class="tiny" style="color:var(--ok)">' + ic('link', 'sm') + ' Terhubung data alumni ' + esc(al.id_member || al.id_record) + '</div>' : '<div class="tiny muted">Belum terhubung data alumni</div>') + '</div></div>'; } },
        { k: 'no_hp', label: 'WhatsApp' }, { k: 'status', label: 'Status', render: (a) => UI.badgeStatus(a.status) + (a.wajib ? ' <span class="badge b-wait">sandi awal</span>' : '') }, { k: 'login_terakhir', label: 'Login terakhir', render: (a) => a.login_terakhir ? fmt.relatif(a.login_terakhir) : '-' },
        { label: '', kelas: 'act', sort: false, render: (a) => (a.email === me.email ? '' : '<button class="btn btn-ghost btn-xs" data-act="reset">' + ic('lock_reset', 'sm') + 'Reset</button> <button class="btn btn-ghost btn-xs" data-act="status">' + (a.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan') + '</button> ') +
          (a.status === 'Aktif' ? '<button class="btn btn-ghost btn-xs" data-act="lepas" title="Kembalikan menjadi akun anggota biasa (data alumni & KTA tetap)">' + ic('person_remove', 'sm') + 'Lepas peran</button>' : '') }],
      onAksi: async (act, a) => {
        if (act === 'reset') return resetSandi(a.email);
        if (act === 'lepas') return lepasPeran(a, main);
        const st = a.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
        if (!(await UI.konfirmasi((st === 'Nonaktif' ? 'Nonaktifkan' : 'Aktifkan') + ' akun <b>' + esc(a.email) + '</b>?' + (st === 'Nonaktif' ? '<p class="small muted mt mb-0">Akun nonaktif tidak bisa masuk sama sekali. Bila orang ini tetap anggota, pakai <b>Lepas peran</b> agar ia masih bisa membuka KTA-nya.</p>' : ''), { bahaya: st === 'Nonaktif' })).ok) return;
        const r = await api('adm.akun.status', { email: a.email, status: st });
        if (UI.hasil(r)) { a.status = st; Store.simpanAdmLokal(); tabelAkun(main); }
      } });
    $('#ak-add', main).onclick = () => UI.modal({ judul: 'Tambah Akun Pengurus', isi: '<div class="col gap-lg"><div class="fld"><label for="ak-n">Nama</label><input class="inp" id="ak-n"></div><div class="fld"><label for="ak-e">Email</label><input class="inp" id="ak-e" type="email"></div><div class="fld"><label for="ak-h">WhatsApp (untuk notifikasi Pengurus)</label><input class="inp" id="ak-h" type="tel"></div><label class="cek"><input type="checkbox" id="ak-m" checked><span>Kirim kata sandi awal ke email ini</span></label>' +
      '<div class="alert info small">' + ic('info', 'sm') + '<div>Bila email ini milik alumni yang sudah terdata, akun otomatis <b>terhubung ke data alumninya</b>. Bila ia sudah punya akun anggota, akun itu <b>dinaikkan menjadi Pengurus</b> — kata sandinya tetap, tidak ada kata sandi baru.</div></div></div>',
      tombol: [{ teks: 'Batal' }, { teks: 'Buat Akun', kelas: 'btn-primary', aksi: async (md) => {
        const r = await api('adm.akun.simpan', { nama: $('#ak-n', md).value.trim(), email: $('#ak-e', md).value.trim(), no_hp: $('#ak-h', md).value.trim(), kirimEmail: $('#ak-m', md).checked });
        if (!UI.hasil(r)) return false;
        Store.admBoot(true).then(() => { if (Router.parse().path === '/admin/pengaturan') pengaturan(); });
        if (r.data.sandi) setTimeout(() => tampilSandi(r.data.email, r.data.sandi, r.msg), 150);
        return true;
      } }] });
  }
  /** Serah terima: akun Pengurus kembali menjadi akun anggota biasa (data alumni & KTA tetap) */
  async function lepasPeran(a, main) {
    if (IKH.butuhServer('1.2.0', 'Lepas peran pengurus')) return;
    const x = D(), me = Sesi.me || {}, diri = a.email === me.email;
    const lain = x.d.akun.filter((k) => k.peran === 'pengurus' && k.status === 'Aktif' && k.email !== a.email).length;
    if (!lain) return UI.toast('Minimal harus ada satu akun Pengurus aktif lain. Buat akun Pengurus pengganti dulu, baru lepas peran ini.', 'warn', 7000);
    const k = await UI.konfirmasi('Lepas peran Pengurus dari <b>' + esc(a.nama || a.email) + '</b>?' +
      '<ul class="small mt mb-0"><li>Akses ke Panel Pengurus dicabut.</li><li>Akun kembali menjadi akun anggota biasa: data alumni, KTA, dan kata sandinya tetap.</li>' +
      (a.id_record ? '' : '<li><b>Akun ini belum terhubung ke data alumni</b> — server akan menolak. Pakai Nonaktifkan bila orang ini tidak perlu masuk lagi.</li>') +
      (diri ? '<li><b>Ini akun Anda sendiri</b> — Anda akan langsung keluar dan masuk lagi sebagai anggota.</li>' : '') + '</ul>', { bahaya: true, ya: 'Lepas Peran' });
    if (!k.ok) return;
    const r = await api('adm.akun.lepas', { email: a.email });
    if (!UI.hasil(r)) return;
    if (r.data && r.data.diriSendiri) return setTimeout(() => Sesi.keluar(), 1200);
    Store.admBoot(true).then(() => { if (Router.parse().path === '/admin/pengaturan') pengaturan(); });
  }

  IKH.Admin = { hal: { dasbor, verifikasi, perubahan, alumni, kta, rekap, log, arsip, pengaturan } };
})();
