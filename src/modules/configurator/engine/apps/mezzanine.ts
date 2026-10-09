import { createTally, dims, grid, type Dims } from '../helpers';
import type { Kit } from '../kit';
import { customMat, hex, MAT } from '../materials';
import { PLATE_T, type AppDef, type AppState, type BomItem, type BuildContext } from '../types';
import { UP, v3, X, Y, type V3 } from '../vec';

/**
 * ARA KAT PLATFORMU (K-110, prototip `ara-kat.js`nin bire bir portu).
 * Metin anahtarları: Engine.mezzanine.* (alanlar, kalemler, notlar). Profil kodları ASCII katalog kodudur.
 */
const COL_FAM = ['HEA', 'HEB', 'IPE', 'SHS', 'RHS'] as const;
const BEAM_FAM = ['IPE', 'HEA', 'HEB'] as const;
/** Yük sınıfı → hareketli yük (kN/m²) ve ön boyut profil kodları */
const LOADS: Readonly<Record<string, { readonly q: number; readonly col: string; readonly main: string; readonly sec: string }>> = {
  hafif: { q: 2.5, col: 'HEA140', main: 'IPE270', sec: 'IPE140' },
  orta: { q: 5, col: 'HEA160', main: 'IPE300', sec: 'IPE160' },
  agir: { q: 7.5, col: 'HEA180', main: 'IPE330', sec: 'IPE180' },
};
const DECK_KG = 9.5, GRATING_KG = 22, TREAD_KG = 14; // kg/m², kg/m², kg/basamak (ızgara basamak)
const deckMat = customMat('deck_concrete', 0x9DA19B, { roughness: 0.85, metalness: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
const gratingMat = customMat('grating', 0x7E8A92, { roughness: 0.45, metalness: 0.6, transparent: true, opacity: 0.6, depthWrite: false });

export const mezzanine: AppDef = {
  id: 'mezzanine',
  sections: [
    { titleKey: 'mezzanine.sections.dims', fields: [
      { id: 'width', type: 'range', labelKey: 'mezzanine.fields.width', unit: 'm', min: 3, max: 40, step: 0.5, value: 12 },
      { id: 'length', type: 'range', labelKey: 'mezzanine.fields.length', unit: 'm', min: 3, max: 60, step: 0.5, value: 24 },
      { id: 'height', type: 'range', labelKey: 'mezzanine.fields.height', unit: 'm', min: 2.4, max: 6, step: 0.1, value: 3.5 },
      { id: 'span', type: 'range', labelKey: 'mezzanine.fields.span', unit: 'm', min: 3, max: 9, step: 0.5, value: 6 },
    ] },
    { titleKey: 'mezzanine.sections.load', fields: [
      { id: 'load', type: 'seg', labelKey: 'mezzanine.fields.load', value: 'orta', options: [
        { value: 'hafif', labelKey: 'mezzanine.options.load.hafif' }, { value: 'orta', labelKey: 'mezzanine.options.load.orta' }, { value: 'agir', labelKey: 'mezzanine.options.load.agir' },
      ] },
      { id: 'deck', type: 'seg', labelKey: 'mezzanine.fields.deck', value: 'beton', options: [
        { value: 'beton', labelKey: 'mezzanine.options.deck.beton' }, { value: 'izgara', labelKey: 'mezzanine.options.deck.izgara' },
      ] },
      { id: 'stair', type: 'toggle', labelKey: 'mezzanine.fields.stair', value: true },
      { id: 'rail', type: 'toggle', labelKey: 'mezzanine.fields.rail', value: true },
    ] },
  ],
  profiles: [
    { id: 'col', labelKey: 'mezzanine.profiles.col', families: COL_FAM, value: 'HEA160', color: hex(MAT.column) },
    { id: 'main', labelKey: 'mezzanine.profiles.main', families: BEAM_FAM, value: 'IPE300', color: hex(MAT.beam) },
    { id: 'sec', labelKey: 'mezzanine.profiles.sec', families: BEAM_FAM, value: 'IPE160', color: hex(MAT.secondary) },
    { id: 'stringer', labelKey: 'mezzanine.profiles.stringer', families: ['UPN', 'UPE'], value: 'UPN200', color: hex(MAT.door), show: (s) => Boolean(s['stair']) },
    { id: 'post', labelKey: 'mezzanine.profiles.post', families: ['SHS', 'RHS', 'CHS'], value: 'SHS40x40x3', color: hex(MAT.galv), show: (s) => Boolean(s['rail']) || Boolean(s['stair']) },
    { id: 'handrail', labelKey: 'mezzanine.profiles.handrail', families: ['CHS', 'SHS'], value: 'CHS42.4x2.6', color: hex(MAT.galv), show: (s) => Boolean(s['rail']) || Boolean(s['stair']) },
  ],
  noteKeys: ['mezzanine.notes.0', 'mezzanine.notes.1'],
  normalize(s, changed) {
    if (changed === 'load') {
      const L = LOADS[String(s['load'])];
      if (L) { s['col'] = L.col; s['main'] = L.main; s['sec'] = L.sec; }
    }
  },
  build(s: AppState, kit: Kit, ctx: BuildContext) {
    const { t, fmt } = ctx;
    const T = PLATE_T;
    const width = Number(s['width']), length = Number(s['length']), height = Number(s['height']), span = Number(s['span']);
    const codes = { col: String(s['col']), main: String(s['main']), sec: String(s['sec']), stringer: String(s['stringer']), post: String(s['post']), handrail: String(s['handrail']) };
    const load = String(s['load']);
    const hw = width / 2, hl = length / 2;
    const gx = grid(width, span), gz = grid(length, span);
    const C = dims(ctx, codes.col), M = dims(ctx, codes.main), S = dims(ctx, codes.sec);
    const concrete = s['deck'] === 'beton';
    const slabT = concrete ? 0.12 : 0.03;
    const yTop = height - slabT;      // çelik üst kotu
    const tally = createTally(kit, ctx);
    const isI = (d: Dims) => d.p.kind === 'I';

    // ---- kolonlar ----
    gx.pts.forEach((x) => gz.pts.forEach((z) => {
      tally.put('col', t('mezzanine.bom.col'), codes.col, MAT.column, [x, 0, z], [x, yTop, z]);
      kit.basePlate(x, z, codes.col);
      kit.box(x, yTop + T / 2, z, C.h + 0.04, T, C.b + 0.02);
    }));

    // ---- ana kirişler (X): kolon başlığına alın levhası ----
    const ym = yTop - M.h / 2;
    gz.pts.forEach((z) => {
      for (let i = 0; i < gx.n; i++) {
        tally.put('main', t('mezzanine.bom.main'), codes.main, MAT.beam, [gx.pts[i]! + C.h / 2 + T, ym, z], [gx.pts[i + 1]! - C.h / 2 - T, ym, z]);
        ([[gx.pts[i]!, 1], [gx.pts[i + 1]!, -1]] as const).forEach(([xc, sg]) => {
          const face = xc + sg * (C.h / 2), epW = Math.min(C.b, M.b + 0.04), bz = Math.max(M.tw / 2 + 0.03, Math.min(epW / 2 - 0.03, 0.06));
          kit.box(face + (sg * T) / 2, ym, z, T, M.h + 0.04, epW);
          [yTop - 0.05, yTop - M.h + 0.05].concat(M.h > 0.28 ? [yTop - M.h / 2] : []).forEach((y) =>
            [-bz, bz].forEach((dz) => kit.bolt([face + (sg * (T - C.tf)) / 2, y, z + dz], [sg, 0, 0], T + C.tf, 0.016)));
          if (isI(C)) [yTop - M.tf / 2, yTop - M.h + M.tf / 2].forEach((y) => kit.box(xc, y, z, C.h - 2 * C.tf, T, C.b - 0.02));
        });
      }
    });

    // ---- tali kirişler (Z): ana kiriş / kolon gövdesine kayma levhası ----
    const nSec = Math.ceil(width / 2.5) + 1;
    const ys = yTop - S.h / 2;
    const fin = (xb: number, zc: number, sg: number, webT: number, flangeHalf: number) => {
      const z0 = zc + sg * (webT / 2), z1 = zc + sg * (flangeHalf + 0.1), hgt = Math.max(0.08, S.h - 2 * S.tf - 0.03);
      kit.box(xb + S.tw / 2 + T / 2, ys, (z0 + z1) / 2, T, hgt, Math.abs(z1 - z0));
      const nb = hgt > 0.15 ? 3 : 2;
      for (let k = 0; k < nb; k++) kit.bolt([xb + T / 2, ys + (k - (nb - 1) / 2) * Math.min(0.06, (hgt - 0.04) / (nb - 1)), zc + sg * (flangeHalf + 0.055)], X, S.tw + T, 0.016);
    };
    for (let k = 0; k < nSec; k++) {
      const x = -hw + (k * width) / (nSec - 1);
      const onCol = gx.pts.some((px) => Math.abs(px - x) < 1e-6);
      for (let j = 0; j < gz.n; j++) {
        const half = onCol ? C.b / 2 : M.b / 2, web = onCol ? C.tw : M.tw;
        tally.put('sec', t('mezzanine.bom.sec'), codes.sec, MAT.secondary, [x, ys, gz.pts[j]! + half + 0.015], [x, ys, gz.pts[j + 1]! - half - 0.015]);
        fin(x, gz.pts[j]!, 1, web, half);
        fin(x, gz.pts[j + 1]!, -1, web, half);
      }
    }

    // ---- döşeme ----
    kit.box(0, yTop + slabT / 2, 0, width + 0.1, slabT, length + 0.1, concrete ? deckMat : gratingMat);

    // ---- merdiven: platformun +X kenarından dışa, düz kollu ----
    let stair: { zc: number; sw: number; n: number; run: number } | null = null;
    if (s['stair']) {
      const nRise = Math.ceil(height / 0.18), rise = height / nRise, going = 0.27, run = (nRise - 1) * going;
      const sw = 1.0, zc = hl - Math.min(1.5, length / 2 - 0.6), x0 = hw + 0.05, x1 = x0 + run;
      const U = dims(ctx, codes.stringer);
      stair = { zc, sw, n: nRise, run };
      [-1, 1].forEach((sg) => {
        const z = zc + sg * (sw / 2 + U.b / 2);
        const a: V3 = [x1 + 0.1, U.h / 2 + 0.05, z], b: V3 = [x0, yTop - U.h / 2, z];
        tally.put('stringer', t('mezzanine.bom.stringer'), codes.stringer, MAT.door, a, b, { ref: [0, 0, sg] });
        kit.box(x0 - T / 2, yTop - U.h / 2, z, T, U.h + 0.06, U.b + 0.04);                     // üst alın levhası (kenar kirişine)
        [-0.05, 0.05].forEach((dy) => kit.bolt([x0 - T / 2 - 0.004, yTop - U.h / 2 + dy, z], [-1, 0, 0], T + 0.01, 0.016));
        kit.box(x1 + 0.1, T / 2, z, 0.3, T, U.b + 0.12);                                          // alt taban levhası
        [-1, 1].forEach((r) => kit.bolt([x1 + 0.1 + r * 0.1, T / 2, z], UP, T, 0.016));
      });
      for (let i = 1; i < nRise; i++) {
        const x = x1 - (i - 1) * going - going / 2, y = i * rise;
        kit.box(x, y - 0.015, zc, going + 0.03, 0.03, sw, gratingMat);
      }
    }

    // ---- korkuluk: dikme her ~1,5 m, küpeşte + ara kayıt + süpürgelik; dikmeler 20 mm taban levhasıyla ----
    const P = dims(ctx, codes.post), HR = dims(ctx, codes.handrail);
    const railH = 1.1;
    const railRun = (a: V3, b: V3, onSlab = true) => {
      const A = v3(a), B = v3(b), L = A.distanceTo(B); if (L < 0.3) return;
      const n = Math.max(1, Math.ceil(L / 1.5)), dir = B.clone().sub(A).normalize();
      for (let i = 0; i <= n; i++) {
        const p = A.clone().addScaledVector(dir, (i * L) / n);
        tally.put('post', t('mezzanine.bom.post'), codes.post, MAT.galv, [p.x, p.y, p.z], [p.x, p.y + railH, p.z]);
        if (onSlab) {
          kit.box(p.x, p.y + T / 2, p.z, P.b + 0.06, T, P.h + 0.06);
          [-1, 1].forEach((r) => kit.bolt([p.x + r * (P.b / 2 + 0.018), p.y + T / 2, p.z], UP, T + slabT, 0.012));
        }
      }
      const up = (y: number): V3 => [A.x, A.y + y, A.z], upB = (y: number): V3 => [B.x, B.y + y, B.z];
      tally.put('handrail', t('mezzanine.bom.handrail'), codes.handrail, MAT.galv, up(railH + HR.h / 2), upB(railH + HR.h / 2));
      tally.put('mid', t('mezzanine.bom.mid'), 'SHS30x30x2', MAT.galv, up(0.55), upB(0.55));
      if (onSlab) tally.put('toe', t('mezzanine.bom.toe'), 'FL100x4', MAT.galv, up(0.06), upB(0.06), { ref: Y });
    };
    if (s['rail']) {
      const y = height;
      const c: readonly V3[] = [[-hw, y, -hl], [hw, y, -hl], [hw, y, hl], [-hw, y, hl]];
      railRun(c[0]!, c[1]!); railRun(c[3]!, c[0]!); railRun(c[2]!, c[3]!);
      if (stair) { railRun(c[1]!, [hw, y, stair.zc - stair.sw / 2 - 0.05]); railRun([hw, y, stair.zc + stair.sw / 2 + 0.05], c[2]!); }
      else railRun(c[1]!, c[2]!);
    }
    if (stair) {
      const x0 = hw + 0.05, x1 = x0 + stair.run;
      const st = stair;
      [-1, 1].forEach((sg) => railRun([x1 + 0.05, 0.05, st.zc + sg * (st.sw / 2 + 0.12)], [x0 + 0.05, height - 0.05, st.zc + sg * (st.sw / 2 + 0.12)], false));
    }

    // ---- metraj ----
    const area = width * length;
    const bom: BomItem[] = [{ group: t('mezzanine.groups.steel') }, tally.row('col'), tally.row('main'), tally.row('sec')].filter((r): r is BomItem => r !== null);
    bom.push({ group: t('mezzanine.groups.deck') });
    if (concrete) bom.push(
      { key: 'deck', name: t('mezzanine.bom.deck'), spec: t('mezzanine.spec.deck', { kg: fmt(DECK_KG, 1) }), amount: area, unit: 'm2', kg: area * DECK_KG },
      { key: 'concrete', name: t('mezzanine.bom.concrete'), spec: t('mezzanine.spec.concrete'), amount: area * 0.1, unit: 'm3' });
    else bom.push({ key: 'grating', name: t('mezzanine.bom.grating'), spec: t('mezzanine.spec.grating', { kg: GRATING_KG }), amount: area, unit: 'm2', kg: area * GRATING_KG });
    if (stair) {
      bom.push({ group: t('mezzanine.groups.stair') });
      const stringer = tally.row('stringer'); if (stringer) bom.push(stringer);
      bom.push({ key: 'tread', name: t('mezzanine.bom.tread'), spec: t('mezzanine.spec.tread', { w: fmt(stair.sw * 1000) }), qty: stair.n - 1, unit: 'pcs', kg: (stair.n - 1) * TREAD_KG, steel: true });
    }
    if (s['rail'] || s['stair']) {
      bom.push({ group: t('mezzanine.groups.rail') });
      for (const r of [tally.row('post'), tally.row('handrail'), tally.row('mid'), tally.row('toe')]) if (r) bom.push(r);
    }
    const q = (LOADS[load] ?? LOADS['orta']!).q;
    return {
      kpis: [
        { label: t('mezzanine.kpi.area'), value: `${fmt(area, 1)} m²` },
        { label: t('mezzanine.kpi.load'), value: `${fmt(q, 1)} kN/m²` },
        { label: t('mezzanine.kpi.grid'), value: `${fmt(gx.step, 2)} × ${fmt(gz.step, 2)} m` },
        { label: t('mezzanine.kpi.columns'), value: `${(gx.n + 1) * (gz.n + 1)}` },
      ],
      flag: t('mezzanine.flag.load', { name: t(`mezzanine.loadNames.${load}`), q: fmt(q, 1), col: ctx.catalog.label(codes.col), main: ctx.catalog.label(codes.main), sec: ctx.catalog.label(codes.sec) }),
      chip: { strong: `${fmt(width, 1)} × ${fmt(length, 1)} m`, rest: t('mezzanine.chip', { area: fmt(area, 1), q: fmt(q, 1) }) },
      bom,
      legend: [{ color: hex(MAT.column), label: t('mezzanine.legend.column') }, { color: hex(MAT.beam), label: t('mezzanine.legend.beam') }, { color: hex(MAT.secondary), label: t('mezzanine.legend.secondary') },
        { color: hex(MAT.door), label: t('mezzanine.legend.stair') }, { color: hex(MAT.galv), label: t('mezzanine.legend.rail') }, { color: hex(MAT.plate), label: t('mezzanine.legend.plate') }],
    };
  },
};
