import { createTally, dims } from '../helpers';
import type { Kit } from '../kit';
import { hex, MAT } from '../materials';
import { PLATE_T, type AppDef, type AppState, type BomItem, type BuildContext } from '../types';
import { clamp, v3, Vec3, X, Y, Z, type V2 } from '../vec';

/**
 * ÇELİK HOL · ENDÜSTRİYEL YAPI (K-110, prototip `hol.js`nin bire bir portu).
 * Metin anahtarları: Engine.hall.* (alanlar, kalemler, notlar). Profil kodları ASCII katalog kodudur.
 */
const PANEL_KG = 10.5; // sandviç panel (40 mm PIR) kg/m²
const I_FAM = ['IPE', 'HEA', 'HEB', 'HEM'] as const;

export const hall: AppDef = {
  id: 'hall',
  views: { iso: [1, 0.62, -1] },
  sections: [
    { titleKey: 'hall.sections.dims', fields: [
      { id: 'width', type: 'range', labelKey: 'hall.fields.width', unit: 'm', min: 8, max: 60, step: 1, value: 20 },
      { id: 'length', type: 'range', labelKey: 'hall.fields.length', unit: 'm', min: 8, max: 120, step: 1, value: 40 },
      { id: 'eave', type: 'range', labelKey: 'hall.fields.eave', unit: 'm', min: 3, max: 15, step: 0.5, value: 6 },
      { id: 'ridge', type: 'range', labelKey: 'hall.fields.ridge', unit: 'm', min: 3, max: 20, step: 0.5, value: 8 },
      { id: 'bay', type: 'range', labelKey: 'hall.fields.bay', unit: 'm', min: 4, max: 10, step: 0.5, value: 6 },
    ] },
    { titleKey: 'hall.sections.options', fields: [
      { id: 'purlins', type: 'toggle', labelKey: 'hall.fields.purlins', value: true },
      { id: 'purlinSp', type: 'range', labelKey: 'hall.fields.purlinSp', unit: 'm', min: 0.8, max: 2.5, step: 0.1, value: 1.0, show: (s) => Boolean(s['purlins']) },
      { id: 'girtSp', type: 'range', labelKey: 'hall.fields.girtSp', unit: 'm', min: 0.8, max: 2.5, step: 0.1, value: 1.0, show: (s) => Boolean(s['purlins']) },
      { id: 'door', type: 'toggle', labelKey: 'hall.fields.door', value: true },
      { id: 'doorW', type: 'range', labelKey: 'hall.fields.doorW', unit: 'm', min: 2, max: 12, step: 0.5, value: 4, show: (s) => Boolean(s['door']) },
      { id: 'doorH', type: 'range', labelKey: 'hall.fields.doorH', unit: 'm', min: 2, max: 10, step: 0.5, value: 5, show: (s) => Boolean(s['door']) },
      { id: 'panels', type: 'toggle', labelKey: 'hall.fields.panels', value: true },
      { id: 'showPanels', type: 'toggle', labelKey: 'hall.fields.showPanels', value: false, show: (s) => Boolean(s['panels']) },
    ] },
  ],
  profiles: [
    { id: 'col', labelKey: 'hall.profiles.col', families: I_FAM, value: 'HEB360', color: hex(MAT.column) },
    { id: 'raf', labelKey: 'hall.profiles.raf', families: I_FAM, value: 'IPE500', color: hex(MAT.beam), show: (s) => Number(s['width']) <= 30 },
    { id: 'chord', labelKey: 'hall.profiles.chord', families: ['L', 'LU'], value: 'L100x100x10', color: hex(MAT.truss), show: (s) => Number(s['width']) > 30 },
    { id: 'diag', labelKey: 'hall.profiles.diag', families: ['L', 'LU'], value: 'L80x80x8', color: hex(MAT.truss), show: (s) => Number(s['width']) > 30 },
    { id: 'sec', labelKey: 'hall.profiles.sec', families: I_FAM, value: 'IPE300', color: hex(MAT.secondary) },
    { id: 'wind', labelKey: 'hall.profiles.wind', families: I_FAM, value: 'IPE300', color: hex(MAT.secondary) },
    { id: 'purlin', labelKey: 'hall.profiles.purlin', families: ['UPN', 'UPE', 'RHS', 'SHS'], value: 'UPN200', color: hex(MAT.secondary), show: (s) => Boolean(s['purlins']) },
    { id: 'girt', labelKey: 'hall.profiles.girt', families: ['UPN', 'UPE', 'RHS', 'SHS'], value: 'UPN200', color: hex(MAT.secondary), show: (s) => Boolean(s['purlins']) },
    { id: 'brace', labelKey: 'hall.profiles.brace', families: ['CHS'], value: 'CHS139.7x6', color: hex(MAT.brace) },
    { id: 'lintel', labelKey: 'hall.profiles.lintel', families: ['RHS', 'SHS', 'UPN', 'IPE'], value: 'RHS200x100x6', color: hex(MAT.door), show: (s) => Boolean(s['door']) },
  ],
  noteKeys: ['hall.notes.0', 'hall.notes.1', 'hall.notes.2'],
  normalize(s) {
    if (Number(s['ridge']) < Number(s['eave'])) s['ridge'] = s['eave']!;
  },
  build(s: AppState, kit: Kit, ctx: BuildContext) {
    const { t, fmt } = ctx;
    const T = PLATE_T;
    const width = Number(s['width']), length = Number(s['length']), eave = Number(s['eave']), ridge = Number(s['ridge']), bay = Number(s['bay']);
    const codes = { col: String(s['col']), raf: String(s['raf']), chord: String(s['chord']), diag: String(s['diag']), sec: String(s['sec']), wind: String(s['wind']), purlin: String(s['purlin']), girt: String(s['girt']), brace: String(s['brace']), lintel: String(s['lintel']) };
    const hw = width / 2;
    const numBays = Math.max(1, Math.round(length / bay));
    const spacing = length / numBays;
    const zs = Array.from({ length: numBays + 1 }, (_, i) => -length / 2 + i * spacing);
    const zFront = zs[0]!, zBack = zs[numBays]!;
    const useTruss = width > 30;
    const col = dims(ctx, codes.col), raf = dims(ctx, codes.raf), sec = dims(ctx, codes.sec), wnd = dims(ctx, codes.wind), CH = dims(ctx, codes.chord), DG = dims(ctx, codes.diag);
    void DG;
    const leg = CH.h, gap = T + 0.001;
    const tally = createTally(kit, ctx);
    const put = tally.put;

    // ---- birleşim geometrisi ----
    const hAt = (x: number) => eave + (ridge - eave) * (1 - Math.abs(x) / hw);
    const slope = (ridge - eave) / hw;
    const hv = (raf.h / 2) * Math.sqrt(1 + slope * slope);
    const rTop = (x: number) => hAt(x) + hv, rBot = (x: number) => hAt(x) - hv;
    const xsE = hw - col.h / 2 - T;
    const Lh = clamp(width * 0.1, 1.2, 3), hd = Math.max(0.3, raf.h * 0.9);
    const Lr = Lh * 0.6, hdR = Math.max(0.2, raf.h * 0.6);
    const colTop = useTruss ? eave - leg / 2 - 0.03 : rTop(xsE) + 0.1;
    const eaveY = useTruss ? colTop - sec.h / 2 - 0.03 : eave;
    const under = (x: number) => {
      if (useTruss) return hAt(x) - leg / 2 - 0.005;
      const ax = Math.abs(x); let y = rBot(x);
      const de = xsE - ax; if (de >= 0 && de < Lh) y -= hd * (1 - de / Lh);
      const dr = Math.max(0, ax - T); if (dr < Lr) y -= hdR * (1 - dr / Lr);
      return y;
    };
    const epW = clamp(raf.b + 0.06, raf.b + 0.03, Math.max(col.b, raf.b + 0.03));
    const bz = Math.max(raf.tw / 2 + 0.035, Math.min(epW / 2 - 0.035, 0.09));

    function knee(side: number, z: number) {
      const inw = -side, xc = side * hw;
      const xf = xc + (inw * col.h) / 2, xs = xf + inw * T;
      const yTop = rTop(xs), yBot = rBot(xs), xB = xs + inw * Lh;
      const C: V2 = [xs, yBot - hd];
      kit.framePlate([[xs, yBot], [xB, rBot(xB)], C], z);           // guse gövdesi
      kit.strip([C[0], C[1], z], [xB, rBot(xB), z], raf.b);           // guse alt başlığı
      const yLo = C[1] - 0.06;
      kit.box(xf + (inw * T) / 2, (yLo + colTop) / 2, z, T, colTop - yLo, epW); // uzatılmış alın levhası
      [yTop - 0.02, C[1]].forEach((y) => kit.box(xc, y, z, col.h - 2 * col.tf, T, col.b - 0.02)); // kolon berkitmeleri
      const rows = [yTop + 0.05], y0 = yTop - 0.09, y1 = C[1] + 0.07;
      const n = Math.max(1, Math.round((y0 - y1) / 0.15));
      for (let k = 0; k <= n; k++) rows.push(y0 - (k * (y0 - y1)) / n);
      const bx = xf + (inw * (T - col.tf)) / 2;
      rows.forEach((y) => [-bz, bz].forEach((dz) => kit.bolt([bx, y, z + dz], [inw, 0, 0], T + col.tf)));
    }
    function apex(z: number) {
      const yHi = rTop(T) + 0.03, yLo = rBot(T) - hdR;
      [-1, 1].forEach((side) => {
        const xs = side * T, xB = side * (T + Lr), C: V2 = [xs, yLo];
        kit.framePlate([[xs, rBot(xs)], [xB, rBot(xB)], C], z);
        kit.strip([C[0], C[1], z], [xB, rBot(xB), z], raf.b);
        kit.box((side * T) / 2, (yHi + yLo - 0.05) / 2, z, T, yHi - yLo + 0.05, epW);
      });
      const y0 = yHi - 0.08, y1 = yLo + 0.04, n = Math.max(1, Math.round((y0 - y1) / 0.14));
      for (let k = 0; k <= n; k++) [-bz, bz].forEach((dz) => kit.bolt([0, y0 - (k * (y0 - y1)) / n, z + dz], X, 2 * T));
    }

    // ---- ana çerçeveler ----
    zs.forEach((z) => {
      [-1, 1].forEach((side) => {
        const xc = side * hw;
        put('col', t('hall.bom.col'), codes.col, MAT.column, [xc, 0, z], [xc, colTop, z]);
        kit.basePlate(xc, z, codes.col);
        kit.box(xc, colTop + T / 2, z, col.h + 0.04, T, col.b + 0.02); // başlık levhası
      });
      if (!useTruss) {
        put('raf', t('hall.bom.raf'), codes.raf, MAT.beam, [-xsE, hAt(xsE), z], [-T, hAt(T), z], { cutX: true });
        put('raf', t('hall.bom.raf'), codes.raf, MAT.beam, [T, hAt(T), z], [xsE, hAt(xsE), z], { cutX: true });
        knee(-1, z); knee(1, z); apex(z);
      } else {
        let nP = Math.max(6, Math.round(width / 2.5)); if (nP % 2) nP++;
        const top: Vec3[] = [], bot: Vec3[] = [];
        for (let i = 0; i <= nP; i++) { const x = -hw + (i * width) / nP; top.push(new Vec3(x, hAt(x), z)); bot.push(new Vec3(x, eave, z)); }
        const nodes = new Map<string, { p: Vec3; dirs: Vec3[] }>();
        const reg = (a: Vec3, b: Vec3) => {
          const k = a.x.toFixed(3) + ',' + a.y.toFixed(3);
          if (!nodes.has(k)) nodes.set(k, { p: a, dirs: [] });
          nodes.get(k)!.dirs.push(new Vec3(b.x - a.x, b.y - a.y, 0));
        };
        const link = (key: string, name: string, code: string, a: Vec3, b: Vec3, trim: number) => {
          reg(a, b); reg(b, a);
          const A = a.clone(), B = b.clone(), d = B.clone().sub(A).normalize();
          put(key, name, code, MAT.truss, A.addScaledVector(d, trim), B.addScaledVector(d, -trim), { double: gap }, 2, true);
        };
        for (let i = 0; i < nP; i++) {
          link('chord', t('hall.bom.chord'), codes.chord, top[i]!, top[i + 1]!, 0);
          link('chord', t('hall.bom.chord'), codes.chord, bot[i]!, bot[i + 1]!, 0);
          if (i % 2 === 0) link('diag', t('hall.bom.diag'), codes.diag, bot[i]!, top[i + 1]!, 0.12);
          else link('diag', t('hall.bom.diag'), codes.diag, top[i]!, bot[i + 1]!, 0.12);
        }
        nodes.forEach(({ p, dirs }) => {
          const heel = Math.abs(Math.abs(p.x) - hw) < 1e-3;
          const dy = colTop + T - p.y;
          const extra: V2[] = heel ? [[-col.h / 2 - 0.02, dy], [col.h / 2 + 0.02, dy]] : [];
          kit.gusset(p, X, Y, dirs, { reach: 0.34, half: Math.max(0.075, leg * 0.75), bolts: [0.14, 0.24], grip: T + 2 * CH.t, extra });
        });
      }
    });

    // ---- boyuna kirişler: kolon gövdesine / mahya levhasına kaynaklı kayma levhası (fin plate) ----
    const longBeam = (x: number, y: number, z1: number, z2: number, endGap: number, finFrom: number) => {
      put('sec', t('hall.bom.sec'), codes.sec, MAT.secondary, [x, y, z1 + endGap], [x, y, z2 - endGap]);
      const finLen = endGap + 0.1 - finFrom, fx = x + sec.tw / 2 + T / 2;
      ([[z1, 1], [z2, -1]] as const).forEach(([zc, sg]) => {
        kit.box(fx, y, zc + sg * (finFrom + finLen / 2), T, Math.max(0.1, sec.h - 2 * sec.tf - 0.04), finLen);
        const nb = sec.h > 0.25 ? [-0.07, 0, 0.07] : [-0.04, 0.04];
        nb.forEach((dy) => kit.bolt([x + T / 2, y + dy, zc + sg * (endGap + 0.05)], X, sec.tw + T, 0.016));
      });
    };
    for (let i = 0; i < numBays; i++) {
      const z1 = zs[i]!, z2 = zs[i + 1]!;
      longBeam(-hw, eaveY, z1, z2, col.tw / 2 + 0.015, col.tw / 2);
      longBeam(hw, eaveY, z1, z2, col.tw / 2 + 0.015, col.tw / 2);
      if (!useTruss) longBeam(0, ridge, z1, z2, epW / 2 + 0.03, epW / 2);
    }

    // ---- çaprazlar ----
    const bNodes = new Map<string, { p: Vec3; e1: Vec3; e2: Vec3; dirs: Vec3[] }>();
    const brace = (key: string, name: string, p1: Vec3, p2: Vec3, e1: Vec3, e2: Vec3, tag: string) => {
      const d = kit.pipeBrace(codes.brace, p1, p2);
      tally.add(key, name, codes.brace, p1.distanceTo(p2) - 0.56);
      ([[p1, d], [p2, d.clone().negate()]] as const).forEach(([p, dir]) => {
        const k = p.toArray().map((v) => v.toFixed(3)).join(',') + tag;
        if (!bNodes.has(k)) bNodes.set(k, { p, e1, e2, dirs: [] });
        bNodes.get(k)!.dirs.push(dir);
      });
      return d;
    };
    const crossPlate = (mid: Vec3, e1: Vec3, e2: Vec3, d1: Vec3, d2: Vec3) => kit.gusset(mid, e1, e2, [d1, d1.clone().negate(), d2, d2.clone().negate()], { reach: 0.24, bolts: [] });
    const vZ = v3(Z), vY = v3(Y);
    const wBot = 0.45, wTop = eaveY - sec.h / 2 - 0.3;
    [-hw, hw].forEach((x) => {
      for (let i = 0; i < numBays; i += 2) {
        const z1 = zs[i]!, z2 = zs[i + 1]!;
        const d1 = brace('wbr', t('hall.bom.wbr'), new Vec3(x, wBot, z1), new Vec3(x, wTop, z2), vZ, vY, 'w');
        const d2 = brace('wbr', t('hall.bom.wbr'), new Vec3(x, wTop, z1), new Vec3(x, wBot, z2), vZ, vY, 'w');
        crossPlate(new Vec3(x, (wBot + wTop) / 2, (z1 + z2) / 2), vZ, vY, d1, d2);
      }
    });
    const slopePt = (side: number, tt: number, z: number) => new Vec3(side * hw * (1 - tt), eave + (ridge - eave) * tt, z);
    const nSeg = Math.max(1, Math.round(hw / 5));
    [-1, 1].forEach((side) => {
      const up = slopePt(side, 1, 0).sub(slopePt(side, 0, 0)).normalize();
      for (let i = 0; i < numBays; i += 2) {
        const z1 = zs[i]!, z2 = zs[i + 1]!;
        for (let k = 0; k < nSeg; k++) {
          const t0 = k / nSeg, t1 = (k + 1) / nSeg;
          const A = slopePt(side, t0, z1), B = slopePt(side, t1, z1), C = slopePt(side, t0, z2), D = slopePt(side, t1, z2);
          const d1 = brace('rbr', t('hall.bom.rbr'), A, D, vZ, up, 'r' + side);
          const d2 = brace('rbr', t('hall.bom.rbr'), B, C, vZ, up, 'r' + side);
          crossPlate(A.clone().add(D).multiplyScalar(0.5), vZ, up, d1, d2);
        }
      }
    });
    bNodes.forEach(({ p, e1, e2, dirs }) => kit.gusset(p, e1, e2, dirs));

    // ---- alın: rüzgar kolonları + kapı ----
    const numSeg = Math.max(1, Math.ceil(width / 5)), segW = width / numSeg;
    let flag = useTruss
      ? t('hall.flag.truss', { width: fmt(width), chord: ctx.catalog.label(codes.chord), diag: ctx.catalog.label(codes.diag) })
      : t('hall.flag.portal', { width: fmt(width), raf: ctx.catalog.label(codes.raf) });
    let door: { x1: number; x2: number; w: number; h: number } | null = null;
    if (s['door']) {
      const dw = Math.min(Number(s['doorW']), width - 2), dh = Math.min(Number(s['doorH']), eave - 0.5);
      if (dw < Number(s['doorW']) || dh < Number(s['doorH'])) flag += ' ' + t('hall.flag.doorShrunk', { w: fmt(dw, 1), h: fmt(dh, 1) });
      door = { x1: -dw / 2, x2: dw / 2, w: dw, h: dh };
    }
    const gableSup: number[][] = [[-hw, hw], [-hw, hw]]; // alın kuşaklarının mesnetleri: köşe kolonları + rüzgar kolonları / kapı dikmeleri
    const windCol = (x: number, zEnd: number, key: string, name: string) => {
      gableSup[zEnd === zFront ? 0 : 1]!.push(x);
      const yU = under(x), top = yU - 0.2;
      put(key, name, codes.wind, MAT.secondary, [x, 0, zEnd], [x, top, zEnd]);
      kit.basePlate(x, zEnd, codes.wind);
      kit.box(x, top + T / 2, zEnd, wnd.h + 0.04, T, wnd.b + 0.02);
      const w = 0.12, yb = top + T;
      kit.framePlate([[x - w, yb], [x + w, yb], [x + w, under(x + w)], [x, yU], [x - w, under(x - w)]], zEnd);
      [-0.06, 0.06].forEach((dx) => kit.bolt([x + dx, top + 0.11, zEnd], Z, 2 * T));
    };
    [zFront, zBack].forEach((zEnd, gi) => {
      for (let k = 1; k < numSeg; k++) {
        const x = -hw + k * segW;
        if (gi === 0 && door && x > door.x1 - 0.6 && x < door.x2 + 0.6) continue;
        windCol(x, zEnd, 'wind', t('hall.bom.wind'));
      }
    });
    if (door) {
      const px = door.w / 2 + wnd.h / 2;
      [-px, px].forEach((x) => windCol(x, zFront, 'dpost', t('hall.bom.dpost')));
      const L = ctx.profile(codes.lintel), lh = L.m.h;
      put('lintel', t('hall.bom.lintel'), codes.lintel, MAT.door, [-px + wnd.h / 2, door.h + lh / 2, zFront], [px - wnd.h / 2, door.h + lh / 2, zFront]);
      [-1, 1].forEach((sg) => {
        const x = sg * (door!.w / 2);
        kit.box(x + (sg * T) / 2, door!.h + lh / 2, zFront, T, lh + 0.06, Math.max(wnd.b, L.m.b) + 0.02);
        [-1, 1].forEach((r) => kit.bolt([x + sg * (T / 2 - wnd.tf / 2), door!.h + lh / 2 + r * lh * 0.28, zFront], [sg, 0, 0], T + wnd.tf, 0.016));
      });
      // seksiyonel kapı kanadı (görsel)
      kit.box(0, door.h / 2, zFront - 0.16, door.w, door.h, 0.05, MAT.door);
      for (let y = 0.5; y < door.h; y += 0.5) kit.box(0, y, zFront - 0.19, door.w, 0.02, 0.01, MAT.plate);
    }

    // ---- aşık ve kuşaklar ----
    const P = ctx.profile(codes.purlin), Gt = ctx.profile(codes.girt);
    if (s['purlins']) {
      const purlinSp = Number(s['purlinSp']), girtSp = Number(s['girtSp']);
      const slopeLen = Math.hypot(hw, ridge - eave);
      const nRows = Math.max(1, Math.floor(slopeLen / purlinSp));
      const onTop = (useTruss ? leg / 2 : raf.h / 2) + P.m.h / 2;
      for (let r = 1; r <= nRows; r++) {
        const tt = (r * purlinSp) / slopeLen;
        if (tt >= 0.98) continue;
        [-1, 1].forEach((side) => {
          const p = slopePt(side, tt, 0);
          const u = new Vec3(-side * hw, ridge - eave, 0).normalize(); // eğim boyunca yukarı
          const n = new Vec3(side * (ridge - eave), hw, 0).normalize(); // çatı normali (dışa)
          const c = new Vec3(p.x, p.y, 0).addScaledVector(n, onTop);
          put('purlin', t('hall.bom.purlin'), codes.purlin, MAT.secondary, [c.x, c.y, zFront - 0.15], [c.x, c.y, zBack + 0.15], { ref: u.toArray() });
        });
      }
      // yan duvar kuşakları: kolon dış başlığına kaynaklı 20 mm takoz levhasına cıvatalı
      const gh = Gt.m.h, gb = Gt.m.b, gtw = Gt.m.tw;
      const xo = hw + col.h / 2;
      for (let y = girtSp; y < eave - 0.3; y += girtSp) {
        [-1, 1].forEach((side) => {
          const x = side * (xo + T + gb / 2);
          put('girt', t('hall.bom.girt'), codes.girt, MAT.secondary, [x, y, zFront - 0.15], [x, y, zBack + 0.15], { ref: [side, 0, 0] });
          zs.forEach((z) => {
            kit.box(side * (xo + T / 2), y, z, T, gh + 0.04, Math.min(col.b, 0.14));
            [-1, 1].forEach((k) => kit.bolt([side * (xo + (T + gtw) / 2), y + k * gh * 0.22, z], [side, 0, 0], T + gtw, 0.012));
          });
        });
      }
      // alın (ön / arka) kuşakları: köşe kolonu, rüzgar kolonu ve kapı dikmelerine takozla; kapı boşluğunda kesilir, çatı eğimine göre kısalır
      const face = Math.max(col.b, wnd.b) / 2;
      const roofClr = (useTruss ? leg / 2 : hv) + gh / 2 + 0.1;
      const lintelTop = door ? door.h + ctx.profile(codes.lintel).m.h + 0.1 : 0;
      const doorPx = door ? door.w / 2 + wnd.h / 2 : 0;
      ([[zFront, -1, 0], [zBack, 1, 1]] as const).forEach(([zEnd, out, gi]) => {
        const sup = [...new Set(gableSup[gi]!.map((v) => +v.toFixed(3)))].sort((a, b) => a - b);
        const zg = zEnd + out * (face + T + gb / 2);
        for (let y = girtSp; y < ridge - roofClr; y += girtSp) {
          const half = y + roofClr <= eave ? hw : hw * (1 - (y + roofClr - eave) / (ridge - eave));
          if (half < 0.5) break;
          let segs: [number, number][] = [[-half, half]];
          if (gi === 0 && door && y < lintelTop) segs = [[-half, -doorPx], [doorPx, half]];
          segs.forEach(([a, b]) => {
            if (b - a < 0.5) return;
            put('ggirt', t('hall.bom.ggirt'), codes.girt, MAT.secondary, [a, y, zg], [b, y, zg], { ref: [0, 0, out] });
            sup.filter((x) => x >= a - 1e-3 && x <= b + 1e-3).forEach((x) => {
              const isCorner = Math.abs(Math.abs(x) - hw) < 1e-3;
              const own = (isCorner ? col.b : wnd.b) / 2;
              if (face - own > 0.005) kit.box(x, y, zEnd + out * (own + (face - own) / 2), T, gh + 0.04, face - own); // ara levha
              kit.box(x, y, zEnd + out * (face + T / 2), 0.14, gh + 0.04, T);                                       // takoz levhası
              [-1, 1].forEach((k) => kit.bolt([x + (isCorner ? 0 : k * 0.035), y + (isCorner ? k * gh * 0.22 : 0), zEnd + out * (face + (T + gtw) / 2)], [0, 0, out], T + gtw, 0.012));
            });
          });
        }
      });
    }

    // ---- kaplama ----
    const slopeLen = Math.hypot(hw, ridge - eave);
    const roofA = 2 * slopeLen * (length + 0.3);
    const wallA = 2 * length * eave;
    const gableA = 2 * (width * eave + (width * (ridge - eave)) / 2) - (door ? door.w * door.h : 0);
    if (s['panels'] && s['showPanels']) {
      const roofOff = (useTruss ? leg / 2 : raf.h / 2) + (s['purlins'] ? P.m.h : 0) + 0.02;
      const wallOff = col.h / 2 + (s['purlins'] ? T + Gt.m.b : 0) + 0.02;
      const gableOff = (s['purlins'] ? Math.max(col.b, wnd.b) / 2 + T + Gt.m.b : 0.2) + 0.03;
      const zA = zFront - 0.15, zB = zBack + 0.15;
      [-1, 1].forEach((side) => {
        const n = new Vec3(side * (ridge - eave), hw, 0).normalize().multiplyScalar(roofOff);
        const e = [side * (hw + 0.15), eave - 0.15 * slope], r = [0, ridge];
        kit.quad([e[0]! + n.x, e[1]! + n.y, zA], [r[0]! + n.x, r[1]! + n.y, zA], [r[0]! + n.x, r[1]! + n.y, zB], [e[0]! + n.x, e[1]! + n.y, zB], MAT.roof);
        const x = side * (hw + wallOff);
        kit.quad([x, 0, zA], [x, eave, zA], [x, eave, zB], [x, 0, zB], MAT.wall);
      });
      ([[zFront - gableOff, true], [zBack + gableOff, false]] as const).forEach(([z, front]) => {
        const outer: V2[] = [[-hw, 0], [hw, 0], [hw, eave], [0, ridge], [-hw, eave]];
        const holes: V2[][] = front && door ? [[[door.x1, 0], [door.x1, door.h], [door.x2, door.h], [door.x2, 0]]] : [];
        kit.polygon(outer, holes, [0, 0, z], MAT.wall, false);
      });
    }

    // ---- metraj ----
    const bom: BomItem[] = [{ group: t('hall.groups.main') }, tally.row('col'), tally.row('raf'), tally.row('chord'), tally.row('diag'),
      { group: t('hall.groups.stability') }, tally.row('sec'), tally.row('wind'), tally.row('dpost'), tally.row('lintel'), tally.row('purlin'), tally.row('girt'), tally.row('ggirt'), tally.row('wbr'), tally.row('rbr')].filter((r): r is BomItem => r !== null);
    if (s['panels']) {
      const panelPcs = (len: number) => Math.ceil(len / 1.0);
      bom.push({ group: t('hall.groups.cladding') },
        { key: 'roofPanel', name: t('hall.bom.roofPanel'), spec: t('hall.spec.panelModule', { kg: fmt(PANEL_KG, 1) }), qty: 2 * panelPcs(length + 0.3), amount: roofA, unit: 'm2', kg: roofA * PANEL_KG },
        { key: 'wallPanel', name: t('hall.bom.wallPanel'), spec: t('hall.spec.module'), qty: 2 * panelPcs(length), amount: wallA, unit: 'm2', kg: wallA * PANEL_KG },
        { key: 'gablePanel', name: t('hall.bom.gablePanel'), spec: door ? t('hall.spec.doorDeducted') : '', qty: 2 * panelPcs(width), amount: gableA, unit: 'm2', kg: gableA * PANEL_KG });
    }
    return {
      kpis: [
        { label: t('hall.kpi.footprint'), value: `${fmt(width * length)} m²` },
        { label: t('hall.kpi.bays'), value: `${numBays} × ${fmt(spacing, 2)} m` },
        { label: t('hall.kpi.columns'), value: `${zs.length * 2}` },
        { label: t('hall.kpi.roofSystem'), value: useTruss ? t('hall.kpi.truss') : t('hall.kpi.portal') },
      ],
      flag,
      chip: { strong: `${fmt(width)} × ${fmt(length)} m`, rest: t('hall.chip', { eave: fmt(eave, 1), ridge: fmt(ridge, 1) }) },
      bom,
      legend: [{ color: hex(MAT.column), label: t('hall.legend.column') }, { color: hex(MAT.beam), label: t('hall.legend.beam') }, { color: hex(MAT.secondary), label: t('hall.legend.secondary') },
        { color: hex(MAT.brace), label: t('hall.legend.brace') }, { color: hex(MAT.plate), label: t('hall.legend.plate') }, { color: hex(MAT.door), label: t('hall.legend.door') }],
    };
  },
};
