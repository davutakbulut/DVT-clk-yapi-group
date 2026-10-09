import { createTally, dims } from '../helpers';
import { UNIT_BOX, type Kit } from '../kit';
import { customMat, hex, MAT, type MaterialDesc } from '../materials';
import type { AppDef, AppState, BomItem, BuildContext } from '../types';
import { transform, X, Y, type Transform } from '../vec';

/**
 * ALÇIPAN BÖLME DUVAR (K-110, prototip `alcipan-duvar.js`nin bire bir portu).
 * Hafif galvaniz profil (CW / UW) ya da kutu profil karkas; çelik bağlantı levhası yok.
 * Metin anahtarları: Engine.drywall.* — levha adları `drywall.boardNames.<key>` (tam), `drywall.boardLower.<key>` (çip, küçük harf; K-16 toLowerCase yasağı).
 */
const BOARDS = {
  beyaz: { color: 0xEDEDE8, kg: 8.7 },
  yesil: { color: 0x9CC5A1, kg: 9.2 },
  kirmizi: { color: 0xD9A6A0, kg: 10.2 },
} as const;
type BoardKey = keyof typeof BOARDS;
const BOARD_KEYS = Object.keys(BOARDS) as BoardKey[];
const BOARD_T = 0.0125, WOOL_KG = 2.3, WASTE = 1.08;
const BOARD_MAT: Readonly<Record<BoardKey, MaterialDesc>> = {
  beyaz: customMat('board_beyaz', BOARDS.beyaz.color, { roughness: 0.9, metalness: 0 }),
  yesil: customMat('board_yesil', BOARDS.yesil.color, { roughness: 0.9, metalness: 0 }),
  kirmizi: customMat('board_kirmizi', BOARDS.kirmizi.color, { roughness: 0.9, metalness: 0 }),
};
const woolMat = customMat('wool', 0xD9B65A, { roughness: 1, metalness: 0 });
const studMat = customMat('stud', 0xB8C0C6, { roughness: 0.35, metalness: 0.7 });
const floorMat = customMat('floor', 0x2B3035, { roughness: 1, metalness: 0 });

const isGalv = (s: AppState) => String(s['frame']) === 'galv';
const isBox = (s: AppState) => String(s['frame']) === 'kutu';
const hasDoors = (s: AppState) => Number(s['doors']) > 0;

export const drywall: AppDef = {
  id: 'drywall',
  frontDir: [0, 0.1, 1],
  views: { iso: [0.6, 0.35, 1] },
  sections: [
    { titleKey: 'drywall.sections.dims', fields: [
      { id: 'length', type: 'range', labelKey: 'drywall.fields.length', unit: 'm', min: 1, max: 40, step: 0.1, value: 10 },
      { id: 'height', type: 'range', labelKey: 'drywall.fields.height', unit: 'm', min: 2, max: 6, step: 0.05, value: 2.8 },
    ] },
    { titleKey: 'drywall.sections.boardFrame', fields: [
      { id: 'board', type: 'seg', labelKey: 'drywall.fields.board', options: BOARD_KEYS.map((k) => ({ value: k, labelKey: `drywall.options.board.${k}` })), value: 'beyaz' },
      { id: 'size', type: 'seg', labelKey: 'drywall.fields.size', options: [{ value: 2.0, labelKey: 'drywall.options.size.2000' }, { value: 2.5, labelKey: 'drywall.options.size.2500' }, { value: 3.0, labelKey: 'drywall.options.size.3000' }], value: 2.5 },
      { id: 'layers', type: 'range', labelKey: 'drywall.fields.layers', unit: 'layers', min: 1, max: 2, step: 1, value: 1 },
      { id: 'frame', type: 'seg', labelKey: 'drywall.fields.frame', options: [{ value: 'galv', labelKey: 'drywall.options.frame.galv' }, { value: 'kutu', labelKey: 'drywall.options.frame.kutu' }], value: 'galv' },
      { id: 'studSp', type: 'seg', labelKey: 'drywall.fields.studSp', options: [{ value: 0.4, labelKey: 'drywall.options.studSp.40' }, { value: 0.6, labelKey: 'drywall.options.studSp.60' }], value: 0.6 },
      { id: 'double', type: 'toggle', labelKey: 'drywall.fields.double', value: true },
      { id: 'wool', type: 'toggle', labelKey: 'drywall.fields.wool', value: true },
    ] },
    { titleKey: 'drywall.sections.doorView', fields: [
      { id: 'doors', type: 'range', labelKey: 'drywall.fields.doors', unit: 'pcs', min: 0, max: 6, step: 1, value: 1 },
      { id: 'doorW', type: 'range', labelKey: 'drywall.fields.doorW', unit: 'm', min: 0.7, max: 1.6, step: 0.05, value: 0.9, show: hasDoors },
      { id: 'doorH', type: 'range', labelKey: 'drywall.fields.doorH', unit: 'm', min: 1.9, max: 2.4, step: 0.05, value: 2.1, show: hasDoors },
      { id: 'cut', type: 'toggle', labelKey: 'drywall.fields.cut', value: true },
    ] },
  ],
  profiles: [
    { id: 'stud', labelKey: 'drywall.profiles.stud', families: ['CW'], value: 'CW75', color: hex(studMat), show: isGalv },
    { id: 'track', labelKey: 'drywall.profiles.track', families: ['UW'], value: 'UW75', color: hex(studMat), show: isGalv },
    { id: 'studBox', labelKey: 'drywall.profiles.studBox', families: ['SHS', 'RHS'], value: 'RHS80x40x2', color: hex(studMat), show: isBox },
    { id: 'trackBox', labelKey: 'drywall.profiles.trackBox', families: ['SHS', 'RHS'], value: 'RHS80x40x2', color: hex(studMat), show: isBox },
  ],
  noteKeys: ['drywall.notes.0', 'drywall.notes.1'],
  normalize(s) {
    const height = Number(s['height']);
    if (Number(s['doorH']) > height - 0.2) s['doorH'] = Math.max(1.9, +(height - 0.2).toFixed(2));
  },
  build(s: AppState, kit: Kit, ctx: BuildContext) {
    const { t, fmt } = ctx;
    const L = Number(s['length']), H = Number(s['height']);
    const boxF = isBox(s);
    const studN = String(boxF ? s['studBox'] : s['stud']), trackN = String(boxF ? s['trackBox'] : s['track']);
    const studL = t(boxF ? 'drywall.bom.studBox' : 'drywall.bom.stud'), trackL = t(boxF ? 'drywall.bom.trackBox' : 'drywall.bom.track');
    const St = dims(ctx, studN), Tr = dims(ctx, trackN);
    const web = St.h;                       // karkas genişliği
    const tally = createTally(kit, ctx);
    const bk: BoardKey = BOARD_KEYS.includes(String(s['board']) as BoardKey) ? (String(s['board']) as BoardKey) : 'beyaz';
    const B = BOARDS[bk], bMat = BOARD_MAT[bk];
    const sides = s['double'] ? 2 : 1;
    const layers = Number(s['layers']), studSp = Number(s['studSp']), bl = Number(s['size']);
    const doorsReq = Number(s['doors']), doorW = Number(s['doorW']), doorH = Number(s['doorH']);
    const cut = Boolean(s['cut']);

    // ---- kapı yerleşimi ----
    const nd = Math.min(doorsReq, Math.floor(L / (doorW + 0.8)));
    const doors = Array.from({ length: nd }, (_, i) => { const c = -L / 2 + ((i + 1) * L) / (nd + 1); return { a: c - doorW / 2, b: c + doorW / 2 }; });
    const inDoor = (x: number, pad = 0) => doors.some((d) => x > d.a - pad && x < d.b + pad);

    // ---- zemin ----
    kit.box(0, -0.01, 0, L + 1.2, 0.02, 2.2, floorMat);

    // ---- U raylar: tabanda kapı boşluğu kesilir ----
    const segs: [number, number][] = [];
    let x0 = -L / 2;
    doors.forEach((d) => { segs.push([x0, d.a]); x0 = d.b; });
    segs.push([x0, L / 2]);
    segs.forEach(([a, b]) => { if (b - a > 0.05) tally.put('track', trackL, trackN, studMat, [a, Tr.b / 2, 0], [b, Tr.b / 2, 0], { ref: Y }); });
    tally.put('track', trackL, trackN, studMat, [-L / 2, H - Tr.b / 2, 0], [L / 2, H - Tr.b / 2, 0], { ref: Y, roll: Math.PI });

    // ---- C dikmeler ----
    const studX: number[] = [];
    for (let x = -L / 2; x <= L / 2 + 1e-6; x += studSp) if (!inDoor(x, 0.02)) studX.push(Math.min(x, L / 2 - 0.025));
    if (studX[studX.length - 1]! < L / 2 - 0.06) studX.push(L / 2 - 0.025);
    studX[0] = -L / 2 + 0.025;
    doors.forEach((d) => { studX.push(d.a - 0.025, d.b + 0.025); });
    studX.forEach((x) => tally.put('stud', studL, studN, studMat, [x, (boxF ? Tr.b : Tr.t) + 0.002, 0], [x, H - (boxF ? Tr.b : Tr.t) - 0.002, 0], { ref: X }));
    // kapı üst kayıtı
    doors.forEach((d) => tally.put('header', t('drywall.bom.header'), trackN, studMat, [d.a - 0.05, doorH + Tr.b / 2, 0], [d.b + 0.05, doorH + Tr.b / 2, 0], { ref: Y, roll: Math.PI }));

    // ---- taş yünü ----
    if (s['wool']) {
      const xs = [...new Set(studX.map((v) => +v.toFixed(3)))].sort((a, b) => a - b);
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i]! + 0.03, b = xs[i + 1]! - 0.03, mid = (a + b) / 2;
        if (b - a < 0.05) continue;
        if (inDoor(mid)) { kit.box(mid, (doorH + H) / 2 + 0.03, 0, b - a, H - doorH - 0.1, 0.05, woolMat); continue; }
        kit.box(mid, H / 2, 0, b - a, H - 0.1, 0.05, woolMat);
      }
    }

    // ---- alçıpan levhalar (1200 mm, şaşırtmalı derz) ----
    const bw = 1.2;
    const mats: Transform[] = [];
    const lim = cut ? 0 : L / 2;
    for (let side = 0; side < sides; side++) {
      const sg = side === 0 ? 1 : -1;
      for (let layer = 0; layer < layers; layer++) {
        const z = sg * (web / 2 + BOARD_T * (layer + 0.5));
        const shift = (layer % 2) * 0.6 + side * 0.3;
        for (let xa = -L / 2 - shift; xa < L / 2; xa += bw) {
          const a = Math.max(-L / 2, xa), b = Math.min(L / 2, xa + bw);
          if (b - a < 0.01) continue;
          const col = Math.round((xa + L / 2 + shift) / bw);
          for (let ya = -((col % 2) * bl) / 2; ya < H; ya += bl) {
            const y0 = Math.max(0, ya), y1 = Math.min(H, ya + bl);
            if (y1 - y0 < 0.01) continue;
            // kapı boşluğunu ve kesit bölgesini dışarıda bırak
            const pieces: [number, number][] = [[a, b]];
            const cuts: [number, number][] = doors.filter(() => y0 < doorH).map((d) => [d.a, d.b]);
            if (side === 0 && cut) cuts.push([lim, L / 2 + 1]);
            let parts = pieces;
            cuts.forEach(([ca, cb]) => {
              parts = parts.flatMap(([pa, pb]): [number, number][] => {
                if (cb <= pa || ca >= pb) return [[pa, pb]];
                const two: [number, number][] = [[pa, Math.max(pa, ca)], [Math.min(pb, cb), pb]];
                return two.filter(([u, v]) => v - u > 0.01);
              });
            });
            parts.forEach(([pa, pb]) => {
              const yy0 = y0, yy1 = doors.some((d) => pa < d.b && pb > d.a) ? Math.max(y0, doorH) : y1;
              if (yy1 - yy0 < 0.01) return;
              mats.push(transform([(pa + pb) / 2, (yy0 + yy1) / 2, z], undefined, [pb - pa - 0.003, yy1 - yy0 - 0.003, BOARD_T]));
            });
            // kapı üstü parçası
            doors.forEach((d) => {
              if (!(y1 > doorH && y0 < H)) return;
              const pa = Math.max(a, d.a), pb = Math.min(b, d.b);
              if (pb - pa < 0.01 || y0 >= doorH) return;
              if (side === 0 && cut && pa >= lim) return;
              mats.push(transform([(pa + pb) / 2, (doorH + y1) / 2, z], undefined, [pb - pa - 0.003, y1 - doorH - 0.003, BOARD_T]));
            });
          }
        }
      }
    }
    kit.instanced(UNIT_BOX, bMat, mats);
    // kapı kasaları (görsel)
    doors.forEach((d) => {
      const depth = web + 2 * BOARD_T * layers + 0.02;
      [d.a, d.b].forEach((x) => kit.box(x, doorH / 2, 0, 0.03, doorH, depth, MAT.door));
      kit.box((d.a + d.b) / 2, doorH, 0, d.b - d.a + 0.03, 0.03, depth, MAT.door);
    });

    // ---- metraj ----
    const net = L * H - nd * doorW * doorH;
    const clad = net * sides * layers;
    const boardA = 1.2 * bl;
    const nBoards = Math.ceil((clad * WASTE) / boardA);
    const bom: BomItem[] = [{ group: t('drywall.groups.cladding') },
      { key: 'board', name: t('drywall.bom.board'), spec: t('drywall.spec.board', { board: t(`drywall.boardNames.${bk}`), len: fmt(bl * 1000), kg: fmt(B.kg, 1) }), qty: nBoards, unit: 'pcs', amount: nBoards * boardA, unit2: 'm2', kg: nBoards * boardA * B.kg },
      { group: t(boxF ? 'drywall.groups.frameBox' : 'drywall.groups.frameGalv') }, tally.row('stud'), tally.row('track'), tally.row('header'),
      { group: t('drywall.groups.consumables') },
      { key: 'screw', name: t('drywall.bom.screw'), spec: t('drywall.spec.screw'), qty: Math.round(clad * 15), unit: 'pcs' },
      { key: 'tape', name: t('drywall.bom.tape'), amount: clad * 1.4, unit: 'm' },
      { key: 'filler', name: t('drywall.bom.filler'), amount: clad * 0.4, unit: 'kg', kg: clad * 0.4 },
      { key: 'seal', name: t('drywall.bom.seal'), spec: t('drywall.spec.seal'), amount: 2 * L + 2 * H, unit: 'm' },
      { key: 'dowel', name: t('drywall.bom.dowel'), spec: t('drywall.spec.dowel'), qty: Math.ceil((2 * L) / 0.6), unit: 'pcs' }].filter((r): r is BomItem => r !== null);
    if (s['wool']) bom.push({ key: 'wool', name: t('drywall.bom.wool'), spec: t('drywall.spec.wool', { kg: fmt(WOOL_KG, 1) }), amount: net * WASTE, unit: 'm2', kg: net * WASTE * WOOL_KG });
    return {
      kpis: [
        { label: t('drywall.kpi.net'), value: `${fmt(net, 1)} m²` },
        { label: t('drywall.kpi.clad'), value: `${fmt(clad, 1)} m²` },
        { label: t('drywall.kpi.boards'), value: `${nBoards}` },
        { label: t('drywall.kpi.thickness'), value: `${fmt((web + sides * layers * BOARD_T) * 1000)} mm` },
      ],
      flag: nd < doorsReq ? t('drywall.flag.doors', { doors: doorsReq, placed: nd }) : '',
      chip: { strong: `${fmt(L, 1)} × ${fmt(H, 2)} m`, rest: t('drywall.chip', { board: t(`drywall.boardLower.${bk}`), stud: ctx.catalog.label(studN) }) },
      bom,
      legend: [{ color: hex(bMat), label: t('drywall.legend.board') }, { color: hex(studMat), label: t('drywall.legend.frame') }, { color: hex(woolMat), label: t('drywall.legend.wool') }, { color: hex(MAT.door), label: t('drywall.legend.door') }],
    };
  },
};
