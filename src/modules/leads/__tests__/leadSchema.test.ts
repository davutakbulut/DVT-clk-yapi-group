import { describe, expect, it } from 'vitest';
import { formatOptions, leadFormSchema, parseOptions, readOptions } from '../domain/leadSchema';

describe('lead form schema', () => {
  const base = { source: 'quote_form', locale: 'tr', fullName: 'Ali Veli', consentKvkk: true, consentMarketing: false, website: '' };
  it('e-posta ya da telefon zorunlu; bal küpü dolu → geçersiz', () => {
    expect(leadFormSchema.safeParse({ ...base, email: 'ali@example.com' }).success).toBe(true);
    expect(leadFormSchema.safeParse({ ...base, phone: '+90 555 111 22 33' }).success).toBe(true);
    expect(leadFormSchema.safeParse(base).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...base, email: 'ali@example.com', website: 'http://spam' }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...base, email: 'ali@example.com', consentKvkk: false }).success).toBe(false);
  });

  it('seçenek satırları: parse ↔ format; anahtar güvenli', () => {
    const opts = parseOptions('warehouse | Depo | Warehouse\nresidential | Konut\n | etiketsiz\nbad key! | X | Y');
    expect(opts).toEqual([
      { key: 'warehouse', label: { tr: 'Depo', en: 'Warehouse' } },
      { key: 'residential', label: { tr: 'Konut' } },
      { key: 'badkey', label: { tr: 'X', en: 'Y' } },
    ]);
    expect(parseOptions(formatOptions(opts))).toEqual(opts);
    expect(readOptions({ project_types: opts, budgets: 'x' })).toEqual({ projectTypes: opts, budgets: [], timelines: [] });
  });
});
