import { createTally, dims } from '../helpers';
import { UNIT_BOX, type Kit } from '../kit';
import { customMat, hex, MAT, type MaterialDesc } from '../materials';
import { PLATE_T, type AppDef, type AppState, type BomItem, type BuildContext } from '../types';
import { IDENTITY, makeBasis, transform, v3, Vec3, X, Y, Z, type Transform, type V2, type V3 } from '../vec';

/**
 * ÇATI & CEPHE KAPLAMA (K-110, prototip `cati-cephe.js`nin bire bir portu).
 * Metin anahtarları: Engine.cladding.* (alanlar, kalemler, notlar). Profil kodları ASCII katalog kodudur.
 */
const TRAPEZ_KG = 4.5;                                                       // 0,50 mm boyalı trapez sac kg/m²
const SANDWICH: Readonly<Record<number, number>> = { 40: 10.5, 60: 11.2, 80: 11.9, 100: 12.6 }; // PIR sandviç panel kg/m²
const COLORS: Readonly<Record<string, number>> = { r9006: 0xA5A8A6, r7016: 0x3B4247, r3009: 0x7A3A2E, r9002: 0xE3E2DA };
const COLOR_KEYS = Object.keys(COLORS);
const ghostMat = customMat('ghost', 0x5A646C, { transparent: true, opacity: 0.45, depthWrite: false });
const trimMat = customMat('trim', 0x8E979D, { roughness: 0.4, metalness: 0.6, doubleSide: true });
const _clad = new Map<string, MaterialDesc>();
const cladMat = (key: string): MaterialDesc => {
  let m = _clad.get(key);
  if (!m) { m = customMat(`clad_${key}`, COLORS[key] ?? COLORS['r9006']!, { roughness: 0.55, metalness: 0.2, doubleSide: true }); _clad.set(key, m); }
  return m;
};

/** Nervürlü (trapez) yüzey: eu boyunca desen, el boyunca len(u) uzunluk, en yönünde nervür; üçgen listesi (x,y,z,…) döndürür. */
function corrugated(o: V3 | Vec3, eu: V3 | Vec3, el: V3 | Vec3, en: V3 | Vec3, u0: number, u1: number, len: (u: number) => number): number[] {
  const P = 0.25, prof: readonly V2[] = [[0, 0], [0.08, 0], [0.1, 0.035], [0.15, 0.035], [0.17, 0]];
  const us: number[] = [];
  for (let base = Math.floor(u0 / P) * P; base < u1; base += P) prof.forEach(([du]) => { const u = base + du; if (u > u0 && u < u1) us.push(u); });
  us.unshift(u0); us.push(u1);
  const vAt = (u: number): number => {
    const r = ((u % P) + P) % P;
    for (let i = 0; i < prof.length - 1; i++) {
      const [a, va] = prof[i]!, [b, vb] = prof[i + 1]!;
      if (r >= a && r <= b) return va + ((vb - va) * (r - a)) / (b - a);
    }
    return 0;
  };
  const O = v3(o), U = v3(eu), L = v3(el), N = v3(en);
  const pos: number[] = [];
  const pt = (u: number, s: number) => O.clone().addScaledVector(U, u).addScaledVector(N, vAt(u)).addScaledVector(L, s);
  for (let i = 0; i < us.length - 1; i++) {
    const ua = us[i]!, ub = us[i + 1]!, la = len(ua), lb = len(ub);
    if (la <= 0 && lb <= 0) continue;
    const a0 = pt(ua, 0), a1 = pt(ua, Math.max(0, la)), b0 = pt(ub, 0), b1 = pt(ub, Math.max(0, lb));
    pos.push(...a0.toArray(), ...b0.toArray(), ...b1.toArray(), ...a0.toArray(), ...b1.toArray(), ...a1.toArray());
  }
  return pos;
}

const hasFacade = (s: AppState) => s['facMat'] !== 'yok';

export const cladding: AppDef = {
  id: 'cladding',
  sections: [
    { titleKey: 'cladding.sections.dims', fields: [
      { id: 'width', type: 'range', labelKey: 'cladding.fields.width', unit: 'm', min: 4, max: 60, step: 0.5, value: 20 },
      { id: 'length', type: 'range', labelKey: 'cladding.fields.length', unit: 'm', min: 4, max: 120, step: 0.5, value: 40 },
      { id: 'slope', type: 'range', labelKey: 'cladding.fields.slope', unit: '%', min: 3, max: 60, step: 1, value: 15 },
      { id: 'wallH', type: 'range', labelKey: 'cladding.fields.wallH', unit: 'm', min: 2, max: 15, step: 0.5, value: 6 },
      { id: 'ov', type: 'range', labelKey: 'cladding.fields.ov', unit: 'm', min: 0, max: 1.5, step: 0.05, value: 0.3 },
    ] },
    { titleKey: 'cladding.sections.cladding', fields: [
      { id: 'roofMat', type: 'seg', labelKey: 'cladding.fields.roofMat', value: 'trapez', options: [{ value: 'trapez', labelKey: 'cladding.options.roofMat.trapez' }, { value: 'sandvic', labelKey: 'cladding.options.roofMat.sandvic' }] },
      { id: 'facMat', type: 'seg', labelKey: 'cladding.fields.facMat', value: 'trapez', options: [{ value: 'yok', labelKey: 'cladding.options.facMat.yok' }, { value: 'trapez', labelKey: 'cladding.options.facMat.trapez' }, { value: 'sandvic', labelKey: 'cladding.options.facMat.sandvic' }] },
      { id: 'sheetLen', type: 'range', labelKey: 'cladding.fields.sheetLen', unit: 'm', min: 2, max: 12, step: 0.5, value: 6, show: (s) => s['roofMat'] === 'trapez' || s['facMat'] === 'trapez' },
      { id: 'panelT', type: 'seg', labelKey: 'cladding.fields.panelT', value: 40, options: [40, 60, 80, 100].map((v) => ({ value: v, labelKey: `cladding.options.panelT.${v}` })), show: (s) => s['roofMat'] === 'sandvic' || s['facMat'] === 'sandvic' },
      { id: 'cut', type: 'toggle', labelKey: 'cladding.fields.cut', value: true },
      { id: 'roofColor', type: 'select', labelKey: 'cladding.fields.roofColor', value: 'r9006', options: COLOR_KEYS.map((k) => ({ value: k, labelKey: `cladding.options.roofColor.${k}` })) },
      { id: 'facColor', type: 'select', labelKey: 'cladding.fields.facColor', value: 'r9002', options: COLOR_KEYS.map((k) => ({ value: k, labelKey: `cladding.options.facColor.${k}` })), show: hasFacade },
    ] },
    { titleKey: 'cladding.sections.sub', fields: [
      { id: 'sub', type: 'toggle', labelKey: 'cladding.fields.sub', value: true },
      { id: 'bay', type: 'range', labelKey: 'cladding.fields.bay', unit: 'm', min: 4, max: 10, step: 0.5, value: 6, show: (s) => Boolean(s['sub']) },
      { id: 'purlinSp', type: 'range', labelKey: 'cladding.fields.purlinSp', unit: 'm', min: 0.8, max: 2.5, step: 0.1, value: 1.5, show: (s) => Boolean(s['sub']) },
      { id: 'girtSp', type: 'range', labelKey: 'cladding.fields.girtSp', unit: 'm', min: 0.8, max: 2.5, step: 0.1, value: 1.5, show: (s) => Boolean(s['sub']) && hasFacade(s) },
    ] },
  ],
  profiles: [
    { id: 'purlin', labelKey: 'cladding.profiles.purlin', families: ['UPN', 'UPE', 'RHS', 'SHS'], value: 'UPN140', color: hex(MAT.secondary), show: (s) => Boolean(s['sub']) },
    { id: 'girt', labelKey: 'cladding.profiles.girt', families: ['UPN', 'UPE', 'RHS', 'SHS'], value: 'UPN120', color: hex(MAT.secondary), show: (s) => Boolean(s['sub']) && hasFacade(s) },
  ],
  noteKeys: ['cladding.notes.0', 'cladding.notes.1'],
  build(s: AppState, kit: Kit, ctx: BuildContext) {
    const { t, fmt } = ctx;
    const T = PLATE_T;
    const width = Number(s['width']), length = Number(s['length']), wallH = Number(s['wallH']), ov = Number(s['ov']);
    const slopePct = Number(s['slope']), bay = Number(s['bay']), purlinSp = Number(s['purlinSp']), girtSp = Number(s['girtSp']);
    const sheetLen = Number(s['sheetLen']), panelT = Number(s['panelT']), cut = Boolean(s['cut']), sub = Boolean(s['sub']);
    const codes = { purlin: String(s['purlin']), girt: String(s['girt']) };
    const hw = width / 2, hl = length / 2, sl = slopePct / 100;
    const rise = hw * sl, ridgeY = wallH + rise;
    const cosA = 1 / Math.sqrt(1 + sl * sl);
    const slopeLen = (hw + ov) / cosA;
    const roofL = length + 2 * ov;
    const tally = createTally(kit, ctx);
    const facade = hasFacade(s);
    const P = dims(ctx, codes.purlin), G = dims(ctx, codes.girt);

    // ---- gösterim amaçlı ana çerçeve ----
    const colH = 0.3, rafH = 0.36;
    const nFr = Math.max(1, Math.round(length / bay)), frSp = length / nFr;
    const frames = Array.from({ length: nFr + 1 }, (_, i) => -hl + i * frSp);
    const hAt = (x: number) => wallH + rise * (1 - Math.abs(x) / hw);
    frames.forEach((z) => {
      [-1, 1].forEach((sd) => {
        kit.member('IPE300', ghostMat, [sd * hw, 0, z], [sd * hw, wallH, z]);
        kit.member('IPE360', ghostMat, [sd * hw, wallH, z], [0, ridgeY, z]);
      });
    });
    const nW = Math.max(1, Math.ceil(width / 5));
    [-hl, hl].forEach((z) => { for (let k = 1; k < nW; k++) { const x = -hw + (k * width) / nW; kit.member('IPE200', ghostMat, [x, 0, z], [x, hAt(x) - rafH / 2, z]); } });

    // ---- aşık ve kuşaklar + takoz levhaları ----
    const roofOff = rafH / 2 + (sub ? P.h : 0);
    let cleats = 0;
    if (sub) {
      const inner = hw / cosA;
      const nRows = Math.max(2, Math.floor((inner - 0.15) / purlinSp) + 1);
      [-1, 1].forEach((sd) => {
        const u = new Vec3(-sd * hw, rise, 0).normalize(), n = new Vec3(sd * rise, hw, 0).normalize();
        for (let r = 0; r < nRows; r++) {
          const tt = Math.min(inner - 0.15, 0.1 + r * purlinSp);
          const base = new Vec3(sd * hw, wallH, 0).addScaledVector(u, tt).addScaledVector(n, rafH / 2);
          const c = base.clone().addScaledVector(n, P.h / 2);
          tally.put('purlin', t('cladding.bom.purlin'), codes.purlin, MAT.secondary, [c.x, c.y, -hl - ov], [c.x, c.y, hl + ov], { ref: u.toArray() });
          frames.forEach((z) => {
            const web = c.clone().addScaledVector(u, -P.b / 2 - T / 2);
            kit.plate([web.x, web.y, z], [0, 0, 1], n, [[-0.06, -P.h / 2], [0.06, -P.h / 2], [0.06, P.h / 2 - 0.01], [-0.06, P.h / 2 - 0.01]]);
            [-1, 1].forEach((k) => kit.bolt(web.clone().addScaledVector(n, k * P.h * 0.22).setZ(z), u, T + P.tw, 0.012));
            cleats++;
          });
        }
      });
      if (facade) {
        const xo = hw + colH / 2;
        for (let y = girtSp; y < wallH - 0.2; y += girtSp) {
          [-1, 1].forEach((sd) => {
            const x = sd * (xo + T + G.b / 2);
            tally.put('girt', t('cladding.bom.girt'), codes.girt, MAT.secondary, [x, y, -hl - 0.1], [x, y, hl + 0.1], { ref: [sd, 0, 0] });
            frames.forEach((z) => {
              kit.box(sd * (xo + T / 2), y, z, T, G.h + 0.04, 0.12);
              [-1, 1].forEach((k) => kit.bolt([sd * (xo + T / 2 + G.tw / 2), y + k * G.h * 0.22, z], [sd, 0, 0], T + G.tw, 0.012));
              cleats++;
            });
          });
        }
        for (let y = girtSp; y < ridgeY - 0.4; y += girtSp) {
          const half = y <= wallH ? hw : hw * (1 - (y - wallH) / rise);
          if (half < 0.5) continue;
          [-1, 1].forEach((sd) => {
            const z = sd * (hl + 0.05 + T + G.b / 2);
            tally.put('girt', t('cladding.bom.girt'), codes.girt, MAT.secondary, [-half, y, z], [half, y, z], { ref: [0, 0, sd] });
            for (let k = 1; k < nW; k++) {
              const x = -hw + (k * width) / nW;
              if (Math.abs(x) > half - 0.1) continue;
              kit.box(x, y, sd * (hl + 0.05 + T / 2), 0.12, G.h + 0.04, T);
              [-1, 1].forEach((kk) => kit.bolt([x, y + kk * G.h * 0.22, sd * (hl + 0.05 + T / 2 + G.tw / 2)], [0, 0, sd], T + G.tw, 0.012));
              cleats++;
            }
          });
        }
      }
    }

    // ---- çatı kaplaması ----
    const roofColor = String(s['roofColor']), facColor = String(s['facColor']);
    const roofTrap = s['roofMat'] === 'trapez';
    const pT = panelT / 1000;
    const zMax = cut ? 0 : hl + ov; // kesit görünümünde +Z yarısı kaplamasız
    [-1, 1].forEach((sd) => {
      const u = new Vec3(-sd * hw, rise, 0).normalize(), n = new Vec3(sd * rise, hw, 0).normalize();
      const edge = new Vec3(sd * (hw + ov), wallH - ov * sl, 0).addScaledVector(n, roofOff + 0.005);
      if (roofTrap) {
        kit.tri(corrugated(edge, Z, u, n, -hl - ov, zMax, () => slopeLen), cladMat(roofColor));
        for (let k = 1; k * (sheetLen - 0.2) < slopeLen; k++) {
          const p = edge.clone().addScaledVector(u, k * (sheetLen - 0.2)).addScaledVector(n, 0.04);
          kit.box(p.x, p.y, (zMax - hl - ov) / 2, 0.01, 0.01, zMax + hl + ov, trimMat);
        }
      } else {
        const mats: Transform[] = [];
        const zAxis = new Vec3().crossVectors(new Vec3(0, 0, 1), n);
        const basis = makeBasis(new Vec3(0, 0, 1), n, zAxis);
        const rows = Math.ceil(slopeLen / 13.5), rowL = slopeLen / rows;
        for (let z = -hl - ov + 0.5; z < zMax; z += 1.0) for (let r = 0; r < rows; r++) {
          const c = edge.clone().addScaledVector(u, (r + 0.5) * rowL).addScaledVector(n, pT / 2).setZ(z);
          mats.push(transform(c, basis, [0.994, pT, rowL - 0.01]));
        }
        kit.instanced(UNIT_BOX, cladMat(roofColor), mats);
      }
      // oluk ve iniş boruları
      const gx = sd * (hw + ov + 0.06), gy = wallH - ov * sl + roofOff - 0.05;
      kit.cylinder({ radiusTop: 0.075, radiusBottom: 0.075, height: roofL, radial: 16, open: true, thetaStart: -Math.PI / 2, thetaLength: Math.PI }, [gx, gy, 0], [Math.PI / 2, 0, 0], trimMat);
      const nDp = Math.max(1, Math.ceil(roofL / 10));
      for (let k = 0; k <= nDp; k += 1) {
        const z = -hl + (k * length) / nDp;
        kit.cylinder({ radiusTop: 0.05, radiusBottom: 0.05, height: gy, radial: 12 }, [gx + sd * 0.02, gy / 2, z], [0, 0, 0], trimMat);
      }
    });
    // mahya kapağı
    const cap = [new Vec3(-0.2, -0.2 * sl, 0), new Vec3(0, 0.03, 0), new Vec3(0.2, -0.2 * sl, 0)];
    [0, 1].forEach((i) => {
      const a = cap[i]!, b = cap[i + 1]!;
      kit.quad([a.x, ridgeY + roofOff + a.y + 0.04, -hl - ov], [b.x, ridgeY + roofOff + b.y + 0.04, -hl - ov], [b.x, ridgeY + roofOff + b.y + 0.04, hl + ov], [a.x, ridgeY + roofOff + a.y + 0.04, hl + ov], trimMat);
    });

    // ---- cephe kaplaması ----
    const facTrap = s['facMat'] === 'trapez';
    const wallX = hw + colH / 2 + (sub ? T + G.b : 0) + 0.01, gableZ = hl + 0.05 + (sub ? T + G.b : 0) + 0.01;
    const topAt = (x: number) => (Math.abs(x) <= hw ? wallH + rise * (1 - Math.abs(x) / hw) : wallH);
    if (facade) {
      const m = cladMat(facColor);
      if (facTrap) {
        [-1, 1].forEach((sd) => {
          kit.tri(corrugated([sd * wallX, 0, 0], Z, Y, [sd, 0, 0], -gableZ, cut ? 0 : gableZ, () => wallH), m);
          if (sd > 0 && cut) return;
          kit.tri(corrugated([0, 0, sd * gableZ], X, Y, [0, 0, sd], -wallX, wallX, (x) => topAt(x) + 0.0), m);
        });
      } else {
        const mats: Transform[] = [];
        const add = (c: Vec3, sx: number, sy: number, sz: number) => mats.push(transform(c, IDENTITY, [sx, sy, sz]));
        [-1, 1].forEach((sd) => {
          for (let z = -gableZ + 0.5; z < (cut ? 0 : gableZ); z += 1.0) add(new Vec3(sd * (wallX + pT / 2), wallH / 2, z), pT, wallH, 0.994);
          if (!(sd > 0 && cut)) for (let x = -wallX + 0.5; x < wallX; x += 1.0) { const h = topAt(x); add(new Vec3(x, h / 2, sd * (gableZ + pT / 2)), 0.994, h, pT); }
        });
        kit.instanced(UNIT_BOX, m, mats);
      }
      // köşe kapamaları
      [-1, 1].forEach((a) => (cut ? [-1] : [-1, 1]).forEach((b) => kit.box(a * (wallX + 0.03), wallH / 2, b * (gableZ + 0.03), 0.12, wallH, 0.12, trimMat)));
    }

    // ---- metraj ----
    const roofA = 2 * slopeLen * roofL;
    const facA = 2 * (width + length) * wallH + width * rise;
    const cols = Math.ceil(roofL / 1.0);
    const panelKg = SANDWICH[panelT] ?? SANDWICH[40]!;
    const bom: BomItem[] = [{ group: t('cladding.groups.roof') }];
    if (roofTrap) {
      const rows = Math.ceil(slopeLen / (sheetLen - 0.2));
      const n = Math.ceil(cols * rows * 2 * 1.05);
      bom.push({ key: 'roofSheet', name: t('cladding.bom.roofSheet'), spec: t('cladding.spec.roofSheet', { len: fmt(sheetLen * 1000), kg: fmt(TRAPEZ_KG, 1) }), qty: n, unit: 'pcs', kg: roofA * 1.05 * TRAPEZ_KG },
        { key: 'roofArea', name: t('cladding.bom.roofArea'), spec: t('cladding.spec.waste5'), amount: roofA * 1.05, unit: 'm2' },
        { key: 'roofScrew', name: t('cladding.bom.roofScrew'), spec: t('cladding.spec.roofScrew'), qty: Math.round(roofA * 6), unit: 'pcs' });
    } else {
      const rows = Math.ceil(slopeLen / 13.5);
      bom.push({ key: 'roofPanel', name: t('cladding.bom.roofPanel', { t: panelT }), spec: t('cladding.spec.roofPanel', { len: fmt(slopeLen / rows, 2), kg: fmt(panelKg, 1) }), qty: cols * rows * 2, unit: 'pcs', kg: roofA * 1.03 * panelKg },
        { key: 'roofArea', name: t('cladding.bom.roofArea'), spec: t('cladding.spec.waste3'), amount: roofA * 1.03, unit: 'm2' },
        { key: 'roofPanelScrew', name: t('cladding.bom.panelScrew'), spec: t('cladding.spec.panelScrew'), qty: Math.round(roofA * 4), unit: 'pcs' });
    }
    const nDown = 2 * (Math.max(1, Math.ceil(roofL / 10)) + 1);
    bom.push({ key: 'ridgeCap', name: t('cladding.bom.ridgeCap'), amount: roofL, unit: 'm' },
      { key: 'gutter', name: t('cladding.bom.gutter'), spec: t('cladding.spec.gutter'), amount: 2 * roofL, unit: 'm' },
      { key: 'downpipe', name: t('cladding.bom.downpipe'), spec: t('cladding.spec.downpipe'), qty: nDown, amount: nDown * wallH, unit: 'm' },
      { key: 'verge', name: t('cladding.bom.verge'), amount: 4 * slopeLen, unit: 'm' });
    if (facade) {
      bom.push({ group: t('cladding.groups.facade') });
      if (facTrap) {
        const rows = Math.ceil(wallH / (sheetLen - 0.2));
        const n = Math.ceil((Math.ceil((2 * (width + length)) / 1.0) * rows + Math.ceil(width) * Math.ceil(rise / (sheetLen - 0.2))) * 1.05);
        bom.push({ key: 'facSheet', name: t('cladding.bom.facSheet'), spec: t('cladding.spec.facSheet', { len: fmt(sheetLen * 1000), kg: fmt(TRAPEZ_KG, 1) }), qty: n, unit: 'pcs', kg: facA * 1.05 * TRAPEZ_KG },
          { key: 'facArea', name: t('cladding.bom.facArea'), spec: t('cladding.spec.facArea'), amount: facA * 1.05, unit: 'm2' },
          { key: 'facScrew', name: t('cladding.bom.facScrew'), qty: Math.round(facA * 6), unit: 'pcs' });
      } else {
        bom.push({ key: 'facPanel', name: t('cladding.bom.facPanel', { t: panelT }), spec: t('cladding.spec.facPanel', { kg: fmt(panelKg, 1) }), qty: Math.ceil(2 * (width + length)), unit: 'pcs', kg: facA * 1.03 * panelKg },
          { key: 'facArea', name: t('cladding.bom.facArea'), spec: t('cladding.spec.facArea'), amount: facA * 1.03, unit: 'm2' },
          { key: 'facPanelScrew', name: t('cladding.bom.panelScrew'), qty: Math.round(facA * 4), unit: 'pcs' });
      }
      bom.push({ key: 'cornerTrim', name: t('cladding.bom.cornerTrim'), amount: 4 * wallH, unit: 'm' }, { key: 'drip', name: t('cladding.bom.drip'), amount: 2 * (width + length), unit: 'm' });
    }
    if (sub) {
      bom.push({ group: t('cladding.groups.sub') });
      for (const r of [tally.row('purlin'), tally.row('girt')]) if (r) bom.push(r);
      bom.push({ key: 'cleat', name: t('cladding.bom.cleat'), spec: t('cladding.spec.cleat'), qty: cleats, unit: 'pcs' });
    }
    const totalKg = (roofTrap ? roofA * 1.05 * TRAPEZ_KG : roofA * 1.03 * panelKg) + (facade ? (facTrap ? facA * 1.05 * TRAPEZ_KG : facA * 1.03 * panelKg) : 0);
    const deg = fmt((Math.atan(sl) * 180) / Math.PI, 1);
    const flag = t('cladding.flag.slope', { slope: slopePct, deg }) + (slopePct < 5 && roofTrap ? ' ' + t('cladding.flag.lowSlope') : '');
    return {
      kpis: [
        { label: t('cladding.kpi.roofArea'), value: `${fmt(roofA)} m²` },
        { label: t('cladding.kpi.facArea'), value: facade ? `${fmt(facA)} m²` : '–' },
        { label: t('cladding.kpi.slopeLen'), value: `${fmt(slopeLen, 2)} m` },
        { label: t('cladding.kpi.rise'), value: `${fmt(rise, 2)} m` },
        { label: t('cladding.kpi.cladKg'), value: `${fmt(totalKg / 1000, 1)} t` },
      ],
      flag,
      chip: { strong: `${fmt(width, 1)} × ${fmt(length, 1)} m`, rest: t('cladding.chip', { slope: slopePct, wallH: fmt(wallH, 1) }) },
      bom,
      legend: [{ color: hex(cladMat(roofColor)), label: t('cladding.legend.roof') }, { color: hex(cladMat(facColor)), label: t('cladding.legend.facade') }, { color: hex(MAT.secondary), label: t('cladding.legend.secondary') },
        { color: hex(MAT.plate), label: t('cladding.legend.plate') }, { color: hex(trimMat), label: t('cladding.legend.trim') }, { color: '#5A646C', label: t('cladding.legend.ghost') }],
    };
  },
};
