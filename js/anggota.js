/* ==========================================================================
   anggota.js — Ruang Anggota: dasbor, KTA digital, profil & pengajuan, keamanan
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, ic, img, bg, fmt, UI, api, Store, Sesi, Router, Kta, LS } = IKH;
  const MENU = [['/anggota', 'Dasbor Saya', 'dashboard'], ['/anggota/kta', 'KTA Digital', 'badge'], ['/anggota/profil', 'Profil & Pengajuan', 'edit_note'], ['/anggota/keamanan', 'Keamanan Akun', 'lock']];
  const LABEL = { nama: 'Nama lengkap', nomor_taruna: 'NIT', angkatan: 'Angkatan', prodi: 'Program studi', tahun_kelulusan: 'Tahun lulus', status_kepegawaian: 'Status kepegawaian', instansi: 'Instansi', jabatan_terakhir: 'Jabatan terakhir', no_hp: 'Nomor WhatsApp', email: 'Email', jenis_kelamin: 'Jenis kelamin', tempat_lahir: 'Tempat lahir', tanggal_lahir: 'Tanggal lahir', kota_domisili: 'Domisili', alamat: 'Alamat', foto_id: 'Pas foto' };

  function layout() {
    return '<header class="agt-top"><div class="wrap"><a class="brand" href="#/" id="a-brand"></a><nav class="agt-nav" id="a-nav" aria-label="Menu anggota"></nav>' +
      '<div class="who"><div class="tx"><div class="nm" id="a-nm"></div><div class="st" id="a-st"></div></div><span id="a-ava"></span><button class="btn btn-ghost btn-icon btn-sm" id="a-out" aria-label="Keluar" title="Keluar">' + ic('logout') + '</button></div></div></header>' +
      '<nav class="agt-tabs" id="a-tabs" aria-label="Menu anggota"></nav><main id="main" class="agt-main"><div class="wrap" id="a-isi"></div></main>' +
      '<footer class="pub-foot" style="margin-top:0"><div class="bawah"><div class="wrap"><span id="a-foot"></span><span>SIM IKALLHUBDAT ' + IKH.chipVersi('gelap') + '</span></div></div></footer>';
  }
  function bingkai(d) {
    const path = Router.parse().path, st = (d && d.setting) || IKH.setPub(), a = (d && d.anggota) || {};
    $('#a-brand').innerHTML = '<span class="lg img" ' + IKH.logoBg(st, 160) + '></span>' + '<div><div class="t1">' + esc(st.ORG_SINGKAT || 'IKALLHUBDAT') + '</div><div class="t2">Ruang Anggota</div></div>';
    const links = MENU.map((m) => '<a href="#' + m[0] + '" class="' + (path === m[0] ? 'on' : '') + '">' + m[1] + '</a>').join('');
    $('#a-nav').innerHTML = links; $('#a-tabs').innerHTML = links;
    $('#a-nm').textContent = a.nama || (Sesi.me && Sesi.me.nama) || '';
    $('#a-st').innerHTML = '● ' + esc(a.status_kartu === 'Aktif' ? 'Anggota Terverifikasi' : (a.status_kartu || ''));
    $('#a-ava').innerHTML = UI.ava(a.nama, a.foto_id);
    $('#a-out').onclick = keluar;
    $('#a-foot').textContent = '© ' + new Date().getFullYear() + ' ' + (st.ORG_NAMA || '');
  }
  async function keluar() {
    if (!(await UI.konfirmasi('Keluar dari Ruang Anggota?', { ya: 'Keluar' })).ok) return;
    api('auth.logout', {}); Sesi.keluar();
  }
  let _rid = 0;
  async function halaman(judul, render) {
    IKH.judul(judul);
    const rid = ++_rid;
    IKH.pasangLayout('agt', layout);
    const isi = $('#a-isi');
    const hidup = () => rid === _rid && document.body.contains(isi);
    const gambar = () => { if (!hidup() || !Store.agt) return; bingkai(Store.agt); render(isi, Store.agt); };
    const p = Store.agtBoot();                  // cache lokal dimuat seketika, server diperiksa di latar
    if (Store.agt) gambar(); else { bingkai(null); isi.innerHTML = '<div class="card">' + UI.skel(8) + '</div>'; }
    const ev = () => { if (hidup()) gambar(); else document.removeEventListener('ikh:agt', ev); };
    document.addEventListener('ikh:agt', ev);
    await p;
    if (!Store.agt && rid === _rid) isi.innerHTML = '<div class="alert bad">' + ic('error') + '<div>Data keanggotaan tidak dapat dimuat. Periksa koneksi lalu muat ulang halaman.</div></div>';
  }

  /* ---------------- Dasbor ---------------- */
  function dasbor() {
    return halaman('Dasbor Saya', (el, d) => {
      const a = d.anggota, st = d.setting || {}, peng = d.pengajuan || [], pending = peng.find((p) => p.status === 'Menunggu');
      const sisa = fmt.sisaHari(a.masa_berlaku_kartu);
      el.innerHTML =
        '<section class="card welcome"><div class="grow" style="min-width:280px"><div class="row wrap"><span class="badge ' + (a.status_kartu === 'Aktif' ? 'b-ok' : 'b-bad') + '">Status Keanggotaan: ' + esc((a.status_kartu || '').toUpperCase()) + '</span>' + (pending ? '<span class="badge b-wait">1 pengajuan menunggu</span>' : '') + '</div>' +
        '<h1>Selamat datang, ' + esc(a.nama) + '</h1><div class="muted">' + esc([a.prodi, a.angkatan ? 'Angkatan ' + a.angkatan : '', a.instansi].filter(Boolean).join(' • ')) + '</div></div>' +
        '<div class="masa"><div class="ico">' + ic('badge') + '</div><div><div class="kicker">Masa Berlaku KTA</div><div class="bb" style="font-size:17px">Hingga ' + fmt.tgl(a.masa_berlaku_kartu, true) + '</div><div class="small ' + (sisa !== null && sisa <= 30 ? '' : 'muted') + '" style="color:' + (sisa !== null && sisa <= 30 ? 'var(--bad)' : '') + '">' + (sisa === null ? '-' : sisa < 0 ? 'Sudah lewat ' + Math.abs(sisa) + ' hari — hubungi Pengurus' : 'Tersisa ' + fmt.angka(sisa) + ' hari') + '</div></div></div></section>' +
        '<div class="grid mt-lg" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start" id="g1">' +
        '<section><div class="row between mb"><h3 class="mb-0 row">' + ic('badge') + 'KTA Digital Anggota</h3><div class="seg" role="tablist"><button class="on" data-sisi="depan">Sisi Depan</button><button data-sisi="belakang">Sisi Belakang</button></div></div>' +
        '<div class="kta-flip" id="flip">' + Kta.depan(a, st) + Kta.belakang(a, st, '').replace('class="kta belakang"', 'class="kta belakang off"') + '</div></section>' +
        '<section class="col gap-lg"><div class="card card-b"><div class="kicker gold">Aksi Dokumen Identitas</div><h3 class="mt">Kelola & Unduh KTA Digital</h3><p class="small muted">KTA PDF siap cetak dilengkapi QR bertanda tangan digital dan tanda tangan ketua.</p>' +
        '<button class="btn btn-gold btn-block" id="b-pdf" data-busy="Menyiapkan PDF…">' + ic('picture_as_pdf') + 'Unduh KTA (PDF Siap Cetak)</button>' +
        '<div class="row mt"><button class="btn btn-ghost grow" id="b-link">' + ic('link', 'sm') + 'Salin Tautan Verifikasi</button><a class="btn btn-ghost btn-icon" href="' + esc(linkVerif(d)) + '" target="_blank" rel="noopener" aria-label="Buka halaman verifikasi">' + ic('open_in_new', 'sm') + '</a></div></div>' +
        '<div class="card card-b" style="background:linear-gradient(135deg,var(--navy),var(--navy-2));color:#DAE2FF;border:0"><div class="row top">' + ic('verified_user', 'lg') + '<div><b style="color:#fff">Keaslian kartu dapat diperiksa publik</b><div class="small mt-0">Siapa pun dapat memindai QR di sisi belakang untuk memastikan kartu ini sah dan masih berlaku.</div></div></div></div></section></div>' +
        '<h3 class="mt-lg">Layanan Mandiri</h3><div class="grid g4">' +
        svc('edit_note', 'Ajukan Pembaruan Data', 'Mutasi instansi, jabatan, nomor WhatsApp, email, atau foto. Berlaku setelah disetujui Pengurus.', pending ? '1 menunggu' : 'Buat pengajuan', '#/anggota/profil') +
        svc('badge', 'KTA Digital', 'Lihat kartu sisi depan & belakang, unduh PDF, atau cetak.', 'Buka kartu', '#/anggota/kta') +
        svc('qr_code_scanner', 'Verifikasi KTA', 'Periksa keaslian KTA anggota lain dengan memindai QR.', 'Pindai sekarang', '#/verifikasi') +
        svc('lock', 'Keamanan Akun', 'Ganti kata sandi dan keluar dari semua perangkat.', 'Pengaturan akun', '#/anggota/keamanan') + '</div>' +
        '<div class="grid mt-lg" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start" id="g2"><section class="card"><div class="card-h"><div><h3>Data Profil Resmi</h3><div class="sub">Data yang terverifikasi Pengurus</div></div><a class="btn btn-ghost btn-sm" href="#/anggota/profil">' + ic('edit', 'sm') + 'Ajukan Perubahan</a></div>' +
        '<div class="card-b grid g2"><div><h4 class="row">' + ic('school', 'sm') + 'Akademik Kedinasan</h4><div class="kv box">' + kv([['NIT', a.nomor_taruna], ['Angkatan', a.angkatan], ['Program studi', a.prodi], ['Tahun lulus', a.tahun_kelulusan]]) + '</div></div>' +
        '<div><h4 class="row">' + ic('work', 'sm') + 'Kepegawaian & Kontak</h4><div class="kv box">' + kv([['Status', a.status_kepegawaian], ['Instansi', a.instansi], ['Jabatan', a.jabatan_terakhir], ['WhatsApp', a.no_hp], ['Email', a.email]]) + '</div></div></div></section>' +
        '<section class="col gap-lg"><div class="card"><div class="card-h"><h3>Riwayat Keanggotaan</h3></div><div class="card-b"><div class="timeline">' + riwayat(a, peng) + '</div></div></div>' +
        '<div class="card card-b"><div class="row">' + ic('help') + '<h4 class="mb-0">Pusat Layanan Anggota</h4></div><p class="small muted mt">Kendala data atau kartu? Hubungi sekretariat.</p>' +
        (st.ORG_WA ? '<a class="btn btn-ghost btn-block" target="_blank" rel="noopener" href="https://wa.me/' + esc(IKH.hp08(st.ORG_WA).replace(/^0/, '62')) + '">' + ic('chat', 'sm') + 'WhatsApp Sekretariat</a>' : '') +
        (st.ORG_EMAIL ? '<a class="btn btn-ghost btn-block mt" href="mailto:' + esc(st.ORG_EMAIL) + '">' + ic('mail', 'sm') + esc(st.ORG_EMAIL) + '</a>' : '') +
        (st.ORG_JAM_LAYANAN ? '<p class="tiny muted mt mb-0">' + esc(st.ORG_JAM_LAYANAN) + '</p>' : '') + (!st.ORG_WA && !st.ORG_EMAIL ? '<p class="small muted mb-0">Kontak sekretariat belum diisi.</p>' : '') + '</div></section></div>';
      if (window.innerWidth < 1024) { $('#g1').style.gridTemplateColumns = '1fr'; $('#g2').style.gridTemplateColumns = '1fr'; }
      pasangFlip(el, d);
      $('#b-pdf').onclick = (e) => unduhPdf(e.currentTarget);
      $('#b-link').onclick = () => UI.salin(linkVerif(d));
    });
  }
  const svc = (ikon, judul, teks, go, href) => '<a class="card svc" href="' + href + '" style="text-decoration:none;color:inherit"><span class="ico">' + ic(ikon) + '</span><h4>' + judul + '</h4><p>' + teks + '</p><span class="go">' + go + ic('arrow_forward', 'sm') + '</span></a>';
  const kv = (rows) => rows.map((r) => '<div>' + esc(r[0]) + '</div><div>' + esc(r[1] || '-') + '</div>').join('');
  function linkVerif(d) { return d.qr && /^https?:/.test(d.qr) ? d.qr : location.origin + location.pathname + '#/v/' + (d.qr || ''); }
  function riwayat(a, peng) {
    const it = [];
    peng.slice(0, 5).forEach((p) => it.push({ t: p.diputuskan_pada || p.diajukan_pada, k: p.status === 'Disetujui' ? 'ok' : p.status === 'Ditolak' ? 'bad' : p.status === 'Menunggu' ? 'wait' : '', h: 'Pengajuan perubahan ' + p.status.toLowerCase(), s: p.field_diubah + (p.catatan ? ' — ' + p.catatan : '') }));
    if (a.tgl_verifikasi) it.push({ t: a.tgl_verifikasi, k: 'ok', h: 'Keanggotaan disetujui', s: 'Nomor anggota ' + (a.id_member || '') + ' diterbitkan.' });
    if (a.tgl_daftar) it.push({ t: a.tgl_daftar, k: '', h: 'Pendaftaran diterima sistem', s: a.id_record + ' • ' + (a.sumber || '') });
    it.sort((x, y) => String(y.t).localeCompare(String(x.t)));
    return it.map((x) => '<div class="it ' + x.k + '"><b class="small">' + esc(x.h) + '</b><div class="small muted">' + esc(x.s) + '</div><div class="tiny muted">' + fmt.waktu(x.t) + '</div></div>').join('') || '<div class="small muted">Belum ada riwayat.</div>';
  }
  async function pasangFlip(el, d) {
    const flip = $('#flip', el); if (!flip) return;
    $$('[data-sisi]', el).forEach((b) => b.onclick = () => { $$('[data-sisi]', el).forEach((x) => x.classList.toggle('on', x === b)); $$('.kta', flip).forEach((k) => k.classList.toggle('off', !k.classList.contains(b.dataset.sisi))); });
    if (d.qr) { try { const svg = await IKH.qrSvg(d.qr); const q = $('.kta.belakang .qr', flip); if (q) q.innerHTML = svg; } catch (e) { } }
  }
  async function unduhPdf(btn) {
    const r = await UI.tombol(btn, () => api('agt.kta', {}));
    if (!r.ok) return UI.toast(r.msg, 'bad', 5000);
    IKH.unduhB64(r.data.data, r.data.nama); UI.toast('KTA diunduh.');
  }

  /* ---------------- KTA ---------------- */
  function kta() {
    return halaman('KTA Digital', (el, d) => {
      const a = d.anggota, st = d.setting || {};
      el.innerHTML = '<div class="ph"><div class="ttl"><span class="ico">' + ic('badge') + '</span><div><h1>Kartu Tanda Anggota Digital</h1><div class="sub">Nomor ' + esc(a.id_member || '-') + ' • berlaku s.d. ' + fmt.tgl(a.masa_berlaku_kartu, true) + '</div></div></div>' +
        '<div class="row wrap no-print"><button class="btn btn-gold" id="b-pdf" data-busy="Menyiapkan PDF…">' + ic('picture_as_pdf') + 'Unduh PDF</button><button class="btn btn-ghost" id="b-print">' + ic('print') + 'Cetak</button><button class="btn btn-ghost" id="b-link">' + ic('link') + 'Salin Tautan</button></div></div>' +
        (a.status_kartu !== 'Aktif' ? '<div class="alert warn mb">' + ic('warning') + '<div>Status kartu: <b>' + esc(a.status_kartu) + '</b>. Hubungi Pengurus untuk perpanjangan/aktivasi.</div></div>' : '') +
        '<div class="grid g2 print-sheet" style="max-width:1100px"><div><div class="kicker mb no-print">Sisi depan</div>' + Kta.depan(a, st) + '</div><div><div class="kicker mb no-print">Sisi belakang</div><div id="blk">' + Kta.belakang(a, st, '') + '</div></div></div>' +
        '<div class="alert info mt-lg no-print" style="max-width:1100px">' + ic('info') + '<div>PDF resmi memuat tanda tangan ketua dan dibuat ulang otomatis bila data Anda atau desain kartu berubah. Untuk mencetak, gunakan PDF agar ukurannya tepat (85,6 × 54 mm).</div></div>';
      IKH.qrSvg(d.qr || a.id_member).then((svg) => { const q = $('#blk .qr', el); if (q) q.innerHTML = svg; }).catch(() => { });
      $('#b-pdf').onclick = (e) => unduhPdf(e.currentTarget);
      $('#b-print').onclick = () => window.print();
      $('#b-link').onclick = () => UI.salin(linkVerif(d));
    });
  }

  /* ---------------- Profil & pengajuan ---------------- */
  const FIELD = ['nama', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'no_hp', 'email', 'kota_domisili', 'alamat', 'nomor_taruna', 'angkatan', 'prodi', 'tahun_kelulusan', 'status_kepegawaian', 'instansi', 'jabatan_terakhir'];
  function profil() {
    return halaman('Profil & Pengajuan', (el, d) => {
      if (el.dataset.ubah === '1' && $('#frm-ubah', el)) return;           // jangan timpa form yang sedang diisi
      const a = d.anggota, st = d.setting || {}, peng = d.pengajuan || [], pending = peng.find((p) => p.status === 'Menunggu');
      const F = IKH.formAlumni(st, a, { tanpaWajib: true });
      el.innerHTML = '<div class="ph"><div class="ttl"><span class="ico">' + ic('edit_note') + '</span><div><h1>Profil Saya & Pengajuan Perubahan</h1><div class="sub">Perubahan berlaku setelah disetujui Pengurus. Data resmi tidak berubah sebelum itu.</div></div></div></div>' +
        (pending ? '<div class="card mb"><div class="card-h" style="background:var(--warn-bg)"><div class="row">' + ic('hourglass_top') + '<div><h4 class="mb-0">Pengajuan ' + esc(pending.id_pengajuan) + ' menunggu persetujuan</h4><div class="sub">Diajukan ' + fmt.waktu(pending.diajukan_pada) + '</div></div></div><button class="btn btn-danger btn-sm" id="b-batal">' + ic('close', 'sm') + 'Batalkan</button></div>' +
          '<div class="card-b">' + tabelDiff(pending) + '</div></div>' : '') +
        '<div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);align-items:start" id="g3"><form class="card" id="frm-ubah" novalidate><div class="card-h"><div><h3>Formulir Pengajuan Perubahan</h3><div class="sub">Ubah hanya isian yang perlu diperbarui</div></div></div>' +
        '<div class="card-b"><h4 class="row">' + ic('person', 'sm') + 'Identitas & Kontak</h4>' + F.identitas + '<hr class="sep"><h4 class="row">' + ic('school', 'sm') + 'Akademik</h4>' + F.akademik + '<hr class="sep"><h4 class="row">' + ic('work', 'sm') + 'Kepegawaian</h4>' + F.kepegawaian +
        '<hr class="sep"><div class="grid g2"><div class="fld"><label>Ganti pas foto (opsional)</label><label class="upload"><input type="file" id="u-foto" accept="image/*"><span class="pv" id="u-pv" ' + (a.foto_id ? bg(a.foto_id, 200) : '') + '>' + (a.foto_id ? '' : ic('photo_camera')) + '</span><span><b>Pilih foto baru</b><br><span class="hint">Foto lama tetap dipakai sampai disetujui.</span></span></label></div>' +
        '<div class="fld"><label for="u-alasan">Alasan / keterangan</label><textarea class="inp" id="u-alasan" rows="4" maxlength="300" placeholder="Contoh: mutasi ke Dishub Provinsi sesuai SK No. …"></textarea></div></div></div>' +
        '<div class="card-f row between wrap"><span class="small muted" id="u-ring">Belum ada perubahan.</span><button class="btn btn-primary" type="submit" ' + (pending ? 'disabled title="Masih ada pengajuan yang menunggu"' : '') + '>' + ic('send') + 'Kirim Pengajuan</button></div></form>' +
        '<section class="card"><div class="card-h"><h3>Riwayat Pengajuan</h3></div><div class="card-b">' + (peng.length ? '<div class="timeline">' + peng.map((p) => '<div class="it ' + (p.status === 'Disetujui' ? 'ok' : p.status === 'Ditolak' ? 'bad' : p.status === 'Menunggu' ? 'wait' : '') + '"><div class="row between"><b class="small mono">' + esc(p.id_pengajuan) + '</b>' + UI.badgeStatus(p.status) + '</div><div class="small">' + esc(p.field_diubah) + '</div>' + (p.catatan ? '<div class="small muted">Catatan: ' + esc(p.catatan) + '</div>' : '') + '<div class="tiny muted">' + fmt.waktu(p.diajukan_pada) + '</div></div>').join('') + '</div>' : '<p class="small muted mb-0">Belum pernah mengajukan perubahan.</p>') + '</div></section></div>';
      if (window.innerWidth < 1024) $('#g3').style.gridTemplateColumns = '1fr';
      el.dataset.ubah = '';
      const frm = $('#frm-ubah'); let foto = null;
      const hitung = () => {
        const o = IKH.ambilForm(frm, FIELD); if (o.no_hp) o.no_hp = IKH.hp08(o.no_hp);
        const beda = FIELD.filter((k) => (o[k] || '') !== String(a[k] || '') && !(o[k] === '' && !a[k]));
        $('#u-ring').innerHTML = beda.length || foto ? '<b>' + (beda.length + (foto ? 1 : 0)) + ' isian berubah:</b> ' + esc(beda.map((k) => LABEL[k]).concat(foto ? ['Pas foto'] : []).join(', ')) : 'Belum ada perubahan.';
        el.dataset.ubah = beda.length || foto ? '1' : '';
        return { o, beda };
      };
      frm.addEventListener('input', hitung); frm.addEventListener('change', hitung);
      $('#u-foto').onchange = async (e) => { try { foto = await IKH.bacaGambar(e.target.files[0], 800, 0.86); $('#u-pv').style.backgroundImage = 'url(' + foto.data + ')'; $('#u-pv').innerHTML = ''; hitung(); } catch (er) { UI.toast(er.message, 'bad'); } };
      if (pending) $('#b-batal').onclick = async () => {
        if (!(await UI.konfirmasi('Batalkan pengajuan ' + pending.id_pengajuan + '?', { bahaya: true, ya: 'Batalkan' })).ok) return;
        const r = await api('agt.batal', { id_pengajuan: pending.id_pengajuan });
        if (UI.hasil(r)) { pending.status = 'Dibatalkan'; el.dataset.ubah = ''; Store.setAgt(d); }
      };
      frm.onsubmit = async (e) => {
        e.preventDefault();
        const h = hitung();
        if (!h.beda.length && !foto) return UI.toast('Belum ada data yang diubah.', 'warn');
        if (!IKH.validasiForm(frm, h.o, [])) return;
        const data = {}; h.beda.forEach((k) => { data[k] = h.o[k]; });
        const r = await UI.tombol($('button[type=submit]', frm), () => api('agt.ajukan', { data: data, foto: foto, alasan: $('#u-alasan').value.trim() }));
        if (!UI.hasil(r)) return;
        el.dataset.ubah = ''; d.pengajuan = [r.data.pengajuan].concat(d.pengajuan || []); Store.setAgt(d);
        window.scrollTo(0, 0);
      };
    });
  }
  function tabelDiff(p) {
    const keys = Object.keys(p.data_baru || {}).filter((k) => k[0] !== '_');
    return '<table class="diff"><thead><tr><th>Isian</th><th>Data saat ini</th><th>Diajukan menjadi</th></tr></thead><tbody>' +
      keys.map((k) => '<tr><td>' + esc(LABEL[k] || k) + '</td><td class="lama">' + (k === 'foto_id' ? (p.data_lama[k] ? '<img src="' + img(p.data_lama[k], 120) + '" style="width:48px;border-radius:6px" alt="">' : '-') : esc(p.data_lama[k] || '-')) + '</td><td class="baru">' +
        (k === 'foto_id' ? '<img src="' + img(p.data_baru[k], 120) + '" style="width:48px;border-radius:6px" alt="">' : esc(p.data_baru[k] || '-')) + '</td></tr>').join('') + '</tbody></table>' +
      (p.data_baru && p.data_baru._alasan ? '<p class="small muted mt mb-0">Keterangan: ' + esc(p.data_baru._alasan) + '</p>' : '');
  }

  /* ---------------- Keamanan ---------------- */
  function keamanan() {
    return halaman('Keamanan Akun', (el, d) => {
      const me = Sesi.me || {};
      el.innerHTML = '<div class="ph"><div class="ttl"><span class="ico">' + ic('lock') + '</span><div><h1>Keamanan Akun</h1><div class="sub">' + esc(me.email || '') + '</div></div></div></div>' +
        '<div class="grid g2" style="max-width:1000px;align-items:start"><form class="card" id="frm-pw"><div class="card-h"><h3>Ganti Kata Sandi</h3></div><div class="card-b col gap-lg">' +
        '<div class="fld"><label for="pw-l">Kata sandi saat ini</label><input class="inp" id="pw-l" type="password" autocomplete="current-password"></div>' +
        '<div class="fld"><label for="pw-b">Kata sandi baru</label><input class="inp" id="pw-b" type="password" autocomplete="new-password"><span class="hint">Minimal 8 karakter, huruf dan angka.</span></div>' +
        '<div class="fld"><label for="pw-k">Ulangi kata sandi baru</label><input class="inp" id="pw-k" type="password" autocomplete="new-password"></div></div>' +
        '<div class="card-f right"><button class="btn btn-primary" type="submit">' + ic('check_circle') + 'Simpan</button></div></form>' +
        '<div class="col gap-lg"><div class="card card-b"><h4>Sesi saat ini</h4><div class="kv"><div>Masuk sebagai</div><div>' + esc(me.email || '-') + '</div><div>Berakhir</div><div>' + fmt.waktu(new Date(Sesi.data ? Sesi.data.exp : Date.now()).toISOString()) + '</div></div></div>' +
        '<div class="card card-b"><h4>Keluar dari semua perangkat</h4><p class="small muted">Gunakan bila Anda pernah masuk di perangkat lain/umum. Semua sesi akan berakhir.</p><button class="btn btn-danger" id="b-semua">' + ic('logout') + 'Keluar dari Semua Perangkat</button></div></div></div>';
      $('#frm-pw').onsubmit = async (e) => {
        e.preventDefault();
        const b = $('#pw-b').value;
        if (b !== $('#pw-k').value) return UI.toast('Konfirmasi kata sandi tidak sama.', 'bad');
        const r = await UI.tombol($('#frm-pw button[type=submit]'), () => api('auth.ganti', { lama: $('#pw-l').value, baru: b }));
        if (!UI.hasil(r)) return;
        Sesi.simpan(r.data.token, r.data.me); if (r.data.boot) Store.setAgt(r.data.boot);
        $('#frm-pw').reset();
      };
      $('#b-semua').onclick = async () => {
        if (!(await UI.konfirmasi('Semua sesi Anda (termasuk perangkat ini) akan berakhir. Lanjutkan?', { bahaya: true, ya: 'Keluar dari semua' })).ok) return;
        await api('auth.logout', { semua: true }); Sesi.keluar();
      };
    });
  }

  IKH.Anggota = { hal: { dasbor, kta, profil, keamanan } };
})();
