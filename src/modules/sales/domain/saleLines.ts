/** Satır biçimleri (admin formu). Kalem: "Açıklama | miktar | birim | birim fiyat | birim maliyet". Gider: "kategori | açıklama | tutar | YYYY-AA-GG". */
export interface ItemLine {
  readonly description: string;
  readonly quantity: number;
  readonly unit: string;
  readonly unitPrice: number;
  readonly unitCost: number | null;
}

export interface ExpenseLine {
  readonly category: (typeof EXPENSE_CATEGORIES)[number];
  readonly description: string | null;
  readonly amount: number;
  readonly expenseDate: string | null;
}

export const EXPENSE_CATEGORIES = ['shipping', 'labor', 'equipment', 'travel', 'subcontractor', 'other'] as const;

function num(v: string | undefined): number | null {
  if (!v) return null;
  const cleaned = v.replace(/\s/g, '');
  // "52.000,00" (TR) · "1,250.50" (EN) · "85.000" (TR binlik, ondalıksız) · "1450"
  const normalized = /,\d{1,3}$/.test(cleaned) ? cleaned.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(cleaned) ? cleaned.replace(/\./g, '') : cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function cells(text: string): string[][] {
  return text
    .split('\n')
    .map((l) => l.split('|').map((p) => p.trim()))
    .filter((p) => p[0]);
}

/** Geçersiz miktar/fiyat satırı düşer (sessiz değil: çağıran satır sayısını karşılaştırıp uyarabilir). */
export function parseItemLines(text: string, withCost: boolean): ItemLine[] {
  return cells(text).flatMap((p) => {
    const quantity = num(p[1]);
    const unitPrice = num(p[3]);
    if (quantity === null || quantity <= 0 || unitPrice === null) return [];
    const unitCost = withCost ? num(p[4]) : null;
    return [{ description: p[0]!.slice(0, 300), quantity: Math.round(quantity * 1000) / 1000, unit: (p[2] || 'adet').slice(0, 20), unitPrice: Math.round(unitPrice * 100) / 100, unitCost: unitCost === null ? null : Math.round(unitCost * 100) / 100 }];
  });
}

export function formatItemLines(items: readonly ItemLine[], withCost: boolean): string {
  return items.map((i) => [i.description, String(i.quantity), i.unit, String(i.unitPrice), ...(withCost ? [i.unitCost === null ? '' : String(i.unitCost)] : [])].join(' | ').replace(/ \| $/, '')).join('\n');
}

export function parseExpenseLines(text: string): ExpenseLine[] {
  return cells(text).flatMap((p) => {
    const category = EXPENSE_CATEGORIES.find((c) => c === p[0]!.toLocaleLowerCase('en'));
    const amount = num(p[2]);
    if (!category || amount === null) return [];
    const date = p[3] && /^\d{4}-\d{2}-\d{2}$/.test(p[3]) ? p[3] : null;
    return [{ category, description: p[1] ? p[1].slice(0, 300) : null, amount: Math.round(amount * 100) / 100, expenseDate: date }];
  });
}

export function formatExpenseLines(items: readonly ExpenseLine[]): string {
  return items.map((e) => [e.category, e.description ?? '', String(e.amount), e.expenseDate ?? ''].join(' | ').replace(/( \|\s*)+$/, '')).join('\n');
}
