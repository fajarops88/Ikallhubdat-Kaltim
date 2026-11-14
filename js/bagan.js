/* ==========================================================================
   bagan.js — Bagan struktur organisasi OTOMATIS dari data Pengurus
   Disusun dari kolom Jabatan, Bidang & Urutan (tanpa kolom "atasan"):
     Pembina/Penasehat (garis putus-putus) → Ketua → Wakil Ketua →
     Sekretaris (kiri) & Bendahara (kanan) → satu kolom per Bidang.
   Dimuat hanya saat bagan ditampilkan (IKH.muat).
   ========================================================================== */
(function () {
  'use strict';
  const IKH = window.IKH, { esc, img } = IKH;
  const BW = 214, BH = 72, GX = 22, GY = 46, PAD = 26, HH = 34, SY = 12, CELAH = 30;
  const NAVY = '#0A2A63', GOLD = '#F6C12B', GARIS = '#9AA9C4', HURUF = "Inter, 'Segoe UI', Roboto, Arial, sans-serif";

  const low = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const urut = (r) => { const n = Number(r.urutan); return isFinite(n) && String(r.urutan).trim() !== '' ? n : 999; };

  /** Peran sebuah jabatan dalam bagan */
  function peran(jabatan) {
    const s = low(jabatan);
    if (/(pembina|penasehat|penasihat|pelindung|dewan (pertimbangan|pakar|penasehat|penasihat|kehormatan|pengawas|etik))/.test(s)) return 'pembina';
    if (/(bidang|seksi|divisi|departemen|komisi|biro|koordinator|kabid|korbid|\banggota\b)/.test(s)) return 'bidang';
    if (/(wakil ketua|wk\.? ?ketua|\bwaka\b)/.test(s)) return 'wakil';
    if (/\bketua\b/.test(s)) return 'ketua';
    if (/(sekretaris|sekjen|\bsekum\b)/.test(s)) return 'sekretaris';
    if (/bendahara/.test(s)) return 'bendahara';
    return 'bidang';
  }
  /** "Ketua Bidang Organisasi & Kaderisasi" → "Bidang Organisasi & Kaderisasi" */
  function namaKelompok(jabatan) {
    const m = String(jabatan || '').match(/\b(bidang|seksi|divisi|departemen|komisi|biro)\b\s*(.*)$/i);
    if (m) return (m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + ' ' + m[2]).trim();
    return 'Anggota Pengurus';
  }
  const koordinator = (r) => /\b(ketua|koordinator|kabid|korbid|kepala)\b/i.test(r.jabatan || '');

  /** Kelompokkan data pengurus menjadi tingkatan bagan */
  function susun(rows) {
    const d = (rows || []).filter((r) => r && r.tampil !== 'TIDAK' && (r.nama || r.jabatan))
      .map((r, i) => Object.assign({ _i: i }, r)).sort((a, b) => urut(a) - urut(b) || a._i - b._i);
    const g = { pembina: [], ketua: [], wakil: [], sekretaris: [], bendahara: [] }, kol = {}, urutKol = [];
    d.forEach((r) => {
      let p = peran(r.jabatan);
      const bd = String(r.bidang || '').trim(), inti = !bd || /(harian|pimpinan|\binti\b)/i.test(bd);
      if (p !== 'pembina' && !inti) p = 'bidang';                    // kolom Bidang diisi → masuk kolom bidang itu
      if (p !== 'bidang') { g[p].push(r); return; }
      const label = !inti ? bd : namaKelompok(r.jabatan), k = low(label);
      if (!kol[k]) { kol[k] = { label: label, isi: [] }; urutKol.push(k); }
      kol[k].isi.push(r);
    });
    if (!g.ketua.length && g.wakil.length) g.ketua.push(g.wakil.shift());
    if (g.ketua.length > 1) { g.wakil = g.ketua.slice(1).concat(g.wakil); g.ketua = g.ketua.slice(0, 1); }   // mis. "Ketua Harian"
    const kolom = urutKol.map((k) => { const c = kol[k]; const a = c.isi.filter(koordinator), b = c.isi.filter((r) => !koordinator(r)); return { label: c.label, isi: a.concat(b) }; });
    const periode = (() => { const n = {}; d.forEach((r) => { if (r.periode) n[r.periode] = (n[r.periode] || 0) + 1; }); return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || ''; })();
    return { g, kolom, periode, jumlah: d.length };
  }

  /* ---------- pengukur & pemotong teks ---------- */
  let _ctx = null;
  const lebar = (t, font) => { try { if (!_ctx) _ctx = document.createElement('canvas').getContext('2d'); _ctx.font = font; return _ctx.measureText(t).width; } catch (e) { return String(t).length * 6.6; } };
  function potong(t, font, maks) {
    t = String(t || ''); if (lebar(t, font) <= maks) return t;
    while (t.length > 1 && lebar(t + '…', font) > maks) t = t.slice(0, -1);
    return t.replace(/[\s,.]+$/, '') + '…';
  }
  function bungkus(t, font, maks, baris) {
    const kata = String(t || '').trim().split(/\s+/).filter(Boolean), out = [];
    let cur = '';
    for (let i = 0; i < kata.length; i++) {
      const coba = cur ? cur + ' ' + kata[i] : kata[i];
      if (lebar(coba, font) <= maks) { cur = coba; continue; }
      if (cur) out.push(cur); cur = kata[i];
      if (out.length === baris - 1) { cur = kata.slice(i).join(' '); break; }
    }
    if (cur) out.push(cur);
    return out.slice(0, baris).map((l, i, a) => (i === a.length - 1 ? potong(l, font, maks) : l));
  }
  /** Inisial tanpa gelar: "Ir. H. Ahmad Rizali, M.T." → "AR" */
  const GELAR = /^(ir|h|hj|dr|drs|dra|prof|kh|ust|ustadz|hc|st|s|m|a|ak|apt|mr|mrs|ns|ners|cand|kol|letkol|mayor|kapt|brigjen|irjen|komjen|ipda|iptu|akp|kompol|akbp|kombes)$/i;
  const inisial = (n) => {
    const k = String(n || '').split(',')[0].replace(/[()]/g, ' ').split(/\s+/).filter(Boolean).filter((w) => !/\.$/.test(w) && !GELAR.test(w.replace(/\./g, '')));
    const a = (k.length ? k : String(n || '?').split(/\s+/)).map((w) => w.replace(/[^A-Za-z]/g, '')[0] || '').filter(Boolean);
    return (a.slice(0, 2).join('') || '?').toUpperCase();
  };
  /** Di dalam kolom bidang, jabatan tidak perlu mengulang nama bidang: "Ketua Bidang Humas" → "Ketua" */
  const jabatanRingkas = (j) => { const t = String(j || '').replace(/\s*\b(bidang|seksi|divisi|departemen|komisi|biro)\b.*$/i, '').trim(); return t || String(j || ''); };

  /* ---------- gambar SVG ---------- */
  function svg(rows, o) {
    o = o || {};
    const S = susun(rows), g = S.g, foto = o.foto !== false;
    if (!S.jumlah) return { svg: '', w: 0, h: 0, susun: S };
    const lebarBaris = (n) => n ? n * BW + (n - 1) * GX : 0;
    const WK = S.kolom.length ? lebarBaris(S.kolom.length) : 0;
    const adaH = g.sekretaris.length || g.bendahara.length;
    const W = Math.max(BW, WK, lebarBaris(g.wakil.length), lebarBaris(g.pembina.length), adaH ? 2 * BW + 2 * CELAH : 0) + 2 * PAD;
    const cx = W / 2, judulH = o.judul ? 64 : 0;
    const garis = [], kotak = [], defs = [];
    let y = PAD + judulH, idx = 0, trunkAtas = null, trunkBawah = null;
    const L = (x1, y1, x2, y2, putus) => garis.push('<path d="M' + x1 + ' ' + y1 + (x1 === x2 ? 'V' + y2 : y1 === y2 ? 'H' + x2 : 'L' + x2 + ' ' + y2) + '"' + (putus ? ' stroke-dasharray="6 5"' : '') + '/>');
    const baris = (n, yy) => { const lb = lebarBaris(n), x0 = cx - lb / 2; return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (BW + GX), y: yy })); };

    function box(r, x, y, gaya) {
      const id = 'bgc' + (o.idAwal || '') + (idx++), utama = gaya === 'ketua';
      const fx = x + 38, fy = y + BH / 2, tx = x + 70, tw = BW - 70 - 12;
      const nmFont = '700 12.5px ' + HURUF, jbFont = '600 11px ' + HURUF;
      const nm = bungkus(r.nama || '-', nmFont, tw, 2), jb = potong(gaya === 'bidang' ? jabatanRingkas(r.jabatan) : (r.jabatan || ''), jbFont, tw);
      const y1 = nm.length > 1 ? y + 24 : y + 31;
      let s = '<g class="bx"><title>' + esc((r.nama || '') + ' — ' + (r.jabatan || '') + (r.bidang ? ' (' + r.bidang + ')' : '')) + '</title>' +
        '<rect x="' + x + '" y="' + y + '" width="' + BW + '" height="' + BH + '" rx="12" fill="' + (utama ? NAVY : '#fff') + '" stroke="' + (utama ? NAVY : '#D5DCE8') + '"/>' +
        (utama ? '' : '<rect x="' + x + '" y="' + (y + 10) + '" width="4" height="' + (BH - 20) + '" rx="2" fill="' + GOLD + '"/>');
      if (foto && r.foto_id) {
        defs.push('<clipPath id="' + id + '"><circle cx="' + fx + '" cy="' + fy + '" r="23"/></clipPath>');
        s += '<circle cx="' + fx + '" cy="' + fy + '" r="25" fill="' + GOLD + '"/><image href="' + esc(img(r.foto_id, 160)) + '" x="' + (fx - 23) + '" y="' + (fy - 23) + '" width="46" height="46" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"/>';
      } else {
        s += '<circle cx="' + fx + '" cy="' + fy + '" r="23" fill="' + (utama ? GOLD : NAVY) + '"/><text x="' + fx + '" y="' + (fy + 5) + '" text-anchor="middle" font-size="14" font-weight="700" fill="' + (utama ? NAVY : '#fff') + '">' + esc(inisial(r.nama)) + '</text>';
      }
      nm.forEach((l, i) => { s += '<text x="' + tx + '" y="' + (y1 + i * 15) + '" font-size="12.5" font-weight="700" fill="' + (utama ? '#fff' : '#1B2537') + '">' + esc(l) + '</text>'; });
      s += '<text x="' + tx + '" y="' + (y1 + nm.length * 15 + 2) + '" font-size="11" font-weight="600" fill="' + (utama ? GOLD : NAVY) + '">' + esc(jb) + '</text></g>';
      kotak.push(s);
    }

    // 1. Pembina / penasehat (garis koordinasi putus-putus ke Ketua)
    if (g.pembina.length) {
      const pos = baris(g.pembina.length, y);
      pos.forEach((p, i) => box(g.pembina[i], p.x, p.y, 'pembina'));
      const yb = y + BH + GY / 2;
      if (pos.length > 1) L(pos[0].x + BW / 2, yb, pos[pos.length - 1].x + BW / 2, yb, true);
      pos.forEach((p) => L(p.x + BW / 2, y + BH, p.x + BW / 2, yb, true));
      if (g.ketua.length) L(cx, yb, cx, y + BH + GY, true);
      y += BH + GY;
    }
    // 2. Ketua
    if (g.ketua.length) { box(g.ketua[0], cx - BW / 2, y, 'ketua'); trunkAtas = y + BH; y += BH + GY; }
    // 3. Wakil ketua
    if (g.wakil.length) {
      const pos = baris(g.wakil.length, y), yb = y - GY / 2;
      if (trunkAtas === null) trunkAtas = yb;
      if (pos.length > 1) L(pos[0].x + BW / 2, yb, pos[pos.length - 1].x + BW / 2, yb);
      pos.forEach((p, i) => { L(p.x + BW / 2, yb, p.x + BW / 2, p.y); box(g.wakil[i], p.x, p.y, 'wakil'); });
      trunkBawah = yb; y += BH + GY;
    }
    // 4. Sekretaris (kiri) & Bendahara (kanan)
    if (adaH) {
      const yb = y - GY / 2, xs = cx - CELAH - BW, xb = cx + CELAH;
      if (trunkAtas === null) trunkAtas = yb;
      const tumpuk = (isi, x) => {
        if (!isi.length) return 0;
        L(cx, yb, x + BW / 2, yb); L(x + BW / 2, yb, x + BW / 2, y);
        if (isi.length > 1) L(x + BW / 2, y + BH, x + BW / 2, y + (isi.length - 1) * (BH + SY));
        isi.forEach((r, i) => box(r, x, y + i * (BH + SY), 'harian'));
        return isi.length;
      };
      const n = Math.max(tumpuk(g.sekretaris, xs), tumpuk(g.bendahara, xb));
      trunkBawah = yb; y += n * (BH + SY) - SY + GY + 6;
    }
    // 5. Kolom bidang
    let bawah = y - GY;
    if (S.kolom.length) {
      const x0 = cx - WK / 2, yb = y - GY / 2;
      if (trunkAtas === null) trunkAtas = yb;
      if (S.kolom.length > 1) L(x0 + BW / 2, yb, x0 + WK - BW / 2, yb);
      let maksH = 0;
      S.kolom.forEach((c, i) => {
        const x = x0 + i * (BW + GX), tinggi = HH + SY + c.isi.length * (BH + SY) - SY;
        maksH = Math.max(maksH, tinggi);
        L(x + BW / 2, yb, x + BW / 2, y);
        garis.unshift('<rect x="' + (x - 8) + '" y="' + (y - 8) + '" width="' + (BW + 16) + '" height="' + (tinggi + 16) + '" rx="14" fill="#F2F5FA" stroke="none"/>');
        kotak.push('<g class="hd"><rect x="' + x + '" y="' + y + '" width="' + BW + '" height="' + HH + '" rx="9" fill="' + NAVY + '"/><text x="' + (x + BW / 2) + '" y="' + (y + 21.5) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" letter-spacing=".3">' + esc(potong(c.label, '700 11.5px ' + HURUF, BW - 18)) + '</text></g>');
        c.isi.forEach((r, j) => box(r, x, y + HH + SY + j * (BH + SY), 'bidang'));
      });
      trunkBawah = yb; bawah = y + maksH;
    }
    if (trunkAtas !== null && trunkBawah !== null && trunkBawah > trunkAtas) garis.push('<path d="M' + cx + ' ' + trunkAtas + 'V' + trunkBawah + '"/>');
    const H = Math.ceil(bawah + PAD + 8);
    const kepala = o.judul ? '<text x="' + cx + '" y="' + (PAD + 22) + '" text-anchor="middle" font-size="19" font-weight="800" fill="' + NAVY + '">' + esc(o.judul) + '</text>' +
      (o.sub ? '<text x="' + cx + '" y="' + (PAD + 44) + '" text-anchor="middle" font-size="12.5" font-weight="600" fill="#55647C">' + esc(o.sub) + '</text>' : '') : '';
    const isi = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="' + HURUF + '" role="img" aria-label="Bagan struktur organisasi">' +
      (o.latar ? '<rect width="100%" height="100%" fill="' + o.latar + '"/>' : '') + (defs.length ? '<defs>' + defs.join('') + '</defs>' : '') + kepala +
      '<g fill="none" stroke="' + GARIS + '" stroke-width="1.6">' + garis.join('') + '</g>' + kotak.join('') + '</svg>';
    return { svg: isi, w: W, h: H, susun: S };
  }

  /** Tampilkan bagan ke elemen; mengembalikan ringkasan susunan */
  function pasang(el, rows, o) {
    if (!el) return null;
    const r = svg(rows, Object.assign({ idAwal: (el.id || 'b') + '-' }, o || {}));
    if (!r.svg) { el.innerHTML = IKH.UI.kosong('Belum ada data pengurus untuk disusun menjadi bagan.', 'account_tree'); return r; }
    el.innerHTML = r.svg.replace('<svg ', '<svg style="width:clamp(' + Math.min(r.w, 760) + 'px,100%,' + r.w + 'px)" ') +
      '<div class="bagan-geser hide">' + IKH.ic('swipe', 'sm') + 'Geser ke samping untuk melihat seluruh bagan</div>';
    requestAnimationFrame(() => {
      const lebih = el.scrollWidth > el.clientWidth + 4, h = el.querySelector('.bagan-geser');
      if (h) h.classList.toggle('hide', !lebih);
      if (lebih) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;     // layar sempit: mulai dari tengah (Ketua)
    });
    return r;
  }

  /** Unduh bagan sebagai PNG (tanpa foto agar bisa diekspor; foto diganti inisial) */
  async function unduh(rows, o) {
    o = o || {};
    const r = svg(rows, { foto: false, latar: '#ffffff', judul: o.judul || 'Struktur Organisasi', sub: o.sub || '', idAwal: 'x-' });
    if (!r.svg) return IKH.UI.toast('Belum ada data pengurus.', 'warn');
    const skala = 2, url = URL.createObjectURL(new Blob([r.svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const gb = await new Promise((ok, gagal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => gagal(new Error('Gagal menyiapkan gambar.')); i.src = url; });
      const cv = document.createElement('canvas'); cv.width = r.w * skala; cv.height = r.h * skala;
      const c = cv.getContext('2d'); c.scale(skala, skala); c.drawImage(gb, 0, 0, r.w, r.h);
      const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (o.nama || 'Bagan-Struktur-Organisasi') + '.png';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } finally { URL.revokeObjectURL(url); }
  }

  IKH.Bagan = { susun, svg, pasang, unduh, peran };
})();
