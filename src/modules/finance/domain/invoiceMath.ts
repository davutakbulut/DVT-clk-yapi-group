/**
 * Fatura tutarları (05-SALES-FINANCE, K-31) — kuruş tamsayısıyla, 0007 CHECK'leriyle birebir:
 *   vat = round(base × vat_rate, 2) · total = base + vat · withholding = round(vat × ratio, 2) · collectable = total − withholding
 * Tevkifat KDV'nin alıcı tarafından beyan edilen kısmıdır; nakit akışını doğrudan etkiler (tevkifatlı/tevkifatsız ayrı izlenir).
 */
export const WITHHOLDING_RATIOS = [0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1.0] as const;
export type WithholdingRatio = (typeof WITHHOLDING_RATIOS)[number];

export interface InvoiceAmounts {
  readonly baseAmount: number;
  readonly vatAmount: number;
  readonly totalAmount: number;
  readonly withholdingAmount: number;
  readonly collectableAmount: number;
}

const cents = (v: number) => Math.round(v * 100);
function mulDivHalfUp(a: number, b: number, d: number): number {
  const p = BigInt(a) * BigInt(b);
  const q = p / BigInt(d);
  const r = p % BigInt(d);
  return Number(r * 2n >= BigInt(d) ? q + 1n : q);
}

export function computeInvoice(input: { readonly baseAmount: number; readonly vatRate: number; readonly withholdingRatio: number | null }): InvoiceAmounts {
  const base = cents(input.baseAmount);
  const vat = mulDivHalfUp(base, Math.round(input.vatRate * 10_000), 10_000);
  const total = base + vat;
  const withholding = input.withholdingRatio ? mulDivHalfUp(vat, Math.round(input.withholdingRatio * 100), 100) : 0;
  return { baseAmount: base / 100, vatAmount: vat / 100, totalAmount: total / 100, withholdingAmount: withholding / 100, collectableAmount: (total - withholding) / 100 };
}

/** Ödeme planı satırı: "Açıklama | oran% | tutar | YYYY-AA-GG". Tutar boşsa oran × tahsil edilecek tutardan türetilir. */
export interface ScheduleLine {
  readonly description: string;
  readonly ratioPct: number | null;
  readonly amount: number;
  readonly dueDate: string;
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const cleaned = v.replace(/\s/g, '').replace('%', '');
  const normalized = /,\d{1,3}$/.test(cleaned) ? cleaned.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(cleaned) ? cleaned.replace(/\./g, '') : cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseScheduleLines(text: string, collectableTotal: number): ScheduleLine[] {
  return text
    .split('\n')
    .map((l) => l.split('|').map((p) => p.trim()))
    .filter((p) => p[0])
    .flatMap((p) => {
      const ratio = num(p[1]);
      const explicit = num(p[2]);
      const amount = explicit ?? (ratio ? mulDivHalfUp(cents(collectableTotal), Math.round(ratio * 100), 10_000) / 100 : null);
      const due = p[3] && /^\d{4}-\d{2}-\d{2}$/.test(p[3]) ? p[3] : null;
      if (!amount || !due) return [];
      return [{ description: p[0]!.slice(0, 200), ratioPct: ratio && ratio <= 100 ? ratio : null, amount, dueDate: due }];
    });
}

export function formatScheduleLines(rows: readonly ScheduleLine[]): string {
  return rows.map((r) => [r.description, r.ratioPct === null ? '' : String(r.ratioPct), String(r.amount), r.dueDate].join(' | ')).join('\n');
}

/** Alacak yaşlandırma kovası (Faz 22 raporu da kullanır): 0-30 / 31-60 / 61-90 / 90+ gün. */
export function agingBucket(dueDate: string, today = new Date()): '0-30' | '31-60' | '61-90' | '90+' | 'current' {
  const due = new Date(`${dueDate}T00:00:00Z`);
  const days = Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - due.getTime()) / 86_400_000);
  if (days <= 0) return 'current';
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
