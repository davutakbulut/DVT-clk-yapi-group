/**
 * Rapor toplamları (05-SALES-FINANCE › 9 rapor) — saf fonksiyonlar, kuruş hassasiyeti (round2). Tüm tutarlar ₺ (K-32: kayıttaki kur).
 * Maliyet/kâr alanları admin dışı için null gelir; fonksiyonlar null'u "bilinmiyor" sayar (K-33).
 */
export interface SaleFact {
  readonly id: string;
  readonly saleDate: string; // YYYY-MM-DD
  readonly status: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly exchangeRate: number;
  readonly grandTotalTry: number;
  readonly netTry: number; // (subtotal − discount) × rate
  readonly totalCostTry: number | null; // 🔒
  readonly leadId: string | null;
}
export interface ItemFact {
  readonly saleId: string;
  readonly serviceName: string | null;
  readonly lineTotalTry: number;
  readonly lineCostTry: number | null; // 🔒
}
export interface ExpenseFact {
  readonly saleId: string;
  readonly category: string;
  readonly amountTry: number;
}
export interface InvoiceFact {
  readonly status: string;
  readonly collectableTry: number;
  readonly paidTry: number;
}
export interface ScheduleFact {
  readonly dueDate: string;
  readonly status: string;
  readonly amount: number;
  readonly paid: number;
}
export interface LeadFact {
  readonly status: string;
  readonly createdAt: string;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const sum = (xs: readonly number[]) => round2(xs.reduce((a, b) => a + b, 0));
export const monthKey = (date: string) => date.slice(0, 7);
const ACTIVE = new Set(['confirmed', 'in_progress', 'completed']);

export interface MonthRow {
  readonly month: string;
  readonly revenue: number;
  readonly count: number;
  readonly cost: number | null;
  readonly profit: number | null;
  readonly marginPct: number | null;
}

/** Ciro özeti + kârlılık: aylık; iptal/taslak hariç. */
export function byMonth(sales: readonly SaleFact[]): MonthRow[] {
  const groups = new Map<string, SaleFact[]>();
  for (const s of sales) if (ACTIVE.has(s.status)) groups.set(monthKey(s.saleDate), [...(groups.get(monthKey(s.saleDate)) ?? []), s]);
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rows]) => {
      const revenue = sum(rows.map((r) => r.grandTotalTry));
      const net = sum(rows.map((r) => r.netTry));
      const known = rows.every((r) => r.totalCostTry !== null);
      const cost = known ? sum(rows.map((r) => r.totalCostTry ?? 0)) : null;
      const profit = cost === null ? null : round2(net - cost);
      return { month, revenue, count: rows.length, cost, profit, marginPct: profit === null || net <= 0 ? null : round2((profit / net) * 100) };
    });
}

export interface PeriodSummary {
  readonly revenue: number;
  readonly count: number;
  readonly previousRevenue: number;
  readonly changePct: number | null;
}

/** Dönem toplamı ve bir önceki eşit uzunluktaki dönemle karşılaştırma. */
export function periodSummary(sales: readonly SaleFact[], from: string, to: string, previous: readonly SaleFact[]): PeriodSummary {
  const inRange = (s: SaleFact) => ACTIVE.has(s.status) && s.saleDate >= from && s.saleDate <= to;
  const cur = sales.filter(inRange);
  const revenue = sum(cur.map((s) => s.grandTotalTry));
  const previousRevenue = sum(previous.filter((s) => ACTIVE.has(s.status)).map((s) => s.grandTotalTry));
  return { revenue, count: cur.length, previousRevenue, changePct: previousRevenue > 0 ? round2(((revenue - previousRevenue) / previousRevenue) * 100) : null };
}

export interface GroupRow {
  readonly key: string;
  readonly label: string;
  readonly revenue: number;
  readonly count: number;
  readonly profit: number | null;
}

/** Hizmet bazlı: kalem satırlarından (hizmet adı yoksa "diğer"). */
export function byService(items: readonly ItemFact[], sales: readonly SaleFact[], otherLabel: string): GroupRow[] {
  const active = new Set(sales.filter((s) => ACTIVE.has(s.status)).map((s) => s.id));
  const groups = new Map<string, ItemFact[]>();
  for (const i of items) if (active.has(i.saleId)) groups.set(i.serviceName ?? '', [...(groups.get(i.serviceName ?? '') ?? []), i]);
  return [...groups.entries()]
    .map(([key, rows]) => ({ key: key || 'other', label: key || otherLabel, revenue: sum(rows.map((r) => r.lineTotalTry)), count: rows.length, profit: rows.every((r) => r.lineCostTry !== null) ? round2(sum(rows.map((r) => r.lineTotalTry)) - sum(rows.map((r) => r.lineCostTry ?? 0))) : null }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Müşteri bazlı: en çok ciro, müşteri kârlılığı (🔒). */
export function byCustomer(sales: readonly SaleFact[]): GroupRow[] {
  const groups = new Map<string, SaleFact[]>();
  for (const s of sales) if (ACTIVE.has(s.status)) groups.set(s.customerId, [...(groups.get(s.customerId) ?? []), s]);
  return [...groups.entries()]
    .map(([key, rows]) => ({ key, label: rows[0]!.customerName, revenue: sum(rows.map((r) => r.grandTotalTry)), count: rows.length, profit: rows.every((r) => r.totalCostTry !== null) ? round2(sum(rows.map((r) => r.netTry)) - sum(rows.map((r) => r.totalCostTry ?? 0))) : null }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);
}

export interface StatusRow {
  readonly status: string;
  readonly count: number;
  readonly collectable: number;
  readonly paid: number;
}

export function invoiceStatus(invoices: readonly InvoiceFact[]): StatusRow[] {
  const groups = new Map<string, InvoiceFact[]>();
  for (const i of invoices) groups.set(i.status, [...(groups.get(i.status) ?? []), i]);
  return [...groups.entries()].map(([status, rows]) => ({ status, count: rows.length, collectable: sum(rows.map((r) => r.collectableTry)), paid: sum(rows.map((r) => r.paidTry)) }));
}

export type AgingBucketKey = '0-30' | '31-60' | '61-90' | '90+';
export interface AgingRow {
  readonly bucket: AgingBucketKey;
  readonly count: number;
  readonly amount: number;
}

/** Alacak yaşlandırma: vadesi geçmiş, tahsil edilmemiş kalan (tutar − tahsil). */
export function aging(schedules: readonly ScheduleFact[], today: string): AgingRow[] {
  const buckets: Record<AgingBucketKey, { count: number; amount: number }> = { '0-30': { count: 0, amount: 0 }, '31-60': { count: 0, amount: 0 }, '61-90': { count: 0, amount: 0 }, '90+': { count: 0, amount: 0 } };
  const t = Date.parse(`${today}T00:00:00Z`);
  for (const s of schedules) {
    if (!['pending', 'partially_paid'].includes(s.status) || s.dueDate >= today) continue;
    const days = Math.floor((t - Date.parse(`${s.dueDate}T00:00:00Z`)) / 86_400_000);
    const key: AgingBucketKey = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
    buckets[key].count += 1;
    buckets[key].amount = round2(buckets[key].amount + Math.max(0, s.amount - s.paid));
  }
  return (Object.keys(buckets) as AgingBucketKey[]).map((bucket) => ({ bucket, ...buckets[bucket] }));
}

export interface CalendarRow {
  readonly month: string;
  readonly count: number;
  readonly amount: number;
}

/** Tahsilat takvimi: bugünden sonraki bekleyen hakedişler aylık (nakit akışı projeksiyonu). */
export function calendar(schedules: readonly ScheduleFact[], today: string): CalendarRow[] {
  const groups = new Map<string, ScheduleFact[]>();
  for (const s of schedules) if (['pending', 'partially_paid'].includes(s.status) && s.dueDate >= today) groups.set(monthKey(s.dueDate), [...(groups.get(monthKey(s.dueDate)) ?? []), s]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, rows]) => ({ month, count: rows.length, amount: sum(rows.map((r) => Math.max(0, r.amount - r.paid))) }));
}

export interface Funnel {
  readonly leads: number;
  readonly quoted: number;
  readonly won: number;
  readonly sales: number;
  readonly quotedRate: number | null;
  readonly wonRate: number | null;
}

/** Dönüşüm hunisi: talep → teklif verildi (quoted/won/lost sonrası) → kazanıldı; talebe bağlı satış sayısı. */
export function funnel(leads: readonly LeadFact[], sales: readonly SaleFact[]): Funnel {
  const total = leads.length;
  const quoted = leads.filter((l) => ['quoted', 'won'].includes(l.status)).length;
  const won = leads.filter((l) => l.status === 'won').length;
  const linked = sales.filter((s) => s.leadId !== null && ACTIVE.has(s.status)).length;
  return { leads: total, quoted, won, sales: linked, quotedRate: total > 0 ? round2((quoted / total) * 100) : null, wonRate: total > 0 ? round2((won / total) * 100) : null };
}

export interface CostRow {
  readonly category: string;
  readonly amount: number;
  readonly sharePct: number;
}

/** Maliyet dağılımı (🔒): gider kategorileri + kalem maliyeti ("item"). */
export function costBreakdown(expenses: readonly ExpenseFact[], items: readonly ItemFact[]): CostRow[] {
  const groups = new Map<string, number>();
  for (const e of expenses) groups.set(e.category, round2((groups.get(e.category) ?? 0) + e.amountTry));
  const itemCost = sum(items.map((i) => i.lineCostTry ?? 0));
  if (itemCost > 0) groups.set('item', itemCost);
  const total = sum([...groups.values()]);
  return [...groups.entries()].map(([category, amount]) => ({ category, amount, sharePct: total > 0 ? round2((amount / total) * 100) : 0 })).sort((a, b) => b.amount - a.amount);
}

/** CSV (Excel açar): UTF-8 BOM + noktalı virgül (TR Excel varsayılanı); alanlar tırnaklanır. */
export function toCsv(headers: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string {
  const cell = (v: string | number | null) => (v === null ? '' : `"${String(v).replace(/"/g, '""')}"`);
  return `﻿${[headers, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')}\r\n`;
}
