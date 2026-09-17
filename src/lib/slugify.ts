// K-16 · Türkçe slug tuzağı. toLowerCase() KULLANILMAZ:
//   'I'.toLowerCase()  → 'i'  ama Türkçe'de doğrusu 'ı' → 'i' (ASCII'ye inerken ikisi de 'i')
//   'İ'.toLowerCase()  → 'i' + U+0307 (birleşen nokta) → ASCII süzgecinde sessizce bozulur
// Bu yüzden büyük/küçük çevrim de dahil her şey açık tablodan yapılır.

const TR_MAP: Readonly<Record<string, string>> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i', i: 'i', // static-ok: harf çevrim tablosu
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', // static-ok: harf çevrim tablosu
  // Türkçe metinde sık geçen şapkalı harfler (kâr, hâl, rüzgâr)
  â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u', // static-ok: harf çevrim tablosu
};

const ASCII_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ASCII_LOWER = 'abcdefghijklmnopqrstuvwxyz';

/** Veritabanındaki CHECK kısıtıyla birebir aynı desen. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const MAX_SLUG_LENGTH = 80;

function mapChar(char: string): string {
  const mapped = TR_MAP[char];
  if (mapped !== undefined) return mapped;
  const upperIndex = ASCII_UPPER.indexOf(char);
  return upperIndex === -1 ? char : (ASCII_LOWER[upperIndex] ?? char);
}

/**
 * Başlıktan ASCII slug üretir. Boş dize dönebilir (ör. girdi yalnız emoji ise) —
 * çağıran bunu doğrulama hatası saymalıdır.
 */
export function slugify(input: string): string {
  const mapped = Array.from(input, mapChar).join('');
  const ascii = mapped
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // kalan birleşen işaretler (é → e)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (ascii.length <= MAX_SLUG_LENGTH) return ascii;
  // Kelime ortasından kesmemek için son tireye kadar geri çekil
  const cut = ascii.slice(0, MAX_SLUG_LENGTH);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > MAX_SLUG_LENGTH / 2 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
}

export function isValidSlug(value: string): boolean {
  return value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);
}
