/* ==========================================================================
   SIM IKALLHUBDAT KALTIM — core.js
   API (fetch → GAS REST), cache SWR, batch & dedupe, drain notifikasi,
   router hash, layout, UI kit, KTA digital (tampilan, gambar kanvas, layar penuh), ekspor
   ========================================================================== */
(function () {
  'use strict';
  const VERSI = '2.0.1';
  const RILIS = '2026-11-18';   // VERSI & RILIS disetel otomatis oleh skrip build bersama versi.json & sw.js
  const CFG = window.APP_CONFIG || {};
  const IKH = (window.IKH = window.IKH || {});
  IKH.VERSI = VERSI; IKH.RILIS = RILIS;
  /* Hanya kolom isian formulir (bukan <th data-k> milik tabel yang bisa diurutkan) */
  IKH.ISIAN = 'input[data-k],textarea[data-k],select[data-k]';

  /* ---------------- Utilitas ---------------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, cls) => '<svg class="ic ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + n + '"></use></svg>';
  const img = (id, w) => (id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 600) : '');
  const bg = (id, w) => (id ? 'style="background-image:url(\'' + img(id, w) + '\')"' : '');
  /* v1.7.1: pas foto tampil utuh (tidak terpotong) — foto penuh di tengah, sisa bingkai diisi versi kabur dari foto yang sama. Pakai bersama kelas "fu". */
  const fotoUtuh = (id, w) => (id ? 'style="--ft:url(\'' + img(id, w) + '\')"' : '');
  /* Logo: hasil unggahan Pengurus (Drive) bila ada, selain itu logo bawaan img/logo.png */
  const logoBg = (st, w) => 'style="background-image:url(\'' + (st && st.LOGO_ID ? img(st.LOGO_ID, w || 160) : 'img/logo.png') + '\')"';
  const inisial = (n) => String(n || '?').replace(/[,.].*$/, '').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || '?';
  const warnaAva = (n) => 'c' + ((String(n || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 5) + 1);
  const debounce = (fn, ms) => {
    let t = null, a = null, ini = null;
    const f = function () { a = arguments; ini = this; clearTimeout(t); t = setTimeout(() => { t = null; fn.apply(ini, a); }, ms); };
    f.segera = () => { if (t) { clearTimeout(t); t = null; fn.apply(ini, a); } };   // jalankan yang tertunda sekarang juga
    return f;
  };
  const daftar = (s) => String(s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const hp08 = (v) => { let s = String(v || '').replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (s.startsWith('62')) s = '0' + s.slice(2); else if (s.startsWith('8')) s = '0' + s; return s; };
  const hariIni = () => { const d = new Date(Date.now() + 8 * 3600e3); return d.toISOString().slice(0, 10); };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function tglObj(v) { if (!v) return null; const s = String(v); const d = new Date(s.length === 10 ? s + 'T00:00:00+08:00' : s); return isNaN(d) ? null : d; }
  const fmt = {
    tgl(v, panjang) { const d = tglObj(v); if (!d) return v ? String(v) : '-'; const w = new Date(d.getTime() + 8 * 3600e3); return w.getUTCDate() + ' ' + (panjang ? BULAN : BLN)[w.getUTCMonth()] + ' ' + w.getUTCFullYear(); },
    waktu(v) { const d = tglObj(v); if (!d) return '-'; const w = new Date(d.getTime() + 8 * 3600e3); return fmt.tgl(v) + ', ' + String(w.getUTCHours()).padStart(2, '0') + '.' + String(w.getUTCMinutes()).padStart(2, '0') + ' WITA'; },
    relatif(v) {
      const d = tglObj(v); if (!d) return '-'; const s = (Date.now() - d.getTime()) / 1000;
      if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' menit lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
      if (s < 604800) return Math.floor(s / 86400) + ' hari lalu'; return fmt.tgl(v);
    },
    angka(n) { return Number(n || 0).toLocaleString('id-ID'); },
    sisaHari(v) { const d = tglObj(v); if (!d) return null; return Math.ceil((d.getTime() - tglObj(hariIni()).getTime()) / 864e5); }
  };
  Object.assign(IKH, { $, $$, esc, ic, img, bg, fotoUtuh, logoBg, inisial, warnaAva, debounce, daftar, hp08, hariIni, fmt });

  /* ---------------- Penyimpanan lokal (aman) ---------------- */
  const LS = {
    get(k, def) { try { const v = localStorage.getItem('ikh_' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('ikh_' + k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem('ikh_' + k); } catch (e) { } },
    hapusSemua(pref) { try { Object.keys(localStorage).forEach((k) => { if (k.indexOf('ikh_' + (pref || '')) === 0) localStorage.removeItem(k); }); } catch (e) { } }
  };
  IKH.LS = LS;

  /* ---------------- Sesi ---------------- */
  const Sesi = {
    data: LS.get('sesi', null),
    get token() { return this.data && this.data.exp > Date.now() ? this.data.token : ''; },
    get me() { return this.data && this.data.exp > Date.now() ? this.data.me : null; },
    simpan(token, me) { this.data = { token, me, exp: me.exp || Date.now() + 12 * 3600e3 }; LS.set('sesi', this.data); },
    keluar(kedaluwarsa) {
      const peran = this.me && this.me.peran, darurat = !!(this.me && this.me.darurat);
      this.data = null; LS.del('sesi'); LS.hapusSemua('adm'); LS.hapusSemua('agt'); Store.adm = null; Store.agt = null;
      if (IKH.Google) IKH.Google.keluar();
      if (kedaluwarsa) UI.toast('Sesi berakhir. Silakan masuk kembali.', 'warn');
      Router.go(darurat ? '/masuk?darurat=1' : peran === 'pengurus' ? '/masuk?p=pengurus' : peran === 'anggota' ? '/masuk' : '/');
    }
  };
  IKH.Sesi = Sesi;

  /* ---------------- Pengukur performa ---------------- */
  const Perf = {
    log: [],
    add(action, t0, res) { this.log.push({ aksi: action, total: Math.round(performance.now() - t0), server: res && res.ms, net: res && res.ms ? Math.round(performance.now() - t0 - res.ms) : null, cache: !!(res && res.data && res.data.cached), ok: !!(res && res.ok) }); if (this.log.length > 200) this.log.shift(); },
    table() { console.table(this.log); },
    summary() { const m = {}; this.log.forEach((x) => { (m[x.aksi] = m[x.aksi] || []).push(x.total); }); console.table(Object.keys(m).map((k) => ({ aksi: k, n: m[k].length, rata: Math.round(m[k].reduce((a, b) => a + b, 0) / m[k].length) }))); }
  };
  window.Perf = Perf;

  /* ---------------- API ---------------- */
  /* GAS_URL dirapikan (spasi/kutip tersisa dibuang) lalu diperiksa; alasan ditampilkan bila salah */
  const GAS_URL = String(CFG.GAS_URL || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/\?.*$/, '').replace(/\/+$/, '');
  function alasanUrl(u) {
    if (!u) return 'GAS_URL kosong / js/config.js tidak terbaca';
    if (/GANTI|XXXX/.test(u)) return 'GAS_URL masih berisi contoh "GANTI_DENGAN_ID_DEPLOYMENT"';
    if (/\/dev$/.test(u)) return 'URL berakhiran /dev (mode uji). Pakai URL /exec dari Deploy → Kelola deployment';
    if (!/^https:\/\/script\.google\.com\/(a\/macros\/[^/]+\/|macros\/)s\/[A-Za-z0-9_-]{20,}\/exec$/.test(u)) return 'format URL tidak dikenali (harus https://script.google.com/macros/s/…/exec)';
    return '';
  }
  const ALASAN_CFG = alasanUrl(GAS_URL);
  const KONFIG_OK = !ALASAN_CFG;
  IKH.KONFIG_OK = KONFIG_OK; IKH.GAS_URL = GAS_URL;
  const BACA = /^(pub\.(boot|cekStatus|verifikasi|galeri|album|foto)|auth\.(me|config)|agt\.boot|adm\.(boot|konten|log|akun\.list|arsip\.list|google\.kesiapan|galeri\.(list|album|foto|lama))|notif\.(config|queue|ringkas)|wa\.(audience|blastList)|crm\.(list|stats|detail)|imp\.inspect)$/;
  const _inflight = {}; let _epoch = 0;
  async function apiRun(action, data, extra) {
    const t0 = performance.now();
    if (!KONFIG_OK) return { ok: false, msg: 'Konfigurasi belum lengkap: ' + ALASAN_CFG + '.', code: 'CFG' };
    const body = Object.assign({ action: action, data: data || {}, token: Sesi.token || undefined }, extra || {});
    let res;
    try {
      const r = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', cache: 'no-store' });
      res = await r.json();
    } catch (e) {
      res = { ok: false, code: 'NET', msg: navigator.onLine ? 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.' : 'Anda sedang offline.' };
    }
    Perf.add(action, t0, res);
    if (res && res.v) Versi.catatServer(res.v);
    if (res && res.nq > 0) scheduleDrain();
    if (res && res.code === 'AUTH' && Sesi.data) setTimeout(() => Sesi.keluar(true), 0);
    if (res && res.code === 'GANTI') setTimeout(() => Router.go('/ganti-sandi'), 0);
    if (res && Array.isArray(res.results)) res.results.forEach((x) => { if (x && x.code === 'AUTH' && Sesi.data) setTimeout(() => Sesi.keluar(true), 0); });
    return res || { ok: false, msg: 'Respons kosong.' };
  }
  /** api(): baca identik yang sedang berjalan ditumpangi; tulis menaikkan epoch (anti data basi) */
  function api(action, data) {
    if (!BACA.test(action)) { _epoch++; return apiRun(action, data); }
    const k = _epoch + '|' + action + '|' + (Sesi.token || '') + '|' + JSON.stringify(data || {});
    if (_inflight[k]) return _inflight[k];
    const p = apiRun(action, data);
    _inflight[k] = p;
    p.then(() => delete _inflight[k], () => delete _inflight[k]);
    return p;
  }
  /** apiQ(): aksi baca dalam tik yang sama digabung menjadi 1 eksekusi "batch" */
  const Batcher = {
    q: null,
    add(action, data) {
      return new Promise((res) => {
        if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); }
        this.q.push({ action, data: data || {}, res });
      });
    },
    async flush() {
      const q = this.q; this.q = null;
      const uniq = []; const map = {};
      q.forEach((it) => { const k = it.action + '|' + JSON.stringify(it.data); if (!map[k]) { map[k] = []; uniq.push(it); } map[k].push(it.res); });
      for (let i = 0; i < uniq.length; i += 10) {
        const part = uniq.slice(i, i + 10);
        if (part.length === 1) { const r = await api(part[0].action, part[0].data); map[part[0].action + '|' + JSON.stringify(part[0].data)].forEach((f) => f(r)); continue; }
        const r = await apiRun('batch', null, { calls: part.map((p) => ({ action: p.action, data: p.data })) });
        part.forEach((p, j) => { const x = r.ok && r.results ? r.results[j] : r; map[p.action + '|' + JSON.stringify(p.data)].forEach((f) => f(x)); });
      }
    }
  };
  const apiQ = (action, data) => Batcher.add(action, data);
  IKH.api = api; IKH.apiQ = apiQ;

  /* Antrean notifikasi: kirim segera setelah aksi (tidak menunggu trigger 1 menit) */
  let _drainT = null, _drainN = 0;
  function scheduleDrain() {
    clearTimeout(_drainT);
    _drainT = setTimeout(async () => {
      const r = await apiRun('drain', {});
      if (r.ok && r.data && r.data.left && _drainN < 3) { _drainN++; scheduleDrain(); } else _drainN = 0;
    }, 400);
  }
  /* Pemanasan server (no-cors, maks. 1×/4 menit per lingkup) */
  function warmUp(scope) {
    if (!KONFIG_OK) return;
    const k = 'warm_' + scope, last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 240000) return;
    sessionStorage.setItem(k, String(Date.now()));
    fetch(GAS_URL + '?w=' + scope, { mode: 'no-cors', cache: 'no-store' }).catch(() => { });
  }
  IKH.warmUp = warmUp;

  /* ---------------- Store (SWR) ---------------- */
  const Store = {
    pub: LS.get('pub', null), pubAt: LS.get('pub_at', 0),
    adm: null, admAt: 0, agt: null, agtAt: 0,
    urai(k) { return k && k.h ? k.r.map((r) => { const o = {}; k.h.forEach((h, i) => { o[h] = r[i]; }); return o; }) : []; },
    /* data publik: tampil dari cache dulu, segarkan di latar bila > 10 menit */
    async pubBoot(paksa) {
      const segar = Date.now() - this.pubAt < 600000;
      if (this.pub && segar && !paksa) return this.pub;
      const p = api('pub.boot', {}).then((r) => {
        if (r.ok) { this.pub = r.data; this.pubAt = Date.now(); LS.set('pub', r.data); LS.set('pub_at', this.pubAt); document.dispatchEvent(new CustomEvent('ikh:pub')); }
        return this.pub;
      });
      return this.pub && !paksa ? this.pub : p;
    },
    setAdm(d) {
      const b = { anggota: this.urai(d.anggota), pengajuan: this.urai(d.pengajuan), akun: this.urai(d.akun), setting: d.setting || {}, log: this.urai(d.log), dibuat: d.dibuat, antrianAda: d.antrianAda, googleClientId: d.googleClientId || '' };
      this.adm = b; this.admAt = Date.now();
      if (d.me && Sesi.data && Sesi.data.me && d.me.email === Sesi.data.me.email && (d.me.id_record !== Sesi.data.me.id_record || d.me.nama !== Sesi.data.me.nama)) {
        Sesi.data.me = Object.assign({}, Sesi.data.me, { id_record: d.me.id_record || '', nama: d.me.nama || Sesi.data.me.nama }); LS.set('sesi', Sesi.data);
      }
      LS.set('adm_' + (Sesi.me ? Sesi.me.email : ''), { d: d, at: this.admAt });
      document.dispatchEvent(new CustomEvent('ikh:adm'));
      return b;
    },
    muatAdmLokal() { const x = LS.get('adm_' + (Sesi.me ? Sesi.me.email : ''), null); if (x && x.d && !this.adm) { this.setAdm(x.d); this.admAt = x.at; } return this.adm; },
    async admBoot(paksa) {
      if (!this.adm) this.muatAdmLokal();
      if (this.adm && !paksa && Date.now() - this.admAt < 30000) return this.adm;
      const p = (paksa ? api : apiQ)('adm.boot', {}).then((r) => { if (r.ok) this.setAdm(r.data); else if (r.code !== 'AUTH') Sync.gagal(r.msg); return this.adm; });
      Sync.mulai(p);
      return this.adm && !paksa ? this.adm : p;
    },
    setAgt(d) { this.agt = d; this.agtAt = Date.now(); LS.set('agt_' + (Sesi.me ? Sesi.me.email : ''), { d, at: this.agtAt }); document.dispatchEvent(new CustomEvent('ikh:agt')); return d; },
    async agtBoot(paksa) {
      if (!this.agt) { const x = LS.get('agt_' + (Sesi.me ? Sesi.me.email : ''), null); if (x) { this.agt = x.d; this.agtAt = x.at; } }
      if (this.agt && !paksa && Date.now() - this.agtAt < 60000) return this.agt;
      const p = api('agt.boot', {}).then((r) => { this.agtErr = r.ok ? null : r; if (r.ok) this.setAgt(r.data); return this.agt; });
      return this.agt && !paksa ? this.agt : p;
    },
    /* ganti satu baris anggota di cache admin (hasil optimistic/server) */
    patchAnggota(row) {
      if (!this.adm || !row) return;
      const i = this.adm.anggota.findIndex((a) => a.id_record === row.id_record);
      if (i > -1) this.adm.anggota[i] = Object.assign({}, this.adm.anggota[i], row); else this.adm.anggota.unshift(row);
      this.simpanAdmLokal();
    },
    hapusAnggota(id) { if (!this.adm) return; this.adm.anggota = this.adm.anggota.filter((a) => a.id_record !== id); this.simpanAdmLokal(); },
    patchPengajuan(row) { if (!this.adm || !row) return; const i = this.adm.pengajuan.findIndex((a) => a.id_pengajuan === row.id_pengajuan); if (i > -1) this.adm.pengajuan[i] = Object.assign({}, this.adm.pengajuan[i], row); this.simpanAdmLokal(); },
    simpanAdmLokal: debounce(function () {
      const a = Store.adm; if (!a) return;
      const pack = (rows) => { const h = rows.length ? Object.keys(rows[0]) : []; return { h, r: rows.map((o) => h.map((k) => o[k])) }; };
      LS.set('adm_' + (Sesi.me ? Sesi.me.email : ''), { d: { anggota: pack(a.anggota), pengajuan: pack(a.pengajuan), akun: pack(a.akun), setting: a.setting, log: pack(a.log), dibuat: a.dibuat, antrianAda: a.antrianAda, googleClientId: a.googleClientId || '' }, at: Store.admAt });
    }, 500),
    menu: {}     // cache per menu sekunder {key: {d, at}}
  };
  IKH.Store = Store;
  /* Cache menu sekunder (konten, notif, crm, log) dengan SWR */
  IKH.ambil = async function (key, action, data, ttl, opsi) {
    const m = Store.menu[key] || LS.get('m_' + key, null);
    if (m && !Store.menu[key]) Store.menu[key] = m;
    const segar = m && Date.now() - m.at < (ttl || 30000);
    if (m && segar && !(opsi && opsi.paksa)) return m.d;
    const p = ((opsi && opsi.paksa) ? api : apiQ)(action, data || {}).then((r) => {
      if (r.ok) { Store.menu[key] = { d: r.data, at: Date.now() }; if (!(opsi && opsi.tanpaLokal)) LS.set('m_' + key, Store.menu[key]); document.dispatchEvent(new CustomEvent('ikh:menu', { detail: key })); return r.data; }
      if (!m) UI.toast(r.msg || 'Gagal memuat data.', 'bad');
      return m ? m.d : null;
    });
    return m && !(opsi && opsi.paksa) ? m.d : p;
  };

  /* Indikator sinkron (panel pengurus) */
  const Sync = {
    n: 0,
    mulai(p) { this.n++; this.tampil(); p.finally(() => { this.n = Math.max(0, this.n - 1); this.tampil(); }); },
    gagal(msg) { const el = $('#sync'); if (el) { el.classList.add('err'); el.title = msg || 'Gagal sinkron'; } },
    tampil() {
      const el = $('#sync'); if (!el) return;
      el.classList.toggle('busy', this.n > 0); if (this.n > 0) el.classList.remove('err');
      const t = $('#sync-t'); if (t) t.textContent = this.n > 0 ? 'Menyinkronkan…' : (Store.admAt ? 'Tersinkron ' + fmt.relatif(new Date(Store.admAt).toISOString()) : 'Belum tersinkron');
    }
  };
  IKH.Sync = Sync;
  setInterval(() => Sync.tampil(), 20000);

  /* ---------------- UI kit ---------------- */
  const UI = {
    toast(msg, tipe, ms) {
      let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      const t = document.createElement('div'); t.className = 'toast ' + (tipe || 'ok'); t.setAttribute('role', 'status');
      t.innerHTML = ic(tipe === 'bad' ? 'error' : tipe === 'warn' ? 'warning' : 'check_circle') + '<div>' + esc(msg) + '</div>';
      box.appendChild(t); setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, ms || 3400);
    },
    hasil(r, okMsg) { if (r && r.ok) { UI.toast(r.msg || okMsg || 'Berhasil.', 'ok'); return true; } UI.toast((r && r.msg) || 'Gagal.', 'bad', 5000); return false; },
    modal(o) {
      return new Promise((resolve) => {
        const prev = document.activeElement;
        const sc = document.createElement('div'); sc.className = 'scrim';
        sc.innerHTML = '<div class="modal ' + (o.lebar || '') + '" role="dialog" aria-modal="true" aria-labelledby="mdl-t">' +
          '<div class="modal-h"><h3 id="mdl-t">' + esc(o.judul || '') + '</h3><button class="btn btn-ghost btn-icon btn-sm" data-x aria-label="Tutup">' + ic('close') + '</button></div>' +
          '<div class="modal-b">' + (o.isi || '') + '</div>' +
          (o.tombol && o.tombol.length ? '<div class="modal-f">' + o.tombol.map((b, i) => '<button class="btn ' + (b.kelas || 'btn-ghost') + '" data-i="' + i + '" type="button">' + (b.ikon ? ic(b.ikon) : '') + esc(b.teks) + '</button>').join('') + '</div>' : '') + '</div>';
        document.body.appendChild(sc); document.body.style.overflow = 'hidden';
        const md = $('.modal', sc);
        const tutup = (v) => { sc.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); resolve(v); };
        const key = (e) => {
          if (e.key === 'Escape') tutup(null);
          if (e.key === 'Tab') { const f = $$('button,input,select,textarea,a[href]', md).filter((x) => !x.disabled && x.offsetParent); if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } }
        };
        document.addEventListener('keydown', key);
        sc.addEventListener('mousedown', (e) => { if (e.target === sc && !o.wajib) tutup(null); });
        $('[data-x]', sc).onclick = () => tutup(null);
        $$('[data-i]', sc).forEach((b) => {
          b.onclick = async () => {
            const t = o.tombol[+b.dataset.i];
            if (t.aksi) { const lama = b.innerHTML; b.classList.add('busy'); b.innerHTML = '<span class="spin"></span>' + esc(t.teks); const v = await t.aksi(md); b.classList.remove('busy'); b.innerHTML = lama; if (v === false) return; tutup(v === undefined ? true : v); }
            else tutup(t.nilai === undefined ? null : t.nilai);
          };
        });
        if (o.onBuka) o.onBuka(md, tutup);
        setTimeout(() => { const f = $('input:not([type=hidden]),select,textarea', md) || $('[data-i]:last-child', md) || $('[data-x]', md); if (f) f.focus(); }, 30);
      });
    },
    async konfirmasi(teks, o) {
      o = o || {};
      const inp = o.input ? '<div class="fld mt"><label for="kf-in">' + esc(o.input.label || 'Catatan') + (o.input.wajib ? '<span class="req">*</span>' : '') + '</label>' +
        (o.input.tipe === 'input' ? '<input id="kf-in" class="inp" value="' + esc(o.input.nilai || '') + '" placeholder="' + esc(o.input.ph || '') + '">' : '<textarea id="kf-in" class="inp" placeholder="' + esc(o.input.ph || '') + '">' + esc(o.input.nilai || '') + '</textarea>') + '</div>' : '';
      let nilai = '';
      const r = await UI.modal({ judul: o.judul || 'Konfirmasi', isi: '<p class="mb-0">' + teks + '</p>' + inp,
        tombol: [{ teks: 'Batal', nilai: false }, { teks: o.ya || 'Ya, lanjutkan', kelas: o.bahaya ? 'btn-danger-fill' : 'btn-primary', aksi: (md) => {
          if (o.input) { nilai = $('#kf-in', md).value.trim(); if (o.input.wajib && !nilai) { $('#kf-in', md).classList.add('err'); $('#kf-in', md).focus(); return false; } }
          return true;
        } }] });
      return { ok: r === true, nilai: nilai };
    },
    muat(teks) { const o = document.createElement('div'); o.className = 'overlay-load'; o.innerHTML = '<div class="box"><span class="spin"></span><span>' + esc(teks || 'Memproses…') + '</span></div>'; document.body.appendChild(o); return { teks: (t) => { $('span:last-child', o).textContent = t; }, tutup: () => o.remove() }; },
    kosong(teks, ikon) { return '<div class="empty">' + ic(ikon || 'inventory_2') + '<div>' + esc(teks || 'Belum ada data.') + '</div></div>'; },
    skel(n) { return '<div class="col" style="padding:1rem">' + Array.from({ length: n || 4 }, (_, i) => '<div class="skel" style="width:' + (90 - i * 12) + '%"></div>').join('') + '</div>'; },
    async tombol(btn, fn) { if (!btn || btn.classList.contains('busy')) return; const lama = btn.innerHTML; btn.classList.add('busy'); btn.innerHTML = '<span class="spin"></span>' + (btn.dataset.busy || 'Memproses…'); try { return await fn(); } catch (e) { console.error('[aksi gagal]', e); UI.toast('Aksi gagal diproses di browser: ' + ((e && e.message) || e) + '. Muat ulang halaman lalu coba lagi.', 'bad', 7000); } finally { btn.classList.remove('busy'); btn.innerHTML = lama; } },
    salin(teks) { (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(() => UI.toast('Disalin ke papan klip.'), () => { prompt('Salin teks berikut:', teks); }); },
    badgeStatus(s) {
      const m = { 'Menunggu Verifikasi': 'b-wait', 'Menunggu': 'b-wait', 'Disetujui': 'b-ok', 'Aktif': 'b-ok', 'Terkirim': 'b-ok', 'Terbit': 'b-ok', 'Selesai': 'b-ok', 'Berjalan': 'b-info', 'Antri': 'b-wait',
        'Ditolak': 'b-bad', 'Kedaluwarsa': 'b-bad', 'Gagal': 'b-bad', 'Nonaktif': 'b-mute', 'Dibatalkan': 'b-mute', 'Batal': 'b-mute', 'Draf': 'b-mute', 'Dihentikan': 'b-mute', 'Usang': 'b-wait', 'Belum Terbit': 'b-mute' };
      return '<span class="badge ' + (m[s] || 'b-mute') + '">' + esc(s || '-') + '</span>';
    },
    ava(nama, fotoId, cls) { return '<span class="ava ' + (cls || '') + ' ' + warnaAva(nama) + '" ' + (fotoId ? bg(fotoId, 120) : '') + '>' + (fotoId ? '' : esc(inisial(nama))) + '</span>'; },
    lightbox(src, cap) { UI.modal({ judul: cap || 'Pratinjau', lebar: 'lg', isi: '<img src="' + esc(src) + '" alt="' + esc(cap || '') + '" style="width:100%;border-radius:10px">' }); }
  };
  IKH.UI = UI;

  /* ---------------- Tabel klien (filter/pagination tanpa server) ---------------- */
  IKH.Tabel = function (el, o) {
    const st = { data: o.data || [], q: '', hal: 1, per: o.per || 25, sort: o.sort || null, pilih: new Set(), filter: null };
    const kunci = o.idKey || 'id';
    function hasil() {
      let d = st.data;
      if (st.filter) d = d.filter(st.filter);
      if (st.q) { const q = st.q.toLowerCase(); d = d.filter((r) => (o.cari ? o.cari(r) : JSON.stringify(r)).toLowerCase().indexOf(q) > -1); }
      if (st.sort) { const k = st.sort.k, a = st.sort.asc ? 1 : -1; d = d.slice().sort((x, y) => String(x[k] || '').localeCompare(String(y[k] || ''), 'id', { numeric: true }) * a); }
      return d;
    }
    function render() {
      const d = hasil(), maks = Math.max(1, Math.ceil(d.length / st.per)); if (st.hal > maks) st.hal = maks;
      const awal = (st.hal - 1) * st.per, hlm = d.slice(awal, awal + st.per);
      const semua = hlm.length && hlm.every((r) => st.pilih.has(r[kunci]));
      el.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + (o.pilih ? '<th class="cb"><input type="checkbox" data-all aria-label="Pilih semua di halaman" ' + (semua ? 'checked' : '') + '></th>' : '') +
        o.kolom.map((c) => '<th class="' + (c.sort !== false && c.k ? 'sortable ' : '') + (c.kelas || '') + '" data-k="' + (c.k || '') + '"' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.label) + (st.sort && st.sort.k === c.k ? (st.sort.asc ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr></thead><tbody>' +
        (hlm.length ? hlm.map((r) => '<tr data-id="' + esc(r[kunci]) + '" class="' + (o.onRow ? 'clk ' : '') + (st.pilih.has(r[kunci]) ? 'sel' : '') + '">' + (o.pilih ? '<td class="cb"><input type="checkbox" data-cb aria-label="Pilih" ' + (st.pilih.has(r[kunci]) ? 'checked' : '') + '></td>' : '') +
          o.kolom.map((c) => '<td class="' + (c.kelas || '') + '">' + (c.render ? c.render(r) : esc(r[c.k])) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + (o.kolom.length + (o.pilih ? 1 : 0)) + '">' + UI.kosong(o.kosong || 'Tidak ada data yang cocok.') + '</td></tr>') +
        '</tbody></table></div><div class="pager"><span>' + (d.length ? (awal + 1) + '–' + Math.min(awal + st.per, d.length) + ' dari ' + fmt.angka(d.length) : '0 data') + (st.pilih.size ? ' • <b>' + st.pilih.size + ' dipilih</b>' : '') + '</span>' +
        '<span class="row"><button class="btn btn-ghost btn-xs" data-pg="-1" ' + (st.hal <= 1 ? 'disabled' : '') + ' aria-label="Halaman sebelumnya">' + ic('chevron_left', 'sm') + '</button><span>' + st.hal + ' / ' + maks + '</span><button class="btn btn-ghost btn-xs" data-pg="1" ' + (st.hal >= maks ? 'disabled' : '') + ' aria-label="Halaman berikutnya">' + ic('chevron_right', 'sm') + '</button></span></div>';
      $$('th.sortable', el).forEach((th) => th.onclick = () => { const k = th.dataset.k; st.sort = st.sort && st.sort.k === k ? { k, asc: !st.sort.asc } : { k, asc: true }; render(); });
      $$('[data-pg]', el).forEach((b) => b.onclick = () => { st.hal += +b.dataset.pg; render(); });
      $$('tbody tr[data-id]', el).forEach((tr) => {
        const row = st.data.find((r) => String(r[kunci]) === tr.dataset.id);
        const cb = $('[data-cb]', tr);
        if (cb) cb.onclick = (e) => { e.stopPropagation(); cb.checked ? st.pilih.add(row[kunci]) : st.pilih.delete(row[kunci]); tr.classList.toggle('sel', cb.checked); if (o.onPilih) o.onPilih(api2.terpilih()); render(); };
        if (o.onRow) tr.onclick = (e) => { if (e.target.closest('button,a,input,label')) return; o.onRow(row, e); };
        $$('[data-act]', tr).forEach((b) => b.onclick = (e) => { e.stopPropagation(); if (o.onAksi) o.onAksi(b.dataset.act, row, b); });
      });
      const all = $('[data-all]', el);
      if (all) all.onclick = () => { hlm.forEach((r) => all.checked ? st.pilih.add(r[kunci]) : st.pilih.delete(r[kunci])); if (o.onPilih) o.onPilih(api2.terpilih()); render(); };
      if (o.setelah) o.setelah(d);
    }
    const api2 = {
      set(d) { st.data = d || []; const ada = new Set(st.data.map((r) => r[kunci])); st.pilih.forEach((k) => { if (!ada.has(k)) st.pilih.delete(k); }); render(); },
      cari(q) { st.q = q; st.hal = 1; render(); },
      saring(fn) { st.filter = fn; st.hal = 1; render(); },
      terpilih() { return st.data.filter((r) => st.pilih.has(r[kunci])); },
      pilihSemuaHasil() { hasil().forEach((r) => st.pilih.add(r[kunci])); render(); if (o.onPilih) o.onPilih(api2.terpilih()); },
      kosongkanPilihan() { st.pilih.clear(); render(); if (o.onPilih) o.onPilih([]); },
      hasil, render
    };
    render();
    return api2;
  };

  /* ---------------- Berkas: baca & kompres ---------------- */
  IKH.bacaGambar = function (file, maxPx, kualitas) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Tidak ada berkas.'));
      if (!/^image\//.test(file.type)) return reject(new Error('Pilih berkas gambar (JPG/PNG).'));
      if (file.size > 15 * 1048576) return reject(new Error('Ukuran gambar maksimal 15 MB.'));
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          const m = maxPx || 800, r = Math.min(1, m / Math.max(im.width, im.height));
          const c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          resolve({ nama: file.name.replace(/\.[^.]+$/, '') + '.jpg', tipe: 'image/jpeg', data: c.toDataURL('image/jpeg', kualitas || 0.85) });
        };
        im.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
        im.src = fr.result;
      };
      fr.onerror = () => reject(new Error('Gagal membaca berkas.'));
      fr.readAsDataURL(file);
    });
  };
  IKH.bacaBerkas = function (file, maksMB) {
    if (/^image\//.test(file.type)) return IKH.bacaGambar(file, 1700, 0.82);
    return new Promise((resolve, reject) => {
      if (file.type !== 'application/pdf') return reject(new Error('Format harus PDF atau gambar.'));
      if (file.size > (maksMB || 4) * 1048576) return reject(new Error('Ukuran PDF maksimal ' + (maksMB || 4) + ' MB.'));
      const fr = new FileReader(); fr.onload = () => resolve({ nama: file.name, tipe: 'application/pdf', data: fr.result }); fr.onerror = () => reject(new Error('Gagal membaca berkas.')); fr.readAsDataURL(file);
    });
  };
  IKH.unduhB64 = function (b64, nama, tipe) {
    const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: tipe || 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  IKH.bukaB64 = function (b64, tipe) {
    const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: tipe })); window.open(url, '_blank', 'noopener');
  };

  /* ---------------- Pemuat skrip (lazy, dengan cadangan CDN) ---------------- */
  const _skrip = {};
  IKH.muat = function (urls) {
    urls = [].concat(urls); const k = urls[0];
    if (_skrip[k]) return _skrip[k];
    _skrip[k] = new Promise((resolve, reject) => {
      let i = 0;
      const coba = () => { if (i >= urls.length) { delete _skrip[k]; return reject(new Error('Gagal memuat pustaka. Periksa koneksi.')); } const s = document.createElement('script'); s.src = urls[i++]; s.async = true; s.onload = () => resolve(); s.onerror = () => { s.remove(); coba(); }; document.head.appendChild(s); };
      coba();
    });
    return _skrip[k];
  };
  const CDN = {
    qr: ['js/vendor/qrcode.js'],
    jsqr: ['js/vendor/jsQR.js'],
    xlsx: ['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'],
    jspdf: ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'],
    autotable: ['https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js', 'https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js']
  };
  IKH.CDN = CDN;

  /* ---------------- Masuk dengan Google (v1.9.0, butuh backend v1.7.0) ----------------
     Tombol resmi Google Identity Services. ID token dari Google dikirim ke server (auth.google);
     server memeriksanya ke Google lalu mencocokkan email dengan data anggota yang sudah disetujui. */
  CDN.gsi = ['https://accounts.google.com/gsi/client'];
  const Google = {
    /** Browser bawaan aplikasi lain (WhatsApp, Instagram, Facebook, WebView). Google menolak login di sana. */
    dalamAplikasi() {
      const ua = navigator.userAgent || '';
      const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview|Twitter|Snapchat|WhatsApp/i.test(ua)) return true;
      if (/Android/.test(ua) && /; wv\)/.test(ua)) return true;                     // Android WebView
      if (ios && !/Safari\//.test(ua) && !navigator.standalone) return true;          // iOS WKWebView di dalam aplikasi
      return false;
    },
    android() { return /Android/.test(navigator.userAgent || ''); },
    /** Buka situs ini di Chrome (Android) */
    keChrome() { return 'intent://' + location.host + location.pathname + '#Intent;scheme=https;package=com.android.chrome;end'; },
    /** Client ID dari data beranda (cepat) atau langsung dari server (segar) */
    async clientId(segar) {
      if (!segar && Store.pub && Store.pub.google) return Store.pub.google;
      const r = await api('auth.config', {});
      if (!r.ok) throw new Error(r.code === 'NOACT' ? 'Server belum diperbarui ke versi yang mendukung Masuk dengan Google (backend v1.7.0).' : (r.msg || 'Gagal memeriksa pengaturan login.'));
      if (Store.pub) Store.pub.google = r.data.googleClientId || '';
      return r.data.googleClientId || '';
    },
    /** Pasang tombol resmi "Masuk dengan Google" di elemen el. onToken(idToken) dipanggil setelah pengguna memilih akun. */
    async tombol(el, cid, onToken) {
      await IKH.muat(CDN.gsi);
      const g = window.google && window.google.accounts && window.google.accounts.id;
      if (!g) throw new Error('Pustaka Google tidak termuat.');
      g.initialize({ client_id: cid, callback: (res) => onToken(res && res.credential), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, context: 'signin', itp_support: true });
      el.innerHTML = '';
      g.renderButton(el, { type: 'standard', theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', locale: 'id',
        width: Math.max(220, Math.min(400, Math.floor(el.clientWidth || 320))) });
    },
    keluar() { try { if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect(); } catch (e) { } },
    gmail(e) { return /@(gmail|googlemail)\.com$/i.test(String(e || '').trim()); }
  };
  IKH.Google = Google;

  /* ---------------- QR & KTA ---------------- */
  async function qrBuat(teks) { await IKH.muat(CDN.qr); const q = window.qrcode(0, 'M'); q.addData(teks); q.make(); return q; }
  IKH.qrSvg = async function (teks) { return (await qrBuat(teks)).createSvgTag({ cellSize: 4, margin: 0, scalable: true }); };
  /** Matriks modul QR (true = gelap) untuk digambar di kanvas */
  IKH.qrMatriks = async function (teks) {
    const q = await qrBuat(teks), n = q.getModuleCount(), m = [];
    for (let r = 0; r < n; r++) { const b = []; for (let c = 0; c < n; c++) b.push(q.isDark(r, c)); m.push(b); }
    return m;
  };
  /* ---------------- Jenis anggota (v1.3.0) ----------------
     Semua jenis adalah alumni dengan hak yang sama. Kolom kosong (data lama) = Biasa.
     Luar Biasa: KTA 5 tahun sejak penetapan · Kehormatan: KTA seumur hidup (tanpa tanggal). */
  const JENIS = {
    'Biasa': { kode: 'b', badge: 'b-jn-b', judul: 'ANGGOTA BIASA' },
    'Luar Biasa': { kode: 'lb', badge: 'b-jn-lb', judul: 'ANGGOTA LUAR BIASA' },
    'Kehormatan': { kode: 'kh', badge: 'b-jn-kh', judul: 'ANGGOTA KEHORMATAN' }
  };
  IKH.JENIS = JENIS;
  IKH.jenisAgt = (a) => (a && (a.jenis_anggota === 'Luar Biasa' || a.jenis_anggota === 'Kehormatan')) ? a.jenis_anggota : 'Biasa';
  IKH.seumurHidup = (a) => IKH.jenisAgt(a) === 'Kehormatan';
  IKH.masaTeks = (a, panjang) => IKH.seumurHidup(a) ? 'Seumur hidup' : (a && a.masa_berlaku_kartu ? fmt.tgl(a.masa_berlaku_kartu, panjang) : '-');
  IKH.badgeJenis = (a, ringkas) => { const j = IKH.jenisAgt(a); return '<span class="badge ' + JENIS[j].badge + '">' + (ringkas ? j : 'Anggota ' + j) + '</span>'; };
  /* v1.8.0 — Pengurus: alumni yang menjabat di Struktur & Pengurus (ditentukan server, backend v1.6.0). Bukan jenis anggota:
     jenis & masa berlaku asli tetap; KTA hanya berganti tampilan (hitam–emas, label PENGURUS) selama menjabat. Pembina/Penasehat tidak termasuk. */
  IKH.pengurusAgt = (a) => (a && a.pengurus && typeof a.pengurus === 'object') ? a.pengurus : null;
  IKH.teksPengurus = (p) => (p ? [p.bidang && p.bidang !== p.jabatan ? p.bidang : '', p.periode ? 'Periode ' + p.periode : ''].filter(Boolean).join(' • ') : '');
  IKH.badgePengurus = (a) => { const p = IKH.pengurusAgt(a); return p ? '<span class="badge b-jn-pg" title="' + esc(p.jabatan || 'Pengurus') + '">Pengurus</span>' : ''; };
  /** Baris kv "Jabatan pengurus" (kosong bila bukan pengurus) */
  IKH.kvPengurus = (a, label) => { const p = IKH.pengurusAgt(a); if (!p) return ''; const r = IKH.teksPengurus(p); return '<div>' + (label || 'Jabatan pengurus') + '</div><div><b>' + esc(p.jabatan || 'Pengurus') + '</b>' + (r ? '<div class="small muted">' + esc(r) + '</div>' : '') + '</div>'; };

  /* ---------------- KTA digital (v1.6.0) ----------------
     Kartu hanya digital: tampil di layar (HTML) dan disimpan sebagai gambar/PDF ukuran kartu ID-1 (85,6 × 54 mm).
     Isi keduanya berasal dari Kta.isi() dan warna dari TEMA, sehingga yang dilihat = yang disimpan.
     Tanda tangan ketua diganti pengesahan elektronik: nama & jabatan ketua saat kartu terbit.
     v1.7.0: sisi belakang hanya memuat SATU QR (verifikasi); QR kecil pengesahan & tanggal pengesahan tidak dicetak lagi.
     Siapa yang mengesahkan & kapan tetap tampil di halaman hasil pindai QR (dari basis data, bukan dari gambar kartu). */
  const TEMA = {
    b: { g: ['#183F86', '#0A2A63', '#001640'], dasar: '#0A2A63', lbl: '#A9BCEB', foto: '#2B4B8C' },
    lb: { g: ['#1E6B55', '#0B4A3A', '#05261D'], dasar: '#0B4A3A', lbl: '#A8D5C2', foto: '#2A6B58' },
    kh: { g: ['#8E2A3C', '#6A1525', '#3A0812'], dasar: '#6A1525', lbl: '#E7B3BC', foto: '#8C3443' },
    pg: { g: ['#3B3B3B', '#1C1C1C', '#050505'], dasar: '#1C1C1C', lbl: '#D8C58E', foto: '#2B2B2B' }      // v1.8.0 Pengurus: hitam–emas
  };
  const dua = (n) => String(n).padStart(2, '0');
  /** Penanda "langsung": tanggal & jam berjalan (WITA) — membedakan kartu di aplikasi dari tangkapan layar */
  const jamKini = () => { const w = new Date(Date.now() + 8 * 3600e3); return w.getUTCDate() + ' ' + BLN[w.getUTCMonth()].toUpperCase() + ' ' + w.getUTCFullYear() + ' • ' + dua(w.getUTCHours()) + ':' + dua(w.getUTCMinutes()) + ':' + dua(w.getUTCSeconds()) + ' WITA'; };
  setInterval(() => { const el = document.querySelectorAll('.kta [data-jam]'); if (el.length) { const t = jamKini(); el.forEach((e) => { e.textContent = t; }); } }, 1000);

  const Kta = {
    statusTeks(a) { if (a.status_verifikasi !== 'Disetujui') return 'BELUM TERVERIFIKASI'; if (a.status_anggota === 'Nonaktif') return 'NONAKTIF'; if (!IKH.seumurHidup(a) && a.masa_berlaku_kartu && a.masa_berlaku_kartu < hariIni()) return 'KEDALUWARSA'; return 'AKTIF'; },
    /** Pengesahan kartu: catatan yang dibekukan di data anggota; kartu tanpa catatan memakai Pengaturan saat ini */
    sah(a, st, sah) {
      st = st || {}; sah = sah || {};
      return { oleh: sah.oleh || a.kta_sah_oleh || st.KETUA_NAMA || '', jabatan: sah.jabatan || a.kta_sah_jabatan || st.KETUA_JABATAN || 'Ketua', pada: sah.pada || a.kta_sah_pada || a.tgl_verifikasi || '' };
    },
    /** Semua teks kartu (dipakai tampilan layar DAN gambar unduhan) */
    isi(a, st, sah) {
      st = st || {};
      const J = JENIS[IKH.jenisAgt(a)], pg = IKH.pengurusAgt(a), p = Kta.sah(a, st, sah), nama = String(a.nama || 'NAMA ANGGOTA').toUpperCase();
      return {
        kode: pg ? 'pg' : J.kode, jenis: pg ? 'PENGURUS' : J.judul, status: Kta.statusTeks(a),         // Pengurus: tampilan saja; masa berlaku tetap jenis asli
        org: st.ORG_NAMA || 'DPD IKALLHUBDAT Kalimantan Timur', singkat: st.ORG_SINGKAT || 'IKALLHUBDAT KALTIM',
        nama: nama, nomor: a.id_member || '—',
        nit: (a.nomor_taruna || '-') + ' / ' + (a.angkatan || '-'), prodi: a.prodi || '-',
        seumur: IKH.seumurHidup(a), masa: a.masa_berlaku_kartu ? fmt.tgl(a.masa_berlaku_kartu).toUpperCase() : '—',
        terbit: a.tgl_verifikasi ? 'Terbit ' + fmt.tgl(a.tgl_verifikasi) : '',
        ketentuan: ['1. Kartu ini milik ' + (st.ORG_NAMA || 'organisasi') + ' dan tidak dapat dipindahtangankan.',
          '2. Pindai QR untuk memeriksa status keanggotaan dan pengesahan kartu ini.',
          '3. Bila menemukan kartu ini, mohon kembalikan ke sekretariat.'],
        sahOleh: p.oleh, sahJabatan: p.jabatan, sahPada: p.pada ? fmt.tgl(p.pada, true) : ''
      };
    },
    /** o.langsung = kartu milik sendiri di aplikasi → tampilkan penanda jam berjalan (menggantikan hiasan cip) */
    depan(a, st, o) {
      st = st || {}; o = o || {};
      const x = Kta.isi(a, st), s = x.status;
      return '<div class="kta depan" data-jn="' + x.kode + '" role="img" aria-label="KTA sisi depan ' + esc(a.nama) + ', ' + x.jenis.toLowerCase() + '">' +
        '<div class="hd"><div class="lg" ' + logoBg(st, 160) + '></div><div class="hdt"><div class="t1">KARTU TANDA ANGGOTA</div><div class="t2" data-pas="3.6">' + esc(x.org) + '</div></div></div>' +
        (o.langsung ? '<div class="live" title="Tampil langsung dari aplikasi"><i></i><span data-jam>' + jamKini() + '</span></div>' : '<div class="chipg"></div>') + '<div class="garis"></div>' +
        '<div class="ft' + (a.foto_id ? ' fu' : '') + '" ' + fotoUtuh(a.foto_id, 400) + '>' + (a.foto_id ? '' : ic('person')) + '</div>' +
        '<div class="dt"><div><div class="l">Nama Lengkap</div><div class="v nm" data-pas="4.4">' + esc(x.nama) + '</div></div>' +
        '<div><div class="l">Nomor Anggota</div><div class="v no" data-pas="3.2">' + esc(x.nomor) + '</div></div>' +
        '<div class="dua"><div><div class="l">NOTAR / Angkatan</div><div class="v" data-pas="3">' + esc(x.nit) + '</div></div><div><div class="l">Program Studi</div><div class="v pr" data-pas="3">' + esc(x.prodi) + '</div></div></div></div>' +
        '<div class="bw"><span>' + (x.seumur ? 'BERLAKU <b>SEUMUR HIDUP</b>' : 'BERLAKU S.D. <b>' + esc(x.masa) + '</b>') + '</span>' +
        '<span class="kn"><span class="jn">' + x.jenis + '</span><span class="st ' + (s === 'AKTIF' ? '' : 'bad') + '">' + s + '</span></span></div></div>';
    },
    /** o = { sah, qr } — qr berupa SVG (boleh kosong, lalu diisi Kta.pasang) */
    belakang(a, st, o) {
      st = st || {}; o = o || {};
      const x = Kta.isi(a, st, o.sah);
      return '<div class="kta belakang" data-jn="' + x.kode + '" role="group" aria-label="KTA sisi belakang: QR verifikasi, ketentuan, dan pengesahan elektronik">' +
        '<div class="pita"><span data-pas="2.6">' + esc(x.singkat) + '</span></div>' +
        '<button type="button" class="qr" data-qr="v" aria-label="Perbesar QR verifikasi keanggotaan">' + (o.qr || '') + '</button><div class="qrl">PINDAI UNTUK VERIFIKASI</div>' +
        '<div class="qrn" data-pas="2.1">' + esc(x.nomor) + '</div><div class="qrt">' + esc(x.terbit) + '</div>' +
        '<div class="kt"><b>KETENTUAN</b>' + x.ketentuan.map((k) => '<div>' + esc(k) + '</div>').join('') + '</div>' +
        '<div class="sg"></div>' +
        '<div class="sah"><div class="s1">DISAHKAN SECARA ELEKTRONIK</div><div class="s2" data-pas="2.4">' + esc(x.sahJabatan) + ',</div><div class="s3" data-pas="3">' + esc(x.sahOleh || '(nama ketua belum diisi)') + '</div></div>' +
        '<div class="bwh"></div></div>';
    },
    /** Isi QR verifikasi pada semua sisi belakang di dalam el. d = { qr } (tautan dari server). */
    async pasang(el, d) {
      const blk = $$('.kta.belakang', el); if (!blk.length || !d) return;
      const isi = async (sel, teks) => {
        if (!teks) return;
        try { const svg = await IKH.qrSvg(teks); blk.forEach((b) => { const q = $(sel, b); if (q) { q.innerHTML = svg; q.dataset.teks = teks; } }); } catch (e) { }
      };
      await isi('.qr', d.qr);
    }
  };
  IKH.Kta = Kta;

  /* v1.8.1 — Teks KTA satu baris: bila terlalu panjang, ukuran huruf diperkecil otomatis (paling kecil 45% dari ukuran normal)
     dan TIDAK PERNAH dipotong dengan "…". Elemen bertanda data-pas="<ukuran normal, cqw>".
     Huruf memakai cqw (persen lebar kartu), sehingga hasil pengecilan berlaku di kartu sebesar apa pun (HP, laptop, layar penuh, cetak).
     Diukur ulang otomatis saat kartu muncul, berubah ukuran, dan setelah font web selesai dimuat — berlaku di semua tempat kartu tampil.
     Bila pada 45% masih belum muat (data sangat panjang), teks turun ke baris berikutnya di DALAM kartu: tetap utuh, tidak keluar tepi. */
  const PAS_MIN = .45;
  const pasSatu = (el) => {
    const dasar = parseFloat(el.dataset.pas), w = el.clientWidth;
    if (!dasar || !w) return;                                        // kartu belum tampil → diukur saat muncul
    el.classList.remove('pas-bungkus'); el.style.fontSize = dasar + 'cqw';
    let uk = dasar, sw = el.scrollWidth;
    for (let i = 0; i < 5 && sw > w && uk > dasar * PAS_MIN; i++) {
      uk = Math.max(dasar * PAS_MIN, uk * w / sw * .985);
      el.style.fontSize = uk.toFixed(3) + 'cqw'; sw = el.scrollWidth;
    }
    if (sw > w) el.classList.add('pas-bungkus');
    el.dataset.pasRasio = (uk / dasar).toFixed(3);
  };
  IKH.pasKartu = (root) => { const r = root && root.querySelectorAll ? root : document; if (r.matches && r.matches('[data-pas]')) pasSatu(r); r.querySelectorAll('[data-pas]').forEach(pasSatu); };
  if (window.ResizeObserver && window.MutationObserver) {
    const ro = new ResizeObserver((es) => es.forEach((e) => { if (!e.target.isConnected) ro.unobserve(e.target); else IKH.pasKartu(e.target); }));
    const amati = (n) => { if (n.nodeType !== 1) return; if (n.classList.contains('kta')) ro.observe(n); else if (n.firstElementChild) n.querySelectorAll('.kta').forEach((k) => ro.observe(k)); };
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(amati))).observe(document.documentElement, { childList: true, subtree: true });
    document.querySelectorAll('.kta').forEach((k) => ro.observe(k));
  }
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(() => IKH.pasKartu());
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => IKH.pasKartu());
  }

  /* Ketuk QR di kartu → QR diperbesar (memudahkan pemindaian, dan menghindari pemindai menangkap QR yang salah) */
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest && e.target.closest('.kta [data-qr]');
    if (!b || !b.querySelector('svg')) return;
    e.preventDefault(); e.stopPropagation();
    Kartu.perbesarQr(b.innerHTML, 'QR Verifikasi Keanggotaan', 'Pindai untuk memeriksa status keanggotaan dan pengesahan kartu langsung ke basis data organisasi.');
  });

  const GOLD = '#F6C12B';
  const F_HEAD = '"Plus Jakarta Sans", Inter, system-ui, sans-serif', F_BODY = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', F_MONO = 'ui-monospace, Menlo, monospace';
  const muatGambar = (src) => new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const Kartu = {
    MM: [85.6, 54], LEBAR: 2022,                                   // ID-1 pada ±600 dpi → 2022 × 1276 px
    async siapFont() {
      if (!document.fonts || !document.fonts.load) return;
      const perlu = ['800 20px "Plus Jakarta Sans"', '400 20px Inter', '600 20px Inter', '700 20px Inter'];
      try { await Promise.race([Promise.all(perlu.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { }
    },
    /** Ambil bahan kartu dari server (pas foto & logo sebagai data URI agar kanvas bisa diekspor). idRecord diisi = Pengurus. */
    ambil(idRecord) { return idRecord ? api('adm.kartu', { id_record: idRecord }) : api('agt.kartu', {}); },
    /** Respons server → bahan gambar (matriks QR + objek gambar) */
    async bahan(d) {
      const st = d.setting || {};
      const [qr, foto, logo] = await Promise.all([IKH.qrMatriks(d.qr), muatGambar(d.foto), muatGambar(d.logo || 'img/logo.png'), Kartu.siapFont()]);
      return { a: d.anggota, st: st, sah: d.sah, qr: qr, foto: foto, logo: logo };
    },
    /** Gambar satu sisi kartu. Satuan tata letak = 1% lebar kartu (sama dengan cqw di style.css).
     *  o.sudut === false → sudut siku & tanpa bingkai (halaman PDF); o.lebar = lebar piksel. */
    kanvas(sisi, B, o) {
      o = o || {};
      const W = o.lebar || Kartu.LEBAR, H = Math.round(W * 54 / 85.6), u = W / 100, Hc = H / u;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'), x = Kta.isi(B.a, B.st, B.sah), T = TEMA[x.kode];
      const rr = (X, Y, w, h, r) => { g.beginPath(); g.moveTo(X + r, Y); g.arcTo(X + w, Y, X + w, Y + h, r); g.arcTo(X + w, Y + h, X, Y + h, r); g.arcTo(X, Y + h, X, Y, r); g.arcTo(X, Y, X + w, Y, r); g.closePath(); };
      const font = (bobot, px, fam) => { g.font = bobot + ' ' + (px * u).toFixed(2) + 'px ' + fam; };
      const lebar = (s, ls) => { if (!ls) return g.measureText(s).width; let w = 0; for (const ch of s) w += g.measureText(ch).width + ls * u; return w; };
      const tulis = (s, X, Y, ls) => { if (!ls) { g.fillText(s, X, Y); return; } let px = X; for (const ch of s) { g.fillText(ch, px, Y); px += g.measureText(ch).width + ls * u; } };
      /** Bungkus per kata tanpa memotong teks ("…" tidak dipakai). Kata yang lebih lebar dari baris dipecah per huruf. */
      const bungkus = (s, maks, ls) => {
        const baris = [], pas = (t) => lebar(t, ls) <= maks; let kini = '';
        String(s).split(/\s+/).filter(Boolean).forEach((k) => {
          const coba = kini ? kini + ' ' + k : k;
          if (pas(coba)) { kini = coba; return; }
          if (kini) baris.push(kini);
          kini = '';
          for (const ch of k) { if (kini && !pas(kini + ch)) { baris.push(kini); kini = ch; } else kini += ch; }
        });
        if (kini) baris.push(kini);
        return baris.length ? baris : [''];
      };
      /** v1.8.1 — sama dengan pasSatu() di layar: satu baris, huruf diperkecil seperlunya (min 45%), tanpa "…".
       *  Bila pada 45% masih belum muat → dibungkus di ukuran 45% (tetap di dalam kartu). lsEm = jarak huruf (em). */
      const muat = (s, maks, bobot, px, fam, lsEm) => {
        s = String(s); let p = px;
        const ukur = () => { font(bobot, p, fam); return lebar(s, lsEm ? p * lsEm : 0); };
        let w = ukur();
        for (let i = 0; i < 5 && w > maks && p > px * PAS_MIN; i++) { p = Math.max(px * PAS_MIN, p * maks / w * .985); w = ukur(); }
        const ls = lsEm ? p * lsEm : 0;
        return { px: p, rasio: p / px, ls: ls, bobot: bobot, fam: fam, baris: w <= maks ? [s] : bungkus(s, maks, ls) };
      };
      /** Gambar hasil muat(): satu baris di tengah slot setinggi `slot`; bila terbungkus, tinggi baris = 1,2 × huruf (sama dengan layar).
       *  kotak = tinggi area untuk penempatan tengah vertikal (opsional). Mengembalikan tinggi yang terpakai (cqw). */
      const blok = (m, X, Y, slot, kotak) => {
        const t = m.baris.length > 1 ? m.px * 1.2 : slot, h = t * m.baris.length;
        if (kotak) Y += (kotak - h) / 2;
        font(m.bobot, m.px, m.fam); m.baris.forEach((s, i) => tulis(s, X, (Y + t * i + t / 2) * u, m.ls));
        return h;
      };
      const tata = c.tata = {};                                          // ringkasan ukuran huruf (untuk pengujian)
      const pas = (im, X, Y, w, h, tutupi) => { const s = (tutupi ? Math.max : Math.min)(w * u / im.width, h * u / im.height), dw = im.width * s, dh = im.height * s; g.drawImage(im, X * u + (w * u - dw) / 2, Y * u + (h * u - dh) / 2, dw, dh); };
      /* Latar kabur untuk pas foto utuh: foto diperkecil ke kanvas mungil lalu diperbesar lagi (berjalan di semua browser, tanpa ctx.filter) */
      const kabur = (im, X, Y, w, h) => {
        const k = document.createElement('canvas'); k.width = 10; k.height = Math.max(4, Math.round(10 * h / w));
        const kg = k.getContext('2d'), s = Math.max(k.width / im.width, k.height / im.height), dw = im.width * s, dh = im.height * s;
        kg.imageSmoothingEnabled = true; kg.drawImage(im, (k.width - dw) / 2, (k.height - dh) / 2, dw, dh);
        g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(k, X * u - w * u * .06, Y * u - h * u * .06, w * u * 1.12, h * u * 1.12); g.restore();
      };
      const kotakQr = (m, X, Y, S, pad, r, garis) => {
        rr(X * u, Y * u, S * u, S * u, r * u); g.fillStyle = '#fff'; g.fill();
        g.lineWidth = .3 * u; g.strokeStyle = garis; rr((X + .15) * u, (Y + .15) * u, (S - .3) * u, (S - .3) * u, Math.max(0, r - .15) * u); g.stroke();
        if (!m || !m.length) return;
        const n = m.length, x0 = (X + pad) * u, y0 = (Y + pad) * u, sel = (S - 2 * pad) * u / n, px = (i, o0) => Math.round(o0 + i * sel);
        g.fillStyle = '#000';
        for (let r2 = 0; r2 < n; r2++) for (let c2 = 0; c2 < n; c2++) if (m[r2][c2]) g.fillRect(px(c2, x0), px(r2, y0), px(c2 + 1, x0) - px(c2, x0), px(r2 + 1, y0) - px(r2, y0));
      };
      const sudut = o.sudut !== false, rad = 3.18 / 85.6 * W;            // radius sudut kartu ID-1 ≈ 3,18 mm
      g.textBaseline = 'middle'; g.textAlign = 'left';
      if (sudut) { rr(0, 0, W, H, rad); g.clip(); }

      if (sisi === 'depan') {
        // latar: radial-gradient(120% 120% at 100% 0%) + garis diagonal halus
        g.save(); g.translate(W, 0); g.scale(1.2 * W, 1.2 * H);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, T.g[0]); gr.addColorStop(.45, T.g[1]); gr.addColorStop(1, T.g[2]);
        g.fillStyle = gr; g.fillRect(-1, 0, 1, 1); g.restore();
        g.fillStyle = 'rgba(255,255,255,.025)';
        const per = 1.66 * Math.SQRT2 * u, tb = .37 * Math.SQRT2 * u;
        for (let d = 0; d < W + H; d += per) { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + tb, 0); g.lineTo(0, d + tb); g.lineTo(0, d); g.closePath(); g.fill(); }
        // kepala: logo + judul
        const xT = 18.1 * u;
        const t2 = tata.org = muat(x.org, 76.9 * u, 800, 3.6, F_HEAD);
        const hT = 3.45 + (t2.baris.length > 1 ? t2.px * 1.2 * t2.baris.length : 4.14), hHd = Math.max(10.5, hT), yT = 4.5 + (hHd - hT) / 2;
        if (B.logo) pas(B.logo, 5, 4.5 + (hHd - 10.5) / 2, 10.5, 10.5, false);
        font(800, 2.3, F_BODY); g.fillStyle = GOLD; tulis('KARTU TANDA ANGGOTA', xT, (yT + 1.725) * u, 2.3 * .12);
        g.fillStyle = '#fff'; blok(t2, xT, yT + 3.45, 4.14);
        // hiasan cip
        const cg = g.createLinearGradient(87.5 * u, 5 * u, 95 * u, 10.6 * u); cg.addColorStop(0, '#F9D86A'); cg.addColorStop(1, '#D9A514');
        rr(87.5 * u, 5 * u, 7.5 * u, 5.6 * u, 1 * u); g.fillStyle = cg; g.fill();
        g.lineWidth = .3 * u; g.strokeStyle = 'rgba(0,0,0,.1)'; rr(87.65 * u, 5.15 * u, 7.2 * u, 5.3 * u, .85 * u); g.stroke();
        // garis emas
        const lg = g.createLinearGradient(5 * u, 0, 95 * u, 0); lg.addColorStop(0, GOLD); lg.addColorStop(1, 'rgba(246,193,43,.1)');
        g.fillStyle = lg; g.fillRect(5 * u, 17 * u, 90 * u, .25 * u);
        // pas foto
        rr(5 * u, 20.5 * u, 20 * u, 25 * u, 1.6 * u); g.fillStyle = T.foto; g.fill();
        if (B.foto) { g.save(); rr(5 * u, 20.5 * u, 20 * u, 25 * u, 1.6 * u); g.clip(); kabur(B.foto, 5, 20.5, 20, 25); pas(B.foto, 5, 20.5, 20, 25, false); g.restore(); }
        else { g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(15 * u, 30.2 * u, 3.4 * u, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(15 * u, 39.6 * u, 6.2 * u, 4.4 * u, 0, Math.PI, 0); g.fill(); }
        g.lineWidth = .45 * u; g.strokeStyle = 'rgba(255,255,255,.85)'; rr(5.225 * u, 20.725 * u, 19.55 * u, 24.55 * u, 1.4 * u); g.stroke();
        // data
        const xD = 29 * u, wD = 66 * u; let y = 20;
        const label = (s, X, Y) => { font(600, 1.9, F_BODY); g.fillStyle = T.lbl; tulis(s, X, (Y + 1.425) * u, 1.9 * .09); };
        label('NAMA LENGKAP', xD, y); y += 2.85;
        const nm = tata.nama = muat(x.nama, wD, 800, 4.4, F_HEAD);
        g.fillStyle = '#fff'; y += blok(nm, xD, y, 5.28) + 1.2;
        label('NOMOR ANGGOTA', xD, y); y += 2.85;
        const no = tata.nomor = muat(x.nomor, wD, 600, 3.2, F_MONO, .04);
        g.fillStyle = GOLD; y += blok(no, xD, y, 3.84) + 1.2;
        label('NOTAR / ANGKATAN', xD, y); label('PROGRAM STUDI', xD + 26 * u, y); y += 2.85;      // kolom 24 + sela 2 + 40
        const nit = tata.nit = muat(x.nit, 24 * u, 600, 3, F_BODY), pr = tata.prodi = muat(x.prodi, 40 * u, 600, 3, F_BODY);
        g.fillStyle = '#fff'; blok(nit, xD, y, 3.6); blok(pr, xD + 26 * u, y, 3.6);
        // kaki: masa berlaku + jenis anggota (status tidak dicetak: gambar tersimpan bisa usang, status ada di pindai QR)
        const yB = Hc - 3.6, yC = yB - 2.075, ls = 2.1 * .06;
        g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(5 * u, (yB - 6.35) * u, 90 * u, .2 * u);
        const awal = x.seumur ? 'BERLAKU ' : 'BERLAKU S.D. ';
        font(400, 2.1, F_BODY); g.fillStyle = T.lbl; tulis(awal, 5 * u, yC * u, ls); const wA = lebar(awal, ls);
        font(700, 2.1, F_MONO); g.fillStyle = GOLD; tulis(x.seumur ? 'SEUMUR HIDUP' : x.masa, 5 * u + wA, yC * u, ls);
        font(800, 2.1, F_BODY); const lsJ = 2.1 * .08, wP = lebar(x.jenis, lsJ) + 3.6 * u, xP = 95 * u - wP;
        rr(xP, (yC - 2.075) * u, wP, 4.15 * u, 2.075 * u); g.fillStyle = GOLD; g.fill();
        g.fillStyle = T.dasar; tulis(x.jenis, xP + 1.8 * u, yC * u, lsJ);
      } else {
        const TEKS = '#1A2233', REDUP = '#55647C', TEPI = '#E2E6ED';
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
        g.fillStyle = T.dasar; g.fillRect(0, 0, W, 9 * u);
        const pt = tata.singkat = muat(x.singkat, 90 * u, 800, 2.6, F_BODY, .14);
        g.fillStyle = GOLD; blok(pt, 5 * u, 0, 9, 9);
        // QR 1 — verifikasi keanggotaan
        kotakQr(B.qr, 5, 13, 28, 1.5, 2, TEPI);
        g.textAlign = 'center';
        font(600, 1.9, F_BODY); g.fillStyle = REDUP; g.fillText('PINDAI UNTUK VERIFIKASI', 19 * u, (42.5 + 1.425) * u);
        const qn = tata.qrNomor = muat(x.nomor, 28 * u, 600, 2.1, F_MONO);
        g.fillStyle = TEKS; blok(qn, 19 * u, 45.3, 3);
        if (x.terbit) { font(400, 1.8, F_BODY); g.fillStyle = REDUP; g.fillText(x.terbit, 19 * u, (48.4 + 1.35) * u); }
        g.textAlign = 'left';
        // ketentuan
        let y = 13;
        font(700, 2.4, F_BODY); g.fillStyle = T.dasar; tulis('KETENTUAN', 38 * u, (y + 1.68) * u, 2.4 * .06); y += 3.36 + .6;
        font(400, 2, F_BODY); g.fillStyle = REDUP;
        let sisa = 7;
        // ketentuan = kalimat biasa (boleh beberapa baris), maksimal 7 baris seperti di layar
        x.ketentuan.forEach((k) => { bungkus(k, 57 * u).forEach((s) => { if (sisa-- > 0) { g.fillText(s, 38 * u, (y + 1.4) * u); y += 2.8; } }); });
        // pengesahan elektronik (v1.7.0: teks saja — tanpa QR kecil & tanggal): nama & jabatan ketua saat kartu disahkan
        g.fillStyle = TEPI; g.fillRect(38 * u, 37.8 * u, 57 * u, .2 * u);
        const jb = tata.sahJabatan = muat(x.sahJabatan + ',', 57 * u, 400, 2.4, F_BODY), nama = tata.sahOleh = muat(x.sahOleh || '(nama ketua belum diisi)', 57 * u, 800, 3, F_BODY);
        const tj = jb.baris.length > 1 ? jb.px * 1.2 * jb.baris.length : 3.36, tn = nama.baris.length > 1 ? nama.px * 1.2 * nama.baris.length : 3.6;
        let ys = 39 + (19.6 - (2.85 + .6 + tj + tn)) / 2;
        font(800, 1.9, F_BODY); g.fillStyle = T.dasar; tulis('DISAHKAN SECARA ELEKTRONIK', 38 * u, (ys + 1.425) * u, 1.9 * .07); ys += 2.85 + .6;
        g.fillStyle = REDUP; ys += blok(jb, 38 * u, ys, 3.36);
        g.fillStyle = TEKS; blok(nama, 38 * u, ys, 3.6);
        // pita emas bawah + bingkai tipis
        g.fillStyle = GOLD; g.fillRect(0, H - 3 * u, W, 3 * u);
        if (sudut) { g.lineWidth = .3 * u; g.strokeStyle = TEPI; rr(.15 * u, .15 * u, W - .3 * u, H - .3 * u, rad - .15 * u); g.stroke(); }
      }
      return c;
    },
    keBlob(c, tipe, mutu) { return new Promise((res) => c.toBlob(res, tipe || 'image/png', mutu)); },
    /** Dialog "Simpan Kartu": gambar depan & belakang (PNG) + PDF ukuran kartu 2 halaman. idRecord diisi = Pengurus. */
    async simpan(idRecord) {
      if (IKH.butuhServer('1.4.0', 'Kartu digital')) return;
      const m = UI.muat('Menyiapkan kartu…');
      let B, url = [];
      try {
        const r = await Kartu.ambil(idRecord);
        if (!r.ok) { UI.toast(r.msg || 'Kartu tidak dapat disiapkan.', 'bad', 6000); return; }
        B = await Kartu.bahan(r.data);
        const blob = await Promise.all([Kartu.keBlob(Kartu.kanvas('depan', B)), Kartu.keBlob(Kartu.kanvas('belakang', B))]);
        if (!blob[0] || !blob[1]) throw new Error('Browser tidak dapat membuat gambar kartu.');
        url = blob.map((b) => URL.createObjectURL(b));
        Kartu._blob = blob;
      } catch (e) { console.error('[kartu]', e); UI.toast('Kartu gagal disiapkan: ' + ((e && e.message) || e), 'bad', 7000); return; }
      finally { m.tutup(); }
      const dasar = 'KTA-' + String(B.a.id_member || 'anggota').replace(/[^\w.-]+/g, '_');
      const berkas = () => [new File([Kartu._blob[0]], dasar + '-depan.png', { type: 'image/png' }), new File([Kartu._blob[1]], dasar + '-belakang.png', { type: 'image/png' })];
      let bisaBagi = false; try { bisaBagi = !!(navigator.canShare && navigator.canShare({ files: berkas() })); } catch (e) { }
      await UI.modal({
        judul: 'Simpan Kartu — ' + (B.a.nama || ''), lebar: 'lg',
        isi: '<div class="simpan-kartu"><figure><img id="sk-d" src="' + url[0] + '" alt="KTA sisi depan"><figcaption>Sisi depan</figcaption><a class="btn btn-gold btn-sm" id="sk-ud" download="' + esc(dasar) + '-depan.png" href="' + url[0] + '">' + ic('download', 'sm') + 'Simpan gambar depan</a></figure>' +
          '<figure><img id="sk-b" src="' + url[1] + '" alt="KTA sisi belakang"><figcaption>Sisi belakang</figcaption><a class="btn btn-gold btn-sm" id="sk-ub" download="' + esc(dasar) + '-belakang.png" href="' + url[1] + '">' + ic('download', 'sm') + 'Simpan gambar belakang</a></figure></div>' +
          '<div class="row wrap mt"><button class="btn btn-ghost" id="sk-pdf" type="button" data-busy="Membuat PDF…">' + ic('picture_as_pdf', 'sm') + 'Simpan PDF ukuran kartu</button>' +
          (bisaBagi ? '<button class="btn btn-ghost" id="sk-bagi" type="button">' + ic('share', 'sm') + 'Bagikan / simpan ke galeri</button>' : '') + '</div>' +
          '<div class="alert info small mt">' + ic('info', 'sm') + '<div>Ukuran kartu identitas standar (85,6 × 54 mm · ' + Kartu.LEBAR + ' × ' + Math.round(Kartu.LEBAR * 54 / 85.6) + ' piksel). Di iPhone: tekan lama gambar lalu pilih <b>Simpan ke Foto</b>.<br>Gambar tersimpan tidak ikut berubah bila kartu diperpanjang atau dinonaktifkan — status terkini selalu mengikuti hasil pindai QR.</div></div>',
        tombol: [{ teks: 'Tutup' }],
        onBuka: (md) => {
          $('#sk-pdf', md).onclick = (e) => UI.tombol(e.currentTarget, () => Kartu.pdf(B, dasar));
          if (bisaBagi) $('#sk-bagi', md).onclick = async () => { try { await navigator.share({ files: berkas(), title: 'KTA ' + (B.a.id_member || '') }); } catch (e) { if (e && e.name !== 'AbortError') UI.toast('Tidak dapat membuka menu bagikan di perangkat ini.', 'warn'); } };
        }
      });
      url.forEach((x) => URL.revokeObjectURL(x)); Kartu._blob = null;
    },
    /** PDF 2 halaman berukuran persis kartu ID-1 (85,6 × 54 mm), sudut siku (halaman = kartu). */
    async pdf(B, dasar) {
      await IKH.muat(CDN.jspdf);
      const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: Kartu.MM, compress: true });
      doc.addImage(Kartu.kanvas('depan', B, { sudut: false }).toDataURL('image/jpeg', .93), 'JPEG', 0, 0, Kartu.MM[0], Kartu.MM[1], 'depan', 'FAST');
      doc.addPage(Kartu.MM, 'landscape');
      doc.addImage(Kartu.kanvas('belakang', B, { sudut: false }).toDataURL('image/png'), 'PNG', 0, 0, Kartu.MM[0], Kartu.MM[1], 'belakang', 'FAST');
      doc.setProperties({ title: 'KTA ' + (B.a.id_member || ''), subject: 'Kartu Tanda Anggota digital', creator: 'SIM IKALLHUBDAT v' + VERSI });
      Kartu._pdfInfo = { halaman: doc.internal.getNumberOfPages(), lebar: +doc.internal.pageSize.getWidth().toFixed(2), tinggi: +doc.internal.pageSize.getHeight().toFixed(2) };
      doc.save(dasar + '.pdf');
      UI.toast('PDF kartu disimpan.');
    },
    /** Mode layar penuh untuk diperlihatkan dari ponsel. d = data boot anggota { anggota, setting, qr, sah }.
     *  Di layar tegak kartu diputar 90° supaya memenuhi layar. */
    tunjuk(d) {
      const a = d.anggota, st = d.setting || {};
      const sc = document.createElement('div'); sc.className = 'kta-layar'; sc.setAttribute('role', 'dialog'); sc.setAttribute('aria-modal', 'true'); sc.setAttribute('aria-label', 'KTA layar penuh');
      sc.innerHTML = '<div class="kl-atas"><span>' + esc(st.ORG_SINGKAT || 'IKALLHUBDAT') + ' • KTA Digital</span><button type="button" class="kl-x" data-x aria-label="Tutup layar penuh">' + ic('close') + '</button></div>' +
        '<div class="kl-panggung"><div class="kl-kartu kta-flip">' + Kta.depan(a, st, { langsung: true }) + Kta.belakang(a, st, { sah: d.sah }).replace('class="kta belakang"', 'class="kta belakang off"') + '</div></div>' +
        '<div class="kl-bawah"><button type="button" class="btn btn-gold" data-balik>' + ic('flip') + '<span>Lihat sisi belakang</span></button><span class="kl-ket">Ketuk QR untuk memperbesar</span></div>';
      document.body.appendChild(sc);
      const lama = document.body.style.overflow; document.body.style.overflow = 'hidden';
      const kartu = $('.kl-kartu', sc), panggung = $('.kl-panggung', sc);
      const ukur = () => {
        const w = panggung.clientWidth, h = panggung.clientHeight, rasio = 85.6 / 54, tegak = h > w * 1.15;
        const lebarKartu = tegak ? Math.min(h * .95, w * .95 * rasio) : Math.min(w * .95, h * .95 * rasio);
        kartu.style.width = Math.floor(lebarKartu) + 'px'; kartu.classList.toggle('putar', tegak);
      };
      ukur(); window.addEventListener('resize', ukur);
      let kunci = null; try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((k) => { kunci = k; }, () => { }); } catch (e) { }
      const tutup = () => { sc.remove(); document.body.style.overflow = lama; window.removeEventListener('resize', ukur); document.removeEventListener('keydown', key); window.removeEventListener('hashchange', tutup); try { if (kunci) kunci.release(); } catch (e) { } };
      const key = (e) => { if (e.key === 'Escape' && !$('.qr-besar')) tutup(); };
      document.addEventListener('keydown', key); window.addEventListener('hashchange', tutup);
      $('[data-x]', sc).onclick = tutup;
      $('[data-balik]', sc).onclick = (e) => {
        const blk = $('.kta.belakang', kartu), dpn = $('.kta.depan', kartu), keBelakang = blk.classList.contains('off');
        blk.classList.toggle('off', !keBelakang); dpn.classList.toggle('off', keBelakang);
        $('span', e.currentTarget).textContent = keBelakang ? 'Lihat sisi depan' : 'Lihat sisi belakang';
      };
      Kta.pasang(sc, d);
      $('[data-x]', sc).focus();
      return { tutup: tutup };
    },
    perbesarQr(svg, judul, ket) {
      const lama = $('.qr-besar'); if (lama) lama.remove();
      const sc = document.createElement('div'); sc.className = 'qr-besar'; sc.setAttribute('role', 'dialog'); sc.setAttribute('aria-modal', 'true'); sc.setAttribute('aria-label', judul);
      sc.innerHTML = '<div class="qb"><div class="qb-j">' + esc(judul) + '</div><div class="qb-q">' + svg + '</div><p>' + esc(ket || '') + '</p><button type="button" class="btn btn-primary" data-x>Tutup</button></div>';
      document.body.appendChild(sc);
      const tutup = () => { sc.remove(); document.removeEventListener('keydown', key, true); };
      const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); tutup(); } };
      document.addEventListener('keydown', key, true);
      sc.addEventListener('click', (e) => { if (e.target === sc || e.target.closest('[data-x]')) tutup(); });
      $('[data-x]', sc).focus();
    }
  };
  IKH.Kartu = Kartu;

  /* ---------------- Ekspor Excel / PDF ---------------- */
  IKH.Ekspor = {
    async excel(rows, nama, judulSheet) {
      if (!rows.length) return UI.toast('Tidak ada data untuk diekspor.', 'warn');
      const m = UI.muat('Menyiapkan Excel…');
      try { await IKH.muat(CDN.xlsx); const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = Object.keys(rows[0]).map((k) => ({ wch: Math.min(40, Math.max(k.length + 2, ...rows.slice(0, 200).map((r) => String(r[k] == null ? '' : r[k]).length + 1))) })); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, (judulSheet || 'Data').slice(0, 30)); XLSX.writeFile(wb, nama + '.xlsx'); }
      catch (e) { UI.toast(e.message, 'bad'); } finally { m.tutup(); }
    },
    async pdf(o) {
      if (!o.rows.length) return UI.toast('Tidak ada data untuk diekspor.', 'warn');
      const m = UI.muat('Menyiapkan PDF…');
      try {
        await IKH.muat(CDN.jspdf); await IKH.muat(CDN.autotable);
        const doc = new window.jspdf.jsPDF({ orientation: o.orientasi || 'landscape', unit: 'mm', format: 'a4' });
        const w = doc.internal.pageSize.getWidth();
        doc.setFillColor(10, 42, 99); doc.rect(0, 0, w, 20, 'F'); doc.setFillColor(246, 193, 43); doc.rect(0, 20, w, 1.2, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text(o.judul || 'Laporan', 12, 9);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(o.sub || '', 12, 15);
        doc.autoTable({ startY: 26, head: [o.kolom.map((k) => k.label)], body: o.rows.map((r) => o.kolom.map((k) => String(r[k.k] == null ? '' : r[k.k]))), styles: { fontSize: 7.5, cellPadding: 1.6 }, headStyles: { fillColor: [10, 42, 99], textColor: 255 }, alternateRowStyles: { fillColor: [247, 248, 250] },
          didDrawPage: () => { doc.setFontSize(7.5); doc.setTextColor(120); doc.text('Dicetak ' + fmt.waktu(new Date().toISOString()) + ' • SIM IKALLHUBDAT Kaltim • Hal. ' + doc.internal.getNumberOfPages(), 12, doc.internal.pageSize.getHeight() - 6); } });
        doc.save(o.nama + '.pdf');
      } catch (e) { UI.toast(e.message, 'bad'); } finally { m.tutup(); }
    }
  };

  /* ---------------- Router ---------------- */
  const Router = {
    rute: [],
    add(pola, fn, o) { const keys = []; const re = new RegExp('^' + pola.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$'); this.rute.push({ re, keys, fn, o: o || {} }); },
    go(p) { if (location.hash === '#' + p) this.jalan(); else location.hash = '#' + p; },
    parse() { const h = decodeURI(location.hash.slice(1)) || '/'; const i = h.indexOf('?'); return { path: i > -1 ? h.slice(0, i) : h, q: new URLSearchParams(i > -1 ? h.slice(i + 1) : '') }; },
    async jalan() {
      const { path, q } = this.parse();
      for (const r of this.rute) {
        const m = r.re.exec(path); if (!m) continue;
        const p = {}; r.keys.forEach((k, i) => { p[k] = decodeURIComponent(m[i + 1]); });
        if (r.o.peran) {
          const me = Sesi.me;
          if (!me) { LS.set('balik', location.hash); return this.go('/masuk'); }
          if (me.wajib && path !== '/ganti-sandi') return this.go('/ganti-sandi');
          const ganda = r.o.pengurusBoleh && me.peran === 'pengurus' && !me.darurat;
          if (r.o.peran !== me.peran && !ganda) return this.go(me.peran === 'pengurus' ? '/admin' : '/anggota');
        }
        try { await r.fn(p, q); } catch (e) { console.error(e); UI.toast('Gagal membuka halaman: ' + e.message, 'bad'); }
        document.dispatchEvent(new CustomEvent('ikh:rute', { detail: path }));
        return;
      }
      this.go('/');
    }
  };
  IKH.Router = Router;
  /* modul dimuat saat pertama dibutuhkan (publik ringan, panel dimuat terpisah) */
  IKH.modul = function (nama, hal) {
    return async function (p, q) {
      if (!IKH[nama]) {
        const m = $('#app-load'); if (m) m.classList.remove('hide');
        try {
          if (nama === 'Admin2' && !IKH.Admin) await IKH.muat(['js/admin.js?v=' + VERSI]);
          await IKH.muat(['js/' + nama.toLowerCase() + '.js?v=' + VERSI]);
        } finally { if (m) m.classList.add('hide'); }
      }
      return IKH[nama].hal[hal](p, q);
    };
  };

  /* ---------------- Layout ---------------- */
  IKH.judul = (t) => { document.title = (t ? t + ' — ' : '') + 'SIM IKALLHUBDAT Kaltim'; };
  IKH.setPub = function () { return (Store.pub && Store.pub.setting) || {}; };
  IKH.app = () => $('#app');
  IKH.layoutAktif = null;
  IKH.pasangLayout = function (nama, render) {
    const app = $('#app');
    if (IKH.layoutAktif !== nama || !$('#main', app)) { app.innerHTML = render(); IKH.layoutAktif = nama; }
    window.scrollTo(0, 0);
    return $('#main', app);
  };

  /* Perubahan yang belum sempat ditulis ke penyimpanan lokal (debounce) jangan hilang saat halaman dimuat ulang/ditutup */
  window.addEventListener('pagehide', () => { try { Store.simpanAdmLokal.segera(); } catch (e) { } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { try { Store.simpanAdmLokal.segera(); } catch (e) { } } });

  /* ---------------- Menu situs publik yang bisa disembunyikan (Kelola Beranda → Menu & Tampilan) ---------------- */
  IKH.MENU_PUB = { beranda: 'Beranda', profil: 'Profil Organisasi', berita: 'Berita', galeri: 'Galeri', daftar: 'Tombol Daftar', status: 'Cek Status Pendaftaran', verifikasi: 'Verifikasi KTA', masuk: 'Masuk' };
  IKH.menuTersembunyi = (st) => { const s = String((st && st.MENU_SEMBUNYI) || '').toLowerCase().split(/[\s,]+/).filter(Boolean); return (k) => s.indexOf(k) > -1; };

  /* ---------------- Peta sebaran per kab/kota (Dasbor Pengurus & Beranda publik) ----------------
     Data batas wilayah (js/peta-kaltim.js) dimuat hanya saat peta pertama kali ditampilkan. */
  const SKALA_PETA = ['#DAE2FF', '#A9BCEB', '#6F8DD1', '#2E4F95', '#0A2A63'];
  IKH.Peta = {
    SKALA: SKALA_PETA,
    muat() { return window.PETA_KALTIM ? Promise.resolve(window.PETA_KALTIM) : IKH.muat(['js/peta-kaltim.js?v=' + VERSI]).then(() => window.PETA_KALTIM); },
    warna(v, maks) { return !v ? '#EEF1F5' : SKALA_PETA[Math.min(4, Math.floor((v / maks) * 5 - 1e-9))]; },
    /** n = {kodeBPS: jumlah}. opsi.klik = wilayah bisa diklik; opsi.aria = deskripsi peta; opsi.denyut = bulatan angka berdenyut (beranda) */
    html(P, n, o) {
      o = o || {};
      const maks = Math.max(1, ...P.wilayah.map((w) => n[w.kode] || 0));
      return '<svg viewBox="0 0 ' + P.w + ' ' + P.h + '" role="img" aria-label="' + esc(o.aria || 'Peta sebaran per kabupaten/kota di Kalimantan Timur') + '"' + (o.denyut ? ' class="hidup"' : '') + '>' +
        '<g class="wil">' + P.wilayah.map((w) => '<path d="' + w.d + '" fill="' + this.warna(n[w.kode] || 0, maks) + '" data-k="' + w.kode + '"' + (w.kota ? ' data-kota="1"' : '') + ' tabindex="0"' + (o.klik ? ' role="button"' : '') + ' aria-label="' + esc(w.nama + ': ' + (n[w.kode] || 0) + ' orang') + '"></path>').join('') + '</g>' +
        '<g class="angkat" aria-hidden="true"></g>' +
        '<g class="lbl" aria-hidden="true">' + P.wilayah.filter((w) => !w.kota).map((w) => '<text x="' + w.x + '" y="' + (w.y + ((n[w.kode] || 0) ? 30 : 4)) + '" text-anchor="middle" data-k="' + w.kode + '">' + esc(w.singkat) + '</text>').join('') + '</g>' +
        '<g class="gel" aria-hidden="true">' + P.wilayah.filter((w) => n[w.kode]).map((w, i) => { const r = 11 + 9 * Math.sqrt(n[w.kode] / maks); return '<g data-k="' + w.kode + '">' + (o.denyut ? '<circle class="rg" cx="' + w.x + '" cy="' + w.y + '" r="' + r.toFixed(1) + '" style="animation-delay:' + (i * .45).toFixed(2) + 's"/>' : '') + '<circle class="bl" cx="' + w.x + '" cy="' + w.y + '" r="' + r.toFixed(1) + '"/><text x="' + w.x + '" y="' + (w.y + 4.5) + '" text-anchor="middle">' + n[w.kode] + '</text></g>'; }).join('') + '</g></svg>' +
        '<div class="pt-tip hide" role="status"></div>' +
        '<div class="pt-leg" aria-hidden="true"><span>0</span><i style="background:#EEF1F5"></i>' + SKALA_PETA.map((c) => '<i style="background:' + c + '"></i>').join('') + '<span>' + fmt.angka(maks) + '</span></div>';
    },
    /** Pasang sorotan + tooltip. o.tip(k) → HTML isi tooltip; o.klik(k) opsional; o.sorot(k, nyala) opsional.
     *  Wilayah yang disorot "terangkat": salinannya digambar di lapisan .angkat (membesar & menyala), batas aslinya tetap.
     *  Mengembalikan fungsi sorot(k, nyala, tampilkanTip). */
    pasang(box, o) {
      const tip = $('.pt-tip', box), svg = $('svg', box), lapis = $('.angkat', svg);
      let aktif = null;
      const diDalam = (luar, p) => {
        try {
          const b = p.getBBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
          // kota "terkurung" wilayah (mis. Samarinda di dalam Kukar): ≥ 3 dari 4 titik di sekelilingnya berada di dalam wilayah
          if (!luar.isPointInFill) return false;
          const d = 3, titik = [[b.x - d, y], [b.x + b.width + d, y], [x, b.y - d], [x, b.y + b.height + d]];
          return titik.filter((q) => { const t = svg.createSVGPoint(); t.x = q[0]; t.y = q[1]; return luar.isPointInFill(t); }).length >= 3;
        } catch (e) { return false; }
      };
      const tampil = (k, e) => {
        const r = box.getBoundingClientRect();
        let px, py;
        if (e && e.clientX) { px = e.clientX - r.left; py = e.clientY - r.top; }
        else { const p = $('.wil path[data-k="' + k + '"]', svg), b = p ? p.getBoundingClientRect() : r; px = b.left + b.width / 2 - r.left; py = b.top + b.height / 2 - r.top; }
        tip.innerHTML = o.tip(k); tip.classList.remove('hide');
        tip.style.left = Math.max(0, Math.min(px + 12, r.width - 200)) + 'px'; tip.style.top = (py + 12) + 'px';
      };
      const nyala = (k, on) => {
        $$('[data-k="' + k + '"]', svg).forEach((el) => el.classList.toggle('on', on));
        if (lapis) {
          if (on) {
            const asal = $('.wil path[data-k="' + k + '"]', svg);
            if (asal) {
              // satu grup diangkat bersama: wilayah + kota yang berada di dalamnya (mis. Samarinda di dalam Kukar), agar kota tidak tertutup
              const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('data-k', k); if (asal.dataset.kota) g.setAttribute('data-kota', '1');
              const salin = (p) => { const c = p.cloneNode(false); ['tabindex', 'role', 'aria-label'].forEach((x) => c.removeAttribute(x)); return c; };
              const utama = salin(asal); utama.classList.add('utama'); g.appendChild(utama);
              if (!asal.dataset.kota) $$('.wil path[data-kota]', svg).forEach((p) => { if (p !== asal && diDalam(asal, p)) g.appendChild(salin(p)); });
              lapis.innerHTML = ''; lapis.appendChild(g);
            }
          } else if (lapis.firstChild && lapis.firstChild.getAttribute('data-k') === k) lapis.innerHTML = '';
        }
        if (o.sorot) o.sorot(k, on);
      };
      const sorot = (k, on, denganTip) => {
        if (on && aktif && aktif !== k) nyala(aktif, false);
        if (on && aktif === k && !denganTip) return;
        nyala(k, on); aktif = on ? k : (aktif === k ? null : aktif);
        if (on && denganTip) tampil(k); else if (!on) tip.classList.add('hide');
      };
      $$('[data-k]', svg).forEach((el) => {
        if (el.closest('.angkat')) return;
        const k = el.dataset.k;
        el.addEventListener('mousemove', (e) => { sorot(k, true); tampil(k, e); });
        el.addEventListener('mouseleave', (e) => { const ke = e.relatedTarget; if (ke && ke.closest && ke.closest('[data-k="' + k + '"]')) return; sorot(k, false); });
        el.addEventListener('focus', () => sorot(k, true, true));
        el.addEventListener('blur', () => sorot(k, false));
        if (o.klik) {
          el.addEventListener('click', () => o.klik(k));
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.klik(k); } });
        } else el.addEventListener('click', (e) => { sorot(k, true); tampil(k, e); });   // layar sentuh: ketuk = wilayah terangkat + angka
      });
      // ketuk di luar wilayah (layar sentuh) → lepaskan sorotan
      box.addEventListener('click', (e) => { if (aktif && !(e.target.closest && e.target.closest('[data-k]'))) sorot(aktif, false); });
      return sorot;
    }
  };

  /* ---------------- Versi aplikasi: info, riwayat, deteksi pembaruan ----------------
     • versi.json (dibuat skrip build) = versi terbaru di GitHub Pages + riwayat perubahan
     • diperiksa tanpa cache saat aplikasi dibuka, saat tab aktif lagi (maks 1×/15 mnt) & tiap 30 mnt
     • versi server diambil dari field "v" pada setiap respons API Apps Script */
  const cmpVer = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; };
  const lsGet = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
  const Versi = {
    info: null, cekAt: 0, gagal: false, server: lsGet('ikh_vsrv'),
    catatServer(v) { v = String(v || ''); if (!v || v === this.server) return; this.server = v; lsSet('ikh_vsrv', v); },
    async cek(paksa) {
      if (!paksa && Date.now() - this.cekAt < 15 * 60e3) return this.info;
      this.cekAt = Date.now();
      try {
        const r = await fetch('./versi.json?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        this.info = await r.json(); this.gagal = false;
      } catch (e) { this.gagal = true; return null; }
      if (this.info && cmpVer(this.info.versi, VERSI) > 0) this.bar(this.info.versi);
      return this.info;
    },
    bar(v) {
      if ($('.update-bar')) return;
      const b = document.createElement('div'); b.className = 'update-bar'; b.setAttribute('role', 'status');
      b.innerHTML = ic('update') + '<span>Versi baru <b>v' + esc(v) + '</b> tersedia — Anda masih memakai v' + VERSI + '.</span><button class="btn btn-gold btn-xs" type="button" data-perbarui>Muat ulang</button><button class="x" type="button" aria-label="Nanti saja" title="Nanti saja">' + ic('close', 'sm') + '</button>';
      document.body.appendChild(b); document.body.classList.add('ada-update');
      $('[data-perbarui]', b).onclick = () => this.perbarui();
      $('.x', b).onclick = () => { b.remove(); document.body.classList.remove('ada-update'); };
    },
    async cacheSw() { try { return window.caches ? (await caches.keys()).filter((n) => /^ikh-v/.test(n)) : []; } catch (e) { return []; } },
    /** Ambil versi terbaru: perbarui service worker, kosongkan cache aplikasi, segarkan cache HTTP halaman, lalu muat ulang */
    async perbarui() {
      UI.muat('Memperbarui aplikasi…');
      const batas = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
      try {
        if (navigator.serviceWorker) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await batas(reg.update().catch(() => { }), 4000);
            const sw = reg.installing || reg.waiting;
            if (sw) await batas(new Promise((r) => { if (sw.state === 'activated') return r(); sw.addEventListener('statechange', () => { if (sw.state === 'activated' || sw.state === 'redundant') r(); }); }), 5000);
          }
        }
        const nama = await this.cacheSw(); await Promise.all(nama.map((n) => caches.delete(n)));
        const hal = location.href.split('#')[0];
        await batas(Promise.all([fetch(hal, { cache: 'reload' }), fetch('./index.html', { cache: 'reload' })]).catch(() => { }), 4000);
      } catch (e) { }
      location.reload();
    },
    isi(st) {
      const i = this.info, srv = this.server, riwayat = (i && Array.isArray(i.riwayat) && i.riwayat.length) ? i.riwayat : [];
      let status;
      if (st === 'cek') status = '<div class="alert info">' + ic('sync', 'sm') + '<div>Memeriksa pembaruan…</div></div>';
      else if (!i) status = '<div class="alert warn">' + ic('cloud_off', 'sm') + '<div>Tidak dapat memeriksa pembaruan (offline, atau berkas <code>versi.json</code> belum ter-upload).</div></div>';
      else if (cmpVer(i.versi, VERSI) > 0) status = '<div class="alert gold">' + ic('update', 'sm') + '<div class="grow">Versi baru <b>v' + esc(i.versi) + '</b> sudah tersedia. Muat ulang untuk memakainya.</div><button class="btn btn-gold btn-xs" type="button" data-perbarui>Muat ulang</button></div>';
      else if (cmpVer(i.versi, VERSI) < 0) status = '<div class="alert info">' + ic('schedule', 'sm') + '<div>Server GitHub Pages masih menyajikan v' + esc(i.versi) + ' — biasanya selesai diproses 1–10 menit setelah <i>git push</i>.</div></div>';
      else status = '<div class="alert ok">' + ic('verified', 'sm') + '<div>Anda memakai versi terbaru.</div></div>';
      const kurang = i && i.server_min && srv && cmpVer(srv, i.server_min) < 0;
      const sw = this._sw;
      return '<div class="ver-head"><span class="lg" style="background-image:url(\'img/logo.png\')"></span><div><div class="t1">SIM IKALLHUBDAT Kaltim</div><div class="small muted">Versi <b>v' + VERSI + '</b> • rilis ' + fmt.tgl(RILIS, true) + '</div></div></div>' + status +
        (kurang ? '<div class="alert bad mt">' + ic('warning', 'sm') + '<div>Backend Apps Script masih <b>v' + esc(srv) + '</b>, sedangkan versi ini membutuhkan minimal <b>v' + esc(i.server_min) + '</b>. Tempel kode backend terbaru lalu deploy ulang.</div></div>' : '') +
        '<div class="kv mt-lg"><div>Versi aplikasi (tampilan)</div><div>v' + VERSI + '</div>' +
        '<div>Versi terbaru di server web</div><div>' + (i ? 'v' + esc(i.versi) : '-') + '</div>' +
        '<div>Versi server (Apps Script)</div><div>' + (srv ? 'v' + esc(srv) : '<span class="muted">belum terhubung</span>') + '</div>' +
        '<div>Cache offline (PWA)</div><div>' + (sw && sw.length ? esc(sw.join(', ')) : '<span class="muted">tidak aktif</span>') + '</div>' +
        '<div>Diperiksa</div><div>' + (this.cekAt ? fmt.relatif(new Date(this.cekAt).toISOString()) : '-') + '</div></div>' +
        (riwayat.length ? '<h4 class="mt-lg mb">Riwayat Perubahan</h4><div class="ver-log">' + riwayat.slice(0, 20).map((r) =>
          '<div class="it ' + (r.versi === VERSI ? 'kini' : '') + '"><div class="row between"><b>v' + esc(r.versi) + (r.versi === VERSI ? ' <span class="badge b-gold">dipakai</span>' : '') + '</b><span class="small muted">' + esc(r.tanggal ? fmt.tgl(r.tanggal) : '') + '</span></div>' +
          (r.judul ? '<div class="small b mt">' + esc(r.judul) + '</div>' : '') + (Array.isArray(r.poin) && r.poin.length ? '<ul>' + r.poin.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '') + '</div>').join('') + '</div>' : '');
    },
    async tampil() {
      this._sw = await this.cacheSw();
      UI.modal({ judul: 'Informasi Versi Aplikasi', isi: '<div id="vr-b">' + this.isi('cek') + '</div>',
        tombol: [{ teks: 'Muat ulang paksa', ikon: 'refresh', aksi: () => { this.perbarui(); return false; } }, { teks: 'Tutup', kelas: 'btn-primary', nilai: null }],
        onBuka: async (md) => {
          const pasang = () => { const b = $('[data-perbarui]', md); if (b) b.onclick = () => this.perbarui(); };
          await this.cek(true);
          const el = $('#vr-b', md); if (el) { el.innerHTML = this.isi(); pasang(); }
        } });
    },
    /** Sekali setelah versi berganti: beri tahu pengguna bahwa pembaruan sudah terpasang */
    sambut() {
      const lama = lsGet('ikh_versi'); lsSet('ikh_versi', VERSI);
      if (lama && lama !== VERSI) setTimeout(() => UI.toast('Aplikasi diperbarui ke v' + VERSI + '. Ketuk label versi untuk melihat yang baru.', 'ok', 6500), 1500);
    }
  };
  document.addEventListener('click', (e) => { const t = e.target && e.target.closest && e.target.closest('[data-versi]'); if (t) { e.preventDefault(); Versi.tampil(); } });
  IKH.Versi = Versi; IKH.cmpVer = cmpVer;
  /** true (dan beri tahu) bila backend Apps Script yang terpasang lebih lama dari versi minimal fitur ini */
  IKH.butuhServer = (min, fitur) => {
    if (!Versi.server || cmpVer(Versi.server, min) >= 0) return false;
    UI.toast((fitur || 'Fitur ini') + ' butuh backend Apps Script v' + min + ' (server Anda masih v' + Versi.server + '). Tempel kode backend terbaru lalu deploy ulang.', 'bad', 8000);
    return true;
  };
  IKH.chipVersi = (kelas) => '<button type="button" class="ver-chip ' + (kelas || '') + '" data-versi title="Informasi & riwayat versi aplikasi">v' + VERSI + '</button>';

  /* ---------------- Status jaringan & init ---------------- */
  function barOffline() { let b = $('.offline-bar'); if (!navigator.onLine) { if (!b) { b = document.createElement('div'); b.className = 'offline-bar'; b.textContent = 'Anda sedang offline — data yang tampil adalah salinan terakhir.'; document.body.appendChild(b); } } else if (b) b.remove(); }
  window.addEventListener('online', barOffline); window.addEventListener('offline', barOffline);
  IKH.mulai = function () {
    if (!KONFIG_OK) {
      const tampil = GAS_URL.length > 70 ? GAS_URL.slice(0, 48) + '…' + GAS_URL.slice(-14) : GAS_URL;
      const d = document.createElement('div'); d.className = 'cfg-bar'; d.setAttribute('role', 'alert');
      d.innerHTML = 'Konfigurasi belum lengkap: ' + esc(ALASAN_CFG) + '.' + (GAS_URL ? ' <span style="font-weight:400">Terbaca: <code>' + esc(tampil) + '</code></span>' : '') +
        ' <span style="font-weight:400">— periksa js/config.js, push, lalu tekan Ctrl+Shift+R.</span>';
      document.body.prepend(d);
      console.warn('[IKALLHUBDAT] GAS_URL ditolak:', ALASAN_CFG, JSON.stringify(CFG.GAS_URL));
    }
    barOffline();
    window.addEventListener('hashchange', () => Router.jalan());
    Router.jalan();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => { });
    console.info('%cSIM IKALLHUBDAT v' + VERSI + ' (' + RILIS + ')', 'color:#0A2A63;font-weight:700');
    Versi.sambut();
    if (/^https?:$/.test(location.protocol)) {
      (window.requestIdleCallback || ((f) => setTimeout(f, 3000)))(() => Versi.cek(true), { timeout: 6000 });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Versi.cek(); });
      setInterval(() => { if (document.visibilityState === 'visible') Versi.cek(true); }, 30 * 60e3);
    }
  };
  /* Pasang aplikasi (PWA) */
  let _install = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _install = e; $$('[data-install]').forEach((b) => b.classList.remove('hide')); });
  IKH.pasangApp = async function () { if (!_install) return UI.toast('Gunakan menu browser → "Tambahkan ke layar utama".', 'warn'); _install.prompt(); await _install.userChoice; _install = null; $$('[data-install]').forEach((b) => b.classList.add('hide')); };
  IKH.bisaPasang = () => !!_install;
})();
