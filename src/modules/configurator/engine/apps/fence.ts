import { createTally, dims } from '../helpers';
import type { Kit } from '../kit';
import { customMat, hex, MAT } from '../materials';
import { isGroup, type AppDef, type AppState, type BomItem, type BomRow, type BuildContext } from '../types';
import { basisFromUnitVectors, makeBasis, transform, X, Y, type Transform } from '../vec';

/**
 * ÇİT & KORKULUK (K-110, prototip `cit-korkuluk.js`nin bire bir portu). Bağlantı levhası yok — direkler zemine gömülü.
 * Metin anahtarları: Engine.fence.* (alanlar, kalemler, notlar). Profil kodları ASCII katalog kodudur.
 */
const BOX_FAM = ['SHS', 'RHS', 'CHS'] as const;
const MESH_KG = 3.9; // 5 mm tel panel (50×200 göz) kg/m²
const ZINC = 0.06;   // sıcak daldırma galvaniz ağırlık payı
const FINISH_KEYS = ['galv', 'galvboya', 'boya'] as const;
type FinishKey = (typeof FINISH_KEYS)[number];
const fenceMats = {
  galv: customMat('fence_galv', 0xA9B2B8, { roughness: 0.4, metalness: 0.6 }),
  galvboya: customMat('fence_galvboya', 0x3B4247, { roughness: 0.5, metalness: 0.3 }),
  boya: customMat('fence_boya', 0x2F5D50, { roughness: 0.5, metalness: 0.3 }),
} as const;
const soilMat = customMat('soil', 0x3A3428, { roughness: 1, metalness: 0 });
const meshMat = customMat('wiremesh', 0x9AA3A8, { roughness: 0.4, metalness: 0.6, wireframe: true });
const finishOf = (v: unknown): FinishKey => (FINISH_KEYS as readonly string[]).includes(String(v)) ? (String(v) as FinishKey) : 'galv';

export const fence: AppDef = {
  id: 'fence',
  frontDir: [0, 0.15, 1],
  views: { iso: [0.22, 0.3, 1] },
  sections: [
    { titleKey: 'fence.sections.dims', fields: [
      { id: 'length', type: 'range', labelKey: 'fence.fields.length', unit: 'm', min: 2, max: 300, step: 0.5, value: 50 },
      { id: 'height', type: 'range', labelKey: 'fence.fields.height', unit: 'm', min: 0.8, max: 3, step: 0.1, value: 1.8 },
      { id: 'postSp', type: 'range', labelKey: 'fence.fields.postSp', unit: 'm', min: 1.2, max: 3.5, step: 0.1, value: 2.5 },
      { id: 'rails', type: 'range', labelKey: 'fence.fields.rails', unit: 'pcs', min: 2, max: 5, step: 1, value: 3 },
      { id: 'embed', type: 'range', labelKey: 'fence.fields.embed', unit: 'm', min: 0, max: 1, step: 0.05, value: 0.5 },
    ] },
    { titleKey: 'fence.sections.infill', fields: [
      { id: 'infill', type: 'seg', labelKey: 'fence.fields.infill', value: 'bar', options: [
        { value: 'bar', labelKey: 'fence.options.infill.bar' }, { value: 'slat', labelKey: 'fence.options.infill.slat' },
        { value: 'panel', labelKey: 'fence.options.infill.panel' }, { value: 'none', labelKey: 'fence.options.infill.none' },
      ] },
      { id: 'barSp', type: 'range', labelKey: 'fence.fields.barSp', unit: 'm', min: 0.08, max: 0.25, step: 0.01, value: 0.12, show: (s) => String(s['infill']) === 'bar' },
      { id: 'slatSp', type: 'range', labelKey: 'fence.fields.slatSp', unit: 'm', min: 0.06, max: 0.3, step: 0.01, value: 0.1, show: (s) => String(s['infill']) === 'slat' },
      { id: 'gates', type: 'range', labelKey: 'fence.fields.gates', unit: 'pcs', min: 0, max: 6, step: 1, value: 1 },
      { id: 'gateW', type: 'range', labelKey: 'fence.fields.gateW', unit: 'm', min: 0.9, max: 6, step: 0.1, value: 1.2, show: (s) => Number(s['gates']) > 0 },
      { id: 'finish', type: 'seg', labelKey: 'fence.fields.finish', value: 'galv', options: FINISH_KEYS.map((k) => ({ value: k, labelKey: `fence.options.finish.${k}` })) },
    ] },
  ],
  profiles: [
    { id: 'post', labelKey: 'fence.profiles.post', families: BOX_FAM, value: 'SHS60x60x3', color: hex(MAT.column) },
    { id: 'rail', labelKey: 'fence.profiles.rail', families: ['RHS', 'SHS', 'CHS', 'L'], value: 'RHS40x20x2', color: hex(MAT.secondary) },
    { id: 'bar', labelKey: 'fence.profiles.bar', families: ['SHS', 'RHS', 'CHS', 'FL'], value: 'SHS20x20x1.5', color: hex(MAT.brace), show: (s) => String(s['infill']) === 'bar' },
    { id: 'slat', labelKey: 'fence.profiles.slat', families: ['FL', 'RHS'], value: 'FL50x5', color: hex(MAT.brace), show: (s) => String(s['infill']) === 'slat' },
    { id: 'gateFrame', labelKey: 'fence.profiles.gateFrame', families: BOX_FAM, value: 'SHS40x40x2', color: hex(MAT.door), show: (s) => Number(s['gates']) > 0 },
  ],
  noteKeys: ['fence.notes.0'],
  build(s: AppState, kit: Kit, ctx: BuildContext) {
    const { t, fmt } = ctx;
    const length = Number(s['length']), height = Number(s['height']), postSp = Number(s['postSp']), rails = Number(s['rails']), embed = Number(s['embed']);
    const infill = String(s['infill']), barSp = Number(s['barSp']), slatSp = Number(s['slatSp']), gates = Number(s['gates']), gateW = Number(s['gateW']);
    const finish = finishOf(s['finish']);
    const codes = { post: String(s['post']), rail: String(s['rail']), bar: String(s['bar']), slat: String(s['slat']), gateFrame: String(s['gateFrame']) };
    const mat = fenceMats[finish];
    const Pd = dims(ctx, codes.post), Rd = dims(ctx, codes.rail);
    const tally = createTally(kit, ctx);
    const area = { v: 0 };
    const AL = (code: string) => ctx.profile(code).props.AL;

    // ---- yerleşim: kapılar eşit aralıkla, çit koşuları direk aralığına bölünür ----
    const g = Math.min(gates, Math.max(0, Math.floor(length / (gateW + 1))));
    const gw = gateW;
    const runLen = Math.max(0.5, (length - g * gw) / (g + 1));
    const spans: { a: number; b: number; gate: boolean }[] = [];
    let x = -length / 2;
    for (let i = 0; i <= g; i++) {
      const n = Math.max(1, Math.ceil(runLen / postSp - 1e-9)), sp = runLen / n;
      for (let k = 0; k < n; k++) spans.push({ a: x + k * sp, b: x + (k + 1) * sp, gate: false });
      x += runLen;
      if (i < g) { spans.push({ a: x, b: x + gw, gate: true }); x += gw; }
    }
    const posts = [spans[0]!.a, ...spans.map((sp) => sp.b)];

    // ---- zemin şeridi ----
    kit.box(0, -0.06, 0, length + 1, 0.1, 0.8, soilMat);

    // ---- direkler (instanced değil: az sayıda) ----
    const postLen = height + embed;
    posts.forEach((px) => {
      tally.put('post', t('fence.bom.post'), codes.post, mat, [px, -embed, 0], [px, height + 0.02, 0]);
      kit.box(px, height + 0.025, 0, Pd.b + 0.004, 0.006, Pd.h + 0.004, mat); // kapak
    });

    // ---- kuşaklar ----
    const railYs = Array.from({ length: rails }, (_, i) => 0.15 + (i * (height - 0.25)) / (rails - 1));
    spans.filter((sp) => !sp.gate).forEach((sp) => railYs.forEach((y) =>
      tally.put('rail', t('fence.bom.rail'), codes.rail, mat, [sp.a + Pd.h / 2, y, 0], [sp.b - Pd.h / 2, y, 0], { ref: Y })));

    // ---- dolgu ----
    const fenceRuns = spans.filter((sp) => !sp.gate);
    const yLo = railYs[0]!, yHi = railYs[railYs.length - 1]!;
    if (infill === 'bar') {
      const B = dims(ctx, codes.bar), mats: Transform[] = [];
      const L = yHi - yLo + Rd.h;
      const basis = basisFromUnitVectors([0, 0, 1], [0, 1, 0]);
      fenceRuns.forEach((sp) => {
        const clear = sp.b - sp.a - Pd.h, n = Math.max(1, Math.round(clear / barSp));
        for (let k = 0; k < n; k++) mats.push(transform([sp.a + Pd.h / 2 + ((k + 0.5) * clear) / n, (yLo + yHi) / 2, Rd.h / 2 + B.b / 2], basis));
      });
      kit.instanced(kit.profileGeometry(codes.bar, L, false), mat, mats);
      tally.add('bar', t('fence.bom.bar'), codes.bar, mats.length * L, 1, mats.length);
    } else if (infill === 'slat') {
      const S = dims(ctx, codes.slat), mats: Transform[] = [];
      const ys: number[] = []; for (let y = yLo + 0.08; y < yHi - 0.04; y += slatSp) ys.push(y);
      const basis = makeBasis([0, 1, 0], [0, 0, 1], [1, 0, 0]);
      let total = 0;
      fenceRuns.forEach((sp) => {
        const L = sp.b - sp.a - Pd.h - 0.01;
        ys.forEach((y) => { mats.push(transform([(sp.a + sp.b) / 2, y, Rd.h / 2 + S.t / 2], basis, [1, 1, L])); total += L; });
      });
      kit.instanced(kit.profileGeometry(codes.slat, 1, false), mat, mats);
      tally.add('slat', t('fence.bom.slat'), codes.slat, total, 1, mats.length);
    } else if (infill === 'panel') {
      fenceRuns.forEach((sp) => {
        const w = sp.b - sp.a - Pd.h, hgt = yHi - yLo;
        kit.plane(w, hgt, Math.max(1, Math.round(w / 0.05)), Math.max(1, Math.round(hgt / 0.2)), [(sp.a + sp.b) / 2, (yLo + yHi) / 2, Rd.h / 2 + 0.005], meshMat);
        area.v += w * hgt;
      });
    }

    // ---- kapılar ----
    const GF = dims(ctx, codes.gateFrame);
    spans.filter((sp) => sp.gate).forEach((sp) => {
      const x0 = sp.a + Pd.h / 2 + 0.02, x1 = sp.b - Pd.h / 2 - 0.02, y0 = 0.08, y1 = height - 0.05;
      const fr: [readonly [number, number, number], readonly [number, number, number]][] = [[[x0, y0, 0], [x1, y0, 0]], [[x0, y1, 0], [x1, y1, 0]], [[x0, y0, 0], [x0, y1, 0]], [[x1, y0, 0], [x1, y1, 0]]];
      fr.forEach(([a, b]) => tally.put('gate', t('fence.bom.gate'), codes.gateFrame, MAT.door, a, b, { ref: a[1] === b[1] ? Y : X }));
      tally.put('gate', t('fence.bom.gate'), codes.gateFrame, MAT.door, [x0, (y0 + y1) / 2, 0], [x1, (y0 + y1) / 2, 0], { ref: Y });
      if (infill === 'bar') {
        const clear = x1 - x0 - GF.h, n = Math.max(1, Math.round(clear / barSp));
        for (let k = 0; k < n; k++) {
          const bx = x0 + GF.h / 2 + ((k + 0.5) * clear) / n;
          tally.put('bar', t('fence.bom.bar'), codes.bar, mat, [bx, y0 + GF.h / 2, 0], [bx, y1 - GF.h / 2, 0]);
        }
      }
      // menteşeler ve kilit (görsel)
      [y0 + 0.2, y1 - 0.2].forEach((y) => kit.box(sp.a + Pd.h / 2 + 0.01, y, 0, 0.03, 0.1, 0.05, MAT.bolt));
      kit.box(x1 - 0.02, height / 2, 0.04, 0.06, 0.16, 0.04, MAT.bolt);
    });

    // ---- metraj ----
    const postRow0 = tally.row('post')!;
    const postAmount = posts.length * postLen;
    const postRow: BomRow = { ...postRow0, amount: postAmount, kg: postAmount * Pd.G, spec: t('fence.spec.post', { label: ctx.catalog.label(codes.post), len: fmt(postLen, 2), embed: fmt(embed, 2), kg: fmt(Pd.G, 2) }) };
    const barRow = tally.row('bar'), slatRow = tally.row('slat');
    const rowsP: BomItem[] = [postRow, tally.row('rail'), barRow, slatRow].filter((r): r is BomRow => r !== null);
    const bom: BomItem[] = [{ group: t('fence.groups.fence') }, ...rowsP];
    if (infill === 'panel') bom.push({ key: 'mesh', name: t('fence.bom.mesh'), spec: t('fence.spec.mesh', { kg: fmt(MESH_KG, 1) }), amount: area.v, unit: 'm2', kg: area.v * MESH_KG, steel: true });
    const gateRow0 = tally.row('gate');
    const gateRow: BomRow | null = gateRow0 ? { ...gateRow0, qty: g, spec: `${t('fence.spec.gate', { w: fmt(gw, 2), h: fmt(height - 0.13, 2) })} · ${gateRow0.spec}` } : null;
    if (gateRow) bom.push({ group: t('fence.groups.gates') }, gateRow);
    const steelKg = bom.reduce((acc, r) => acc + (!isGroup(r) && r.steel && r.kg ? r.kg : 0), 0);
    const paint = posts.length * postLen * AL(codes.post) + railYs.length * fenceRuns.reduce((acc, sp) => acc + sp.b - sp.a - Pd.h, 0) * AL(codes.rail)
      + (infill === 'bar' ? (barRow?.amount ?? 0) * AL(codes.bar) : 0)
      + (infill === 'slat' ? (slatRow?.amount ?? 0) * AL(codes.slat) : 0)
      + (gateRow ? (gateRow.amount ?? 0) * AL(codes.gateFrame) : 0) + area.v * 0.4;
    bom.push({ group: t('fence.groups.finish') }, { key: 'paint', name: t('fence.bom.paint'), spec: t(`fence.finishNames.${finish}`), amount: paint, unit: 'm2' });
    if (finish !== 'boya') bom.push({ key: 'zinc', name: t('fence.bom.zinc'), spec: t('fence.spec.zinc', { pct: fmt(ZINC * 100, 0) }), kg: steelKg * ZINC });
    bom.push({ key: 'footing', name: t('fence.bom.footing'), spec: t('fence.spec.footing'), qty: posts.length, amount: posts.length * 0.09 * (embed + 0.1), unit: 'm3' });
    return {
      kpis: [
        { label: t('fence.kpi.length'), value: `${fmt(length, 1)} m` },
        { label: t('fence.kpi.posts'), value: `${posts.length}` },
        { label: t('fence.kpi.paint'), value: `${fmt(paint, 1)} m²` },
        { label: t('fence.kpi.gateLabel'), value: g ? t('fence.kpi.gate', { n: g, w: fmt(gw, 2) }) : t('fence.kpi.noGate') },
      ],
      flag: g < gates ? t('fence.flag.gates', { wanted: gates, placed: g }) : '',
      chip: { strong: `${fmt(length, 1)} m`, rest: t('fence.chip', { h: fmt(height, 2), finish: t(`fence.finishLower.${finish}`) }) },
      bom,
      legend: [{ color: hex(mat), label: t('fence.legend.fence') }, { color: hex(MAT.door), label: t('fence.legend.gate') }, { color: hex(soilMat), label: t('fence.legend.soil') }],
    };
  },
};
