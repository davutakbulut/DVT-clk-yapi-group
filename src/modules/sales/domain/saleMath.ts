/**
 * Satış tutarları — saf hesap, kuruş tamsayısıyla (kayan nokta yok). 0007 CHECK kısıtlarıyla birebir:
 *   line_total = round(quantity × unit_price, 2) · grand_total = subtotal − discount + vat · grand_total_try = round(grand_total × rate, 2)
 *   gross_profit = subtotal − discount − total_cost · line_profit = line_total − line_cost
 * Yuvarlama: yarım yukarı (Postgres numeric round ile aynı, pozitif tutarlarda).
 */
export interface SaleLineInput {
  readonly quantity: number; // 3 ondalık
  readonly unitPrice: number; // 2 ondalık
  readonly unitCost: number | null; // 🔒 yalnız admin
}

export interface SaleLineTotals {
  readonly lineTotal: number;
  readonly lineCost: number | null;
  readonly lineProfit: number | null;
}

export interface SaleTotalsInput {
  readonly lines: readonly SaleLineInput[];
  readonly expenses: readonly number[]; // 🔒
  readonly discountPct: number;
  readonly isInvoiced: boolean;
  readonly vatRate: number; // 0.20
  readonly exchangeRate: number; // TRY için 1
  readonly withCost: boolean; // admin: maliyet/kâr hesaplanır
}

export interface SaleTotals {
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly vatAmount: number;
  readonly grandTotal: number;
  readonly grandTotalTry: number;
  readonly totalCost: number | null;
  readonly grossProfit: number | null;
  readonly marginPct: number | null;
}

const cents = (v: number) => Math.round(v * 100);
const fromCents = (c: number) => c / 100;
/** a × b / d, yarım yukarı — BigInt: kuruş × mikro-kur 2^53'ü aşabilir. */
function mulDiv(a: number, b: number, d: number): number {
  const p = BigInt(a) * BigInt(b);
  const q = p / BigInt(d);
  const r = p % BigInt(d);
  return Number(r * 2n >= BigInt(d) ? q + 1n : q);
}

export function lineTotals(line: SaleLineInput): SaleLineTotals {
  const qMilli = Math.round(line.quantity * 1000);
  const lineTotal = mulDiv(qMilli, cents(line.unitPrice), 1000);
  if (line.unitCost === null) return { lineTotal: fromCents(lineTotal), lineCost: null, lineProfit: null };
  const lineCost = mulDiv(qMilli, cents(line.unitCost), 1000);
  return { lineTotal: fromCents(lineTotal), lineCost: fromCents(lineCost), lineProfit: fromCents(lineTotal - lineCost) };
}

export function computeSaleTotals(input: SaleTotalsInput): SaleTotals {
  const lines = input.lines.map(lineTotals);
  const subtotal = lines.reduce((a, l) => a + cents(l.lineTotal), 0);
  const discount = mulDiv(subtotal, Math.round(input.discountPct * 100), 10_000);
  const base = subtotal - discount;
  const vat = input.isInvoiced ? mulDiv(base, Math.round(input.vatRate * 10_000), 10_000) : 0;
  const grand = base + vat;
  const grandTry = mulDiv(grand, Math.round(input.exchangeRate * 1_000_000), 1_000_000);
  let totalCost: number | null = null;
  let grossProfit: number | null = null;
  let marginPct: number | null = null;
  if (input.withCost) {
    const lineCost = lines.reduce((a, l) => a + cents(l.lineCost ?? 0), 0);
    const expenses = input.expenses.reduce((a, e) => a + cents(e), 0);
    totalCost = lineCost + expenses;
    grossProfit = base - totalCost;
    marginPct = base > 0 ? Math.round((grossProfit / base) * 10_000) / 100 : null;
  }
  return {
    subtotal: fromCents(subtotal),
    discountAmount: fromCents(discount),
    vatAmount: fromCents(vat),
    grandTotal: fromCents(grand),
    grandTotalTry: fromCents(grandTry),
    totalCost: totalCost === null ? null : fromCents(totalCost),
    grossProfit: grossProfit === null ? null : fromCents(grossProfit),
    marginPct,
  };
}

/** Kâr marjı rengi (05-SALES-FINANCE): 🔴 %10 altı · 🟡 %10–20 · 🟢 %20 üstü. */
export function marginBand(pct: number | null): 'red' | 'yellow' | 'green' | null {
  if (pct === null) return null;
  if (pct < 10) return 'red';
  if (pct <= 20) return 'yellow';
  return 'green';
}
