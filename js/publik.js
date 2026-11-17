/* ==========================================================================
   publik.js — situs publik + autentikasi
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, ic, img, bg, fotoUtuh, fmt, UI, api, Store, Sesi, Router, Kta, daftar, LS, hariIni } = IKH;

  /* ---------------- Bingkai publik ---------------- */
  // v1.7.0: menu "Pendaftaran Alumni" diganti "Galeri" (pendaftaran lewat tombol "Daftar" di ujung menu)
  const NAV = [['/', 'Beranda', 'beranda'], ['/profil', 'Profil Organisasi', 'profil'], ['/berita', 'Berita', 'berita'], ['/galeri', 'Galeri', 'galeri'], ['/verifikasi', 'Verifikasi KTA', 'verifikasi']];
  const TAUTAN_FOOT = [['/', 'Beranda', 'beranda'], ['/profil', 'Profil Organisasi & Kepengurusan', 'profil'], ['/berita', 'Berita & Pengumuman', 'berita'], ['/galeri', 'Galeri Kegiatan', 'galeri'], ['/daftar', 'Pendaftaran Alumni Baru', 'daftar'], ['/status', 'Cek Status Pendaftaran', 'status'], ['/verifikasi', 'Verifikasi Keaslian KTA', 'verifikasi'], ['/masuk', 'Masuk Anggota / Pengurus', 'masuk']];
  function logoHtml(st, kelas) {
    return '<span class="lg img ' + (kelas || '') + '" ' + IKH.logoBg(st, 160) + ' role="img" aria-label="Logo ' + esc(st.ORG_SINGKAT || 'IKALLHUBDAT') + '"></span>';
  }
  function layoutPub() {
    return '<header class="pub-top"><div class="wrap"><a class="brand" href="#/" id="brand"></a>' +
      '<button class="btn btn-ghost btn-icon burger" id="burger" aria-label="Buka menu" aria-expanded="false" aria-controls="pubnav">' + ic('menu') + '</button>' +
      '<nav class="pub-nav" id="pubnav" aria-label="Navigasi utama"></nav></div></header>' +
      '<main id="main" class="pub-main" tabindex="-1"></main><footer class="pub-foot" id="foot"></footer>';
  }
  function bingkai() {
    const st = IKH.setPub(), path = Router.parse().path, me = Sesi.me, sem = IKH.menuTersembunyi(st);
    const brand = $('#brand'); if (!brand) return;
    brand.innerHTML = logoHtml(st) + '<div class="grow"><div class="t1">SIM IKALLHUBDAT</div><div class="t2">' + esc((st.ORG_NAMA || 'DPD Kalimantan Timur').replace(/^DPD IKALLHUBDAT\s*/i, 'DPD ')) + '</div></div>';
    $('#pubnav').innerHTML = NAV.filter((n) => !sem(n[2])).map((n) => '<a href="#' + n[0] + '" class="' + ((n[0] === '/' ? path === '/' : path.indexOf(n[0]) === 0) ? 'on' : '') + '">' + n[1] + '</a>').join('') +
      (me ? '<a class="btn btn-primary btn-sm" href="#' + (me.peran === 'pengurus' ? '/admin' : '/anggota') + '">' + ic('person', 'sm') + (me.peran === 'pengurus' ? 'Panel Pengurus' : 'Ruang Anggota') + '</a>'
        : (sem('masuk') ? '' : '<a class="btn btn-ghost btn-sm" href="#/masuk">' + ic('lock', 'sm') + 'Masuk</a>') + (sem('daftar') ? '' : '<a class="btn btn-gold btn-sm btn-daftar" href="#/daftar">' + ic('how_to_reg', 'sm') + '<span>Daftar</span></a>'));
    const tahun = new Date().getFullYear();
    $('#foot').innerHTML = '<div class="wrap"><div><a class="brand" href="#/" style="color:#fff">' + logoHtml(st) + '<div><div class="t1" style="color:#fff">' + esc(st.ORG_SINGKAT || 'IKALLHUBDAT KALTIM') + '</div><div class="t2" style="color:#93A6D4">' + esc(st.ORG_NAMA_PANJANG || '') + '</div></div></a>' +
      '<p class="mt" style="font-size:13.5px;max-width:420px">Portal resmi keanggotaan alumni: pendaftaran mandiri, verifikasi berjenjang oleh Pengurus, dan KTA digital ber-QR yang dapat diperiksa keasliannya.</p>' +
      '<button class="btn btn-gold btn-sm hide" data-install>' + ic('download', 'sm') + 'Pasang Aplikasi</button></div>' +
      '<div><h4>Tautan Cepat</h4>' + TAUTAN_FOOT.filter((t) => !sem(t[2])).map((t) => '<a href="#' + t[0] + '">' + t[1] + '</a>').join('') + '</div>' +
      '<div><h4>Sekretariat</h4>' +
      (st.ORG_ALAMAT ? '<div class="ln">' + ic('location_on', 'sm') + '<span>' + esc(st.ORG_ALAMAT) + '</span></div>' : '') +
      (st.ORG_EMAIL ? '<div class="ln">' + ic('mail', 'sm') + '<a href="mailto:' + esc(st.ORG_EMAIL) + '" style="display:inline;padding:0">' + esc(st.ORG_EMAIL) + '</a></div>' : '') +
      (st.ORG_TELEPON ? '<div class="ln">' + ic('call', 'sm') + '<span>' + esc(st.ORG_TELEPON) + '</span></div>' : '') +
      (st.ORG_WA ? '<div class="ln">' + ic('chat', 'sm') + '<a href="https://wa.me/' + esc(IKH.hp08(st.ORG_WA).replace(/^0/, '62')) + '" target="_blank" rel="noopener" style="display:inline;padding:0">WhatsApp ' + esc(st.ORG_WA) + '</a></div>' : '') +
      (st.ORG_JAM_LAYANAN ? '<div class="ln">' + ic('schedule', 'sm') + '<span>' + esc(st.ORG_JAM_LAYANAN) + '</span></div>' : '') +
      (!st.ORG_ALAMAT && !st.ORG_EMAIL ? '<div class="ln small">Kontak sekretariat belum diisi Pengurus.</div>' : '') +
      '</div></div><div class="bawah"><div class="wrap"><span>© ' + tahun + ' ' + esc(st.ORG_NAMA || 'DPD IKALLHUBDAT Kalimantan Timur') + '</span><span>SIM IKALLHUBDAT ' + IKH.chipVersi('gelap') + '</span></div></div>';
    if (IKH.bisaPasang()) $$('[data-install]').forEach((b) => b.classList.remove('hide'));
    $$('[data-install]').forEach((b) => b.onclick = () => IKH.pasangApp());
    const bg2 = $('#burger'), nav = $('#pubnav');
    bg2.onclick = () => { const o = nav.classList.toggle('open'); bg2.setAttribute('aria-expanded', o); };
    $$('a', nav).forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); bg2.setAttribute('aria-expanded', 'false'); }));
  }
  let _rid = 0;
  /** Halaman publik: render dari cache → segarkan di latar → render ulang bila data berubah */
  async function halamanPub(judul, render) {
    IKH.judul(judul);
    const rid = ++_rid;
    const main = IKH.pasangLayout('pub', layoutPub);
    bingkai();
    const hidup = () => rid === _rid && document.body.contains(main);
    const gambar = () => { if (!hidup()) return; bingkai(); render(main, Store.pub || {}); };
    const sudah = !!Store.pub;
    if (sudah) gambar(); else { main.innerHTML = '<div class="wrap sec">' + UI.skel(6) + '</div>'; IKH.warmUp('pub'); }
    const sebelum = Store.pubAt;
    await Store.pubBoot();
    if (Store.pubAt !== sebelum || !sudah) gambar();
    const ev = () => { if (hidup()) gambar(); else document.removeEventListener('ikh:pub', ev); };
    document.addEventListener('ikh:pub', ev);
  }
  const pageHead = (crumb, judul, sub) => '<section class="page-h"><div class="wrap"><div class="crumb"><a href="#/">Beranda</a>' + ic('chevron_right', 'sm') + '<span>' + esc(crumb) + '</span></div><h1>' + esc(judul) + '</h1>' + (sub ? '<p class="muted mb-0" style="max-width:760px">' + esc(sub) + '</p>' : '') + '</div></section>';
  const contohKta = (st) => ({ nama: 'Nama Anggota', id_member: (st.KTA_PREFIX || 'IKH-KT') + '-' + new Date().getFullYear() + '-0001', nomor_taruna: 'NIT', angkatan: '—', prodi: 'Program Studi', masa_berlaku_kartu: (new Date().getFullYear() + 3) + '-12-31', status_verifikasi: 'Disetujui', status_anggota: 'Aktif' });

  /* ---------------- Beranda ---------------- */
  function beranda() {
    return halamanPub('Beranda', (main, d) => {
      const st = d.setting || {}, berita = (d.berita || []).slice(0, 3), stat = d.stat, sem = IKH.menuTersembunyi(st);
      const alb = sem('galeri') ? [] : (d.album || []).slice(0, 4);
      const sb = st.TAMPIL_PETA !== 'TIDAK' && d.sebaran && d.sebaran.n ? d.sebaran : null;
      const ctaDaftar = st.PENDAFTARAN_DIBUKA !== 'TIDAK' && !sem('daftar');
      const judul = String(st.HERO_JUDUL || 'Sistem Informasi Manajemen Ikatan Alumni Lalu Lintas & Perhubungan Darat');
      const pisah = judul.indexOf(' Ikatan') > 0 ? [judul.slice(0, judul.indexOf(' Ikatan')), judul.slice(judul.indexOf(' Ikatan') + 1)] : [judul, ''];
      main.innerHTML =
        '<section class="hero"><div class="wrap"><div><span class="pill">' + ic('verified', 'sm') + esc(st.HERO_LABEL || 'Portal Resmi Keanggotaan') + '</span>' +
        '<h1 class="mt">' + esc(pisah[0]) + (pisah[1] ? '<span>' + esc(pisah[1]) + '</span>' : '') + '</h1><p class="lead">' + esc(st.HERO_SUBJUDUL || '') + '</p>' +
        '<div class="trust"><span>' + ic('verified_user', 'sm') + 'Diverifikasi Pengurus</span><span>' + ic('qr_code_2', 'sm') + 'KTA ber-QR bertanda tangan digital</span><span>' + ic('lock', 'sm') + 'Data tersimpan aman</span></div></div>' +
        '<div class="kartu-hero" aria-hidden="true"><div class="kicker center" style="margin-bottom:.5rem">Contoh tampilan KTA digital</div>' + Kta.depan(contohKta(st), st) + '</div></div></section>' +
        (stat ? '<div class="wrap"><div class="stats">' +
          [['groups', stat.alumni, 'Alumni terverifikasi'], ['badge', stat.aktif, 'KTA aktif'], ['school', stat.angkatan, 'Angkatan terdata'], ['domain', stat.instansi, 'Instansi penempatan']]
            .map((s) => '<div class="stat"><div class="ico">' + ic(s[0]) + '</div><div><div class="n tnum">' + fmt.angka(s[1]) + '</div><div class="l">' + s[2] + '</div></div></div>').join('') + '</div></div>' : '') +
        (sb ? '<section class="sec" id="sebaran" style="padding-top:' + (stat ? '1rem' : '3rem') + '"><div class="wrap"><div class="sec-h"><div><div class="kicker gold">Jejaring Alumni</div><h2>Sebaran Alumni di Kalimantan Timur</h2><p class="muted mb-0 mt">Jumlah alumni terverifikasi menurut domisili kabupaten/kota.</p></div></div>' +
          '<div class="card card-b peta-wrap"><div class="peta" id="pb-peta">' + UI.skel(5) + '</div><div id="pb-list"></div></div></div></section>' : '') +
        (sem('berita') ? '' : '<section class="sec"><div class="wrap"><div class="sec-h"><div><div class="kicker gold">Kabar Organisasi</div><h2>Berita & Pengumuman Terkini</h2></div><a class="btn btn-ghost btn-sm" href="#/berita">Semua berita' + ic('arrow_forward', 'sm') + '</a></div>' +
        (berita.length ? '<div class="news">' + berita.map(kartuBerita).join('') + '</div>' : UI.kosong('Belum ada berita.', 'newspaper')) + '</div></section>') +
        (st.SAMBUTAN_ISI ? '<section class="sec alt"><div class="wrap sambutan"><div class="foto" ' + (st.SAMBUTAN_FOTO_ID ? bg(st.SAMBUTAN_FOTO_ID, 600) : '') + '>' + (st.SAMBUTAN_FOTO_ID ? '' : ic('person', 'xl')) + '</div>' +
          '<div><div class="kicker gold">' + esc(st.SAMBUTAN_JUDUL || 'Sambutan Ketua') + '</div><div class="quote mt">' + esc(potong(st.SAMBUTAN_ISI, 420)) + '</div>' +
          '<div class="mt"><b>' + esc(st.KETUA_NAMA || '') + '</b><div class="muted small">' + esc(st.KETUA_JABATAN || '') + ' ' + esc(st.ORG_SINGKAT || '') + '</div></div>' +
          (sem('profil') ? '' : '<a class="btn btn-text mt" href="#/profil?s=sambutan">Baca selengkapnya' + ic('arrow_forward', 'sm') + '</a>') + '</div></div></section>' : '') +
        (alb.length ? '<section class="sec"><div class="wrap"><div class="sec-h"><div><div class="kicker gold">Dokumentasi</div><h2>Galeri Kegiatan</h2></div><a class="btn btn-ghost btn-sm" href="#/galeri">Semua album' + ic('arrow_forward', 'sm') + '</a></div>' +
          '<div class="albums">' + alb.map(kartuAlbum).join('') + '</div></div></section>' : '') +
        (!ctaDaftar && sem('masuk') ? '' : '<section class="sec" style="padding-top:' + (alb.length ? '0' : '2rem') + '"><div class="wrap"><div class="cta"><div><div class="kicker" style="color:var(--gold)">Digitalisasi Keanggotaan</div><h2 class="mt">Belum terdata sebagai anggota?</h2><p>Daftar mandiri untuk memperoleh KTA digital ber-QR. Sudah menjadi anggota? Masuk untuk melihat kartu dan mengajukan pembaruan data.</p></div>' +
        '<div class="row wrap">' + (ctaDaftar ? '<a class="btn btn-gold btn-daftar" href="#/daftar">' + ic('person_add') + '<span>Daftar</span></a>' : '') + (sem('masuk') ? '' : '<a class="btn btn-ghost" href="#/masuk">' + ic('lock') + 'Masuk Anggota</a>') + '</div></div></div></section>');
      if (alb.length) GF.pasang(main);
      if (sb) petaBeranda(sb);
    });
  }
  /** Peta sebaran di beranda: hanya angka agregat dari server (tanpa data pribadi) */
  async function petaBeranda(sb) {
    const box = $('#pb-peta'); if (!box) return;
    let P;
    try { P = await IKH.Peta.muat(); } catch (e) { const s = $('#sebaran'); if (s) s.remove(); return; }
    if (!$('#pb-peta') || !document.body.contains(box)) return;
    const n = sb.n || {}, total = sb.total || 0;
    const dalam = P.wilayah.reduce((t, w) => t + (n[w.kode] || 0), 0);
    const persen = (v) => total ? Math.round(v / total * 1000) / 10 : 0;
    box.innerHTML = IKH.Peta.html(P, n, { aria: 'Peta sebaran alumni terverifikasi per kabupaten/kota di Kalimantan Timur', denyut: true });
    const rows = P.wilayah.map((w) => ({ k: w.kode, nama: w.nama, v: n[w.kode] || 0 })).sort((a, b) => b.v - a.v || a.nama.localeCompare(b.nama));
    const isi = rows.filter((r) => r.v);
    const maks = Math.max(1, ...rows.map((r) => r.v));
    $('#pb-list').innerHTML = (dalam ? '<div class="pb-ring"><div><div class="n tnum">' + fmt.angka(dalam) + '</div><div class="l">alumni berdomisili di Kalimantan Timur</div></div><div><div class="n tnum">' + isi.length + '<small>/10</small></div><div class="l">kabupaten/kota terjangkau</div></div></div>' +
      '<ol class="pb-list">' + isi.map((r) => '<li data-k="' + r.k + '"><span class="nm">' + esc(r.nama) + '</span><span class="br"><i style="width:' + Math.max(4, r.v / maks * 100) + '%"></i></span><b class="tnum">' + fmt.angka(r.v) + '</b></li>').join('') + '</ol>'
      : UI.kosong('Belum ada data domisili alumni terverifikasi.', 'map')) +
      ((sb.luar || sb.kosong || sb.lain) ? '<p class="small muted mt mb-0">' + [sb.luar ? fmt.angka(sb.luar) + ' alumni berdomisili di luar Kalimantan Timur' : '', (sb.kosong || 0) + (sb.lain || 0) ? fmt.angka((sb.kosong || 0) + (sb.lain || 0)) + ' belum tercatat domisilinya' : ''].filter(Boolean).join(' • ') + '.</p>' : '');
    const sorot = IKH.Peta.pasang(box, {
      tip: (k) => { const w = P.wilayah.find((x) => x.kode === k); return '<b>' + esc(w ? w.nama : k) + '</b><br>' + fmt.angka(n[k] || 0) + ' alumni' + (total ? ' • ' + persen(n[k] || 0) + '%' : ''); },
      sorot: (k, on) => $$('#pb-list li[data-k="' + k + '"]').forEach((el) => el.classList.toggle('on', on))
    });
    // arahkan ke baris daftar → wilayahnya ikut terangkat & menyala di peta
    $$('#pb-list li[data-k]').forEach((li) => {
      li.addEventListener('mouseenter', () => sorot(li.dataset.k, true, true));
      li.addEventListener('mouseleave', () => sorot(li.dataset.k, false));
    });
  }
  const periodeStr = (str) => { const n = {}; (str || []).forEach((r) => { if (r.periode) n[r.periode] = (n[r.periode] || 0) + 1; }); return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || ''; };
  const potong = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s; };
  function kartuBerita(b) {
    return '<a class="news-c" href="#/berita/' + esc(b.id) + '"><div class="im" ' + (b.gambar_id ? bg(b.gambar_id, 800) : '') + '>' + (b.gambar_id ? '' : ic('newspaper', 'xl')) + '</div>' +
      '<div class="bd"><div class="meta">' + ic('calendar_month', 'sm') + fmt.tgl(b.tanggal, true) + (b.kategori ? ' • <span class="badge b-info">' + esc(b.kategori) + '</span>' : '') + '</div>' +
      '<h3>' + esc(b.judul) + '</h3><p>' + esc(potong(b.ringkasan || b.isi, 160)) + '</p></div></a>';
  }

  /* ---------------- Galeri album (v1.7.0) ----------------
     Foto disimpan privat di Drive. Server mengirim data gambar (bukan tautan); browser menyimpannya di
     Cache Storage "ikh-galeri-v1" agar album yang sama tidak diunduh ulang, lalu memakai URL blob: lokal.
     Ukuran "k" (± 480 px) untuk grid, "b" (± 1280 px) untuk tampilan diperbesar. */
  const GF = {
    NAMA: 'ikh-galeri-v1', url: {}, janji: {}, antre: [], jalan: 0, t: null, MAKS_JALAN: 2,
    kunci(id, uk) { return location.origin + location.pathname.replace(/[^/]*$/, '') + '__galeri/' + uk + '/' + encodeURIComponent(id); },
    async dariCache(id, uk) { try { if (!window.caches) return null; const c = await caches.open(this.NAMA); const r = await c.match(this.kunci(id, uk)); return r ? await r.blob() : null; } catch (e) { return null; } },
    async keCache(id, uk, blob) {
      try {
        if (!window.caches) return;
        const c = await caches.open(this.NAMA);
        await c.put(this.kunci(id, uk), new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } }));
        if (Math.random() < 0.05) { const k = await c.keys(); if (k.length > 900) await Promise.all(k.slice(0, k.length - 700).map((x) => c.delete(x))); }   // batasi ± 700 foto
      } catch (e) { }
    },
    keBlob(du) { const i = du.indexOf(','), tipe = du.slice(5, i).split(';')[0], bin = atob(du.slice(i + 1)), arr = new Uint8Array(bin.length); for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j); return new Blob([arr], { type: tipe }); },
    /** Promise → URL blob: foto (null bila gagal). admin = rute Pengurus (album tersembunyi ikut). */
    ambil(id, uk, admin) {
      const k = uk + ':' + id;
      if (this.url[k]) return Promise.resolve(this.url[k]);
      if (this.janji[k]) return this.janji[k];
      this.janji[k] = (async () => {
        let b = await this.dariCache(id, uk);
        if (!b) b = await new Promise((res) => { this.antre.push({ id, uk, admin: !!admin, res }); this.jadwal(); });
        if (!b) { delete this.janji[k]; return null; }
        return (this.url[k] = URL.createObjectURL(b));
      })();
      return this.janji[k];
    },
    jadwal() { if (!this.t) this.t = setTimeout(() => { this.t = null; this.alir(); }, 40); },
    async alir() {
      while (this.antre.length && this.jalan < this.MAKS_JALAN) {
        const a = this.antre[0], maks = a.uk === 'b' ? 2 : 12;
        const grup = this.antre.filter((x) => x.uk === a.uk && x.admin === a.admin).slice(0, maks);
        this.antre = this.antre.filter((x) => grup.indexOf(x) === -1);
        this.jalan++;
        api(a.admin ? 'adm.galeri.foto' : 'pub.foto', { ids: grup.map((x) => x.id), ukuran: a.uk }).then((r) => {
          const f = (r && r.ok && r.data && r.data.foto) || {};
          grup.forEach((x) => { const du = f[x.id]; if (!du) return x.res(null); const b = this.keBlob(du); this.keCache(x.id, x.uk, b); x.res(b); });
        }, () => grup.forEach((x) => x.res(null))).finally(() => { this.jalan--; this.alir(); });
      }
    },
    /** Muat foto untuk semua elemen [data-gf] di dalam root saat mendekati layar */
    pasang(root, admin) {
      const isi = (el) => {
        el.dataset.gfOn = '1';
        GF.ambil(el.dataset.gf, el.dataset.uk || 'k', admin).then((u) => {
          if (!u) { el.classList.add('gagal'); return; }
          const im = el.tagName === 'IMG' ? el : (el.querySelector('img') || el.appendChild(Object.assign(document.createElement('img'), { alt: el.dataset.alt || '' })));
          im.draggable = false; im.onload = () => el.classList.add('siap'); im.src = u;
        });
      };
      const el = $$('[data-gf]:not([data-gf-on])', root);
      if (!('IntersectionObserver' in window)) return el.forEach(isi);
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); isi(e.target); } }), { rootMargin: '400px 0px' });
      el.forEach((x) => io.observe(x));
    },
    /** Penampil foto layar penuh: geser/tombol panah/keyboard; foto besar dimuat saat dibuka */
    lihat(list, i, o) {
      o = o || {};
      const prev = document.activeElement;
      const v = document.createElement('div'); v.className = 'gv'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Foto ' + (o.judul || 'galeri'));
      v.innerHTML = '<div class="gv-top"><span class="gv-n" aria-live="polite"></span><span class="gv-j">' + esc(o.judul || '') + '</span><button class="gv-x" type="button" aria-label="Tutup">' + ic('close') + '</button></div>' +
        '<button class="gv-nav kiri" type="button" aria-label="Foto sebelumnya">' + ic('chevron_left', 'lg') + '</button><figure class="gv-fig"><img class="gv-img" alt="" draggable="false"><span class="spin"></span><figcaption class="gv-cap"></figcaption></figure>' +
        '<button class="gv-nav kanan" type="button" aria-label="Foto berikutnya">' + ic('chevron_right', 'lg') + '</button>';
      document.body.appendChild(v); document.body.style.overflow = 'hidden';
      const im = $('.gv-img', v), fig = $('.gv-fig', v);
      let kini = i, giliran = 0;
      const tampil = async (j) => {
        kini = (j + list.length) % list.length; const f = list[kini], g = ++giliran;
        $('.gv-n', v).textContent = (kini + 1) + ' / ' + list.length; $('.gv-cap', v).textContent = f.ket || '';
        im.alt = f.ket || 'Foto ' + (kini + 1); fig.classList.add('muat');
        const kecil = GF.url['k:' + f.id];
        if (kecil) { im.src = kecil; im.classList.add('buram'); } else im.removeAttribute('src');
        const u = await GF.ambil(f.id, 'b', o.admin) || await GF.ambil(f.id, 'k', o.admin);
        if (g !== giliran) return;
        if (u) im.src = u; im.classList.remove('buram'); fig.classList.remove('muat');
        if (list.length > 1) GF.ambil(list[(kini + 1) % list.length].id, 'b', o.admin);          // siapkan foto berikutnya
      };
      const tutup = () => { v.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); };
      const key = (e) => { if (e.key === 'Escape') tutup(); else if (e.key === 'ArrowLeft') tampil(kini - 1); else if (e.key === 'ArrowRight') tampil(kini + 1); };
      document.addEventListener('keydown', key);
      $('.gv-x', v).onclick = tutup; $('.gv-nav.kiri', v).onclick = () => tampil(kini - 1); $('.gv-nav.kanan', v).onclick = () => tampil(kini + 1);
      v.addEventListener('click', (e) => { if (e.target === v || e.target === fig) tutup(); });
      v.addEventListener('contextmenu', (e) => { if (e.target === im) e.preventDefault(); });
      let x0 = null;
      v.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      v.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) tampil(kini + (dx < 0 ? 1 : -1)); });
      if (list.length < 2) $$('.gv-nav', v).forEach((b) => b.classList.add('hide'));
      tampil(i); setTimeout(() => $('.gv-x', v).focus(), 30);
    }
  };
  IKH.GF = GF;
  const fotoN = (n) => fmt.angka(n) + ' foto';
  function kartuAlbum(a) {
    return '<a class="alb" href="#/galeri/' + esc(a.id) + '"><span class="sp" ' + (a.sampul ? 'data-gf="' + esc(a.sampul) + '" data-alt="' + esc(a.judul) + '"' : '') + '>' + ic('photo_library', 'xl') + '</span>' +
      '<span class="bd"><b>' + esc(a.judul) + '</b><span class="meta">' + [a.tanggal ? fmt.tgl(a.tanggal, true) : '', a.lokasi].filter(Boolean).map(esc).join(' • ') + '</span><span class="jml">' + ic('photo_camera', 'sm') + fotoN(a.jumlah) + '</span></span></a>';
  }
  const galTutup = () => '<div class="wrap sec"><div class="empty">' + ic('visibility_off') + '<div>Galeri sedang tidak ditampilkan.</div><a class="btn btn-ghost btn-sm mt" href="#/">Kembali ke beranda</a></div></div>';
  /* data galeri: SWR singkat (2 menit) + simpanan lokal agar tampil instan */
  const Gal = {
    daftar: LS.get('gal', null),
    async muatDaftar(paksa) {
      if (this.daftar && !paksa && Date.now() - this.daftar.at < 120000) return this.daftar;
      const r = await api('pub.galeri', {});
      if (r.ok) { this.daftar = { d: r.data, at: Date.now() }; LS.set('gal', this.daftar); return this.daftar; }
      if (r.code === 'TUTUP') { this.daftar = null; LS.del('gal'); }
      return { err: r };
    },
    album: {},
    async muatAlbum(id) {
      const x = this.album[id];
      if (x && Date.now() - x.at < 120000) return x;
      const r = await api('pub.album', { id });
      if (r.ok) return (this.album[id] = { d: r.data, at: Date.now() });
      return { err: r };
    }
  };
  function galeriPage() {
    return halamanPub('Galeri', async (main, d) => {
      const st = d.setting || {}, sem = IKH.menuTersembunyi(st);
      const kepala = pageHead('Galeri', 'Galeri Kegiatan', 'Dokumentasi kegiatan ' + (st.ORG_SINGKAT || 'organisasi') + ', dikelompokkan per album.');
      if (sem('galeri')) { main.innerHTML = kepala + galTutup(); return; }
      const gambar = (x) => {
        const al = x.d.album || [];
        main.innerHTML = kepala + '<section class="sec" style="padding-top:2rem"><div class="wrap">' + (al.length ? '<div class="albums">' + al.map(kartuAlbum).join('') + '</div>' : UI.kosong('Belum ada album kegiatan.', 'photo_library')) + '</div></section>';
        GF.pasang(main);
      };
      if (Gal.daftar) gambar(Gal.daftar); else main.innerHTML = kepala + '<div class="wrap sec">' + UI.skel(4) + '</div>';
      const awal = Gal.daftar && Gal.daftar.at;
      const x = await Gal.muatDaftar();
      if (!document.body.contains(main)) return;
      if (x.err) { if (x.err.code === 'TUTUP') main.innerHTML = kepala + galTutup(); else if (!Gal.daftar) main.innerHTML = kepala + '<div class="wrap sec">' + UI.kosong(x.err.code === 'NOACT' ? 'Galeri belum aktif di server (butuh backend Apps Script v1.5.0).' : (x.err.msg || 'Galeri belum dapat dimuat.'), 'cloud_off') + '</div>'; return; }
      if (x.at !== awal) gambar(x);
    });
  }
  function albumPage(p) {
    return halamanPub('Galeri', async (main, d) => {
      const st = d.setting || {}, sem = IKH.menuTersembunyi(st);
      const crumb = '<section class="page-h"><div class="wrap"><div class="crumb"><a href="#/">Beranda</a>' + ic('chevron_right', 'sm') + '<a href="#/galeri">Galeri</a>' + ic('chevron_right', 'sm') + '<span>Album</span></div>';
      if (sem('galeri')) { main.innerHTML = crumb + '<h1>Galeri Kegiatan</h1></div></section>' + galTutup(); return; }
      if (!main.querySelector('.fotos[data-id="' + CSS.escape(p.id) + '"]')) main.innerHTML = crumb + '<h1>Memuat album…</h1></div></section><div class="wrap sec">' + UI.skel(4) + '</div>';
      const x = await Gal.muatAlbum(p.id);
      if (!document.body.contains(main)) return;
      if (x.err) { main.innerHTML = crumb + '<h1>Album tidak tersedia</h1></div></section>' + (x.err.code === 'TUTUP' ? galTutup() : '<div class="wrap sec"><div class="empty">' + ic('photo_library') + '<div>' + esc(x.err.msg || 'Album tidak ditemukan.') + '</div><a class="btn btn-ghost btn-sm mt" href="#/galeri">Lihat album lain</a></div></div>'); return; }
      if (main.querySelector('.fotos[data-k="' + CSS.escape(p.id + '|' + x.at) + '"]')) return;     // sudah tergambar dari data yang sama
      const a = x.d.album, foto = x.d.foto || [];
      IKH.judul(a.judul + ' — Galeri');
      main.innerHTML = crumb + '<h1>' + esc(a.judul) + '</h1><div class="alb-meta">' +
        (a.tanggal ? '<span>' + ic('calendar_month', 'sm') + fmt.tgl(a.tanggal, true) + '</span>' : '') + (a.lokasi ? '<span>' + ic('location_on', 'sm') + esc(a.lokasi) + '</span>' : '') + '<span>' + ic('photo_camera', 'sm') + fotoN(foto.length) + '</span></div>' +
        (a.keterangan ? '<p class="muted mb-0 mt" style="max-width:760px">' + esc(a.keterangan) + '</p>' : '') + '</div></section>' +
        '<section class="sec" style="padding-top:2rem"><div class="wrap"><div class="fotos" data-id="' + esc(a.id) + '" data-k="' + esc(a.id + '|' + x.at) + '">' + foto.map((f, i) => '<button type="button" class="ft" data-i="' + i + '" data-gf="' + esc(f.id) + '" data-alt="' + esc(f.ket || a.judul) + '" aria-label="Perbesar foto ' + (i + 1) + (f.ket ? ': ' + esc(f.ket) : '') + '">' + ic('image') + (f.ket ? '<span class="cap">' + esc(f.ket) + '</span>' : '') + '</button>').join('') + '</div>' +
        '<div class="mt-lg"><a class="btn btn-ghost btn-sm" href="#/galeri">' + ic('arrow_back', 'sm') + 'Semua album</a></div></div></section>';
      GF.pasang(main);
      $$('.fotos .ft', main).forEach((b) => { b.onclick = () => GF.lihat(foto, +b.dataset.i, { judul: a.judul }); b.addEventListener('contextmenu', (e) => e.preventDefault()); });
    });
  }

  /* ---------------- Berita ---------------- */
  function beritaList() {
    return halamanPub('Berita', (main, d) => {
      const b = d.berita || [];
      main.innerHTML = pageHead('Berita', 'Berita & Pengumuman', 'Informasi terbaru kegiatan dan pengumuman organisasi.') +
        '<section class="sec" style="padding-top:2rem"><div class="wrap">' + (b.length ? '<div class="news">' + b.map(kartuBerita).join('') + '</div>' : UI.kosong('Belum ada berita.', 'newspaper')) + '</div></section>';
    });
  }
  function beritaDetail(p) {
    return halamanPub('Berita', (main, d) => {
      const b = (d.berita || []).find((x) => x.id === p.id);
      if (!b) { main.innerHTML = pageHead('Berita', 'Berita tidak ditemukan') + '<div class="wrap sec">' + UI.kosong('Berita mungkin sudah dihapus.', 'newspaper') + '</div>'; return; }
      IKH.judul(b.judul);
      main.innerHTML = '<section class="page-h"><div class="wrap" style="max-width:860px"><div class="crumb"><a href="#/">Beranda</a>' + ic('chevron_right', 'sm') + '<a href="#/berita">Berita</a></div>' +
        '<div class="row small muted">' + ic('calendar_month', 'sm') + fmt.tgl(b.tanggal, true) + (b.kategori ? ' • ' + esc(b.kategori) : '') + (b.penulis ? ' • ' + esc(b.penulis) : '') + '</div><h1 class="mt">' + esc(b.judul) + '</h1></div></section>' +
        '<section class="sec" style="padding-top:2rem"><div class="wrap" style="max-width:860px">' + (b.gambar_id ? '<img src="' + esc(img(b.gambar_id, 1400)) + '" alt="" style="width:100%;border-radius:14px;margin-bottom:1.5rem">' : '') +
        (b.ringkasan ? '<p class="b" style="font-size:16.5px">' + esc(b.ringkasan) + '</p>' : '') + '<div class="prose">' + esc(b.isi) + '</div>' +
        '<a class="btn btn-ghost mt-lg" href="#/berita">' + ic('arrow_back') + 'Kembali ke daftar berita</a></div></section>';
    });
  }

  /* ---------------- Profil organisasi ---------------- */
  function profil(p, q) {
    return halamanPub('Profil Organisasi', (main, d) => {
      const st = d.setting || {}, str = d.struktur || [];
      const sub = [['tentang', 'Tentang & Tujuan'], ['sejarah', 'Sejarah'], ['visimisi', 'Visi & Misi'], ['sambutan', 'Sambutan Ketua'], ['struktur', 'Struktur Organisasi']];
      main.innerHTML = pageHead('Profil Organisasi', 'Profil ' + (st.ORG_NAMA || 'Organisasi'), st.ORG_NAMA_PANJANG) +
        '<div class="wrap" style="position:sticky;top:68px;z-index:5;background:var(--bg)"><div class="tabs" style="padding:0;border:0">' + sub.map((s) => '<button data-s="' + s[0] + '">' + s[1] + '</button>').join('') + '</div></div>' +
        '<div class="wrap" style="padding-bottom:3rem">' +
        '<section class="sec form-sec" id="s-tentang" style="padding-top:1.5rem"><div class="grid g2"><div class="card card-b"><div class="kicker gold">Tentang Kami</div><div class="prose mt">' + esc(st.PROFIL_TENTANG) + '</div></div>' +
        '<div class="card card-b"><div class="kicker gold">Tujuan Organisasi</div><ul class="misi mt">' + daftar(st.PROFIL_TUJUAN).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div></div></section>' +
        '<section class="form-sec" id="s-sejarah"><div class="card card-b"><div class="kicker gold">Sejarah</div><h2 class="mt">Perjalanan Organisasi</h2><div class="prose">' + esc(st.PROFIL_SEJARAH) + '</div></div></section>' +
        '<section class="sec form-sec" id="s-visimisi" style="padding-bottom:0"><div class="grid g2"><div class="card navy card-b"><div class="kicker" style="color:var(--gold)">Visi</div><div class="quote mt" style="color:#fff">' + esc(st.PROFIL_VISI) + '</div></div>' +
        '<div class="card card-b"><div class="kicker gold">Misi</div><ul class="misi mt">' + daftar(st.PROFIL_MISI).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div></div></section>' +
        '<section class="sec form-sec" id="s-sambutan" style="padding-bottom:0"><div class="card card-b sambutan samb-profil"><div class="foto" ' + (st.SAMBUTAN_FOTO_ID ? bg(st.SAMBUTAN_FOTO_ID, 600) : '') + '>' + (st.SAMBUTAN_FOTO_ID ? '' : ic('person', 'xl')) + '</div>' +
        '<div><div class="kicker gold">' + esc(st.SAMBUTAN_JUDUL || 'Sambutan Ketua') + '</div><div class="prose mt">' + esc(st.SAMBUTAN_ISI) + '</div><div class="mt"><b>' + esc(st.KETUA_NAMA || '') + '</b><div class="muted small">' + esc(st.KETUA_JABATAN || '') + '</div></div></div></div></section>' +
        '<section class="sec form-sec" id="s-struktur" style="padding-bottom:0"><div class="sec-h"><div><div class="kicker gold">Kepengurusan</div><h2>Struktur Organisasi</h2></div></div>' +
        (str.length ? '<div class="card card-b mb"><div class="row between wrap mb"><span class="small muted">' + ic('account_tree', 'sm') + ' Bagan disusun otomatis dari data kepengurusan' + (periodeStr(str) ? ' • Periode ' + esc(periodeStr(str)) : '') + '</span>' +
          '<button class="btn btn-ghost btn-xs" id="bagan-png">' + ic('download', 'sm') + 'Unduh PNG</button></div><div class="bagan" id="bagan-oto">' + UI.skel(4) + '</div></div>' : UI.kosong('Struktur organisasi belum diisi.', 'account_tree')) +
        (st.STRUKTUR_BAGAN_ID ? '<div class="card card-b mb"><div class="small muted mb">Bagan resmi (gambar)</div><img src="' + esc(img(st.STRUKTUR_BAGAN_ID, 1600)) + '" alt="Bagan struktur organisasi" style="width:100%;border-radius:8px;cursor:zoom-in" id="bagan"></div>' : '') + '</section>' +
        '</div>';
      $$('[data-s]', main).forEach((b) => b.onclick = () => { const el = $('#s-' + b.dataset.s); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      const bag = $('#bagan', main); if (bag) bag.onclick = () => UI.lightbox(bag.src, 'Bagan struktur organisasi');
      if (str.length) IKH.muat(['js/bagan.js?v=' + IKH.VERSI]).then(() => {
        const el = $('#bagan-oto'); if (!el || !document.body.contains(el)) return;
        IKH.Bagan.pasang(el, str);
        $('#bagan-png').onclick = (e) => UI.tombol(e.currentTarget, () => IKH.Bagan.unduh(str, { judul: 'Struktur Organisasi ' + (st.ORG_NAMA || 'IKALLHUBDAT'), sub: periodeStr(str) ? 'Periode ' + periodeStr(str) : '', nama: 'Bagan-Struktur-' + (st.ORG_SINGKAT || 'IKALLHUBDAT').replace(/\s+/g, '-') }));
      }, () => { const el = $('#bagan-oto'); if (el) el.innerHTML = UI.kosong('Bagan gagal dimuat. Periksa koneksi.', 'account_tree'); });
      if (q && q.get('s')) setTimeout(() => { const el = $('#s-' + q.get('s')); if (el) el.scrollIntoView({ block: 'start' }); }, 60);
    });
  }

  /* ---------------- Pendaftaran mandiri ---------------- */
  const FIELD_DAFTAR = ['nama', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'no_hp', 'email', 'kota_domisili', 'alamat', 'nomor_taruna', 'angkatan', 'prodi', 'tahun_kelulusan', 'status_kepegawaian', 'instansi', 'jabatan_terakhir'];
  const WAJIB = ['nama', 'no_hp', 'email', 'nomor_taruna', 'angkatan', 'prodi', 'tahun_kelulusan', 'status_kepegawaian'];
  const opsi = (list, pilih, kosong) => '<option value="">' + esc(kosong || '— Pilih —') + '</option>' + list.map((x) => '<option ' + (x === pilih ? 'selected' : '') + '>' + esc(x) + '</option>').join('');
  IKH.formAlumni = function (st, v, o) {
    v = v || {}; o = o || {};
    const f = (k, label, inp, hint, full) => '<div class="fld ' + (full ? 'full' : '') + '" data-f="' + k + '"><label for="f-' + k + '">' + label + (WAJIB.indexOf(k) > -1 && !o.tanpaWajib ? '<span class="req">*</span>' : '') + '</label>' + inp + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
    const t = (k, ph, type, extra) => '<input class="inp" id="f-' + k + '" name="' + k + '" type="' + (type || 'text') + '" value="' + esc(v[k] || '') + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + '>';
    const s = (k, list) => '<select class="inp" id="f-' + k + '" name="' + k + '">' + opsi(list, v[k]) + (v[k] && list.indexOf(v[k]) === -1 ? '<option selected>' + esc(v[k]) + '</option>' : '') + '</select>';
    // Pilihan + isian bebas: bila daftar memuat "Lainnya", memilihnya memunculkan kotak isian.
    // Nilai yang tidak ada di daftar (isian bebas sebelumnya) tampil sebagai "Lainnya" + teksnya.
    const sLain = (k, list, ph) => {
      const lain = list.find((x) => POLA_LAIN.test(x));
      if (!lain) return s(k, list);
      const isi = v[k] || '', bebas = !!isi && list.indexOf(isi) === -1, pilih = bebas ? lain : isi;
      return '<select class="inp" id="f-' + k + '" name="' + k + '" data-lain="' + esc(lain) + '"' + (isi === lain && v.id_record ? ' data-awal="' + esc(lain) + '"' : '') + '>' + opsi(list, pilih) + '</select>' +
        '<input class="inp inp-lain' + (pilih === lain ? '' : ' hide') + '" id="f-' + k + '_lain" type="text" maxlength="150" value="' + esc(bebas ? isi : '') + '" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '">';
    };
    const tahun = new Date().getFullYear();
    return {
      identitas: '<div class="form-grid">' + f('nama', 'Nama lengkap & gelar', t('nama', 'Sesuai ijazah, beserta gelar', 'text', 'autocomplete="name" maxlength="150"'), 'Nama ini tampil pada KTA.', true) +
        f('jenis_kelamin', 'Jenis kelamin', s('jenis_kelamin', ['Laki-laki', 'Perempuan'])) + f('tempat_lahir', 'Tempat lahir', t('tempat_lahir', 'Kota kelahiran')) +
        f('tanggal_lahir', 'Tanggal lahir', t('tanggal_lahir', '', 'date', 'max="' + (tahun - 15) + '-12-31"')) + f('no_hp', 'Nomor WhatsApp aktif', t('no_hp', '08xxxxxxxxxx', 'tel', 'autocomplete="tel" inputmode="tel"'), 'Untuk notifikasi status verifikasi.') +
        f('email', 'Email aktif', t('email', 'nama@email.com', 'email', 'autocomplete="email"'), 'Akun & KTA digital dikirim ke email ini.') + f('kota_domisili', 'Domisili (kab/kota)', s('kota_domisili', daftar(st.DAFTAR_KOTA))) +
        f('alamat', 'Alamat lengkap', '<textarea class="inp" id="f-alamat" name="alamat" rows="2" maxlength="300" placeholder="Jalan, RT, kelurahan, kecamatan">' + esc(v.alamat || '') + '</textarea>', '', true) + '</div>',
      akademik: '<div class="form-grid">' + f('nomor_taruna', 'Nomor Induk Taruna (NIT)', t('nomor_taruna', 'Contoh: 1902044', 'text', 'maxlength="30"')) + f('angkatan', 'Angkatan', t('angkatan', 'Contoh: 38', 'text', 'maxlength="10"')) +
        f('prodi', 'Program studi', sLain('prodi', daftar(st.DAFTAR_PRODI), 'Tulis nama program studi')) + f('tahun_kelulusan', 'Tahun lulus', t('tahun_kelulusan', 'TTTT', 'text', 'inputmode="numeric" maxlength="4"')) + '</div>',
      kepegawaian: '<div class="form-grid">' + f('status_kepegawaian', 'Status kepegawaian', s('status_kepegawaian', daftar(st.DAFTAR_KEPEGAWAIAN))) + f('instansi', 'Instansi / unit kerja', t('instansi', 'Contoh: Dinas Perhubungan Kota …')) +
        f('jabatan_terakhir', 'Jabatan terakhir', t('jabatan_terakhir', 'Contoh: Analis Lalu Lintas'), '', true) + '</div>'
    };
  };
  /* "Lainnya" → isian bebas. Teks yang sama dengan salah satu pilihan memakai ejaan resmi pilihan itu. */
  const POLA_LAIN = /^(lainnya|lain-lain|lain lain)$/i;
  const rapi = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  function nilaiLain(sel) {
    const t = rapi(($('#' + sel.id + '_lain') || {}).value);
    if (!t || POLA_LAIN.test(t)) return sel.dataset.awal || '';           // data lama bernilai "Lainnya" dibiarkan
    const sama = Array.from(sel.options).find((op) => op.value && !POLA_LAIN.test(op.value) && op.value.toLowerCase() === t.toLowerCase());
    return sama ? sama.value : t;
  }
  const pilihLain = (sel) => !!sel && sel.tagName === 'SELECT' && !!sel.dataset.lain && sel.value === sel.dataset.lain;
  document.addEventListener('change', (e) => {
    const sel = e.target;
    if (!sel || !sel.matches || !sel.matches('select[data-lain]')) return;
    const inp = $('#' + sel.id + '_lain'); if (!inp) return;
    const on = pilihLain(sel);
    inp.classList.toggle('hide', !on);
    if (on && !inp.value) inp.focus();
  });
  IKH.ambilForm = function (el, fields) { const o = {}; fields.forEach((k) => { const x = $('[name="' + k + '"]', el); if (x) o[k] = pilihLain(x) ? nilaiLain(x) : x.value.trim(); }); return o; };
  IKH.validasiForm = function (el, o, wajib) {
    $$('.fld.err', el).forEach((x) => { x.classList.remove('err'); const m = $('.msg-err', x); if (m) m.remove(); });
    const salah = [];
    const tanda = (k, msg) => { const f = $('[data-f="' + k + '"]', el); if (f) { f.classList.add('err'); f.insertAdjacentHTML('beforeend', '<span class="msg-err">' + esc(msg) + '</span>'); } salah.push(k); };
    $$('select[data-lain]', el).forEach((sel) => { if (pilihLain(sel) && !nilaiLain(sel)) tanda(sel.name, 'Anda memilih "' + sel.dataset.lain + '": ' + ($('#' + sel.id + '_lain').placeholder || 'isi kotak di bawahnya').toLowerCase() + '.'); });
    (wajib || []).forEach((k) => { if (!o[k] && salah.indexOf(k) === -1) tanda(k, 'Wajib diisi.'); });
    if (o.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) tanda('email', 'Format email tidak valid.');
    if (o.no_hp && !/^08\d{8,12}$/.test(IKH.hp08(o.no_hp))) tanda('no_hp', 'Nomor tidak valid (contoh 081234567890).');
    if (o.tahun_kelulusan && !/^\d{4}$/.test(o.tahun_kelulusan)) tanda('tahun_kelulusan', 'Isi 4 digit tahun.');
    if (salah.length) { const f = $('[data-f="' + salah[0] + '"] .inp-lain:not(.hide)', el) || $('[data-f="' + salah[0] + '"] .inp', el); if (f) { f.focus(); f.scrollIntoView({ block: 'center' }); } }
    return !salah.length;
  };

  function daftarPage() {
    return halamanPub('Pendaftaran Alumni', (main, d) => {
      const st = d.setting || {};
      if (main.dataset.form === '1' && $('#frm-daftar', main)) return;     // jangan timpa isian saat data disegarkan
      if (st.PENDAFTARAN_DIBUKA === 'TIDAK') { main.innerHTML = pageHead('Pendaftaran Alumni', 'Pendaftaran sedang ditutup') + '<div class="wrap sec"><div class="alert warn">' + ic('info') + '<div>Pendaftaran anggota baru sedang ditutup oleh Pengurus. Silakan hubungi sekretariat untuk informasi.</div></div></div>'; return; }
      const draf = LS.get('draf_daftar', {});
      const F = IKH.formAlumni(st, draf);
      const sec = (n, id, judul, sub, isi) => '<section class="card form-sec mb" id="sec-' + id + '"><div class="card-h"><div class="row gap-lg"><span class="n">' + n + '</span><div><h3>' + judul + '</h3><div class="sub">' + sub + '</div></div></div></div><div class="card-b">' + isi + '</div></section>';
      main.dataset.form = '1';
      main.innerHTML = pageHead('Pendaftaran Alumni', 'Formulir Pendaftaran Mandiri Anggota', 'Isi data identitas, riwayat akademik, kepegawaian, dan unggah dokumen pendukung. Pengurus akan memverifikasi; setelah disetujui, akun dan KTA digital ber-QR dikirim ke email Anda.') +
        '<div class="wrap sec" style="padding-top:1.5rem"><div class="grid" style="grid-template-columns:260px minmax(0,1fr);align-items:start" id="dft-grid">' +
        '<aside class="steps" style="position:sticky;top:90px" aria-label="Tahapan formulir">' + [['identitas', 'Identitas & Kontak'], ['akademik', 'Akademik Kedinasan'], ['kepegawaian', 'Kepegawaian'], ['dokumen', 'Dokumen & Pernyataan']].map((s, i) => '<a class="step" href="javascript:void 0" data-go="' + s[0] + '"><span class="n">' + (i + 1) + '</span><span>' + s[1] + '</span></a>').join('') +
        '<div class="alert info mt small">' + ic('info', 'sm') + '<div>Isian tersimpan otomatis di perangkat ini sampai formulir dikirim (kecuali berkas).</div></div><a class="btn btn-text small" href="#/status">Sudah mendaftar? Cek status' + ic('arrow_forward', 'sm') + '</a></aside>' +
        '<form id="frm-daftar" novalidate>' +
        sec(1, 'identitas', 'Data Identitas & Kontak', 'Data diri dan kontak yang dapat dihubungi', F.identitas) +
        sec(2, 'akademik', 'Riwayat Akademik Kedinasan', 'Almamater, program studi, dan angkatan', F.akademik) +
        sec(3, 'kepegawaian', 'Status Kepegawaian & Penempatan', 'Instansi dan jabatan saat ini', F.kepegawaian) +
        sec(4, 'dokumen', 'Unggah Dokumen & Pernyataan', 'Pas foto wajib; ijazah/SK dianjurkan untuk mempercepat verifikasi',
          '<div class="grid g2"><div class="fld" data-f="foto"><label>Pas foto (untuk KTA)<span class="req">*</span></label><label class="upload"><input type="file" id="in-foto" accept="image/*"><span class="pv" id="pv-foto">' + ic('photo_camera', 'lg') + '</span><span><b>Pilih foto</b><br><span class="hint">Latar polos, wajah jelas. JPG/PNG — dikompres otomatis.</span></span></label></div>' +
          '<div class="fld" data-f="berkas"><label>Berkas pendukung (maks. 3)</label><label class="upload"><input type="file" id="in-berkas" accept="application/pdf,image/*" multiple><span class="pv" style="height:72px">' + ic('upload_file', 'lg') + '</span><span><b>Ijazah / SK penempatan</b><br><span class="hint">PDF maks. 4 MB atau gambar. Hanya dapat dilihat Pengurus.</span></span></label><div class="files" id="ls-berkas"></div></div></div>' +
          '<input type="text" name="website" id="f-website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
          '<label class="cek mt-lg" data-f="setuju"><input type="checkbox" id="f-setuju"><span>Saya menyatakan data yang saya isi benar dan dapat dipertanggungjawabkan, serta bersedia data saya dikelola Pengurus untuk keperluan administrasi keanggotaan.</span></label>' +
          '<div class="row wrap mt-lg"><button class="btn btn-primary" type="submit" id="btn-kirim">' + ic('send') + 'Kirim Pendaftaran</button><button class="btn btn-ghost" type="button" id="btn-reset">Kosongkan formulir</button></div>') +
        '</form></div></div>';
      if (window.innerWidth < 900) { $('#dft-grid', main).style.gridTemplateColumns = '1fr'; $('.steps', main).style.position = 'static'; }
      const frm = $('#frm-daftar', main);
      let foto = null, berkas = [];
      $$('[data-go]', main).forEach((a) => a.onclick = () => $('#sec-' + a.dataset.go).scrollIntoView({ behavior: 'smooth' }));
      frm.addEventListener('input', IKH.debounce(() => { if (!document.body.contains(frm)) return; LS.set('draf_daftar', IKH.ambilForm(frm, FIELD_DAFTAR)); tandaiLangkah(); }, 400));
      function tandaiLangkah() {
        const o = IKH.ambilForm(frm, FIELD_DAFTAR);
        const lengkap = { identitas: ['nama', 'no_hp', 'email'].every((k) => o[k]), akademik: ['nomor_taruna', 'angkatan', 'prodi', 'tahun_kelulusan'].every((k) => o[k]), kepegawaian: !!o.status_kepegawaian, dokumen: !!foto && $('#f-setuju', frm).checked };
        $$('[data-go]', main).forEach((a) => a.classList.toggle('done', !!lengkap[a.dataset.go]));
      }
      tandaiLangkah();
      $('#f-setuju', frm).onchange = tandaiLangkah;
      $('#in-foto').onchange = async (e) => {
        try { foto = await IKH.bacaGambar(e.target.files[0], 800, 0.86); $('#pv-foto').style.backgroundImage = 'url(' + foto.data + ')'; $('#pv-foto').innerHTML = ''; tandaiLangkah(); }
        catch (er) { UI.toast(er.message, 'bad'); }
      };
      const gambarBerkas = () => { $('#ls-berkas').innerHTML = berkas.map((b, i) => '<div class="f">' + ic(b.tipe === 'application/pdf' ? 'description' : 'image', 'sm') + '<span class="grow trunc">' + esc(b.nama) + '</span><button type="button" class="btn btn-text btn-xs" data-hb="' + i + '" aria-label="Hapus berkas">' + ic('close', 'sm') + '</button></div>').join(''); $$('[data-hb]', main).forEach((x) => x.onclick = () => { berkas.splice(+x.dataset.hb, 1); gambarBerkas(); }); };
      $('#in-berkas').onchange = async (e) => {
        for (const f of Array.from(e.target.files)) { if (berkas.length >= 3) { UI.toast('Maksimal 3 berkas.', 'warn'); break; } try { berkas.push(await IKH.bacaBerkas(f, 4)); } catch (er) { UI.toast(f.name + ': ' + er.message, 'bad'); } }
        e.target.value = ''; gambarBerkas();
      };
      $('#btn-reset').onclick = async () => { if ((await UI.konfirmasi('Kosongkan semua isian formulir?')).ok) { LS.del('draf_daftar'); main.dataset.form = ''; Router.jalan(); } };
      frm.onsubmit = async (e) => {
        e.preventDefault();
        const o = IKH.ambilForm(frm, FIELD_DAFTAR);
        if (!IKH.validasiForm(frm, o, WAJIB)) return UI.toast('Periksa kembali isian yang ditandai merah.', 'bad');
        if (!foto) { $('[data-f="foto"]').classList.add('err'); $('#sec-dokumen').scrollIntoView({ behavior: 'smooth' }); return UI.toast('Pas foto wajib diunggah.', 'bad'); }
        if (!$('#f-setuju').checked) return UI.toast('Centang pernyataan kebenaran data.', 'bad');
        o.no_hp = IKH.hp08(o.no_hp);
        const m = UI.muat('Mengirim pendaftaran & mengunggah berkas…');
        const r = await api('pub.daftar', { data: o, foto: foto, berkas: berkas, setuju: true, website: $('#f-website').value });
        m.tutup();
        if (!r.ok) return UI.toast(r.msg, 'bad', 6000);
        LS.del('draf_daftar'); LS.set('reg_terakhir', { id: r.data.id_record, email: o.email });
        main.dataset.form = '';
        main.innerHTML = pageHead('Pendaftaran Alumni', 'Pendaftaran terkirim') + '<div class="wrap sec" style="max-width:720px"><div class="res"><div class="hd ok">' + ic('task_alt') + '<div><h3>Terima kasih, ' + esc(o.nama) + '!</h3><div>Pendaftaran Anda sedang menunggu verifikasi Pengurus.</div></div></div>' +
          '<div class="bd"><div class="kv box"><div>Nomor registrasi</div><div class="mono">' + esc(r.data.id_record) + '</div><div>Email</div><div>' + esc(o.email) + '</div><div>Status</div><div>' + UI.badgeStatus('Menunggu Verifikasi') + '</div></div>' +
          '<p class="mt small muted">Simpan nomor registrasi untuk mengecek status. Setelah disetujui, Anda menerima email berisi kata sandi awal dan KTA digital (PDF).</p>' +
          '<div class="row wrap"><a class="btn btn-primary" href="#/status?id=' + encodeURIComponent(r.data.id_record) + '&e=' + encodeURIComponent(o.email) + '">' + ic('fact_check') + 'Cek Status</a><a class="btn btn-ghost" href="#/">Kembali ke Beranda</a></div></div></div></div>';
        window.scrollTo(0, 0);
      };
    });
  }

  /* ---------------- Cek status pendaftaran ---------------- */
  function statusPage(p, q) {
    return halamanPub('Cek Status Pendaftaran', (main) => {
      const last = LS.get('reg_terakhir', {}) || {};
      main.innerHTML = pageHead('Cek Status', 'Cek Status Pendaftaran', 'Masukkan nomor registrasi dan email yang Anda gunakan saat mendaftar.') +
        '<div class="wrap sec" style="max-width:640px;padding-top:2rem"><form class="card card-b col gap-lg" id="frm-st"><div class="fld"><label for="st-id">Nomor registrasi</label><input class="inp mono" id="st-id" placeholder="REG-2026-0001" value="' + esc(q.get('id') || last.id || '') + '"></div>' +
        '<div class="fld"><label for="st-em">Email</label><input class="inp" id="st-em" type="email" value="' + esc(q.get('e') || last.email || '') + '"></div><button class="btn btn-primary" type="submit">' + ic('search') + 'Periksa Status</button></form><div id="st-hasil" class="mt-lg" aria-live="polite"></div></div>';
      const frm = $('#frm-st', main);
      frm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = $('button[type=submit]', frm);
        const r = await UI.tombol(btn, () => api('pub.cekStatus', { id_record: $('#st-id').value.trim(), email: $('#st-em').value.trim() }));
        const el = $('#st-hasil');
        if (!r.ok) { el.innerHTML = '<div class="alert bad">' + ic('error') + '<div>' + esc(r.msg) + '</div></div>'; return; }
        const d = r.data, s = d.status_verifikasi;
        el.innerHTML = '<div class="res"><div class="hd ' + (s === 'Disetujui' ? 'ok' : s === 'Ditolak' ? 'bad' : 'warn') + '">' + ic(s === 'Disetujui' ? 'verified' : s === 'Ditolak' ? 'cancel' : 'hourglass_top') + '<div><h3>' + esc(s) + '</h3><div>' + esc(d.nama) + '</div></div></div>' +
          '<div class="bd"><div class="kv"><div>Nomor registrasi</div><div class="mono">' + esc(d.id_record) + '</div><div>Tanggal daftar</div><div>' + fmt.waktu(d.tgl_daftar) + '</div>' + (d.id_member ? '<div>Nomor anggota</div><div class="mono">' + esc(d.id_member) + '</div>' : '') + (d.tgl_verifikasi ? '<div>Diverifikasi</div><div>' + fmt.waktu(d.tgl_verifikasi) + '</div>' : '') + '</div>' +
          (s === 'Ditolak' ? '<div class="alert warn mt">' + ic('info') + '<div><b>Catatan Pengurus:</b> ' + esc(d.catatan || '-') + '<br>Silakan perbaiki lalu daftar kembali.</div></div><a class="btn btn-primary mt" href="#/daftar">Daftar Ulang</a>' : '') +
          (s === 'Disetujui' ? '<p class="mt small">Info akun telah dikirim ke email Anda; KTA digital tersedia di Ruang Anggota. Belum menerima? Gunakan <a href="#/lupa">Lupa / Aktivasi Kata Sandi</a>.</p><a class="btn btn-primary" href="#/masuk">Masuk ke Ruang Anggota</a>' : '') +
          (s === 'Menunggu Verifikasi' ? '<p class="mt small muted mb-0">Pengurus sedang memeriksa data Anda. Anda akan menerima notifikasi melalui email/WhatsApp.</p>' : '') + '</div></div>';
      };
      if ((q.get('id') || last.id) && (q.get('e') || last.email) && q.get('id')) frm.requestSubmit();
    });
  }

  /* ---------------- Verifikasi KTA ---------------- */
  let _kamera = null;
  function hentikanKamera() { if (_kamera) { _kamera.getTracks().forEach((t) => t.stop()); _kamera = null; } }
  window.addEventListener('hashchange', hentikanKamera);
  function verifikasiPage(p) {
    return halamanPub('Verifikasi KTA', (main) => {
      if (main.dataset.vrf === (p.kode || '-') && $('#vr-hasil', main)) return;
      main.dataset.vrf = p.kode || '-';
      main.innerHTML = pageHead('Verifikasi KTA', 'Verifikasi Keaslian KTA Digital', 'Pindai kode QR pada KTA atau masukkan nomor anggota untuk memeriksa keabsahan kartu langsung ke basis data organisasi.') +
        '<div class="wrap sec" style="padding-top:2rem"><div class="grid g2" style="align-items:start"><div class="card"><div class="tabs" role="tablist"><button class="on" data-t="scan" role="tab">' + ic('qr_code_scanner', 'sm') + 'Pindai QR</button><button data-t="manual" role="tab">' + ic('badge', 'sm') + 'Cari Nomor KTA</button></div>' +
        '<div class="card-b" id="t-scan"><div class="scanner" id="scanner"><div class="center col" style="align-items:center;padding:1rem">' + ic('photo_camera', 'xl') + '<span class="small">Kamera belum aktif</span></div></div>' +
        '<div class="row wrap mt"><button class="btn btn-primary" id="btn-kam">' + ic('photo_camera') + 'Nyalakan Kamera</button><label class="btn btn-ghost">' + ic('image') + 'Unggah Foto QR<input type="file" accept="image/*" id="in-qr" class="hide"></label></div>' +
        '<p class="hint mt mb-0">Tips: kamera ponsel bawaan juga dapat memindai QR pada KTA dan langsung membuka halaman ini.</p></div>' +
        '<form class="card-b hide" id="t-manual"><div class="fld"><label for="vr-no">Nomor anggota (KTA) atau NIT</label><div class="inp-ic">' + ic('search') + '<input class="inp mono" id="vr-no" placeholder="Contoh: IKH-KT-2026-0001"></div></div><button class="btn btn-primary mt" type="submit">' + ic('fact_check') + 'Periksa Keaslian</button>' +
        '<p class="hint mt mb-0">Pencarian manual menampilkan data terbatas. Pemindaian QR menampilkan data lengkap beserta foto karena QR bertanda tangan digital.</p></form></div>' +
        '<div id="vr-hasil" aria-live="polite">' + '<div class="card card-b col" style="align-items:center;text-align:center;padding:2.5rem">' + ic('verified_user', 'xl') + '<h3 class="mt">Hasil verifikasi tampil di sini</h3><p class="muted mb-0">Data diambil langsung dari basis data resmi saat pengecekan.</p></div></div></div></div>';
      $$('[data-t]', main).forEach((b) => b.onclick = () => { $$('[data-t]', main).forEach((x) => x.classList.toggle('on', x === b)); $('#t-scan').classList.toggle('hide', b.dataset.t !== 'scan'); $('#t-manual').classList.toggle('hide', b.dataset.t !== 'manual'); if (b.dataset.t !== 'scan') hentikanKamera(); });
      $('#t-manual').onsubmit = (e) => { e.preventDefault(); const v = $('#vr-no').value.trim(); if (v) periksa(v); };
      $('#btn-kam').onclick = mulaiKamera;
      $('#in-qr').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const kode = await dekodeGambar(f); if (kode) periksa(kode); else UI.toast('QR tidak terbaca pada gambar. Coba foto yang lebih jelas.', 'bad'); e.target.value = ''; };
      if (p.kode) periksa(p.kode);
    });
  }
  async function periksa(kode) {
    const el = $('#vr-hasil'); if (!el) return;
    hentikanKamera();
    const ms = /#\/s\/([^?\s#]+)/.exec(String(kode));              // yang dipindai QR pengesahan → halaman pengesahan
    if (ms) { IKH.Router.go('/s/' + ms[1]); return; }
    el.innerHTML = '<div class="card">' + UI.skel(5) + '</div>';
    const r = await api('pub.verifikasi', { kode: kode });
    if (!r.ok) { el.innerHTML = '<div class="alert bad">' + ic('error') + '<div>' + esc(r.msg) + '</div></div>'; return; }
    const d = r.data;
    if (!d.valid) { el.innerHTML = '<div class="res"><div class="hd bad">' + ic('cancel') + '<div><h3>KTA TIDAK VALID</h3><div>' + esc(d.pesan || '') + '</div></div></div><div class="bd small muted">Diperiksa ' + fmt.waktu(d.dicek) + '. Bila menurut Anda ini keliru, hubungi sekretariat.</div></div>'; return; }
    const a = d.anggota, aktif = d.status === 'Aktif';
    el.innerHTML = '<div class="res"><div class="hd ' + (aktif ? 'ok' : 'warn') + '">' + ic(aktif ? 'verified' : 'warning') + '<div><h3>' + (aktif ? 'KTA VALID & TERDAFTAR RESMI' : 'KTA TERDAFTAR — STATUS ' + esc(d.status).toUpperCase()) + '</h3><div>' + esc(d.org || '') + (d.qr ? ' • QR bertanda tangan sah' : ' • Pencarian manual') + '</div></div></div>' +
      '<div class="bd"><div class="row top gap-lg">' + (a.foto_id ? '<div class="fu foto-v" ' + fotoUtuh(a.foto_id, 300) + '></div>' : '') +
      '<div class="grow"><div class="kicker">Nama Lengkap</div><h3 style="margin:.15rem 0 .5rem">' + esc(a.nama) + '</h3>' + UI.badgeStatus(d.status) + '</div></div>' +
      '<div class="kv mt"><div>Jenis anggota</div><div>' + IKH.badgeJenis(a) + '</div><div>Nomor anggota</div><div class="mono">' + esc(a.id_member) + '</div>' + (a.nomor_taruna ? '<div>NIT</div><div class="mono">' + esc(a.nomor_taruna) + '</div>' : '') + '<div>Angkatan</div><div>' + esc(a.angkatan || '-') + '</div><div>Program studi</div><div>' + esc(a.prodi || '-') + '</div>' +
      (a.tahun_kelulusan ? '<div>Tahun lulus</div><div>' + esc(a.tahun_kelulusan) + '</div>' : '') + (a.instansi ? '<div>Instansi</div><div>' + esc(a.instansi) + '</div>' : '') + (a.seumur_hidup ? '<div>Masa berlaku</div><div>Seumur hidup</div>' : '<div>Berlaku s.d.</div><div>' + fmt.tgl(a.masa_berlaku_kartu, true) + '</div>') +
      (d.sah && d.sah.pada ? '<div>Disahkan oleh</div><div>' + esc(d.sah.oleh || '-') + '<div class="small muted">' + esc(d.sah.jabatan || '') + ' • ' + fmt.tgl(d.sah.pada, true) + '</div></div>' : '') + '</div>' +
      '<p class="small muted mt mb-0">Diperiksa ' + fmt.waktu(d.dicek) + '.</p><button class="btn btn-ghost btn-sm mt" onclick="IKH.Router.go(\'/verifikasi\')">' + ic('refresh', 'sm') + 'Periksa KTA lain</button></div></div>';
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /* ---------------- Pengesahan KTA (QR kecil di sisi belakang kartu) ----------------
     Pengganti tanda tangan ketua: menampilkan siapa yang mengesahkan kartu dan kapan, langsung dari basis data. */
  function pengesahanPage(p) {
    return halamanPub('Pengesahan KTA', async (main) => {
      if (main.dataset.sah === p.kode && $('#sh-hasil', main)) return;
      main.dataset.sah = p.kode;
      main.innerHTML = pageHead('Pengesahan KTA', 'Pengesahan Elektronik KTA', 'Halaman ini dibuka dari QR pengesahan pada sisi belakang KTA. KTA digital tidak memakai tanda tangan basah; pengesahan Ketua dibuktikan lewat halaman ini.') +
        '<div class="wrap sec" style="max-width:720px;padding-top:2rem"><div id="sh-hasil" aria-live="polite"><div class="card">' + UI.skel(6) + '</div></div></div>';
      const el = $('#sh-hasil', main);
      const r = await api('pub.pengesahan', { kode: p.kode });
      if (!document.body.contains(el)) return;
      if (!r.ok) { el.innerHTML = '<div class="alert bad">' + ic('error') + '<div>' + esc(r.code === 'NOACT' ? 'Halaman pengesahan butuh backend Apps Script v1.4.0. Hubungi Pengurus.' : r.msg) + '</div></div>'; return; }
      const d = r.data, lagi = '<a class="btn btn-ghost btn-sm mt" href="#/verifikasi">' + ic('qr_code_scanner', 'sm') + 'Pindai KTA lain</a>';
      if (!d.valid) { el.innerHTML = '<div class="res"><div class="hd bad">' + ic('cancel') + '<div><h3>PENGESAHAN TIDAK SAH</h3><div>' + esc(d.pesan || '') + '</div></div></div><div class="bd small muted">Diperiksa ' + fmt.waktu(d.dicek) + '. Bila menurut Anda ini keliru, hubungi sekretariat.<br>' + lagi + '</div></div>'; return; }
      const a = d.anggota, s = d.sah || {}, aktif = d.status === 'Aktif', baik = d.terkini && aktif;
      el.innerHTML = '<div class="res"><div class="hd ' + (baik ? 'ok' : 'warn') + '">' + ic(baik ? 'verified' : 'warning') + '<div><h3>' + (!d.terkini ? 'PENGESAHAN SUDAH DIGANTIKAN' : aktif ? 'KTA DISAHKAN SECARA ELEKTRONIK' : 'DISAHKAN — STATUS KARTU ' + esc(d.status).toUpperCase()) + '</h3><div>' + esc(d.org || '') + ' • kode pengesahan bertanda tangan sah</div></div></div>' +
        '<div class="bd">' + (!d.terkini ? '<div class="alert warn mb">' + ic('warning') + '<div>Kode pada kartu ini berasal dari pengesahan <b>' + fmt.tgl(d.sahKode, true) + '</b> yang sudah digantikan pengesahan baru (kartu diperpanjang atau datanya diperbarui). Minta pemegang kartu menampilkan <b>kartu terbaru dari aplikasi</b>.</div></div>' : '') +
        '<div class="row top gap-lg">' + (a.foto_id ? '<div class="fu foto-v" ' + fotoUtuh(a.foto_id, 300) + '></div>' : '') +
        '<div class="grow"><div class="kicker">Pemegang kartu</div><h3 style="margin:.15rem 0 .5rem">' + esc(a.nama) + '</h3>' + UI.badgeStatus(d.status) + ' ' + IKH.badgeJenis(a) + '</div></div>' +
        '<div class="kv mt"><div>Nomor anggota</div><div class="mono">' + esc(a.id_member) + '</div>' + (a.seumur_hidup ? '<div>Masa berlaku</div><div>Seumur hidup</div>' : '<div>Berlaku s.d.</div><div>' + fmt.tgl(a.masa_berlaku_kartu, true) + '</div>') +
        '<div>Disahkan oleh</div><div><b>' + esc(s.oleh || '(nama ketua belum diisi Pengurus)') + '</b><div class="small muted">' + esc(s.jabatan || '') + '</div></div>' +
        '<div>' + (d.terkini ? 'Tanggal pengesahan' : 'Pengesahan terbaru') + '</div><div>' + fmt.waktu(s.pada) + '</div>' + (s.terbit ? '<div>KTA terbit</div><div>' + fmt.tgl(s.terbit, true) + '</div>' : '') + '</div>' +
        '<p class="small muted mt mb-0">Diperiksa ' + fmt.waktu(d.dicek) + '. Pengesahan dicatat otomatis oleh sistem atas nama Ketua yang menjabat saat kartu terbit atau diperbarui.</p>' +
        '<div class="row wrap"><a class="btn btn-primary btn-sm mt" href="#/v/' + encodeURIComponent(a.id_member) + '">' + ic('fact_check', 'sm') + 'Lihat status keanggotaan</a>' + lagi + '</div></div></div>';
    });
  }
  async function mulaiKamera() {
    const box = $('#scanner');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return UI.toast('Browser tidak mendukung kamera. Gunakan Unggah Foto QR.', 'bad');
    try { _kamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
    catch (e) { return UI.toast('Izin kamera ditolak / tidak tersedia.', 'bad'); }
    box.innerHTML = '<video playsinline muted></video><div class="fr"></div>';
    const v = $('video', box); v.srcObject = _kamera; await v.play();
    const det = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    if (!det) await IKH.muat(IKH.CDN.jsqr);
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    const loop = async () => {
      if (!_kamera) return;
      try {
        let kode = null;
        if (det) { const r = await det.detect(v); if (r.length) kode = r[0].rawValue; }
        else if (v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; x.drawImage(v, 0, 0); const q = window.jsQR(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height); if (q) kode = q.data; }
        if (kode) { if (navigator.vibrate) navigator.vibrate(80); return periksa(kode); }
      } catch (e) { }
      setTimeout(() => requestAnimationFrame(loop), 180);
    };
    loop();
  }
  async function dekodeGambar(file) {
    const url = URL.createObjectURL(file);
    try {
      const im = new Image(); im.src = url; await im.decode();
      if ('BarcodeDetector' in window) { try { const r = await new window.BarcodeDetector({ formats: ['qr_code'] }).detect(im); if (r.length) return r[0].rawValue; } catch (e) { } }
      await IKH.muat(IKH.CDN.jsqr);
      const c = document.createElement('canvas'), s = Math.min(1, 1400 / Math.max(im.width, im.height)); c.width = im.width * s; c.height = im.height * s;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
      const q = window.jsQR(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
      return q ? q.data : null;
    } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
  }

  /* ---------------- Autentikasi ---------------- */
  function layoutAuth(kanan) {
    const st = IKH.setPub();
    return '<div class="auth"><div class="kiri"><span class="pill" style="align-self:flex-start">' + ic('shield', 'sm') + 'Portal Layanan Alumni</span><h1 class="mt">Sistem Informasi Manajemen Keanggotaan ' + esc(st.ORG_SINGKAT || 'IKALLHUBDAT KALTIM') + '</h1>' +
      '<p>Satu akun untuk melihat KTA digital, mengunduh kartu, dan mengajukan pembaruan data yang diverifikasi Pengurus.</p>' +
      '<div class="ft">' + ic('verified_user') + '<div><b>Akun dibuat otomatis</b>setelah pendaftaran disetujui. Kata sandi awal dikirim ke email terdaftar.</div></div>' +
      '<div class="ft">' + ic('lock_reset') + '<div><b>Data lama sudah diimpor?</b>Aktifkan akun lewat menu "Lupa / Aktivasi Kata Sandi" memakai email terdaftar.</div></div>' +
      '<div class="ft">' + ic('qr_code_2') + '<div><b>KTA ber-QR</b>dapat diperiksa keasliannya oleh siapa pun.</div></div></div><div class="kanan"><div class="box">' + kanan + '</div></div></div>';
  }
  function halAuth(judul, kanan, pasang) {
    IKH.judul(judul);
    const main = IKH.pasangLayout('pub', layoutPub); bingkai();
    main.innerHTML = layoutAuth(kanan);
    pasang(main);
    if (!Store.pub) Store.pubBoot().then(() => { bingkai(); });
  }
  const mata = (id) => '<button type="button" class="btn btn-text ic-r" data-mata="' + id + '" aria-label="Tampilkan kata sandi">' + ic('visibility', 'sm') + '</button>';
  function pasangMata(el) { $$('[data-mata]', el).forEach((b) => b.onclick = () => { const i = $('#' + b.dataset.mata); i.type = i.type === 'password' ? 'text' : 'password'; b.innerHTML = ic(i.type === 'password' ? 'visibility' : 'visibility_off', 'sm'); }); }
  function setelahMasuk(d) {
    Sesi.simpan(d.token, d.me);
    if (d.boot) { if (d.me.peran === 'pengurus') IKH.Store.setAdm(d.boot); else IKH.Store.setAgt(d.boot); }
    if (d.me.wajib) return Router.go('/ganti-sandi');
    const balik = LS.get('balik', ''); LS.del('balik');
    const tujuan = balik && balik.indexOf(d.me.peran === 'pengurus' ? '#/admin' : '#/anggota') === 0 ? balik.slice(1) : (d.me.peran === 'pengurus' ? '/admin' : '/anggota');
    Router.go(tujuan);
  }
  IKH.setelahMasuk = setelahMasuk;
  function masuk() {
    if (Sesi.me && !Sesi.me.wajib) return Router.go(Sesi.me.peran === 'pengurus' ? '/admin' : '/anggota');
    IKH.warmUp('admin');
    halAuth('Masuk', '<div class="kicker gold">Portal Masuk Terpadu</div><h2 class="mt">Masuk ke Akun Anda</h2><p class="muted">Gunakan email dan kata sandi yang terdaftar.</p>' +
      '<div class="seg mb" role="tablist" aria-label="Jenis akun"><button class="on" data-p="anggota" type="button">' + 'Alumni / Anggota</button><button data-p="pengurus" type="button">Pengurus</button></div>' +
      '<form id="frm-in" class="col gap-lg" novalidate><div class="fld"><label for="in-em">Email</label><div class="inp-ic">' + ic('mail') + '<input class="inp" id="in-em" type="email" autocomplete="username" placeholder="nama@email.com"></div></div>' +
      '<div class="fld"><div class="row between"><label for="in-pw" class="lbl">Kata sandi</label><a href="#/lupa" class="small">Lupa / aktivasi?</a></div><div class="inp-ic">' + ic('lock') + '<input class="inp" id="in-pw" type="password" autocomplete="current-password">' + mata('in-pw') + '</div></div>' +
      '<label class="cek" id="ingat-w"><input type="checkbox" id="in-ingat"><span>Ingat saya di perangkat ini (30 hari)</span></label>' +
      '<button class="btn btn-primary btn-block" type="submit" data-busy="Memeriksa…">' + ic('login') + 'Masuk</button></form>' +
      '<div class="alert info mt-lg small" id="in-info">' + ic('info', 'sm') + '<div>Akun anggota aktif setelah pendaftaran disetujui Pengurus. Belum terdaftar? <a href="#/daftar"><b>Daftar sekarang</b></a>.</div></div>', (el) => {
      pasangMata(el);
      $$('[data-p]', el).forEach((b) => b.onclick = () => {
        $$('[data-p]', el).forEach((x) => x.classList.toggle('on', x === b));
        const png = b.dataset.p === 'pengurus';
        $('#ingat-w').classList.toggle('hide', png);
        $('#in-info').innerHTML = ic('info', 'sm') + (png ? '<div>Akun Pengurus dibuat oleh Pengurus lain. Pemasangan pertama: gunakan <b>akses darurat</b> dari log setup Apps Script, lalu buat akun Pengurus di menu Pengaturan.</div>' : '<div>Akun anggota aktif setelah pendaftaran disetujui Pengurus. Belum terdaftar? <a href="#/daftar"><b>Daftar sekarang</b></a>.</div>');
      });
      $('#frm-in').onsubmit = async (e) => {
        e.preventDefault();
        const em = $('#in-em').value.trim(), pw = $('#in-pw').value;
        if (!em || !pw) return UI.toast('Isi email dan kata sandi.', 'bad');
        const r = await UI.tombol($('#frm-in button[type=submit]'), () => api('auth.login', { email: em, sandi: pw, ingat: $('#in-ingat').checked, appUrl: location.origin + location.pathname }));
        if (!r.ok) { $('#in-pw').value = ''; $('#in-pw').focus(); return UI.toast(r.msg, 'bad', 5000); }
        UI.toast(r.msg);
        setelahMasuk(r.data);
      };
      setTimeout(() => $('#in-em').focus(), 50);
    });
  }
  function gantiSandiWajib() {
    const me = Sesi.me; if (!me) return Router.go('/masuk');
    if (!me.wajib) return Router.go(me.peran === 'pengurus' ? '/admin' : '/anggota');
    halAuth('Ganti Kata Sandi', '<div class="kicker gold">Keamanan Akun</div><h2 class="mt">Ganti Kata Sandi Awal</h2><p class="muted">Demi keamanan, ganti kata sandi awal sebelum melanjutkan.</p>' +
      '<form id="frm-gs" class="col gap-lg"><div class="fld"><label for="gs-l">Kata sandi saat ini (dari email)</label><div class="inp-ic">' + ic('key') + '<input class="inp" id="gs-l" type="password" autocomplete="current-password">' + mata('gs-l') + '</div></div>' +
      '<div class="fld"><label for="gs-b">Kata sandi baru</label><div class="inp-ic">' + ic('lock') + '<input class="inp" id="gs-b" type="password" autocomplete="new-password">' + mata('gs-b') + '</div><span class="hint">Minimal 8 karakter, memuat huruf dan angka.</span></div>' +
      '<div class="fld"><label for="gs-k">Ulangi kata sandi baru</label><input class="inp" id="gs-k" type="password" autocomplete="new-password"></div>' +
      '<button class="btn btn-primary btn-block" type="submit">' + ic('check_circle') + 'Simpan & Lanjutkan</button><button class="btn btn-ghost btn-block" type="button" id="gs-out">Keluar</button></form>', (el) => {
      pasangMata(el);
      $('#gs-out').onclick = () => Sesi.keluar();
      $('#frm-gs').onsubmit = async (e) => {
        e.preventDefault();
        const l = $('#gs-l').value, b = $('#gs-b').value;
        if (b !== $('#gs-k').value) return UI.toast('Konfirmasi kata sandi tidak sama.', 'bad');
        if (b.length < 8 || !/[A-Za-z]/.test(b) || !/\d/.test(b)) return UI.toast('Kata sandi minimal 8 karakter dengan huruf dan angka.', 'bad');
        const r = await UI.tombol($('#frm-gs button[type=submit]'), () => api('auth.ganti', { lama: l, baru: b }));
        if (!UI.hasil(r)) return;
        setelahMasuk(r.data);
      };
    });
  }
  function lupa() {
    halAuth('Lupa Kata Sandi', '<div class="kicker gold">Pemulihan / Aktivasi Akun</div><h2 class="mt">Lupa atau Aktivasi Kata Sandi</h2><p class="muted">Masukkan email terdaftar. Kami akan mengirim tautan untuk mengatur kata sandi (berlaku 60 menit). Anggota dari data lama yang belum punya akun juga memakai menu ini.</p>' +
      '<form id="frm-lp" class="col gap-lg"><div class="fld"><label for="lp-em">Email terdaftar</label><div class="inp-ic">' + ic('mail') + '<input class="inp" id="lp-em" type="email" autocomplete="email"></div></div>' +
      '<button class="btn btn-primary btn-block" type="submit">' + ic('send') + 'Kirim Tautan</button><a class="btn btn-ghost btn-block" href="#/masuk">Kembali ke halaman masuk</a></form><div id="lp-hasil" class="mt" aria-live="polite"></div>', (el) => {
      $('#frm-lp').onsubmit = async (e) => {
        e.preventDefault();
        const r = await UI.tombol($('#frm-lp button[type=submit]'), () => api('auth.lupa', { email: $('#lp-em').value.trim() }));
        $('#lp-hasil').innerHTML = '<div class="alert ' + (r.ok ? 'ok' : 'bad') + '">' + ic(r.ok ? 'mail' : 'error') + '<div>' + esc(r.msg) + '</div></div>';
      };
    });
  }
  function reset(p, q) {
    const em = q.get('e') || '', t = q.get('t') || '';
    halAuth('Atur Kata Sandi', '<div class="kicker gold">Atur Kata Sandi</div><h2 class="mt">Buat Kata Sandi Baru</h2><p class="muted">Akun: <b>' + esc(em || '-') + '</b></p>' +
      (!em || !t ? '<div class="alert bad">' + ic('error') + '<div>Tautan tidak lengkap. Minta tautan baru di menu Lupa Kata Sandi.</div></div>' :
        '<form id="frm-rs" class="col gap-lg"><div class="fld"><label for="rs-b">Kata sandi baru</label><div class="inp-ic">' + ic('lock') + '<input class="inp" id="rs-b" type="password" autocomplete="new-password">' + mata('rs-b') + '</div><span class="hint">Minimal 8 karakter, huruf dan angka.</span></div>' +
        '<div class="fld"><label for="rs-k">Ulangi kata sandi baru</label><input class="inp" id="rs-k" type="password" autocomplete="new-password"></div><button class="btn btn-primary btn-block" type="submit">' + ic('check_circle') + 'Simpan Kata Sandi</button></form>'), (el) => {
      pasangMata(el);
      const f = $('#frm-rs'); if (!f) return;
      f.onsubmit = async (e) => {
        e.preventDefault();
        const b = $('#rs-b').value;
        if (b !== $('#rs-k').value) return UI.toast('Konfirmasi kata sandi tidak sama.', 'bad');
        const r = await UI.tombol($('#frm-rs button[type=submit]'), () => api('auth.reset', { email: em, t: t, baru: b }));
        if (!UI.hasil(r)) return;
        Router.go('/masuk');
      };
    });
  }

  /* ---------------- Rute ---------------- */
  const R = IKH.Router;
  R.add('/', beranda); R.add('/profil', profil); R.add('/berita', beritaList); R.add('/berita/:id', beritaDetail);
  R.add('/galeri', galeriPage); R.add('/galeri/:id', albumPage);
  R.add('/daftar', daftarPage); R.add('/status', statusPage); R.add('/verifikasi', verifikasiPage); R.add('/v/:kode', verifikasiPage); R.add('/s/:kode', pengesahanPage);
  R.add('/masuk', masuk); R.add('/lupa', lupa); R.add('/reset', reset); R.add('/ganti-sandi', gantiSandiWajib);
  // pengurusBoleh: Pengurus yang akunnya terhubung ke data alumni membuka "Data & KTA Saya" (peran ganda)
  const AG = { peran: 'anggota', pengurusBoleh: true };
  R.add('/anggota', IKH.modul('Anggota', 'dasbor'), AG); R.add('/anggota/kta', IKH.modul('Anggota', 'kta'), AG);
  R.add('/anggota/profil', IKH.modul('Anggota', 'profil'), AG); R.add('/anggota/keamanan', IKH.modul('Anggota', 'keamanan'), AG);
  [['', 'dasbor'], ['/verifikasi', 'verifikasi'], ['/perubahan', 'perubahan'], ['/alumni', 'alumni'], ['/kta', 'kta'], ['/rekap', 'rekap'], ['/log', 'log'], ['/pengaturan', 'pengaturan'], ['/arsip', 'arsip']]
    .forEach((x) => R.add('/admin' + x[0], IKH.modul('Admin', x[1]), { peran: 'pengurus' }));
  [['/beranda', 'beranda'], ['/notifikasi', 'notifikasi'], ['/crm', 'crm'], ['/impor', 'impor']]
    .forEach((x) => R.add('/admin' + x[0], IKH.modul('Admin2', x[1]), { peran: 'pengurus' }));
  IKH.bingkaiPub = bingkai;
  document.addEventListener('DOMContentLoaded', () => IKH.mulai());
})();
