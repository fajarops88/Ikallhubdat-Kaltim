/* ==========================================================================
   SIM IKALLHUBDAT KALTIM — core.js
   API (fetch → GAS REST), cache SWR, batch & dedupe, drain notifikasi,
   router hash, layout, UI kit, renderer KTA, ekspor
   ========================================================================== */
(function () {
  'use strict';
  const VERSI = '1.0.0';
  const CFG = window.APP_CONFIG || {};
  const IKH = (window.IKH = window.IKH || {});
  IKH.VERSI = VERSI;

  /* ---------------- Utilitas ---------------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, cls) => '<svg class="ic ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + n + '"></use></svg>';
  const img = (id, w) => (id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 600) : '');
  const bg = (id, w) => (id ? 'style="background-image:url(\'' + img(id, w) + '\')"' : '');
  const inisial = (n) => String(n || '?').replace(/[,.].*$/, '').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || '?';
  const warnaAva = (n) => 'c' + ((String(n || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 5) + 1);
  const debounce = (fn, ms) => { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
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
  Object.assign(IKH, { $, $$, esc, ic, img, bg, inisial, warnaAva, debounce, daftar, hp08, hariIni, fmt });

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
      const peran = this.me && this.me.peran;
      this.data = null; LS.del('sesi'); LS.hapusSemua('adm'); LS.hapusSemua('agt'); Store.adm = null; Store.agt = null;
      if (kedaluwarsa) UI.toast('Sesi berakhir. Silakan masuk kembali.', 'warn');
      Router.go(peran === 'pengurus' || peran === 'anggota' ? '/masuk' : '/');
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
  const KONFIG_OK = CFG.GAS_URL && /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(CFG.GAS_URL) && !/GANTI|XXXX/.test(CFG.GAS_URL);
  IKH.KONFIG_OK = KONFIG_OK;
  const BACA = /^(pub\.(boot|cekStatus|verifikasi)|auth\.me|agt\.boot|adm\.(boot|konten|log|akun\.list|arsip\.list)|notif\.(config|queue|ringkas)|wa\.(audience|blastList)|crm\.(list|stats|detail)|imp\.inspect)$/;
  const _inflight = {}; let _epoch = 0;
  async function apiRun(action, data, extra) {
    const t0 = performance.now();
    if (!KONFIG_OK) return { ok: false, msg: 'Konfigurasi GAS_URL di js/config.js belum diisi.', code: 'CFG' };
    const body = Object.assign({ action: action, data: data || {}, token: Sesi.token || undefined }, extra || {});
    let res;
    try {
      const r = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', cache: 'no-store' });
      res = await r.json();
    } catch (e) {
      res = { ok: false, code: 'NET', msg: navigator.onLine ? 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.' : 'Anda sedang offline.' };
    }
    Perf.add(action, t0, res);
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
    fetch(CFG.GAS_URL + '?w=' + scope, { mode: 'no-cors', cache: 'no-store' }).catch(() => { });
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
      const b = { anggota: this.urai(d.anggota), pengajuan: this.urai(d.pengajuan), akun: this.urai(d.akun), setting: d.setting || {}, log: this.urai(d.log), dibuat: d.dibuat, antrianAda: d.antrianAda };
      this.adm = b; this.admAt = Date.now();
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
      const p = api('agt.boot', {}).then((r) => { if (r.ok) this.setAgt(r.data); return this.agt; });
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
      LS.set('adm_' + (Sesi.me ? Sesi.me.email : ''), { d: { anggota: pack(a.anggota), pengajuan: pack(a.pengajuan), akun: pack(a.akun), setting: a.setting, log: pack(a.log), dibuat: a.dibuat }, at: Store.admAt });
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
    async tombol(btn, fn) { if (!btn || btn.classList.contains('busy')) return; const lama = btn.innerHTML; btn.classList.add('busy'); btn.innerHTML = '<span class="spin"></span>' + (btn.dataset.busy || 'Memproses…'); try { return await fn(); } finally { btn.classList.remove('busy'); btn.innerHTML = lama; } },
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
    autotable: ['https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js', 'https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'],
    pdflib: ['https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js']
  };
  IKH.CDN = CDN;

  /* ---------------- QR & KTA ---------------- */
  IKH.qrSvg = async function (teks) {
    await IKH.muat(CDN.qr);
    const q = window.qrcode(0, 'M'); q.addData(teks); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  };
  const Kta = {
    statusTeks(a) { if (a.status_verifikasi !== 'Disetujui') return 'BELUM TERVERIFIKASI'; if (a.status_anggota === 'Nonaktif') return 'NONAKTIF'; if (a.masa_berlaku_kartu && a.masa_berlaku_kartu < hariIni()) return 'KEDALUWARSA'; return 'AKTIF'; },
    depan(a, st) {
      st = st || {};
      const s = Kta.statusTeks(a);
      return '<div class="kta depan" role="img" aria-label="KTA sisi depan ' + esc(a.nama) + '">' +
        '<div class="hd"><div class="lg" ' + (st.LOGO_ID ? bg(st.LOGO_ID, 160) : '') + '>' + (st.LOGO_ID ? '' : ic('shield')) + '</div><div><div class="t1">KARTU TANDA ANGGOTA</div><div class="t2">' + esc(st.ORG_NAMA || 'DPD IKALLHUBDAT Kalimantan Timur') + '</div></div></div>' +
        '<div class="chipg"></div><div class="garis"></div>' +
        '<div class="ft" ' + (a.foto_id ? bg(a.foto_id, 400) : '') + '>' + (a.foto_id ? '' : ic('person')) + '</div>' +
        '<div class="dt"><div><div class="l">Nama Lengkap</div><div class="v nm">' + esc(String(a.nama || 'NAMA ANGGOTA').toUpperCase()) + '</div></div>' +
        '<div><div class="l">Nomor Anggota</div><div class="v no">' + esc(a.id_member || '—') + '</div></div>' +
        '<div class="dua"><div><div class="l">NIT / Angkatan</div><div class="v">' + esc((a.nomor_taruna || '-') + ' / ' + (a.angkatan || '-')) + '</div></div><div><div class="l">Program Studi</div><div class="v">' + esc(a.prodi || '-') + '</div></div></div></div>' +
        '<div class="bw"><span>BERLAKU S.D. <b>' + esc(a.masa_berlaku_kartu ? fmt.tgl(a.masa_berlaku_kartu).toUpperCase() : '—') + '</b></span><span class="st ' + (s === 'AKTIF' ? '' : 'bad') + '">' + s + '</span></div></div>';
    },
    belakang(a, st, qrSvg) {
      st = st || {};
      return '<div class="kta belakang" role="img" aria-label="KTA sisi belakang">' +
        '<div class="pita">' + esc(st.ORG_SINGKAT || 'IKALLHUBDAT KALTIM') + '</div>' +
        '<div class="qr">' + (qrSvg || '') + '</div><div class="qrl">PINDAI UNTUK VERIFIKASI</div>' +
        '<div class="kt"><b>KETENTUAN</b>1. Kartu ini milik ' + esc(st.ORG_NAMA || 'organisasi') + ' dan tidak dapat dipindahtangankan.<br>2. Keaslian kartu dapat diperiksa dengan memindai kode QR.<br>3. Bila menemukan kartu ini, mohon kembalikan ke sekretariat.</div>' +
        '<div class="ttd">' + esc(st.KETUA_JABATAN || 'Ketua') + ',<div class="nm">' + esc(st.KETUA_NAMA || '…………………………') + '</div></div><div class="bwh"></div></div>';
    }
  };
  IKH.Kta = Kta;

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
          if (r.o.peran !== me.peran) return this.go(me.peran === 'pengurus' ? '/admin' : '/anggota');
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

  /* ---------------- Status jaringan & init ---------------- */
  function barOffline() { let b = $('.offline-bar'); if (!navigator.onLine) { if (!b) { b = document.createElement('div'); b.className = 'offline-bar'; b.textContent = 'Anda sedang offline — data yang tampil adalah salinan terakhir.'; document.body.appendChild(b); } } else if (b) b.remove(); }
  window.addEventListener('online', barOffline); window.addEventListener('offline', barOffline);
  IKH.mulai = function () {
    if (!KONFIG_OK) { const d = document.createElement('div'); d.className = 'cfg-bar'; d.textContent = 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec dari Apps Script.'; document.body.prepend(d); }
    barOffline();
    window.addEventListener('hashchange', () => Router.jalan());
    Router.jalan();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => { });
  };
  /* Pasang aplikasi (PWA) */
  let _install = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _install = e; $$('[data-install]').forEach((b) => b.classList.remove('hide')); });
  IKH.pasangApp = async function () { if (!_install) return UI.toast('Gunakan menu browser → "Tambahkan ke layar utama".', 'warn'); _install.prompt(); await _install.userChoice; _install = null; $$('[data-install]').forEach((b) => b.classList.add('hide')); };
  IKH.bisaPasang = () => !!_install;
})();
