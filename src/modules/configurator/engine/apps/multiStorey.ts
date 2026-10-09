import { createTally, dims, grid } from '../helpers';
import type { Kit } from '../kit';
import { customMat, hex, MAT } from '../materials';
import { PLATE_T, type AppDef, type AppState, type BomItem, type BomRow, type BuildContext } from '../types';
import { UP, v3, Vec3, X, Y, Z } from '../vec';

/**
 * ÇOK KATLI ÇELİK YAPI (K-110, prototip `cok-katli.js`nin bire bir portu).
 * Metin anahtarları: Engine.multiStorey.* (alanlar, kalemler, notlar). Profil kodları ASCII katalog kodudur.
 */
const I_FAM = ['IPE', 'HEA', 'HEB', 'HEM'] as const;
const DECK_KG = 9.5;     // trapez döşeme sacı kg/m²
const SLAB_CONC = 0.095; // 12 cm kompozit döşeme net beton m³/m²
const REBAR_KG = 100;    // radye donatısı (tahmini) kg/m³
const slabMat = customMat('slab', 0x9DA19B, { roughness: 0.9, metalness: 0, transparent: true, opacity: 0.38, depthWrite: false });

export const multiStorey: AppDef = {
  id: 'multiStorey',
  sections: [
    { titleKey: 'multiStorey.sections.dims', fields: [
      { id: 'width', type: 'range', labelKey: 'multiStorey.fields.width', unit: 'm', min: 8, max: 60, step: 1, value: 20 },
      { id: 'length', type: 'range', labelKey: 'multiStorey.fields.length', unit: 'm', min: 8, max: 80, step: 1, value: 30 },
      { id: 'fh', type: 'range', labelKey: 'multiStorey.fields.fh', unit: 'm', min: 2.5, max: 4.5, step: 0.1, value: 3.2 },
      { id: 'floors', type: 'range', labelKey: 'multiStorey.fields.floors', unit: 'floors', min: 1, max: 20, step: 1, value: 5 },
      { id: 'span', type: 'range', labelKey: 'multiStorey.fields.span', unit: 'm', min: 4, max: 8, step: 0.5, value: 5 },
    ] },
    { titleKey: 'multiStorey.sections.options', fields: [
      { id: 'braces', type: 'toggle', labelKey: 'multiStorey.fields.braces', value: true },
      { id: 'slabs', type: 'toggle', labelKey: 'multiStorey.fields.slabs', value: true },
      { id: 'glass', type: 'toggle', labelKey: 'multiStorey.fields.glass', value: false },
    ] },
  ],
  profiles: [
    { id: 'col', labelKey: 'multiStorey.profiles.col', families: I_FAM, value: 'HEB300', color: hex(MAT.column) },
    { id: 'main', labelKey: 'multiStorey.profiles.main', families: I_FAM, value: 'IPE500', color: hex(MAT.beam) },
    { id: 'sec', labelKey: 'multiStorey.profiles.sec', families: I_FAM, value: 'IPE400', color: hex(MAT.secondary) },
    { id: 'brace', labelKey: 'multiStorey.profiles.brace', families: ['CHS', 'SHS'], value: 'CHS139.7x6', color: hex(MAT.brace), show: (s) => Boolean(s['braces']) },
  ],
  noteKeys: ['multiStorey.notes.0', 'multiStorey.notes.1'],
  build(s: AppState, kit: Kit, ctx: BuildContext) {
    const { t, fmt } = ctx;
    const T = PLATE_T;
    const width = Number(s['width']), length = Number(s['length']), fh = Number(s['fh']), floors = Number(s['floors']), span = Number(s['span']);
    const codes = { col: String(s['col']), main: String(s['main']), sec: String(s['sec']), brace: String(s['brace']) };
    const gx = grid(width, span), gz = grid(length, span);
    const C = dims(ctx, codes.col), M = dims(ctx, codes.main), S = dims(ctx, codes.sec);
    const H = floors * fh;
    const tally = createTally(kit, ctx);

    // ---- radye ----
    const raftT = 0.5 + Math.max(0, floors - 3) * 0.1;
    const raftVol = (width + 1.5) * raftT * (length + 1.5);
    kit.box(0, -raftT / 2, 0, width + 1.5, raftT, length + 1.5, MAT.concrete);

    // ---- kolonlar (her 3 katta ek) ----
    const splices: number[] = [];
    for (let f = 3; f < floors; f += 3) splices.push(f * fh + 1.0);
    const spliceN = splices.length;
    gx.pts.forEach((x) => gz.pts.forEach((z) => {
      const cuts = [0, ...splices, H];
      for (let i = 0; i < cuts.length - 1; i++) {
        const y0 = cuts[i]! + (i > 0 ? T : 0), y1 = cuts[i + 1]! - (i < cuts.length - 2 ? T : 0);
        kit.member(codes.col, MAT.column, [x, y0, z], [x, y1, z]);
      }
      tally.add('col', t('multiStorey.bom.col'), codes.col, H, 1, 1); // parça parça çizilir, kolon başına bir kez sayılır
      kit.basePlate(x, z, codes.col);
      kit.box(x, H + T / 2, z, C.h + 0.04, T, C.b + 0.02); // başlık levhası
      splices.forEach((y) => {
        [-1, 1].forEach((sg) => kit.box(x, y + (sg * T) / 2, z, C.h + 0.16, T, C.b));
        [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => kit.bolt([x + sx * (C.h / 2 + 0.05), y, z + sz * C.b * 0.25], UP, 2 * T)));
      });
    }));

    // kayma levhalı (fin plate) mafsallı bağlantı: Z doğrultusundaki kiriş, z = zc'deki gövdeye bağlanır
    const finEnd = (xb: number, yb: number, B: { h: number; tf: number; tw: number }, zc: number, sg: number, webT: number, flangeHalf: number) => {
      const z0 = zc + sg * (webT / 2), z1 = zc + sg * (flangeHalf + 0.12);
      const hgt = Math.max(0.1, B.h - 2 * B.tf - 0.05);
      kit.box(xb + B.tw / 2 + T / 2, yb, (z0 + z1) / 2, T, hgt, Math.abs(z1 - z0));
      const nb = Math.max(2, Math.min(5, Math.floor(hgt / 0.075)));
      for (let k = 0; k < nb; k++) {
        const dy = (k - (nb - 1) / 2) * Math.min(0.075, (hgt - 0.06) / Math.max(1, nb - 1));
        kit.bolt([xb + T / 2, yb + dy, zc + sg * (flangeHalf + 0.07)], X, B.tw + T, 0.016);
      }
    };

    for (let f = 1; f <= floors; f++) {
      const yTop = f * fh, ym = yTop - M.h / 2;
      // ana kirişler X doğrultusu: kolon başlığına alın levhalı
      gz.pts.forEach((z) => {
        for (let i = 0; i < gx.n; i++) {
          const xa = gx.pts[i]! + C.h / 2 + T, xb = gx.pts[i + 1]! - C.h / 2 - T;
          tally.put('main', t('multiStorey.bom.main'), codes.main, MAT.beam, [xa, ym, z], [xb, ym, z]);
          ([[gx.pts[i]!, 1], [gx.pts[i + 1]!, -1]] as const).forEach(([xc, sg]) => {
            const face = xc + sg * (C.h / 2);
            const epW = Math.min(C.b, M.b + 0.04), bz = Math.max(M.tw / 2 + 0.035, Math.min(epW / 2 - 0.03, 0.07));
            kit.box(face + (sg * T) / 2, ym, z, T, M.h + 0.04, epW);
            const rows = [yTop - 0.06, yTop - 0.16, yTop - M.h + 0.16, yTop - M.h + 0.06];
            rows.forEach((y) => [-bz, bz].forEach((dz) => kit.bolt([face + (sg * (T - C.tf)) / 2, y, z + dz], [sg, 0, 0], T + C.tf)));
          });
        }
      });
      // kolon berkitmeleri (X kirişlerinin başlık hizasında)
      gx.pts.forEach((x) => gz.pts.forEach((z) => [yTop - M.tf / 2, yTop - M.h + M.tf / 2].forEach((y) => kit.box(x, y, z, C.h - 2 * C.tf, T, C.b - 0.02))));
      // ana kirişler Z doğrultusu: kolon gövdesine kayma levhası
      gx.pts.forEach((x) => {
        for (let j = 0; j < gz.n; j++) {
          const za = gz.pts[j]! + C.b / 2 + 0.015, zb = gz.pts[j + 1]! - C.b / 2 - 0.015;
          tally.put('main', t('multiStorey.bom.main'), codes.main, MAT.beam, [x, ym, za], [x, ym, zb]);
          finEnd(x, ym, M, gz.pts[j]!, 1, C.tw, C.b / 2);
          finEnd(x, ym, M, gz.pts[j + 1]!, -1, C.tw, C.b / 2);
        }
      });
      // tali kirişler: açıklık ortasında Z doğrultusu, X kirişlerinin gövdesine kayma levhası
      const ys = yTop - S.h / 2;
      for (let i = 0; i < gx.n; i++) {
        const xm = (gx.pts[i]! + gx.pts[i + 1]!) / 2;
        for (let j = 0; j < gz.n; j++) {
          const za = gz.pts[j]! + M.b / 2 + 0.015, zb = gz.pts[j + 1]! - M.b / 2 - 0.015;
          tally.put('sec', t('multiStorey.bom.sec'), codes.sec, MAT.secondary, [xm, ys, za], [xm, ys, zb]);
          finEnd(xm, ys, S, gz.pts[j]!, 1, M.tw, M.b / 2);
          finEnd(xm, ys, S, gz.pts[j + 1]!, -1, M.tw, M.b / 2);
        }
      }
      // döşeme ve cephe
      if (s['slabs']) kit.box(0, yTop + 0.06, 0, width + 0.3, 0.12, length + 0.3, slabMat);
      if (s['glass']) {
        const y0 = yTop - fh, hw = width / 2 + 0.25, hl = length / 2 + 0.25;
        kit.quad([-hw, y0, -hl], [hw, y0, -hl], [hw, yTop, -hl], [-hw, yTop, -hl], MAT.glass);
        kit.quad([-hw, y0, hl], [hw, y0, hl], [hw, yTop, hl], [-hw, yTop, hl], MAT.glass);
        kit.quad([-hw, y0, -hl], [-hw, y0, hl], [-hw, yTop, hl], [-hw, yTop, -hl], MAT.glass);
        kit.quad([hw, y0, -hl], [hw, y0, hl], [hw, yTop, hl], [hw, yTop, -hl], MAT.glass);
      }
    }

    // ---- düşey çaprazlar: her cephenin kenar açıklıklarında, her katta X ----
    if (s['braces']) {
      const nodes = new Map<string, { p: Vec3; e1: Vec3; e2: Vec3; dirs: Vec3[] }>();
      const brace = (p1: Vec3, p2: Vec3, e1: Vec3, e2: Vec3) => {
        const d = kit.pipeBrace(codes.brace, p1, p2);
        tally.add('brace', t('multiStorey.bom.brace'), codes.brace, p1.distanceTo(p2) - 0.56);
        ([[p1, d], [p2, d.clone().negate()]] as const).forEach(([p, dir]) => {
          const k = p.toArray().map((v) => v.toFixed(3)).join(',') + e1.toArray().join('');
          if (!nodes.has(k)) nodes.set(k, { p, e1, e2, dirs: [] });
          nodes.get(k)!.dirs.push(dir);
        });
        return d;
      };
      const bays = (n: number) => (n >= 3 ? [0, n - 1] : [0]);
      const vX = v3(X), vY = v3(Y), vZ = v3(Z);
      for (let f = 1; f <= floors; f++) {
        const yb = (f - 1) * fh + (f === 1 ? 0.45 : 0.35), yt = f * fh - M.h - 0.3;
        if (yt - yb < 1) continue;
        const xBrace = (a: number, b: number, z: number) => {
          const d1 = brace(new Vec3(a, yb, z), new Vec3(b, yt, z), vX, vY), d2 = brace(new Vec3(a, yt, z), new Vec3(b, yb, z), vX, vY);
          kit.gusset([(a + b) / 2, (yb + yt) / 2, z], X, Y, [d1, d1.clone().negate(), d2, d2.clone().negate()], { reach: 0.24, bolts: [] });
        };
        const zBrace = (a: number, b: number, x: number) => {
          const d1 = brace(new Vec3(x, yb, a), new Vec3(x, yt, b), vZ, vY), d2 = brace(new Vec3(x, yt, a), new Vec3(x, yb, b), vZ, vY);
          kit.gusset([x, (yb + yt) / 2, (a + b) / 2], Z, Y, [d1, d1.clone().negate(), d2, d2.clone().negate()], { reach: 0.24, bolts: [] });
        };
        [gz.pts[0]!, gz.pts[gz.n]!].forEach((z) => bays(gx.n).forEach((i) => xBrace(gx.pts[i]!, gx.pts[i + 1]!, z)));
        [gx.pts[0]!, gx.pts[gx.n]!].forEach((x) => bays(gz.n).forEach((j) => zBrace(gz.pts[j]!, gz.pts[j + 1]!, x)));
      }
      nodes.forEach(({ p, e1, e2, dirs }) => kit.gusset(p, e1, e2, dirs));
    }

    // ---- metraj ----
    const floorA = width * length;
    const colRow = tally.row('col');
    const nCols = (gx.n + 1) * (gz.n + 1);
    const colFixed: BomRow | null = colRow
      ? { ...colRow, qty: nCols, spec: spliceN ? `${colRow.spec} · ${t('multiStorey.spec.splices', { n: spliceN })}` : colRow.spec }
      : null;
    const bom: BomItem[] = [{ group: t('multiStorey.groups.steel') }, colFixed, tally.row('main'), tally.row('sec'), tally.row('brace')].filter((r): r is BomItem => r !== null);
    if (s['slabs']) bom.push({ group: t('multiStorey.groups.slab') },
      { key: 'deck', name: t('multiStorey.bom.deck'), spec: t('multiStorey.spec.deck', { kg: fmt(DECK_KG, 1), floors }), amount: floorA * floors, unit: 'm2', kg: floorA * floors * DECK_KG },
      { key: 'slabConc', name: t('multiStorey.bom.slabConc'), spec: t('multiStorey.spec.slabConc'), amount: floorA * floors * SLAB_CONC, unit: 'm3' });
    bom.push({ group: t('multiStorey.groups.foundation') },
      { key: 'raft', name: t('multiStorey.bom.raft'), spec: t('multiStorey.spec.raft', { cm: fmt(raftT * 100) }), amount: raftVol, unit: 'm3' },
      { key: 'rebar', name: t('multiStorey.bom.rebar'), spec: t('multiStorey.spec.rebar', { kg: REBAR_KG }), amount: (raftVol * REBAR_KG) / 1000, unit: 't', amountDec: 2, kg: raftVol * REBAR_KG });
    return {
      kpis: [
        { label: t('multiStorey.kpi.raft'), value: `${fmt(raftT * 100)} cm · ${fmt(raftVol)} m³` },
        { label: t('multiStorey.kpi.floorArea'), value: `${fmt(floorA * floors)} m²` },
        { label: t('multiStorey.kpi.height'), value: `${fmt(H, 1)} m` },
        { label: t('multiStorey.kpi.spacing'), value: `${fmt(gx.step, 2)} × ${fmt(gz.step, 2)} m` },
        { label: t('multiStorey.kpi.columns'), value: `${nCols}` },
      ],
      flag: floors > 3
        ? t('multiStorey.flag.thick', { floors, extra: (floors - 3) * 10, total: fmt(raftT * 100) })
        : t('multiStorey.flag.min', { floors }),
      chip: { strong: `${fmt(width)} × ${fmt(length)} m`, rest: t('multiStorey.chip', { floors, area: fmt(floorA * floors) }) },
      bom,
      groundY: -raftT - 0.01,
      legend: [{ color: hex(MAT.column), label: t('multiStorey.legend.column') }, { color: hex(MAT.beam), label: t('multiStorey.legend.beam') }, { color: hex(MAT.secondary), label: t('multiStorey.legend.secondary') },
        { color: hex(MAT.brace), label: t('multiStorey.legend.brace') }, { color: hex(MAT.plate), label: t('multiStorey.legend.plate') }, { color: hex(MAT.concrete), label: t('multiStorey.legend.concrete') }],
    };
  },
};
