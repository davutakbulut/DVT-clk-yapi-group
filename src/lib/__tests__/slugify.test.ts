import { describe, expect, it } from 'vitest';
import { isValidSlug, MAX_SLUG_LENGTH, slugify } from '../slugify';

describe('slugify', () => {
  it.each([
    ['Fabrika Çelik Çatı', 'fabrika-celik-cati'],
    ['Çelik Konstrüksiyon İşleri', 'celik-konstruksiyon-isleri'],
    ['ŞĞÜÖİÇ şğüöıç', 'sguoic-sguoic'],
    ['Kâr Marjı & Rüzgâr Yükü', 'kar-marji-ruzgar-yuku'],
    ['  --Depo / Hangar (2024)--  ', 'depo-hangar-2024'],
    ['Café Déjà Vu', 'cafe-deja-vu'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  // Tuzağın kendisi: bu ikisi toLowerCase() ile yazılsaydı bozulurdu.
  it("büyük 'I' → 'i' (noktasız ı üzerinden, ASCII'de kaybolmadan)", () => {
    expect(slugify('IĞDIR ISITMA')).toBe('igdir-isitma');
  });

  it("'İ' birleşen nokta (U+0307) bırakmaz", () => {
    const slug = slugify('İSTANBUL İNŞAAT');
    expect(slug).toBe('istanbul-insaat');
    expect(slug).not.toMatch(/̇/);
  });

  it('ürettiği her slug veritabanı CHECK desenine uyar', () => {
    for (const input of ['Çelik', 'a  b', 'İ-I-ı-i', '100% Çelik!', 'x'.repeat(200), 'kelime '.repeat(40)]) {
      const slug = slugify(input);
      expect(isValidSlug(slug), `"${input}" → "${slug}"`).toBe(true);
      expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    }
  });

  it('uzun başlığı kelime ortasından kesmez', () => {
    const slug = slugify('celik konstruksiyon fabrika binasi catisi ve cephe kaplama uygulamalari rehberi 2026 guncel');
    expect(slug.endsWith('-')).toBe(false);
    expect('celik konstruksiyon fabrika binasi catisi ve cephe kaplama uygulamalari rehberi 2026 guncel'.split(' ')).toContain(slug.split('-').at(-1));
  });

  it('ASCII karşılığı olmayan girdide boş döner — çağıran doğrulama hatası sayar', () => {
    expect(slugify('🏗️ ✨')).toBe('');
    expect(isValidSlug('')).toBe(false);
  });
});

describe('isValidSlug', () => {
  it.each(['Buyuk-Harf', 'çelik', 'cift--tire', '-bas', 'son-', 'bosluk var', 'nokta.li'])('reddeder: %s', (value) => {
    expect(isValidSlug(value)).toBe(false);
  });
});
