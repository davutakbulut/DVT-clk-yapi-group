import { isLocalizedText, type LocalizedText } from '@/lib/localized';

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

/** Varyant satırı: "ölçü etiketi | genişlik | yükseklik | et kalınlığı | boy | kg/m | stok kodu" (mm, kg). */
export interface VariantRow {
  readonly sizeLabel: string;
  readonly widthMm: number | null;
  readonly heightMm: number | null;
  readonly thicknessMm: number | null;
  readonly lengthMm: number | null;
  readonly kgPerM: number | null;
  readonly stockCode: string | null;
  /** Kesit grubu (ör. Kare / Dikdörtgen) — TR metin; EN yoksa TR gösterilir. */
  readonly variantGroup: string | null;
  /** Kesit değerleri A, Ix, Iy, Wx, Wy, ix, iy, u (yalnız pozitif sayılar). */
  readonly props: Readonly<Record<string, number>>;
}

const PROP_ORDER = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy', 'u'] as const;

const n = (v: string | undefined): number | null => {
  if (!v) return null;
  const x = Number(v.replace(',', '.'));
  return Number.isFinite(x) && x > 0 ? x : null;
};

/**
 * Satır: ölçü | genişlik | yükseklik | et | boy | kg/m | kod | grup | A | Ix | Iy | Wx | Wy | ix | iy | u
 * Excel'den yapıştırılan sekmeli satırlar da kabul edilir (sekme → |). Başlık satırı ("ölçü"/"size" ile başlayan) atlanır.
 */
export function parseVariants(text: string): VariantRow[] {
  return text
    .split('\n')
    .map((l) => l.replace(/\t/g, '|').split('|').map((p) => p.trim()))
    .filter((p) => p[0] && !/^(ölçü|olcu|size|stok|kod)/i.test(p[0]) )
    .map((p) => {
      const props: Record<string, number> = {};
      PROP_ORDER.forEach((k, i) => {
        const v = n(p[8 + i]);
        if (v !== null) props[k] = v;
      });
      return { sizeLabel: p[0]!, widthMm: n(p[1]), heightMm: n(p[2]), thicknessMm: n(p[3]), lengthMm: n(p[4]), kgPerM: n(p[5]), stockCode: p[6] || null, variantGroup: p[7] || null, props };
    });
}

export function formatVariants(rows: readonly VariantRow[]): string {
  return rows
    .map((v) => {
      const base = [v.sizeLabel, v.widthMm ?? '', v.heightMm ?? '', v.thicknessMm ?? '', v.lengthMm ?? '', v.kgPerM ?? '', v.stockCode ?? '', v.variantGroup ?? ''];
      const extra = PROP_ORDER.map((k) => v.props[k] ?? '');
      return [...base, ...(extra.some((x) => x !== '') ? extra : [])].join(' | ').replace(/( \|)+$/, '');
    })
    .join('\n');
}

export function readSpecs(rows: readonly { group_name: unknown; name: unknown; value: unknown; unit: string | null }[]): SpecRow[] {
  return rows.map((r) => ({ group: isLocalizedText(r.group_name) ? r.group_name : {}, name: isLocalizedText(r.name) ? r.name : {}, value: isLocalizedText(r.value) ? r.value : {}, unit: r.unit }));
}
