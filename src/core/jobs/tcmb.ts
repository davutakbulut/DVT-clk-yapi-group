/**
 * TCMB günlük kur XML'i (https://www.tcmb.gov.tr/kurlar/today.xml) → USD/EUR döviz SATIŞ kuru. Saf ayrıştırma; ağ yok.
 * Biçim: <Tarih_Date Tarih="18.09.2026" ...><Currency Kod="USD" ...><ForexSelling>40.1234</ForexSelling>…
 */
export interface TcmbRate {
  readonly currency: 'USD' | 'EUR';
  readonly rateDate: string; // YYYY-MM-DD
  readonly rate: number;
}

export function parseTcmbXml(xml: string): TcmbRate[] {
  const dateMatch = /Tarih="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml);
  if (!dateMatch) return [];
  const rateDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  const out: TcmbRate[] = [];
  for (const currency of ['USD', 'EUR'] as const) {
    const block = new RegExp(`<Currency[^>]*Kod="${currency}"[^>]*>([\\s\\S]*?)</Currency>`).exec(xml);
    const selling = block ? /<ForexSelling>\s*([\d.]+)\s*<\/ForexSelling>/.exec(block[1]!) : null;
    const rate = selling ? Number(selling[1]) : Number.NaN;
    if (Number.isFinite(rate) && rate > 0) out.push({ currency, rateDate, rate: Math.round(rate * 1_000_000) / 1_000_000 });
  }
  return out;
}
