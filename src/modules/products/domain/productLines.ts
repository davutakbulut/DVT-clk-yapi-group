import { isLocalizedText, type LocalizedText } from '@/lib/localized';
import { PROP_KEYS, readDims, readProps, type Dims, type PropKey } from './productConfig';

/** Teknik özellik satırı: "grup | ad | değer | birim" — TR ve EN metin alanları sıraya göre eşleşir. */
export interface SpecRow {
  readonly group: LocalizedText;
  readonly name: LocalizedText;
  readonly value: LocalizedText;
  readonly unit: string | null;
}

function lines(text: string): string[][] {
  return text
    .split('\n')
    .map((l) => l.split('|').map((p) => p.trim()))
    .filter((parts) => parts.length >= 3 && parts[1]);
}

export function parseSpecs(tr: string, en: string): SpecRow[] {
  const a = lines(tr);
  const b = lines(en);
  return a.map((row, i) => {
    const e = b[i];
    const pick = (idx: number): LocalizedText => ({ ...(row[idx] ? { tr: row[idx] } : {}), ...(e?.[idx] ? { en: e[idx] } : {}) });
    return { group: pick(0), name: pick(1), value: pick(2), unit: row[3] || null };
  });
}

export function formatSpecs(specs: readonly SpecRow[], locale: 'tr' | 'en'): string {
  return specs
    .map((s) => [s.group[locale] ?? '', s.name[locale] ?? '', s.value[locale] ?? '', locale === 'tr' ? (s.unit ?? '') : ''].join(' | ').replace(/( \|)+$/, ''))
    .filter((l) => l.replace(/[\s|]/g, ''))
    .join('\n');
}

/** Varyant satırı (mm, kg). Grup: kod (K-90) ya da eski dil etiketi. */
export interface VariantRow {
  readonly sizeLabel: string;
  readonly sizeKey: string | null;
  readonly widthMm: number | null;
  readonly heightMm: number | null;
  readonly thicknessMm: number | null;
  readonly lengthMm: number | null;
  readonly kgPerM: number | null;
  readonly kgPerM2: number | null;
  readonly stockCode: string | null;
  readonly variantGroup: string | null;
  /** Kesit değerleri (yalnız pozitif sayılar). */
  readonly props: Partial<Record<PropKey, number>>;
  /** Kesit geometrisi (mm) ve "dim" metni. */
  readonly dims: Dims;
}

const LEGACY_PROPS = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy', 'u'] as const;
/** CSV başlığı (K-90, örnek sayfaların csv/ biçimi): k;g;s;v;lbl;dim;kg;kgm2;<kesit değerleri>;d_<geometri> — noktalı virgül, sekme ya da | ile. */
const CSV_HEAD = /^(k|kod|code|stok)$/i;

const n = (v: string | undefined): number | null => {
  if (!v) return null;
  const x = Number(v.replace(',', '.'));
  return Number.isFinite(x) && x > 0 ? x : null;
};
const splitLine = (l: string): string[] => {
  // Tırnaklı alanlar (Ø21,3 (1/2"")) yalnız ; ayracında
  const sep = l.includes(';') ? ';' : l.includes('\t') ? '\t' : '|';
  if (sep !== ';') return l.split(sep).map((p) => p.trim());
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i]!;
    if (c === '"') {
      if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === ';' && !q) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  out.push(cur.trim());
  return out;
};

/**
 * İki biçim:
 *  1) Sütun başlıklı CSV (örnek sayfaların csv/ dosyaları): ilk satır `k;g;s;v;lbl;dim;kg;…;d_h;d_b…` — sütunlar ada göre okunur.
 *  2) Eski boru satırı (K-88): ölçü | genişlik | yükseklik | et | boy | kg/m | kod | grup | A | Ix | Iy | Wx | Wy | ix | iy | u
 * Excel'den sekmeli yapıştırma her ikisinde de kabul edilir; eski biçimde "ölçü/size" ile başlayan başlık satırı atlanır.
 */
export function parseVariants(text: string): VariantRow[] {
  const raw = text.replace(/^\uFEFF/, '').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  if (raw.length === 0) return [];
  const head = splitLine(raw[0]!);
  if (head.length > 1 && CSV_HEAD.test(head[0]!) && head.some((h) => /^(lbl|kg|kgm2|s|v)$/i.test(h))) return parseCsv(head, raw.slice(1));
  return raw
    .map((l) => l.replace(/\t/g, '|').split('|').map((p) => p.trim()))
    .filter((p) => p[0] && !/^(ölçü|olcu|size|stok|kod)/i.test(p[0]))
    .map((p) => {
      const props: Partial<Record<PropKey, number>> = {};
      LEGACY_PROPS.forEach((k, i) => {
        const v = n(p[8 + i]);
        if (v !== null) props[k] = v;
      });
      return { sizeLabel: p[0]!, sizeKey: null, widthMm: n(p[1]), heightMm: n(p[2]), thicknessMm: n(p[3]), lengthMm: n(p[4]), kgPerM: n(p[5]), kgPerM2: null, stockCode: p[6] || null, variantGroup: p[7] || null, props, dims: {} };
    });
}

/** Geometriden genişlik/yükseklik/kalınlık: sıralama ve arama için (kesit türünden bağımsız, anahtar adına göre). */
function geometry(d: Record<string, number | string>, v: number | null): { widthMm: number | null; heightMm: number | null; thicknessMm: number | null } {
  const g = (k: string) => (typeof d[k] === 'number' ? (d[k] as number) : null);
  const heightMm = g('H') ?? g('h') ?? g('a');
  const widthMm = g('B') ?? g('b') ?? g('D') ?? g('w') ?? g('we');
  const thicknessMm = v ?? g('t');
  return { widthMm, heightMm, thicknessMm };
}

function parseCsv(head: string[], rows: string[]): VariantRow[] {
  const idx = (name: string) => head.findIndex((h) => h === name);
  const col = (cells: string[], name: string) => { const i = idx(name); return i >= 0 ? (cells[i] ?? '') : ''; };
  const out: VariantRow[] = [];
  for (const line of rows) {
    const cells = splitLine(line);
    const lbl = col(cells, 'lbl') || col(cells, 's') || col(cells, 'k');
    if (!lbl) continue;
    const props: Record<string, unknown> = {};
    const dims: Record<string, number | string> = {};
    head.forEach((h, i) => {
      const c = cells[i] ?? '';
      if (!c) return;
      if (h.startsWith('d_')) {
        const k = h.slice(2);
        const x = Number(c.replace(',', '.'));
        dims[k] = Number.isFinite(x) && /^[\d.,-]+$/.test(c) ? x : c;
      } else if ((PROP_KEYS as readonly string[]).includes(h) || h === 'U') props[h] = Number(c.replace(',', '.'));
    });
    const dim = col(cells, 'dim');
    if (dim) dims['dim'] = dim;
    const v = n(col(cells, 'v'));
    const geo = geometry(dims, v);
    out.push({
      sizeLabel: lbl,
      sizeKey: col(cells, 's') || null,
      ...geo,
      lengthMm: n(col(cells, 'len')),
      kgPerM: n(col(cells, 'kg')),
      kgPerM2: n(col(cells, 'kgm2')),
      stockCode: col(cells, 'k') || null,
      variantGroup: col(cells, 'g') || null,
      props: readProps(props),
      dims: readDims(dims),
    });
  }
  return out;
}

const csvCell = (s: string | number | null): string => {
  const t = s === null ? '' : String(s);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Geometri/ölçü anahtarı/kg/m² olan satırlar CSV başlıklı; yalnız eski alanlar varsa K-88 boru biçimi (kısa ve okunur). */
export function formatVariants(rows: readonly VariantRow[]): string {
  const rich = rows.some((v) => v.sizeKey || v.kgPerM2 !== null || Object.keys(v.dims).length > 0 || Object.keys(v.props).some((k) => !(LEGACY_PROPS as readonly string[]).includes(k)));
  if (!rich) {
    return rows
      .map((v) => {
        const base = [v.sizeLabel, v.widthMm ?? '', v.heightMm ?? '', v.thicknessMm ?? '', v.lengthMm ?? '', v.kgPerM ?? '', v.stockCode ?? '', v.variantGroup ?? ''];
        const extra = LEGACY_PROPS.map((k) => v.props[k] ?? '');
        return [...base, ...(extra.some((x) => x !== '') ? extra : [])].join(' | ').replace(/( \|)+$/, '');
      })
      .join('\n');
  }
  const propKeys = PROP_KEYS.filter((k) => rows.some((v) => v.props[k] !== undefined));
  const dimKeys = [...new Set(rows.flatMap((v) => Object.keys(v.dims).filter((k) => k !== 'dim')))];
  const anyLen = rows.some((v) => v.lengthMm !== null);
  const head = ['k', 'g', 's', 'v', 'lbl', 'dim', 'kg', 'kgm2', ...(anyLen ? ['len'] : []), ...propKeys, ...dimKeys.map((k) => `d_${k}`)];
  const body = rows.map((v) =>
    [v.stockCode, v.variantGroup, v.sizeKey, v.thicknessMm, v.sizeLabel, typeof v.dims['dim'] === 'string' ? v.dims['dim'] : null, v.kgPerM, v.kgPerM2, ...(anyLen ? [v.lengthMm] : []), ...propKeys.map((k) => v.props[k] ?? null), ...dimKeys.map((k) => v.dims[k] ?? null)]
      .map(csvCell)
      .join(';'),
  );
  return [head.join(';'), ...body].join('\n');
}

export function readSpecs(rows: readonly { group_name: unknown; name: unknown; value: unknown; unit: string | null }[]): SpecRow[] {
  return rows.map((r) => ({ group: isLocalizedText(r.group_name) ? r.group_name : {}, name: isLocalizedText(r.name) ? r.name : {}, value: isLocalizedText(r.value) ? r.value : {}, unit: r.unit }));
}
