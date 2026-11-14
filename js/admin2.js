/* ==========================================================================
   admin2.js — Kelola Beranda, WhatsApp & Notifikasi, CRM Kontak, Impor Data Lama
   (dimuat saat menu ini pertama dibuka)
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, ic, img, bg, fmt, UI, api, apiQ, Store, Sesi, Router, LS, daftar, hariIni } = IKH;
  const halaman = IKH.halamanAdm, ph = IKH.ph, opsi = IKH.opsi, uniq = IKH.uniq;

  /* ======================= KELOLA BERANDA ======================= */
  const KB = { tab: 'hero' };
  function beranda() {
    return halaman('/admin/beranda', 'Kelola Beranda', async (main, x, awal) => {
      if (!awal && KB.edit) return;
      const st = x.st;
      const tabs = [['hero', 'Beranda', 'home'], ['profil', 'Profil Organisasi', 'domain'], ['sambutan', 'Sambutan Ketua', 'person'], ['struktur', 'Struktur & Pengurus', 'account_tree'], ['berita', 'Berita', 'newspaper'], ['galeri', 'Galeri', 'photo_library']];
      const t = (k, label, hint, area, rows) => '<div class="fld"><label for="kb-' + k + '">' + label + '</label>' + (area ? '<textarea class="inp" id="kb-' + k + '" data-k="' + k + '" rows="' + (rows || 5) + '">' + esc(st[k] || '') + '</textarea>' : '<input class="inp" id="kb-' + k + '" data-k="' + k + '" value="' + esc(st[k] || '') + '">') + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
      KB.edit = false;
      main.innerHTML = ph('newspaper', 'Kelola Konten Beranda & Profil Organisasi', 'Semua perubahan langsung tampil di situs publik.', '<a class="btn btn-ghost btn-sm" href="#/" target="_blank">' + ic('open_in_new', 'sm') + 'Lihat situs</a>') +
        '<section class="card"><div class="tabs">' + tabs.map((tb) => '<button data-tab="' + tb[0] + '" class="' + (KB.tab === tb[0] ? 'on' : '') + '">' + ic(tb[2], 'sm') + tb[1] + '</button>').join('') + '</div>' +
        '<div class="card-b" data-p="hero"><div class="col gap-lg" style="max-width:820px">' + t('HERO_LABEL', 'Label kecil') + t('HERO_JUDUL', 'Judul besar beranda', 'Bagian setelah kata "Ikatan" otomatis tampil sebagai sub-baris.') + t('HERO_SUBJUDUL', 'Sub-judul', '', true, 3) +
        '<label class="switch"><input type="checkbox" id="kb-stat" ' + (st.TAMPIL_STATISTIK !== 'TIDAK' ? 'checked' : '') + '><span class="tr"></span>Tampilkan statistik jumlah alumni di beranda</label></div></div>' +
        '<div class="card-b" data-p="profil"><div class="grid g2"><div class="col gap-lg">' + t('PROFIL_TENTANG', 'Tentang organisasi', '', true, 6) + t('PROFIL_TUJUAN', 'Tujuan (satu per baris)', '', true, 5) + t('PROFIL_VISI', 'Visi', '', true, 3) + '</div><div class="col gap-lg">' + t('PROFIL_SEJARAH', 'Sejarah', '', true, 9) + t('PROFIL_MISI', 'Misi (satu per baris)', '', true, 6) + '</div></div></div>' +
        '<div class="card-b" data-p="sambutan"><div class="grid" style="grid-template-columns:220px minmax(0,1fr);align-items:start"><div class="col"><div style="aspect-ratio:4/5;border-radius:14px;background:#E9EDF3 center/cover no-repeat;' + (st.SAMBUTAN_FOTO_ID ? 'background-image:url(\'' + img(st.SAMBUTAN_FOTO_ID, 500) + '\')' : '') + '"></div><label class="btn btn-ghost btn-sm">' + ic('upload', 'sm') + 'Ganti Foto Ketua<input type="file" accept="image/*" class="hide" id="up-samb"></label></div>' +
        '<div class="col gap-lg">' + t('SAMBUTAN_JUDUL', 'Judul') + t('SAMBUTAN_ISI', 'Isi sambutan', 'Nama & jabatan ketua diambil dari Pengaturan.', true, 12) + '</div></div></div>' +
        '<div class="card-b" data-p="struktur"><div class="row between wrap mb"><div><h4 class="mb-0">Bagan Struktur (opsional)</h4><div class="hint">Gambar bagan organisasi, tampil di halaman Profil.</div></div><div class="row"><label class="btn btn-ghost btn-sm">' + ic('upload', 'sm') + (st.STRUKTUR_BAGAN_ID ? 'Ganti' : 'Unggah') + ' Bagan<input type="file" accept="image/*" class="hide" id="up-bagan"></label>' + (st.STRUKTUR_BAGAN_ID ? '<button class="btn btn-text btn-sm" id="del-bagan">Hapus</button>' : '') + '</div></div>' +
        (st.STRUKTUR_BAGAN_ID ? '<img src="' + esc(img(st.STRUKTUR_BAGAN_ID, 900)) + '" alt="Bagan" style="max-height:220px;border-radius:10px;border:1px solid var(--border)">' : '') +
        '<hr class="sep"><div class="row between mb"><h4 class="mb-0">Pengurus</h4><button class="btn btn-primary btn-sm" data-baru="struktur">' + ic('person_add', 'sm') + 'Tambah Pengurus</button></div><div id="kb-str">' + UI.skel(3) + '</div></div>' +
        '<div class="card-b" data-p="berita"><div class="row between mb"><h4 class="mb-0">Berita & Pengumuman</h4><button class="btn btn-primary btn-sm" data-baru="berita">' + ic('add', 'sm') + 'Tulis Berita</button></div><div id="kb-brt">' + UI.skel(3) + '</div></div>' +
        '<div class="card-b" data-p="galeri"><div class="row between mb"><h4 class="mb-0">Galeri Kegiatan</h4><button class="btn btn-primary btn-sm" data-baru="galeri">' + ic('add_photo_alternate', 'sm') + 'Tambah Foto</button></div><div id="kb-gal">' + UI.skel(3) + '</div></div>' +
        '<div class="card-f row between wrap" id="kb-foot"><span class="small muted" id="kb-ubah">Tidak ada perubahan.</span><button class="btn btn-primary" id="kb-simpan">' + ic('check_circle') + 'Simpan Teks</button></div></section>';
      const tampilTab = () => { $$('[data-tab]', main).forEach((y) => y.classList.toggle('on', y.dataset.tab === KB.tab)); $$('[data-p]', main).forEach((p) => p.classList.toggle('hide', p.dataset.p !== KB.tab)); $('#kb-foot').classList.toggle('hide', ['struktur', 'berita', 'galeri'].indexOf(KB.tab) > -1); };
      $$('[data-tab]', main).forEach((b) => b.onclick = () => { KB.tab = b.dataset.tab; tampilTab(); });
      tampilTab();
      const kartu = $('section.card', main);
      const ubah = () => { if (!$('#kb-stat')) return; const n = $$('[data-k]', kartu).filter((i) => i.value !== String(st[i.dataset.k] || '')).length + (($('#kb-stat').checked ? 'YA' : 'TIDAK') !== (st.TAMPIL_STATISTIK === 'TIDAK' ? 'TIDAK' : 'YA') ? 1 : 0); $('#kb-ubah').textContent = n ? n + ' isian berubah — belum disimpan.' : 'Tidak ada perubahan.'; KB.edit = n > 0; };
      kartu.addEventListener('input', ubah); $('#kb-stat').onchange = ubah;
      $('#kb-simpan').onclick = (e) => UI.tombol(e.currentTarget, async () => {
        const pairs = {}; $$('[data-k]', kartu).forEach((i) => { if (i.value !== String(st[i.dataset.k] || '')) pairs[i.dataset.k] = i.value; });
        const s2 = $('#kb-stat').checked ? 'YA' : 'TIDAK'; if (s2 !== (st.TAMPIL_STATISTIK === 'TIDAK' ? 'TIDAK' : 'YA')) pairs.TAMPIL_STATISTIK = s2;
        if (!Object.keys(pairs).length) return UI.toast('Tidak ada perubahan.', 'warn');
        const r = await api('adm.setting.simpan', { pairs });
        if (UI.hasil(r)) { Store.adm.setting = r.data.setting; Store.simpanAdmLokal(); KB.edit = false; Store.pubBoot(true); ubah(); }
      });
      const unggah = (sel, tujuan) => { const el = $(sel, main); if (el) el.onchange = async (e) => { try { const f = await IKH.bacaGambar(e.target.files[0], tujuan === 'bagan' ? 1800 : 900, 0.86); const m = UI.muat('Mengunggah…'); const r = await api('adm.upload', { tujuan, file: f }); m.tutup(); if (UI.hasil(r)) { Store.adm.setting = r.data.setting; Store.simpanAdmLokal(); Store.pubBoot(true); beranda(); } } catch (er) { UI.toast(er.message, 'bad'); } }; };
      unggah('#up-samb', 'sambutan'); unggah('#up-bagan', 'bagan');
      const db = $('#del-bagan', main); if (db) db.onclick = async () => { const r = await api('adm.upload', { tujuan: 'bagan', hapus: true }); if (UI.hasil(r)) { Store.admBoot(true); } };
      $$('[data-baru]', main).forEach((b) => b.onclick = () => formKonten(b.dataset.baru, null));
      const k = await IKH.ambil('konten', 'adm.konten', {}, 60000);
      if (k) gambarKonten(k);
      document.addEventListener('ikh:menu', function ev(e) { if (e.detail !== 'konten') return; if (!$('#kb-brt')) return document.removeEventListener('ikh:menu', ev); gambarKonten(Store.menu.konten.d); });
    });
  }
  function gambarKonten(k) {
    if (!$('#kb-brt')) return;
    IKH.Tabel($('#kb-brt'), { data: k.berita, idKey: 'id', per: 15, kosong: 'Belum ada berita.',
      kolom: [{ k: 'judul', label: 'Judul', render: (b) => '<div class="row">' + (b.gambar_id ? '<span class="ava sq" ' + bg(b.gambar_id, 120) + '></span>' : '<span class="ava sq">' + ic('newspaper', 'sm') + '</span>') + '<div><b>' + esc(b.judul) + '</b><div class="small muted">' + esc(b.kategori || '') + '</div></div></div>' },
        { k: 'tanggal', label: 'Tanggal', render: (b) => fmt.tgl(b.tanggal) }, { k: 'status', label: 'Status', render: (b) => UI.badgeStatus(b.status) },
        { label: '', kelas: 'act', sort: false, render: () => '<button class="btn btn-ghost btn-xs" data-act="ubah">' + ic('edit', 'sm') + '</button> <button class="btn btn-ghost btn-xs" data-act="hapus">' + ic('delete', 'sm') + '</button>' }],
      onAksi: (a, b) => a === 'ubah' ? formKonten('berita', b) : hapusKonten('berita', b) });
    $('#kb-gal').innerHTML = k.galeri.length ? '<div class="gal">' + k.galeri.map((g) => '<div class="g" ' + bg(g.gambar_id, 500) + ' style="cursor:default"><span class="cap">' + esc(g.judul) + '<span class="row" style="margin-top:4px"><button class="btn btn-ghost btn-xs" data-g="' + esc(g.id) + '" data-a="ubah">' + ic('edit', 'sm') + '</button><button class="btn btn-ghost btn-xs" data-g="' + esc(g.id) + '" data-a="hapus">' + ic('delete', 'sm') + '</button></span></span></div>').join('') + '</div>' : UI.kosong('Belum ada foto.', 'photo_library');
    $$('[data-g]', $('#kb-gal')).forEach((b) => b.onclick = () => { const g = k.galeri.find((y) => y.id === b.dataset.g); b.dataset.a === 'ubah' ? formKonten('galeri', g) : hapusKonten('galeri', g); });
    IKH.Tabel($('#kb-str'), { data: k.struktur, idKey: 'id', per: 30, kosong: 'Belum ada data pengurus.',
      kolom: [{ k: 'urutan', label: '#', w: '50px' }, { k: 'nama', label: 'Nama', render: (s) => '<div class="person">' + UI.ava(s.nama, s.foto_id) + '<div><div class="nm">' + esc(s.nama) + '</div><div class="sb">' + esc(s.periode || '') + '</div></div></div>' },
        { k: 'jabatan', label: 'Jabatan', render: (s) => esc(s.jabatan) + '<div class="small muted">' + esc(s.bidang || '') + '</div>' }, { k: 'tampil', label: 'Tampil', render: (s) => s.tampil === 'TIDAK' ? '<span class="badge b-mute">Disembunyikan</span>' : '<span class="badge b-ok">Tampil</span>' },
        { label: '', kelas: 'act', sort: false, render: () => '<button class="btn btn-ghost btn-xs" data-act="ubah">' + ic('edit', 'sm') + '</button> <button class="btn btn-ghost btn-xs" data-act="hapus">' + ic('delete', 'sm') + '</button>' }],
      onAksi: (a, s) => a === 'ubah' ? formKonten('struktur', s) : hapusKonten('struktur', s) });
  }
  const PETA_K = { berita: { api: 'berita', kunci: 'berita', judul: 'Berita' }, galeri: { api: 'galeri', kunci: 'galeri', judul: 'Foto Galeri' }, struktur: { api: 'struktur', kunci: 'struktur', judul: 'Pengurus' } };
  function formKonten(jenis, item) {
    const v = item || {}, P = PETA_K[jenis];
    let gbr = null;
    const f = (k, l, inp) => '<div class="fld"><label for="fk-' + k + '">' + l + '</label>' + inp + '</div>';
    const t = (k, ph, type) => '<input class="inp" id="fk-' + k + '" value="' + esc(v[k] || '') + '" placeholder="' + esc(ph || '') + '" type="' + (type || 'text') + '">';
    const gid = jenis === 'struktur' ? v.foto_id : v.gambar_id;
    const isi = jenis === 'berita' ? '<div class="col gap-lg">' + f('judul', 'Judul', t('judul')) + '<div class="grid g3">' + f('kategori', 'Kategori', t('kategori', 'Organisasi / Pengumuman')) + f('tanggal', 'Tanggal', t('tanggal', '', 'date')) + f('status', 'Status', '<select class="inp" id="fk-status">' + opsi(['Terbit', 'Draf'], v.status || 'Terbit', false) + '</select>') + '</div>' +
      f('ringkasan', 'Ringkasan', '<textarea class="inp" id="fk-ringkasan" rows="2">' + esc(v.ringkasan || '') + '</textarea>') + f('isi', 'Isi berita', '<textarea class="inp" id="fk-isi" rows="10">' + esc(v.isi || '') + '</textarea>') + '</div>'
      : jenis === 'galeri' ? '<div class="col gap-lg">' + f('judul', 'Judul kegiatan', t('judul')) + '<div class="grid g3">' + f('lokasi', 'Lokasi', t('lokasi')) + f('tanggal', 'Tanggal', t('tanggal', '', 'date')) + f('urutan', 'Urutan', t('urutan', '1', 'number')) + '</div>' + f('keterangan', 'Keterangan', '<textarea class="inp" id="fk-keterangan" rows="2">' + esc(v.keterangan || '') + '</textarea>') + '</div>'
        : '<div class="col gap-lg"><div class="grid g2">' + f('nama', 'Nama & gelar', t('nama')) + f('jabatan', 'Jabatan', t('jabatan', 'Ketua / Sekretaris / …')) + f('bidang', 'Bidang', t('bidang')) + f('periode', 'Periode', t('periode', '2025–2029')) + f('urutan', 'Urutan tampil', t('urutan', '1', 'number')) +
          f('tampil', 'Tampil di situs', '<select class="inp" id="fk-tampil">' + opsi(['YA', 'TIDAK'], v.tampil || 'YA', false) + '</select>') + '</div>' + f('profil_singkat', 'Profil singkat (opsional)', '<textarea class="inp" id="fk-profil_singkat" rows="4">' + esc(v.profil_singkat || '') + '</textarea>') + '</div>';
    UI.modal({ judul: (item ? 'Ubah ' : 'Tambah ') + P.judul, lebar: 'lg', isi: isi + '<div class="fld mt-lg"><label>' + (jenis === 'struktur' ? 'Foto' : 'Gambar') + (jenis === 'galeri' && !item ? '<span class="req">*</span>' : '') + '</label><label class="upload"><input type="file" accept="image/*" id="fk-gbr"><span class="pv" id="fk-pv" style="width:120px;height:80px;' + (gid ? 'background-image:url(\'' + img(gid, 300) + '\')' : '') + '">' + (gid ? '' : ic('image', 'lg')) + '</span><span class="small">Pilih gambar (dikompres otomatis)</span></label></div>',
      onBuka: (md) => { $('#fk-gbr', md).onchange = async (e) => { try { gbr = await IKH.bacaGambar(e.target.files[0], jenis === 'struktur' ? 600 : 1400, 0.84); $('#fk-pv', md).style.backgroundImage = 'url(' + gbr.data + ')'; $('#fk-pv', md).innerHTML = ''; } catch (er) { UI.toast(er.message, 'bad'); } }; },
      tombol: [{ teks: 'Batal' }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (md) => {
        const d = { id: v.id || '' }; $$('[id^="fk-"]', md).forEach((i) => { if (i.type !== 'file' && i.id !== 'fk-pv') d[i.id.slice(3)] = i.value; });
        if (gbr) d.gambar = gbr;
        const r = await api('adm.' + P.api + '.simpan', d);
        if (!UI.hasil(r)) return false;
        const k = Store.menu.konten && Store.menu.konten.d; if (k) { const arr = k[P.kunci]; const i = arr.findIndex((y) => y.id === r.data.item.id); if (i > -1) arr[i] = r.data.item; else arr.unshift(r.data.item); gambarKonten(k); }
        Store.pubBoot(true); return true;
      } }] });
  }
  async function hapusKonten(jenis, item) {
    if (!(await UI.konfirmasi('Hapus <b>' + esc(item.judul || item.nama) + '</b>? Gambar terkait ikut dihapus.', { bahaya: true, ya: 'Hapus' })).ok) return;
    const r = await api('adm.' + PETA_K[jenis].api + '.hapus', { id: item.id });
    if (!UI.hasil(r)) return;
    const k = Store.menu.konten && Store.menu.konten.d; if (k) { k[PETA_K[jenis].kunci] = k[PETA_K[jenis].kunci].filter((y) => y.id !== item.id); gambarKonten(k); }
    Store.pubBoot(true);
  }

  /* ======================= WHATSAPP & NOTIFIKASI ======================= */
  const NS = { tab: 'blast', penerima: [], ring: null, hanyaWA: false, ub: 20, jeda: '5', aktif: null, auto: false, cd: 0, timer: null, sumber: 'crm', f: {} };
  function notifikasi(p, q) {
    if (q && q.get('tab')) NS.tab = q.get('tab');
    return halaman('/admin/notifikasi', 'WhatsApp & Notifikasi', async (main, x, awal) => {
      if (!awal && $('#nt-isi')) return;
      main.innerHTML = ph('campaign', 'WhatsApp & Notifikasi', 'Blast WhatsApp per batch, pemantauan antrean, saklar kanal, dan template pesan otomatis.') +
        '<section class="card"><div class="tabs">' + [['blast', 'Blast WhatsApp', 'campaign'], ['antrean', 'Antrean & Riwayat', 'forum'], ['konfig', 'Konfigurasi', 'tune']].map((t) => '<button data-tab="' + t[0] + '" class="' + (NS.tab === t[0] ? 'on' : '') + '">' + ic(t[2], 'sm') + t[1] + '</button>').join('') + '</div><div id="nt-isi" class="card-b">' + UI.skel(6) + '</div></section>';
      $$('[data-tab]', main).forEach((b) => b.onclick = () => { NS.tab = b.dataset.tab; $$('[data-tab]', main).forEach((y) => y.classList.toggle('on', y === b)); tabN(); });
      tabN();
    });
  }
  function tabN() { clearInterval(NS.timer); if (NS.tab === 'blast') tabBlast(); else if (NS.tab === 'antrean') tabAntrean(); else tabKonfig(); }

  async function tabKonfig() {
    const el = $('#nt-isi'); el.innerHTML = UI.skel(6);
    const c = await IKH.ambil('notifcfg', 'notif.config', {}, 20000, { paksa: true, tanpaLokal: true });
    if (!c || !$('#nt-isi')) return;
    const mat = c.matriks;
    el.innerHTML = '<div class="grid g2"><div class="card card-b col gap-lg"><div class="row between"><h4 class="mb-0 row">' + ic('chat') + 'WhatsApp (Fonnte)</h4><label class="switch"><input type="checkbox" id="c-wa" ' + (c.waAktif ? 'checked' : '') + '><span class="tr"></span><span id="c-wa-t">' + (c.waAktif ? 'AKTIF' : 'NONAKTIF') + '</span></label></div>' +
      '<div class="fld"><label for="c-tok">Token Fonnte</label><input class="inp mono" id="c-tok" type="password" autocomplete="off" placeholder="' + esc(c.tokenAda ? c.token + ' (tersimpan — kosongkan bila tidak diubah)' : 'Tempel token dari fonnte.com → Device') + '"><span class="hint">Disimpan di Script Properties, tidak pernah dikirim kembali ke browser.</span></div>' +
      '<div class="row wrap"><button class="btn btn-ghost btn-sm" id="c-dev" data-busy="Memeriksa…">' + ic('sync', 'sm') + 'Cek Perangkat</button><button class="btn btn-ghost btn-sm" id="c-twa">' + ic('send', 'sm') + 'Kirim Tes WA</button>' + (c.tokenAda ? '<button class="btn btn-text btn-sm" id="c-del">Hapus token</button>' : '') + '</div><div id="c-devh"></div>' +
      '<div class="grid g2"><div class="fld"><label>Ukuran batch blast</label><div class="seg" id="c-ub">' + [10, 20, 50].map((n) => '<button type="button" data-n="' + n + '" class="' + (c.batchDefault === n ? 'on' : '') + '">' + n + '</button>').join('') + '</div></div><div class="fld"><label for="c-jd">Jeda antarpesan (detik)</label><input class="inp" id="c-jd" value="' + esc(c.jeda) + '" placeholder="5 atau 3-8"></div></div>' +
      '<label class="switch"><input type="checkbox" id="c-det" ' + (c.deteksiOtomatis ? 'checked' : '') + '><span class="tr"></span>Deteksi otomatis nomor WhatsApp kontak baru (±10 menit sekali)</label></div>' +
      '<div class="card card-b col gap-lg"><div class="row between"><h4 class="mb-0 row">' + ic('mail') + 'Email (Gmail)</h4><label class="switch"><input type="checkbox" id="c-em" ' + (c.emailAktif ? 'checked' : '') + '><span class="tr"></span><span id="c-em-t">' + (c.emailAktif ? 'AKTIF' : 'NONAKTIF') + '</span></label></div>' +
      '<div class="kv box"><div>Sisa kuota hari ini</div><div class="tnum">' + c.kuotaEmail + '</div><div>Trigger antrean (1 menit)</div><div>' + (c.trigger ? '<span class="badge b-ok">aktif</span>' : '<span class="badge b-bad">belum</span>') + '</div><div>Pemanas server</div><div>' + (c.keepWarm ? 'aktif' : 'dimatikan') + '</div></div>' +
      '<div class="fld"><label for="c-nm">Nama pengirim</label><input class="inp" id="c-nm" value="' + esc(c.namaPengirim) + '"></div><div class="fld"><label for="c-url">URL aplikasi (untuk tautan di pesan)</label><input class="inp" id="c-url" value="' + esc(c.appUrl) + '"></div>' +
      '<button class="btn btn-ghost btn-sm" id="c-tem" style="align-self:flex-start">' + ic('send', 'sm') + 'Kirim Tes Email</button><p class="hint mb-0">Akun Gmail biasa ±100 email/hari; Google Workspace ±1.500/hari. Email "wajib" (atur sandi) tetap terkirim walau saklar email dimatikan.</p></div></div>' +
      '<h4 class="mt-lg">Matriks Notifikasi Otomatis</h4><div class="tbl-wrap"><table class="tbl matriks"><thead><tr><th>Kejadian</th><th class="center">WhatsApp</th><th class="center">Email</th><th></th></tr></thead><tbody>' +
      mat.map((m, i) => '<tr><td><div class="lbl">' + esc(m.label) + '</div><div class="kode">' + esc(m.kode) + (m.wajib ? ' • wajib' : '') + '</div></td><td class="center"><label class="switch"><input type="checkbox" data-m="' + i + '" data-c="wa" ' + (m.wa ? 'checked' : '') + ' ' + (m.hanyaEmail ? 'disabled' : '') + '><span class="tr"></span></label></td>' +
        '<td class="center"><label class="switch"><input type="checkbox" data-m="' + i + '" data-c="email" ' + (m.email ? 'checked' : '') + ' ' + (m.wajib ? 'disabled' : '') + '><span class="tr"></span></label></td><td class="act"><button class="btn btn-ghost btn-xs" data-ed="' + i + '">' + ic('edit', 'sm') + 'Ubah pesan</button></td></tr>' +
        '<tr class="hide" id="ed-' + i + '"><td colspan="4" style="background:#FBFBFD"><div class="grid g2"><div class="col gap-lg"><div class="fld"><label>Subjek email</label><input class="inp" data-t="subjek" data-i="' + i + '" value="' + esc(m.subjek) + '"></div><div class="fld"><label>Pesan WhatsApp' + (m.pesanEmail ? '' : ' & email') + '</label><textarea class="inp" rows="6" data-t="pesan" data-i="' + i + '">' + esc(m.pesan) + '</textarea></div>' +
        (m.pesanEmailDefault ? '<div class="fld"><label>Pesan email</label><textarea class="inp" rows="8" data-t="pesanEmail" data-i="' + i + '">' + esc(m.pesanEmail) + '</textarea></div>' : '') + '<div class="hint">Variabel: {nama} {institusi} {link} {email} ' + m.vars.map((v) => '{' + esc(v) + '}').join(' ') + '. Teks di antara *bintang* jadi tebal.</div><button type="button" class="btn btn-text btn-sm" data-rs="' + i + '" style="align-self:flex-start">' + ic('refresh', 'sm') + 'Kembalikan bawaan</button></div>' +
        '<div><div class="kicker mb">Pratinjau WhatsApp</div><div class="wa-preview"><div class="wa-bubble" id="pv-' + i + '"></div></div></div></div></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="row mt-lg" style="justify-content:flex-end"><button class="btn btn-primary" id="c-simpan">' + ic('check_circle') + 'Simpan Konfigurasi</button></div>';
    const contoh = { nama: 'Budi Santoso', institusi: (IKH.adm.D().st.ORG_NAMA || 'DPD IKALLHUBDAT Kaltim'), link: c.appUrl || 'https://…', email: 'budi@contoh.id', kode: 'REG-2026-0001', id_member: 'IKH-KT-2026-0001', masa_berlaku: '31 Des 2029', catatan: 'Contoh catatan', field: 'Instansi', sisa_hari: '25', judul: 'Pendaftaran baru', isi: 'Contoh isi', sandi: '••••••' };
    const pv = (i) => { const ta = $('[data-t="pesan"][data-i="' + i + '"]', el); const out = ta.value.replace(/\{(\w+)\}/g, (m, k) => contoh[k] !== undefined ? contoh[k] : m); $('#pv-' + i).innerHTML = esc(out).replace(/\*([^*\n]+)\*/g, '<b>$1</b>'); };
    $$('[data-ed]', el).forEach((b) => b.onclick = () => { const r = $('#ed-' + b.dataset.ed); r.classList.toggle('hide'); pv(b.dataset.ed); });
    $$('[data-t="pesan"]', el).forEach((t) => t.oninput = () => pv(t.dataset.i));
    $$('[data-rs]', el).forEach((b) => b.onclick = () => { const m = mat[b.dataset.rs]; $('[data-t="subjek"][data-i="' + b.dataset.rs + '"]', el).value = m.subjekDefault; $('[data-t="pesan"][data-i="' + b.dataset.rs + '"]', el).value = m.pesanDefault; const pe = $('[data-t="pesanEmail"][data-i="' + b.dataset.rs + '"]', el); if (pe) pe.value = m.pesanEmailDefault; pv(b.dataset.rs); });
    $$('#c-ub [data-n]', el).forEach((b) => b.onclick = () => $$('#c-ub [data-n]', el).forEach((y) => y.classList.toggle('on', y === b)));
    $('#c-wa').onchange = (e) => { $('#c-wa-t').textContent = e.target.checked ? 'AKTIF' : 'NONAKTIF'; };
    $('#c-em').onchange = (e) => { $('#c-em-t').textContent = e.target.checked ? 'AKTIF' : 'NONAKTIF'; };
    $('#c-dev').onclick = async (e) => { const r = await UI.tombol(e.currentTarget, () => api('wa.device', {})); $('#c-devh').innerHTML = r.ok ? '<div class="alert ' + (r.data.status === 'connect' ? 'ok' : 'warn') + ' small">' + ic('chat', 'sm') + '<div>Perangkat <b>' + esc(r.data.device || '-') + '</b> • status <b>' + esc(r.data.status || '-') + '</b> • paket ' + esc(r.data.paket || '-') + ' • kuota ' + esc(r.data.kuota || '-') + ' • aktif s.d. ' + esc(r.data.kedaluwarsa || '-') + '</div></div>' : '<div class="alert bad small">' + ic('error', 'sm') + '<div>' + esc(r.msg) + '</div></div>'; };
    $('#c-twa').onclick = async () => { const k = await UI.konfirmasi('Kirim pesan tes ke nomor:', { judul: 'Tes WhatsApp', ya: 'Kirim', input: { label: 'Nomor WhatsApp', tipe: 'input', wajib: true, ph: '08…' } }); if (k.ok) UI.hasil(await api('wa.test', { nomor: k.nilai })); };
    $('#c-tem').onclick = async () => { const k = await UI.konfirmasi('Kirim email tes ke:', { judul: 'Tes Email', ya: 'Kirim', input: { label: 'Email', tipe: 'input', wajib: true, nilai: (Sesi.me && /@/.test(Sesi.me.email) ? Sesi.me.email : '') } }); if (k.ok) UI.hasil(await api('email.test', { email: k.nilai })); };
    const del = $('#c-del'); if (del) del.onclick = async () => { if (!(await UI.konfirmasi('Hapus token Fonnte? WhatsApp akan nonaktif.', { bahaya: true, ya: 'Hapus' })).ok) return; const r = await api('notif.configSave', { token: '__HAPUS__', waAktif: false }); if (UI.hasil(r)) tabKonfig(); };
    $('#c-simpan').onclick = (e) => UI.tombol(e.currentTarget, async () => {
      const m = {};
      mat.forEach((x, i) => {
        const o = {}; $$('[data-m="' + i + '"]', el).forEach((s) => { o[s.dataset.c] = s.checked; });
        $$('[data-i="' + i + '"]', el).forEach((t) => { o[t.dataset.t] = t.value; });
        m[x.kode] = o;
      });
      const body = { waAktif: $('#c-wa').checked, emailAktif: $('#c-em').checked, batchDefault: +$('#c-ub .on').dataset.n, jeda: $('#c-jd').value.trim(), deteksiOtomatis: $('#c-det').checked, namaPengirim: $('#c-nm').value.trim(), appUrl: $('#c-url').value.trim(), matriks: m };
      if ($('#c-tok').value.trim()) body.token = $('#c-tok').value.trim();
      if (body.appUrl === (c.appUrl || '')) delete body.appUrl;
      const r = await api('notif.configSave', body);
      if (UI.hasil(r)) { $('#c-tok').value = ''; Store.menu.notifcfg = { d: r.data, at: Date.now() }; tabKonfig(); }
    });
  }

  async function tabAntrean() {
    const el = $('#nt-isi'); el.innerHTML = UI.skel(6);
    const f = NS.f;
    const muat = async (paksa) => {
      const d = await IKH.ambil('antrean', 'notif.queue', f, 10000, { paksa: paksa, tanpaLokal: true });
      if (!d || !$('#nt-isi') || NS.tab !== 'antrean') return;
      el.innerHTML = '<div class="grid g4 mb">' + [['Antri', 'Menunggu', 'hourglass_top', 'w'], ['Terkirim', 'Terkirim', 'task_alt', 'o'], ['Gagal', 'Gagal', 'error', ''], ['Batal', 'Dibatalkan', 'block', '']].map((k) => '<div class="card kpi ' + k[3] + '" data-st="' + k[0] + '"><span class="ico">' + ic(k[2]) + '</span><div class="t">' + k[1] + '</div><div class="n tnum">' + fmt.angka(d.ringkas[k[0]] || 0) + '</div></div>').join('') + '</div>' +
        '<div class="toolbar" style="padding:0 0 1rem;border:0"><select class="inp" id="aq-st" style="width:auto">' + opsi(['Antri', 'Terkirim', 'Gagal', 'Batal'], f.status, 'Semua status') + '</select><select class="inp" id="aq-k" style="width:auto">' + opsi(['WA', 'EMAIL'], f.kanal, 'Semua kanal') + '</select><span class="grow small muted">Sisa kuota email: ' + d.kuotaEmail + '</span>' +
        '<button class="btn btn-ghost btn-sm" id="aq-r">' + ic('refresh', 'sm') + 'Muat ulang</button><button class="btn btn-ghost btn-sm" id="aq-u">' + ic('autorenew', 'sm') + 'Ulangi yang Gagal</button><button class="btn btn-primary btn-sm" id="aq-p" data-busy="Mengirim…">' + ic('send', 'sm') + 'Proses Sekarang</button></div><div id="aq-tbl"></div>';
      IKH.Tabel($('#aq-tbl'), { data: d.rows, idKey: 'id', per: 30, kosong: 'Antrean kosong.',
        kolom: [{ k: 'dibuat', label: 'Waktu', render: (r) => '<span class="small nowrap">' + fmt.waktu(r.dibuat) + '</span>' }, { k: 'kanal', label: 'Kanal', render: (r) => '<span class="badge ' + (r.kanal === 'WA' ? 'b-ok' : 'b-info') + '">' + r.kanal + '</span>' },
          { k: 'tujuan', label: 'Tujuan', render: (r) => esc(r.nama || '') + '<div class="small mono muted">' + esc(r.tujuan) + '</div>' }, { k: 'event', label: 'Kejadian', render: (r) => '<span class="small mono">' + esc(r.event) + '</span>' },
          { k: 'pesan', label: 'Pesan', render: (r) => '<span class="small">' + esc(r.pesan) + '</span>' }, { k: 'status', label: 'Status', render: (r) => UI.badgeStatus(r.status) + (r.respon ? '<div class="tiny muted" style="max-width:180px">' + esc(r.respon) + '</div>' : '') }] });
      $('#aq-st').onchange = (e) => { f.status = e.target.value; muat(true); };
      $('#aq-k').onchange = (e) => { f.kanal = e.target.value; muat(true); };
      $('#aq-r').onclick = () => muat(true);
      $$('[data-st]', el).forEach((k) => k.onclick = () => { f.status = k.dataset.st; muat(true); });
      $('#aq-u').onclick = async () => { const r = await api('notif.retry', {}); if (UI.hasil(r)) muat(true); };
      $('#aq-p').onclick = async (e) => { const r = await UI.tombol(e.currentTarget, () => api('notif.processNow', {})); UI.hasil(r); muat(true); };
    };
    muat(true);
  }

  async function tabBlast() {
    const el = $('#nt-isi');
    const cfg = await IKH.ambil('notifcfg', 'notif.config', {}, 60000, { tanpaLokal: true });
    if (!$('#nt-isi') || NS.tab !== 'blast') return;
    const x = IKH.adm.D(), cfgOk = cfg && cfg.waAktif && cfg.tokenAda;
    if (cfg && NS.ub === 20) NS.ub = cfg.batchDefault || 20;
    const dariCrm = sessionStorage.getItem('ikh_blast_ids');
    el.innerHTML = (!cfgOk ? '<div class="alert warn mb">' + ic('warning') + '<div>WhatsApp belum aktif. Isi token Fonnte & nyalakan saklar di tab <a href="javascript:void 0" id="go-k"><b>Konfigurasi</b></a>.</div></div>' : '') +
      '<div id="bl-aktif"></div><div class="grid" style="grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);align-items:start" id="bl-g">' +
      '<div class="card"><div class="card-h"><h4>1. Pilih Sasaran</h4></div><div class="card-b col gap-lg"><div class="seg" id="bl-src"><button data-s="crm" class="' + (NS.sumber === 'crm' ? 'on' : '') + '">Dari CRM Kontak</button><button data-s="manual" class="' + (NS.sumber === 'manual' ? 'on' : '') + '">Tempel Manual</button></div>' +
      '<div id="bl-fcrm" class="grid g2 ' + (NS.sumber === 'crm' ? '' : 'hide') + '"><select class="inp" id="bl-seg">' + opsi(['Alumni', 'Pendaftar', 'Pengurus', 'Kontak Luar'], NS.f.segmen, 'Semua segmen') + '</select><select class="inp" id="bl-st">' + opsi(['Aktif', 'Kedaluwarsa', 'Nonaktif'], NS.f.status, 'Semua status anggota') + '</select>' +
      '<select class="inp" id="bl-angk">' + opsi(uniq(x.d.anggota.map((a) => a.angkatan)), NS.f.angkatan, 'Semua angkatan') + '</select><select class="inp" id="bl-prodi">' + opsi(uniq(x.d.anggota.map((a) => a.prodi)), NS.f.prodi, 'Semua prodi') + '</select></div>' +
      '<div id="bl-fman" class="' + (NS.sumber === 'manual' ? '' : 'hide') + '"><textarea class="inp" id="bl-man" rows="5" placeholder="Satu nomor per baris, format: 0812xxxx|Nama"></textarea></div>' +
      (dariCrm ? '<div class="alert info small">' + ic('contacts', 'sm') + '<div>' + JSON.parse(dariCrm).length + ' kontak terpilih dari CRM. <a href="javascript:void 0" id="bl-crmx">Abaikan</a></div></div>' : '') +
      '<div class="row wrap"><button class="btn btn-primary btn-sm" id="bl-load" data-busy="Memuat…">' + ic('groups', 'sm') + 'Muat Penerima</button><button class="btn btn-ghost btn-sm" id="bl-det">' + ic('travel_explore', 'sm') + 'Deteksi Nomor WA</button></div>' +
      '<div id="bl-ring" class="row wrap"></div><label class="cek"><input type="checkbox" id="bl-hwa" ' + (NS.hanyaWA ? 'checked' : '') + '><span>Kirim hanya ke nomor yang terdeteksi terdaftar WhatsApp</span></label><div id="bl-tbl"></div></div></div>' +
      '<div class="col gap-lg"><div class="card"><div class="card-h"><h4>2. Tulis Pesan</h4></div><div class="card-b col gap-lg"><input class="inp" id="bl-jdl" placeholder="Judul internal (mis. Undangan Musda 2026)"><div class="row wrap">' + ['nama', 'angkatan', 'prodi', 'id_member', 'instansi', 'institusi', 'link'].map((v) => '<button class="chip" data-v="' + v + '">{' + v + '}</button>').join('') + '</div>' +
      '<textarea class="inp" id="bl-psn" rows="7" placeholder="Halo {nama}, …">' + esc(LS.get('blast_draf', '')) + '</textarea><div class="wa-preview"><div class="wa-bubble" id="bl-pv">Pratinjau pesan…</div></div></div></div>' +
      '<div class="card"><div class="card-h"><h4>3. Ukuran Batch & Jeda</h4></div><div class="card-b col gap-lg"><div class="row wrap gap-lg"><div class="seg" id="bl-ub">' + [10, 20, 50].map((n) => '<button data-n="' + n + '" class="' + (NS.ub === n ? 'on' : '') + '">' + n + ' / batch</button>').join('') + '</div><div class="fld" style="width:140px"><input class="inp" id="bl-jd" value="' + esc(NS.jeda) + '" aria-label="Jeda detik" placeholder="5 atau 3-8"></div></div>' +
      '<div class="small muted" id="bl-est"></div><button class="btn btn-gold btn-block" id="bl-go" ' + (cfgOk ? '' : 'disabled') + '>' + ic('send') + 'Mulai Blast</button><p class="hint mb-0">Tips anti-blokir: mulai batch 10, jeda acak ≥5 detik (mis. 5-10), hindari tautan yang sama ke ratusan nomor dalam 1 jam.</p></div></div></div></div>' +
      '<div class="card mt-lg"><div class="card-h"><h4>Riwayat Blast</h4><button class="btn btn-ghost btn-sm" id="bl-ref">' + ic('refresh', 'sm') + '</button></div><div id="bl-riw">' + UI.skel(3) + '</div></div>';
    if (window.innerWidth < 1180) $('#bl-g').style.gridTemplateColumns = '1fr';
    const gk = $('#go-k'); if (gk) gk.onclick = () => { NS.tab = 'konfig'; $$('[data-tab]').forEach((y) => y.classList.toggle('on', y.dataset.tab === 'konfig')); tabN(); };
    const cx = $('#bl-crmx'); if (cx) cx.onclick = () => { sessionStorage.removeItem('ikh_blast_ids'); tabBlast(); };
    $$('#bl-src [data-s]').forEach((b) => b.onclick = () => { NS.sumber = b.dataset.s; $$('#bl-src [data-s]').forEach((y) => y.classList.toggle('on', y === b)); $('#bl-fcrm').classList.toggle('hide', NS.sumber !== 'crm'); $('#bl-fman').classList.toggle('hide', NS.sumber !== 'manual'); });
    $$('#bl-ub [data-n]').forEach((b) => b.onclick = () => { NS.ub = +b.dataset.n; $$('#bl-ub [data-n]').forEach((y) => y.classList.toggle('on', y === b)); estimasi(); });
    $('#bl-jd').oninput = (e) => { NS.jeda = e.target.value.trim(); estimasi(); };
    $('#bl-hwa').onchange = (e) => { NS.hanyaWA = e.target.checked; gambarPenerima(); };
    $$('[data-v]').forEach((b) => b.onclick = () => { const t = $('#bl-psn'); const s = t.selectionStart; t.value = t.value.slice(0, s) + '{' + b.dataset.v + '}' + t.value.slice(t.selectionEnd); t.focus(); pratinjauBlast(); });
    $('#bl-psn').oninput = () => { LS.set('blast_draf', $('#bl-psn').value); pratinjauBlast(); };
    $('#bl-load').onclick = (e) => UI.tombol(e.currentTarget, muatPenerima);
    $('#bl-det').onclick = deteksiWA;
    $('#bl-go').onclick = mulaiBlast;
    $('#bl-ref').onclick = () => riwayatBlast(true);
    pratinjauBlast(); gambarPenerima(); riwayatBlast(false);
  }
  async function muatPenerima() {
    const ids = sessionStorage.getItem('ikh_blast_ids');
    const d = NS.sumber === 'manual' ? { sumber: 'manual', manual: $('#bl-man').value } : ids ? { sumber: 'crm', ids: JSON.parse(ids) } : { sumber: 'crm', segmen: $('#bl-seg').value, status: $('#bl-st').value, angkatan: $('#bl-angk').value, prodi: $('#bl-prodi').value };
    NS.f = { segmen: d.segmen, status: d.status, angkatan: d.angkatan, prodi: d.prodi };
    const r = await api('wa.audience', d);
    if (!r.ok) return UI.toast(r.msg, 'bad');
    NS.penerima = r.data.rows.map((p) => Object.assign(p, { pilih: p.valid && !p.ganda && !p.optOut })); NS.ring = r.data.ringkas;
    gambarPenerima();
  }
  function terpilih() { return NS.penerima.filter((p) => p.pilih && p.valid && !p.ganda && !p.optOut && (!NS.hanyaWA || p.statusWA === 'Terdaftar')); }
  function gambarPenerima() {
    const el = $('#bl-tbl'); if (!el) return;
    const r = NS.ring;
    $('#bl-ring').innerHTML = r ? [['Total', r.total, 'b-mute'], ['Valid', r.valid, 'b-ok'], ['Tidak valid', r.tidakValid, 'b-bad'], ['Ganda', r.ganda, 'b-wait'], ['Opt-out', r.optOut, 'b-mute'], ['✓ WA', r.terdaftarWA, 'b-ok'], ['✕ bukan WA', r.tidakTerdaftarWA, 'b-bad']].map((c) => '<span class="badge ' + c[2] + '">' + c[0] + ' ' + c[1] + '</span>').join('') : '';
    if (!NS.penerima.length) { el.innerHTML = UI.kosong('Klik "Muat Penerima".', 'groups'); estimasi(); return; }
    IKH.Tabel(el, { data: NS.penerima, idKey: 'hp', per: 15,
      kolom: [{ label: '', w: '36px', sort: false, render: (p) => '<input type="checkbox" data-pp="' + esc(p.hp) + '" ' + (p.pilih ? 'checked' : '') + ' ' + (!p.valid || p.ganda || p.optOut ? 'disabled' : '') + ' aria-label="Pilih">' },
        { k: 'nama', label: 'Nama', render: (p) => '<span style="' + (!p.valid || p.ganda || p.optOut ? 'opacity:.5' : '') + '">' + esc(p.nama || '-') + (p.optOut ? ' <span class="badge b-mute">opt-out</span>' : '') + (p.ganda ? ' <span class="badge b-wait">ganda</span>' : '') + '</span>' },
        { k: 'hp', label: 'Nomor', render: (p) => '<span class="mono small">' + esc(p.hp || '-') + '</span>' }, { k: 'statusWA', label: 'WA', render: (p) => '<span class="wa-badge ' + (p.statusWA === 'Terdaftar' ? 'ya">✓ WA' : p.statusWA === 'Tidak Terdaftar' ? 'tidak">✕ bukan WA' : 'belum">? belum dicek') + '</span>' }],
      setelah: () => $$('[data-pp]', el).forEach((c) => c.onchange = () => { const p = NS.penerima.find((y) => y.hp === c.dataset.pp); if (p) p.pilih = c.checked; estimasi(); }) });
    estimasi(); pratinjauBlast();
  }
  function estimasi() {
    const n = terpilih().length, b = Math.ceil(n / NS.ub), j = String(NS.jeda).split('-').map(Number), rata = j.length > 1 ? (j[0] + j[1]) / 2 : (j[0] || 5);
    const el = $('#bl-est'); if (el) el.innerHTML = '<b>' + n + ' penerima</b> → ' + b + ' batch • estimasi ±' + Math.max(1, Math.ceil((n * rata + b * 60) / 60)) + ' menit';
    const g = $('#bl-go'); if (g) g.innerHTML = ic('send') + 'Mulai Blast (' + n + ' nomor)';
  }
  function pratinjauBlast() {
    const p = terpilih()[0] || { nama: 'Budi', vars: {} }, st = IKH.adm.D().st;
    const v = Object.assign({ nama: p.nama || 'Bapak/Ibu', institusi: st.ORG_NAMA, link: st.APP_URL || '' }, p.vars || {}, { nama: p.nama || (p.vars && p.vars.nama) || 'Bapak/Ibu' });
    const t = ($('#bl-psn') || {}).value || '';
    const el = $('#bl-pv'); if (el) el.innerHTML = t ? esc(t.replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') : '<span class="muted">Pratinjau pesan…</span>';
  }
  async function deteksiWA() {
    const nomor = Array.from(new Set(NS.penerima.filter((p) => p.valid && !p.statusWA).map((p) => p.hp)));
    if (!nomor.length) return UI.toast(NS.penerima.length ? 'Semua nomor sudah dicek.' : 'Muat penerima terlebih dahulu.', 'warn');
    const m = UI.muat('Mengecek 0/' + nomor.length + '…');
    try {
      for (let i = 0; i < nomor.length; i += 50) {
        m.teks('Mengecek ' + Math.min(i + 50, nomor.length) + '/' + nomor.length + '…');
        const r = await api('wa.validate', { nomor: nomor.slice(i, i + 50) });
        if (!r.ok) { UI.toast(r.msg, 'bad', 6000); break; }
        NS.penerima.forEach((p) => { if (r.data.hasil[p.hp]) p.statusWA = r.data.hasil[p.hp]; });
      }
    } finally { m.tutup(); }
    if (NS.ring) { NS.ring.terdaftarWA = NS.penerima.filter((p) => p.statusWA === 'Terdaftar').length; NS.ring.tidakTerdaftarWA = NS.penerima.filter((p) => p.statusWA === 'Tidak Terdaftar').length; }
    gambarPenerima();
  }
  async function mulaiBlast() {
    const pen = terpilih(), pesan = $('#bl-psn').value.trim();
    if (!pen.length) return UI.toast('Belum ada penerima terpilih.', 'warn');
    if (pesan.length < 3) return UI.toast('Tulis pesan terlebih dahulu.', 'warn');
    if (!(await UI.konfirmasi('Kirim blast ke <b>' + pen.length + '</b> nomor dalam ' + Math.ceil(pen.length / NS.ub) + ' batch (' + NS.ub + '/batch, jeda ' + esc(NS.jeda) + ' dtk)?', { ya: 'Mulai Blast' })).ok) return;
    const r = await api('wa.blastCreate', { judul: $('#bl-jdl').value.trim(), pesan, ukuranBatch: NS.ub, jeda: NS.jeda, sasaran: NS.sumber === 'manual' ? 'Manual' : [NS.f.segmen, NS.f.angkatan && 'Angk. ' + NS.f.angkatan, NS.f.prodi, NS.f.status].filter(Boolean).join(' • ') || 'CRM', penerima: pen.map((p) => ({ hp: p.hp, nama: p.nama, vars: p.vars })) });
    if (!UI.hasil(r)) return;
    sessionStorage.removeItem('ikh_blast_ids'); LS.del('blast_draf');
    NS.aktif = r.data.blastId; NS.auto = true;
    riwayatBlast(true);
    kirimBatch();
  }
  async function kirimBatch() {
    if (!NS.aktif) return;
    const r = await api('wa.blastProcess', { blastId: NS.aktif });
    if (r.ok && r.data.blast) gambarAktif(r.data.blast);
    if (r.ok && r.data.blast && r.data.blast.status !== 'Berjalan') { NS.auto = false; riwayatBlast(true); }
  }
  function gambarAktif(b) {
    const el = $('#bl-aktif'); if (!el) return;
    clearInterval(NS.timer);
    if (!b || b.status !== 'Berjalan') { el.innerHTML = b ? '<div class="alert ok mb">' + ic('task_alt') + '<div>Blast <b>' + esc(b.judul) + '</b> ' + esc(b.status.toLowerCase()) + ': ' + b.terkirim + ' terkirim, ' + b.gagal + ' gagal.</div></div>' : ''; return; }
    const j = String(b.jeda).split('-').map(Number), rata = j.length > 1 ? (j[0] + j[1]) / 2 : (j[0] || 5);
    NS.cd = Math.max(30, Math.round(b.batch * rata));
    el.innerHTML = '<div class="card mb" style="border-color:var(--info-bd)"><div class="card-b"><div class="row between wrap"><div><b>' + esc(b.judul) + '</b> <span class="badge b-info">Berjalan</span><div class="small muted">' + esc(b.sasaran || '') + ' • ' + b.batch + '/batch • jeda ' + esc(b.jeda) + ' dtk</div></div>' +
      '<div class="row wrap"><label class="switch small"><input type="checkbox" id="ba-auto" ' + (NS.auto ? 'checked' : '') + '><span class="tr"></span>Otomatis <span id="ba-cd" class="tnum muted"></span></label><button class="btn btn-primary btn-sm" id="ba-next" data-busy="Mengirim…">' + ic('play_arrow', 'sm') + 'Kirim Batch Berikutnya</button><button class="btn btn-danger btn-sm" id="ba-stop">' + ic('stop_circle', 'sm') + 'Hentikan</button></div></div>' +
      '<div class="progress mt"><i style="width:' + b.persen + '%"></i></div><div class="row between small mt"><span>' + b.terkirim + ' terkirim • ' + b.gagal + ' gagal • ' + b.sisa + ' sisa</span><span>' + b.persen + '%</span></div><p class="tiny muted mt mb-0">Server tetap mengirim 1 batch/menit walau halaman ini ditutup.</p></div></div>';
    $('#ba-auto').onchange = (e) => { NS.auto = e.target.checked; };
    $('#ba-next').onclick = (e) => UI.tombol(e.currentTarget, kirimBatch);
    $('#ba-stop').onclick = async () => { if (!(await UI.konfirmasi('Hentikan blast? Pesan yang belum terkirim dibatalkan.', { bahaya: true, ya: 'Hentikan' })).ok) return; const r = await api('wa.blastStop', { blastId: b.id }); if (UI.hasil(r)) { NS.aktif = null; NS.auto = false; el.innerHTML = ''; riwayatBlast(true); } };
    NS.timer = setInterval(() => {
      if (!$('#ba-cd')) return clearInterval(NS.timer);
      if (!NS.auto || document.visibilityState !== 'visible') { $('#ba-cd').textContent = ''; return; }
      NS.cd--; $('#ba-cd').textContent = '(' + NS.cd + ' dtk)';
      if (NS.cd <= 0) { clearInterval(NS.timer); kirimBatch(); }
    }, 1000);
  }
  async function riwayatBlast(paksa) {
    const d = await IKH.ambil('blast', 'wa.blastList', {}, 15000, { paksa: paksa, tanpaLokal: true });
    const el = $('#bl-riw'); if (!d || !el) return;
    const jalan = d.blast.find((b) => b.status === 'Berjalan');
    if (jalan && (!NS.aktif || NS.aktif === jalan.id)) { NS.aktif = jalan.id; gambarAktif(jalan); }
    IKH.Tabel(el, { data: d.blast, idKey: 'id', per: 10, kosong: 'Belum ada blast.',
      kolom: [{ k: 'tanggal', label: 'Tanggal', render: (b) => '<span class="small">' + fmt.waktu(b.tanggal) + '</span>' }, { k: 'judul', label: 'Judul', render: (b) => '<b>' + esc(b.judul) + '</b><div class="small muted">' + esc(b.sasaran) + '</div>' },
        { k: 'batch', label: 'Batch • jeda', render: (b) => b.batch + ' • ' + esc(b.jeda) + 's' }, { k: 'persen', label: 'Progres', render: (b) => '<div class="progress" style="width:120px"><i style="width:' + b.persen + '%"></i></div><div class="tiny muted">' + b.terkirim + '/' + b.total + (b.gagal ? ' • ' + b.gagal + ' gagal' : '') + '</div>' },
        { k: 'status', label: 'Status', render: (b) => UI.badgeStatus(b.status) }, { label: '', kelas: 'act', sort: false, render: (b) => b.status === 'Berjalan' ? '<button class="btn btn-ghost btn-xs" data-act="pantau">Pantau</button>' : '' }],
      onAksi: (a, b) => { NS.aktif = b.id; gambarAktif(b); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  }

  /* ======================= CRM KONTAK ======================= */
  const CS = { f: { halaman: 1, per: 50 }, sel: new Set(), data: null };
  function crm() {
    return halaman('/admin/crm', 'CRM Kontak', async (main, x, awal) => {
      if (!awal && $('#crm-tbl')) return;
      main.innerHTML = ph('contacts', 'CRM Kontak', 'Satu daftar Nama · Email · WhatsApp dari alumni, pendaftar, pengurus, dan kontak luar.', '<span class="small muted" id="crm-sync"></span><button class="btn btn-ghost btn-sm" id="crm-dup">' + ic('merge', 'sm') + 'Periksa Duplikat</button><label class="btn btn-ghost btn-sm">' + ic('upload', 'sm') + 'Impor CSV<input type="file" accept=".csv,.xlsx,.xls" class="hide" id="crm-imp"></label><button class="btn btn-ghost btn-sm" id="crm-tpl">' + ic('download', 'sm') + 'Template</button><button class="btn btn-primary btn-sm" id="crm-s" data-busy="Menyinkron…">' + ic('sync', 'sm') + 'Sinkron Sekarang</button>') +
        '<div class="grid g3 mb" id="crm-kpi" style="grid-template-columns:repeat(6,minmax(0,1fr))">' + UI.skel(2) + '</div>' +
        '<section class="card"><div class="toolbar" id="crm-chip"></div><div class="toolbar"><div class="inp-ic cari">' + ic('search') + '<input class="inp" id="crm-q" placeholder="Cari nama, email, nomor, angkatan…"></div><select class="inp" id="crm-wa" style="width:auto">' + opsi([['Terdaftar', '✓ WA terdaftar'], ['Tidak Terdaftar', '✕ bukan WA'], ['belum', '? belum dicek']].map((o) => o[1]), '', 'Status WA') + '</select>' +
        '<select class="inp" id="crm-em" style="width:auto"><option value="">Status email</option><option value="YA">Email valid</option><option value="TIDAK">Email tidak valid</option></select><select class="inp" id="crm-tag" style="width:auto"></select></div>' +
        '<div class="bulkbar hide" id="crm-bulk"><b id="crm-bn"></b><span class="grow"></span><button class="btn btn-ghost btn-xs" data-b="deteksiWA">' + ic('travel_explore', 'sm') + 'Deteksi WA</button><button class="btn btn-ghost btn-xs" data-b="tag">' + ic('label', 'sm') + 'Beri Tag</button><button class="btn btn-ghost btn-xs" data-b="untag">Hapus Tag</button>' +
        '<button class="btn btn-primary btn-xs" data-b="blast">' + ic('campaign', 'sm') + 'Blast ke Terpilih</button><button class="btn btn-ghost btn-xs" data-b="optout">' + ic('block', 'sm') + 'Opt-out</button><button class="btn btn-ghost btn-xs" data-b="optin">Opt-in</button><button class="btn btn-ghost btn-xs" data-b="export">' + ic('download', 'sm') + 'Ekspor</button><button class="btn btn-text btn-xs" data-b="batal">Batal</button></div>' +
        '<div id="crm-tbl">' + UI.skel(8) + '</div></section>';
      const map = { '✓ WA terdaftar': 'Terdaftar', '✕ bukan WA': 'Tidak Terdaftar', '? belum dicek': 'belum' };
      $('#crm-q').oninput = IKH.debounce((e) => { CS.f.cari = e.target.value; CS.f.halaman = 1; muatCrm(); }, 350);
      $('#crm-wa').onchange = (e) => { CS.f.statusWA = map[e.target.value] || ''; CS.f.halaman = 1; muatCrm(); };
      $('#crm-em').onchange = (e) => { CS.f.emailValid = e.target.value; CS.f.halaman = 1; muatCrm(); };
      $('#crm-tag').onchange = (e) => { CS.f.tag = e.target.value; CS.f.halaman = 1; muatCrm(); };
      $('#crm-s').onclick = (e) => UI.tombol(e.currentTarget, async () => { const r = await api('crm.sync', {}); if (UI.hasil(r)) { statsCrm(true); muatCrm(true); } });
      $('#crm-tpl').onclick = () => { const b = new Blob(['nama,email,wa,segmen,tag\nContoh Nama,contoh@email.com,081234567890,Kontak Luar,Mitra\n'], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'template-kontak.csv'; a.click(); };
      $('#crm-imp').onchange = imporCsv;
      $('#crm-dup').onclick = duplikat;
      $$('[data-b]', main).forEach((b) => b.onclick = () => aksiCrm(b.dataset.b));
      statsCrm(false); muatCrm(false);
    });
  }
  async function statsCrm(paksa) {
    const s = await IKH.ambil('crmstats', 'crm.stats', {}, 30000, { paksa, tanpaLokal: true });
    const el = $('#crm-kpi'); if (!s || !el) return;
    CS.stats = s;
    el.innerHTML = [['total', 'Total Kontak', s.total, 'contacts', '', {}], ['wa', 'WA Terverifikasi', s.terdaftarWA, 'chat', 'o', { statusWA: 'Terdaftar' }], ['em', 'Email Valid', s.emailValid, 'mail', '', { emailValid: 'YA' }],
      ['bc', 'Belum Dicek WA', s.belumCekWA, 'help', 'w', { statusWA: 'belum' }], ['oo', 'Opt-out', s.optOut, 'block', '', { optOut: 'YA' }], ['dp', 'Duplikat', s.duplikat, 'merge', 'g', { duplikat: 1 }]]
      .map((k) => '<div class="card kpi ' + k[4] + '" data-kf=\'' + JSON.stringify(k[5]) + '\'><span class="ico">' + ic(k[3]) + '</span><div class="t">' + k[1] + '</div><div class="n tnum" style="font-size:26px">' + fmt.angka(k[2]) + '</div></div>').join('');
    if (window.innerWidth < 1180) el.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))';
    if (window.innerWidth < 768) el.style.gridTemplateColumns = 'repeat(2,minmax(0,1fr))';
    $$('[data-kf]', el).forEach((k) => k.onclick = () => { CS.f = Object.assign({ halaman: 1, per: 50 }, JSON.parse(k.dataset.kf)); muatCrm(true); });
  }
  async function muatCrm(paksa) {
    const el = $('#crm-tbl'); if (!el) return;
    const r = await api('crm.list', CS.f);
    if (!r.ok) { el.innerHTML = '<div class="alert bad">' + ic('error') + '<div>' + esc(r.msg) + '</div></div>'; return; }
    const d = CS.data = r.data;
    $('#crm-sync').textContent = d.syncTerakhir ? 'Sinkron ' + fmt.relatif(new Date(d.syncTerakhir).toISOString()) : 'Belum pernah sinkron';
    $('#crm-chip').innerHTML = '<button class="chip ' + (!CS.f.segmen ? 'on' : '') + '" data-sg="">Semua</button>' + Object.keys(d.facet.segmen).map((s) => '<button class="chip ' + (CS.f.segmen === s ? 'on' : '') + '" data-sg="' + esc(s) + '">' + esc(s) + ' <span class="n">' + fmt.angka(d.facet.segmen[s]) + '</span></button>').join('');
    $$('[data-sg]').forEach((c) => c.onclick = () => { CS.f.segmen = c.dataset.sg; CS.f.halaman = 1; muatCrm(); });
    $('#crm-tag').innerHTML = opsi(d.tags, CS.f.tag, 'Semua tag');
    const maks = Math.max(1, Math.ceil(d.total / d.per));
    el.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="cb"><input type="checkbox" id="crm-all" aria-label="Pilih semua"></th><th>Kontak</th><th>Email</th><th>WhatsApp</th><th>Tag</th><th>Terakhir dihubungi</th><th class="right">Pesan</th></tr></thead><tbody>' +
      (d.rows.length ? d.rows.map((k) => '<tr class="clk ' + (CS.sel.has(k.id) ? 'sel' : '') + '" data-id="' + esc(k.id) + '" style="' + ((!k.wa && k.emailValid !== 'YA') || k.duplikat ? 'box-shadow:inset 3px 0 0 var(--warn)' : '') + '"><td class="cb"><input type="checkbox" data-cb ' + (CS.sel.has(k.id) ? 'checked' : '') + ' aria-label="Pilih"></td>' +
        '<td><div class="person">' + UI.ava(k.nama) + '<div style="min-width:0"><div class="nm trunc">' + esc(k.nama) + (k.optOut ? ' <span class="badge b-mute">opt-out</span>' : '') + (k.duplikat ? ' <span class="badge b-wait">duplikat</span>' : '') + '</div><div class="sb"><span class="badge b-navy" style="font-size:10px">' + esc(k.segmen) + '</span> ' + esc([k.info.angkatan && 'Angk. ' + k.info.angkatan, k.info.prodi].filter(Boolean).join(' • ')) + '</div></div></div></td>' +
        '<td class="small">' + (k.email ? esc(k.email) + ' ' + (k.emailValid === 'YA' ? '<span style="color:var(--ok)">✓</span>' : '<span style="color:var(--warn)">⚠</span>') : '<span class="muted">-</span>') + '</td>' +
        '<td>' + (k.wa ? '<a class="mono small" href="https://wa.me/' + esc(k.wa.replace(/^0/, '62')) + '" target="_blank" rel="noopener">' + esc(k.wa) + '</a> <span class="wa-badge ' + (k.statusWA === 'Terdaftar' ? 'ya">✓ WA' : k.statusWA === 'Tidak Terdaftar' ? 'tidak">✕' : 'belum">?') + '</span>' : '<span class="muted">-</span>') + '</td>' +
        '<td class="small">' + esc(k.tag || '') + '</td><td class="small">' + (k.terakhir ? fmt.relatif(k.terakhir) : '-') + '</td><td class="right tnum">' + k.jumlah + '</td></tr>').join('') : '<tr><td colspan="7">' + UI.kosong('Tidak ada kontak yang cocok. Coba "Sinkron Sekarang".', 'contacts') + '</td></tr>') +
      '</tbody></table></div><div class="pager"><span>' + fmt.angka(d.total) + ' kontak' + (CS.sel.size ? ' • <b>' + CS.sel.size + ' dipilih</b>' : '') + '</span><span class="row"><button class="btn btn-ghost btn-xs" id="crm-prev" ' + (d.halaman <= 1 ? 'disabled' : '') + '>' + ic('chevron_left', 'sm') + '</button>' + d.halaman + ' / ' + maks + '<button class="btn btn-ghost btn-xs" id="crm-next" ' + (d.halaman >= maks ? 'disabled' : '') + '>' + ic('chevron_right', 'sm') + '</button></span></div>';
    $('#crm-prev').onclick = () => { CS.f.halaman--; muatCrm(); }; $('#crm-next').onclick = () => { CS.f.halaman++; muatCrm(); };
    $('#crm-all').onclick = (e) => { d.rows.forEach((k) => e.target.checked ? CS.sel.add(k.id) : CS.sel.delete(k.id)); muatUlangSel(); };
    $$('tbody tr[data-id]', el).forEach((tr) => {
      $('[data-cb]', tr).onclick = (e) => { e.stopPropagation(); e.target.checked ? CS.sel.add(tr.dataset.id) : CS.sel.delete(tr.dataset.id); tr.classList.toggle('sel', e.target.checked); bulkBar(); };
      tr.onclick = (e) => { if (e.target.closest('a,input')) return; drawerKontak(tr.dataset.id); };
    });
    bulkBar();
  }
  function muatUlangSel() { $$('#crm-tbl tbody tr[data-id]').forEach((tr) => { const s = CS.sel.has(tr.dataset.id); tr.classList.toggle('sel', s); const c = $('[data-cb]', tr); if (c) c.checked = s; }); bulkBar(); }
  function bulkBar() { const b = $('#crm-bulk'); if (!b) return; b.classList.toggle('hide', !CS.sel.size); $('#crm-bn').textContent = CS.sel.size + ' kontak dipilih'; }
  async function aksiCrm(act) {
    const ids = Array.from(CS.sel);
    if (act === 'batal') { CS.sel.clear(); return muatUlangSel(); }
    if (act === 'export') {
      const r = await api('crm.export', ids.length ? Object.assign({}, CS.f) : CS.f);
      if (!r.ok) return UI.toast(r.msg, 'bad');
      const rows = ids.length ? r.data.rows.filter((k) => CS.sel.has(k.KontakID)) : r.data.rows;
      return IKH.Ekspor.excel(rows, 'Kontak-CRM-' + hariIni(), 'Kontak');
    }
    if (!ids.length) return;
    if (act === 'blast') { sessionStorage.setItem('ikh_blast_ids', JSON.stringify(ids)); NS.tab = 'blast'; NS.sumber = 'crm'; return Router.go('/admin/notifikasi'); }
    let nilai = '';
    if (act === 'tag' || act === 'untag') { const k = await UI.konfirmasi((act === 'tag' ? 'Beri tag ke ' : 'Hapus tag dari ') + ids.length + ' kontak:', { ya: 'Terapkan', input: { label: 'Nama tag', tipe: 'input', wajib: true } }); if (!k.ok) return; nilai = k.nilai; }
    if (act === 'optout' && !(await UI.konfirmasi(ids.length + ' kontak tidak akan menerima blast (notifikasi transaksional tetap terkirim).', { ya: 'Opt-out' })).ok) return;
    const m = UI.muat('Memproses…');
    const r = await api('crm.bulk', { ids, aksi: act, nilai });
    m.tutup();
    if (UI.hasil(r)) { CS.sel.clear(); muatCrm(); statsCrm(true); }
  }
  async function drawerKontak(id) {
    const sc = document.createElement('div'); sc.className = 'scrim'; sc.style.placeItems = 'stretch end'; sc.style.padding = '0';
    sc.innerHTML = '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Detail kontak"><div class="modal-h"><h3>Detail Kontak</h3><button class="btn btn-ghost btn-icon btn-sm" data-x aria-label="Tutup">' + ic('close') + '</button></div><div class="modal-b" style="flex:1" id="dk">' + UI.skel(8) + '</div></aside>';
    document.body.appendChild(sc);
    const tutup = () => sc.remove();
    sc.addEventListener('mousedown', (e) => { if (e.target === sc) tutup(); }); $('[data-x]', sc).onclick = tutup;
    const r = await api('crm.detail', { kontakId: id });
    if (!r.ok) { $('#dk', sc).innerHTML = '<div class="alert bad">' + esc(r.msg) + '</div>'; return; }
    const k = r.data.kontak;
    $('#dk', sc).innerHTML = '<div class="row gap-lg">' + UI.ava(k.nama, '', 'lg') + '<div><h3 class="mb-0">' + esc(k.nama) + '</h3><div class="row mt"><span class="badge b-navy">' + esc(k.segmen) + '</span><span class="badge b-mute">' + esc(k.sumber) + '</span></div></div></div>' +
      '<div class="row wrap mt">' + (k.wa ? '<a class="btn btn-ok btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(k.wa.replace(/^0/, '62')) + '">' + ic('chat', 'sm') + 'WhatsApp</a>' : '') + (k.email ? '<a class="btn btn-ghost btn-sm" href="mailto:' + esc(k.email) + '">' + ic('mail', 'sm') + 'Email</a>' : '') + (k.wa ? '<button class="btn btn-ghost btn-sm" id="dk-cp">' + ic('content_copy', 'sm') + 'Salin nomor</button>' : '') + (k.sumber === 'anggota' ? '<button class="btn btn-ghost btn-sm" id="dk-agt">' + ic('person', 'sm') + 'Data alumni</button>' : '') + '</div>' +
      '<div class="col gap-lg mt-lg"><div class="grid g2"><div class="fld"><label>Nama</label><input class="inp" id="dk-n" value="' + esc(k.nama) + '"></div><div class="fld"><label>WhatsApp</label><input class="inp" id="dk-w" value="' + esc(k.wa) + '"></div></div>' +
      '<div class="fld"><label>Email</label><input class="inp" id="dk-e" value="' + esc(k.email) + '" ' + (k.sumber !== 'manual' ? 'disabled title="Ubah lewat Data Alumni / Akun"' : '') + '></div><div class="fld"><label>Tag (pisahkan koma)</label><input class="inp" id="dk-t" value="' + esc(k.tag) + '"></div>' +
      '<div class="fld"><label>Catatan</label><textarea class="inp" id="dk-c" rows="3">' + esc(k.catatan) + '</textarea></div><label class="switch"><input type="checkbox" id="dk-o" ' + (k.optOut ? 'checked' : '') + '><span class="tr"></span>Opt-out dari blast</label>' +
      '<button class="btn btn-primary" id="dk-s" style="align-self:flex-start">' + ic('check_circle', 'sm') + 'Simpan Kontak</button></div>' +
      '<hr class="sep"><h4>Catat Interaksi</h4><div class="row wrap"><select class="inp" id="dk-k" style="width:auto">' + opsi(['Telepon', 'WA Manual', 'Kunjungan', 'Email Manual', 'Catatan'], 'Catatan', false) + '</select><input class="inp grow" id="dk-r" placeholder="Ringkasan…"><button class="btn btn-ghost" id="dk-add">Catat</button></div>' +
      '<h4 class="mt-lg">Riwayat</h4><div class="timeline" id="dk-tl">' + timeline(r.data.timeline) + '</div>';
    const cp = $('#dk-cp', sc); if (cp) cp.onclick = () => UI.salin(k.wa);
    const ag = $('#dk-agt', sc); if (ag) ag.onclick = () => { tutup(); Router.go('/admin/alumni?id=' + encodeURIComponent(k.ref)); };
    $('#dk-s', sc).onclick = (e) => UI.tombol(e.currentTarget, async () => {
      const rr = await api('crm.save', { kontak: { id: k.id, nama: $('#dk-n', sc).value, wa: $('#dk-w', sc).value, email: k.sumber === 'manual' ? $('#dk-e', sc).value : undefined, tag: $('#dk-t', sc).value, catatan: $('#dk-c', sc).value, optOut: $('#dk-o', sc).checked } });
      if (UI.hasil(rr)) { muatCrm(); }
    });
    $('#dk-add', sc).onclick = async () => {
      const rr = await api('crm.interaksi', { kontakId: k.id, kanal: $('#dk-k', sc).value, ringkasan: $('#dk-r', sc).value });
      if (UI.hasil(rr)) { r.data.timeline.unshift(rr.data.interaksi); $('#dk-tl', sc).innerHTML = timeline(r.data.timeline); $('#dk-r', sc).value = ''; }
    };
  }
  const timeline = (tl) => tl.length ? tl.map((t) => '<div class="it ' + (t.status === 'Terkirim' ? 'ok' : t.status === 'Gagal' ? 'bad' : '') + '"><div class="row between"><b class="small">' + esc(t.jenis === 'pesan' ? (t.kanal + ' • ' + (t.event || '')) : t.kanal) + '</b>' + (t.status ? UI.badgeStatus(t.status) : '') + '</div><div class="small">' + esc(t.ringkasan) + '</div><div class="tiny muted">' + fmt.waktu(t.tanggal) + (t.oleh ? ' • ' + esc(t.oleh) : '') + '</div></div>').join('') : '<p class="small muted">Belum ada riwayat.</p>';
  async function imporCsv(e) {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const m = UI.muat('Membaca berkas…');
    try {
      const rows = await bacaTabel(f);
      const norm = (o) => { const n = {}; Object.keys(o).forEach((k) => { n[String(k).toLowerCase().replace(/[^a-z]/g, '')] = o[k]; }); return { nama: n.nama || n.name || '', email: n.email || '', wa: String(n.wa || n.whatsapp || n.hp || n.nohp || ''), segmen: n.segmen || '', tag: n.tag || '' }; };
      m.teks('Mengimpor ' + rows.length + ' baris…');
      const r = await api('crm.import', { rows: rows.map(norm) });
      if (UI.hasil(r)) { muatCrm(); statsCrm(true); }
    } catch (er) { UI.toast(er.message, 'bad'); } finally { m.tutup(); }
  }
  async function bacaTabel(f) {
    await IKH.muat(IKH.CDN.xlsx);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true, raw: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  }
  async function duplikat() {
    const s = await IKH.ambil('crmstats', 'crm.stats', {}, 5000, { paksa: true, tanpaLokal: true });
    if (!s) return;
    if (!s.grupDuplikat.length) return UI.toast('Tidak ditemukan kontak duplikat.');
    UI.modal({ judul: 'Kontak Duplikat (' + s.grupDuplikat.length + ' grup)', lebar: 'lg', isi: '<p class="small muted">Kontak dengan nomor WA atau email yang sama. Pilih kontak utama lalu gabungkan — tag, catatan, dan riwayat pesan dijumlahkan.</p>' +
      s.grupDuplikat.slice(0, 50).map((g, i) => '<div class="card card-b sm mb"><div class="row between"><b class="mono small">' + esc(g.kunci.replace(/^wa:/, 'WA ').replace(/^em:/, 'Email ')) + '</b><button class="btn btn-primary btn-xs" data-gb="' + i + '">' + ic('merge', 'sm') + 'Gabungkan</button></div><div class="row wrap mt">' + g.ids.map((id, j) => '<label class="chip"><input type="radio" name="u' + i + '" value="' + esc(id) + '" ' + (j === 0 ? 'checked' : '') + '>' + esc(id) + '</label>').join('') + '</div></div>').join(''),
      onBuka: (md) => $$('[data-gb]', md).forEach((b) => b.onclick = async () => {
        const g = s.grupDuplikat[+b.dataset.gb], utama = $('input[name="u' + b.dataset.gb + '"]:checked', md).value;
        const r = await UI.tombol(b, () => api('crm.merge', { utama, gabung: g.ids.filter((x) => x !== utama) }));
        if (UI.hasil(r)) { b.closest('.card').style.opacity = '.4'; b.disabled = true; muatCrm(); statsCrm(true); }
      }) });
  }

  /* ======================= IMPOR DATA LAMA ======================= */
  const ALIAS = { nama: ['nama', 'namalengkap', 'name', 'namaanggota', 'namaalumni'], nomor_taruna: ['nomortaruna', 'nit', 'notaruna', 'nim', 'nomorinduktaruna'], angkatan: ['angkatan', 'angk', 'tahunangkatan'], prodi: ['prodi', 'programstudi', 'jurusan', 'program'], tahun_kelulusan: ['tahunkelulusan', 'tahunlulus', 'lulus'],
    status_kepegawaian: ['statuskepegawaian', 'statuspegawai', 'kepegawaian'], instansi: ['instansi', 'unitkerja', 'tempatkerja', 'kantor'], jabatan_terakhir: ['jabatanterakhir', 'jabatan'], no_hp: ['nohp', 'hp', 'whatsapp', 'wa', 'nowa', 'nomorhp', 'telepon', 'notelp'], email: ['email', 'surel', 'alamatemail'],
    id_member: ['idmember', 'noanggota', 'nomoranggota', 'nokta', 'nomorkta', 'kta', 'idanggota'], status_verifikasi: ['statusverifikasi', 'verifikasi', 'status'], status_anggota: ['statusanggota', 'keanggotaan'], masa_berlaku_kartu: ['masaberlakukartu', 'masaberlaku', 'berlaku', 'berlakusampai', 'expired'],
    jenis_kelamin: ['jeniskelamin', 'jk', 'gender'], tempat_lahir: ['tempatlahir'], tanggal_lahir: ['tanggallahir', 'tgllahir'], kota_domisili: ['kotadomisili', 'domisili', 'kota', 'kabupatenkota'], alamat: ['alamat', 'alamatlengkap'], foto_id: ['fotoid', 'foto', 'pasfoto', 'urlfoto'], tgl_daftar: ['tgldaftar', 'tanggaldaftar', 'timestamp'] };
  const LBL = { nama: 'Nama lengkap *', nomor_taruna: 'NIT', angkatan: 'Angkatan', prodi: 'Program studi', tahun_kelulusan: 'Tahun lulus', status_kepegawaian: 'Status kepegawaian', instansi: 'Instansi', jabatan_terakhir: 'Jabatan', no_hp: 'No. WhatsApp', email: 'Email', id_member: 'Nomor anggota (KTA lama)', status_verifikasi: 'Status verifikasi', status_anggota: 'Status anggota', masa_berlaku_kartu: 'Masa berlaku', jenis_kelamin: 'Jenis kelamin', tempat_lahir: 'Tempat lahir', tanggal_lahir: 'Tanggal lahir', kota_domisili: 'Domisili', alamat: 'Alamat', foto_id: 'Foto (ID/URL Drive)', tgl_daftar: 'Tanggal daftar' };
  const nh = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function tebak(headers) { const p = {}, pakai = {}; Object.keys(ALIAS).forEach((t) => { const al = ALIAS[t].concat([nh(t)]); const h = headers.find((x) => !pakai[x] && al.indexOf(nh(x)) > -1); if (h) { p[t] = h; pakai[h] = 1; } }); return p; }
  const IM = { mode: 'sheet', src: null, headers: [], rows: null, peta: {}, info: null };
  function impor() {
    return halaman('/admin/impor', 'Impor Data Lama', (main, x, awal) => {
      if (!awal && $('#im-1')) return;
      main.innerHTML = ph('upload_file', 'Impor Data Alumni dari App/Spreadsheet Lama', 'Data sumber hanya DIBACA. Aman diulang: data yang sudah ada tidak digandakan.') +
        '<div class="alert info mb">' + ic('info') + '<div><b>Alur aman:</b> pilih sumber → cocokkan kolom → <b>Pindai</b> (tanpa menulis) → <b>Jalankan</b>. Tepat sebelum pindah ke app baru, jalankan sekali lagi untuk menangkap data terbaru (delta). Anggota hasil impor mengaktifkan akun sendiri lewat menu <b>Lupa / Aktivasi Kata Sandi</b> dengan email terdaftar.</div></div>' +
        '<section class="card mb" id="im-1"><div class="card-h"><h4>1. Sumber Data</h4><div class="seg"><button data-m="sheet" class="' + (IM.mode === 'sheet' ? 'on' : '') + '">Google Sheets app lama</button><button data-m="file" class="' + (IM.mode === 'file' ? 'on' : '') + '">File Excel / CSV</button></div></div>' +
        '<div class="card-b"><div id="im-sheet" class="' + (IM.mode === 'sheet' ? '' : 'hide') + '"><div class="row wrap"><input class="inp grow" id="im-url" placeholder="Tempel URL / ID spreadsheet app lama (harus bisa dibuka akun Google pemilik Apps Script)"><button class="btn btn-primary" id="im-cek" data-busy="Membuka…">' + ic('search') + 'Periksa</button></div><div id="im-sheets" class="mt"></div></div>' +
        '<div id="im-file" class="' + (IM.mode === 'file' ? '' : 'hide') + '"><label class="upload"><input type="file" id="im-f" accept=".xlsx,.xls,.csv"><span class="pv" style="height:64px">' + ic('table_view', 'lg') + '</span><span><b>Pilih file</b><br><span class="hint">Baris pertama = judul kolom. Maks. 3.000 baris per impor.</span></span></label><div id="im-finfo" class="mt small"></div></div></div></section>' +
        '<section class="card mb hide" id="im-2"><div class="card-h"><h4>2. Cocokkan Kolom</h4><span class="small muted">Tebakan otomatis berdasarkan nama kolom — periksa kembali.</span></div><div class="card-b"><div class="mapgrid" id="im-map"></div></div></section>' +
        '<section class="card mb hide" id="im-3"><div class="card-h"><h4>3. Opsi & Jalankan</h4></div><div class="card-b col gap-lg"><div class="grid g2"><div class="fld"><label for="im-st">Status data hasil impor</label><select class="inp" id="im-st"><option value="Disetujui">Disetujui — langsung aktif (nomor anggota lama dipakai / dibuatkan)</option><option value="Menunggu Verifikasi">Menunggu Verifikasi — diperiksa ulang Pengurus</option><option value="ikuti">Ikuti kolom status di sumber</option></select></div>' +
        '<label class="cek" style="align-self:end"><input type="checkbox" id="im-timpa"><span>Timpa data yang sudah ada dengan nilai dari sumber (default: lewati)</span></label></div>' +
        '<div class="row wrap"><button class="btn btn-ghost" id="im-scan" data-busy="Memindai…">' + ic('fact_check') + 'Pindai (tanpa menulis)</button><button class="btn btn-primary" id="im-run" data-busy="Mengimpor…" disabled>' + ic('upload') + 'Jalankan Impor</button></div><div id="im-hasil"></div></div></section>';
      $$('[data-m]', main).forEach((b) => b.onclick = () => { IM.mode = b.dataset.m; $$('[data-m]', main).forEach((y) => y.classList.toggle('on', y === b)); $('#im-sheet').classList.toggle('hide', IM.mode !== 'sheet'); $('#im-file').classList.toggle('hide', IM.mode !== 'file'); });
      $('#im-cek').onclick = (e) => UI.tombol(e.currentTarget, async () => {
        const r = await api('imp.inspect', { source: $('#im-url').value.trim() });
        if (!r.ok) return UI.toast(r.msg, 'bad', 6000);
        IM.info = r.data;
        $('#im-sheets').innerHTML = '<div class="small mb">Spreadsheet: <b>' + esc(r.data.judul) + '</b>. Pilih sheet berisi data alumni:</div><div class="row wrap">' + r.data.sheets.map((s, i) => '<button class="chip" data-sh="' + i + '">' + esc(s.nama) + ' <span class="n">' + s.baris + ' baris</span></button>').join('') + '</div>';
        $$('[data-sh]').forEach((c) => c.onclick = () => { $$('[data-sh]').forEach((y) => y.classList.toggle('on', y === c)); const s = r.data.sheets[+c.dataset.sh]; IM.src = { type: 'sheet', id: $('#im-url').value.trim(), sheet: s.nama }; IM.headers = s.headers.filter(Boolean); IM.peta = Object.assign({}, s.tebakan); tampilPeta(s.contoh, s.headers); });
      });
      $('#im-f').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        const m = UI.muat('Membaca file…');
        try {
          await IKH.muat(IKH.CDN.xlsx);
          const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
          const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
          const head = (aoa[0] || []).map(String), rows = aoa.slice(1).filter((r) => r.join('') !== '');
          if (rows.length > 3000) throw new Error('File berisi ' + rows.length + ' baris. Maks. 3.000 per impor — pecah file.');
          IM.src = { type: 'rows', headers: head, rows: rows }; IM.headers = head.filter(Boolean); IM.peta = tebak(IM.headers);
          $('#im-finfo').innerHTML = ic('check_circle', 'sm') + ' <b>' + esc(f.name) + '</b> • sheet "' + esc(wb.SheetNames[0]) + '" • ' + rows.length + ' baris';
          tampilPeta(rows.slice(0, 3), head);
        } catch (er) { UI.toast(er.message, 'bad', 6000); } finally { m.tutup(); }
      };
      $('#im-scan').onclick = (e) => UI.tombol(e.currentTarget, () => jalankanImpor(true));
      $('#im-run').onclick = async (e) => { const btn = e.currentTarget; if (!(await UI.konfirmasi('Jalankan impor sekarang? Data baru akan ditulis ke database.', { ya: 'Jalankan Impor' })).ok) return; UI.tombol(btn, () => jalankanImpor(false)); };
    });
  }
  function tampilPeta(contoh, headers) {
    $('#im-2').classList.remove('hide'); $('#im-3').classList.remove('hide');
    const contohKol = (h) => { const i = headers.indexOf(h); return i > -1 ? (contoh || []).map((r) => r[i]).filter((v) => v !== '').slice(0, 2).join(' | ') : ''; };
    $('#im-map').innerHTML = Object.keys(LBL).map((t) => '<label class="lbl" for="mp-' + t + '">' + LBL[t] + '</label><div><select class="inp" id="mp-' + t + '" data-t="' + t + '">' + '<option value="">— tidak diimpor —</option>' + IM.headers.map((h) => '<option ' + (IM.peta[t] === h ? 'selected' : '') + '>' + esc(h) + '</option>').join('') + '</select><div class="tiny muted trunc" id="ex-' + t + '">' + esc(contohKol(IM.peta[t])) + '</div></div>').join('');
    $$('[data-t]', $('#im-map')).forEach((s) => s.onchange = () => { IM.peta[s.dataset.t] = s.value; $('#ex-' + s.dataset.t).textContent = contohKol(s.value); $('#im-run').disabled = true; });
    $('#im-run').disabled = true; $('#im-hasil').innerHTML = '';
  }
  async function jalankanImpor(dry) {
    if (!IM.src) return UI.toast('Pilih sumber data dahulu.', 'warn');
    const peta = {}; Object.keys(IM.peta).forEach((k) => { if (IM.peta[k]) peta[k] = IM.peta[k]; });
    if (!peta.nama) return UI.toast('Kolom "Nama lengkap" wajib dicocokkan.', 'bad');
    const r = await api(dry ? 'imp.scan' : 'imp.run', { source: IM.src, mapping: peta, opsi: { status: $('#im-st').value, timpa: $('#im-timpa').checked } });
    if (!r.ok) return UI.toast(r.msg, 'bad', 6000);
    const h = r.data.hasil;
    $('#im-hasil').innerHTML = '<div class="alert ' + (dry ? 'info' : 'ok') + '">' + ic(dry ? 'fact_check' : 'task_alt') + '<div><b>' + esc(r.msg) + '</b></div></div><div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>Baris di sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody><tr><td class="tnum">' + h.sumber + '</td><td class="tnum">' + h.ditambah + '</td><td class="tnum">' + h.diperbarui + '</td><td class="tnum">' + h.dilewati + '</td></tr></tbody></table></div>' +
      (r.data.peringatan.length ? '<div class="alert warn mt">' + ic('warning') + '<div><b>Peringatan (' + r.data.peringatan.length + '):</b><br>' + r.data.peringatan.map(esc).join('<br>') + '</div></div>' : '');
    $('#im-run').disabled = !dry ? true : false;
    if (!dry) { Store.admBoot(true); UI.toast(r.msg); }
  }

  IKH.Admin2 = { hal: { beranda, notifikasi, crm, impor } };
})();
