import { describe, expect, it } from 'vitest';
import { parseConsent, serializeConsent } from '../domain/consent';

describe('çerez onayı', () => {
  it('serileştir ↔ ayrıştır; zorunlu her zaman true; sürüm uyuşmazsa null', () => {
    const raw = serializeConsent({ analytics: true, marketing: false });
    const parsed = parseConsent(raw);
    expect(parsed).toMatchObject({ v: 1, necessary: true, analytics: true, marketing: false });
    expect(parsed?.at).toMatch(/^\d{4}-/);
    expect(parseConsent(encodeURIComponent(JSON.stringify({ v: 0, analytics: true })))).toBeNull();
    expect(parseConsent('bozuk%')).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });
});
