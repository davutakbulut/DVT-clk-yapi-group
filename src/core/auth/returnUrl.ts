// 03-SECURITY-KVKK › Açık yönlendirme: returnUrl yalnız site içi göreli yol olabilir.
// Reddedilenler: şema/host taşıyanlar, `//` ve `/\` (protokol-göreli), `%2F`/`%5C` (çift kod çözme), `@`, kontrol karakterleri.

const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/**
 * Güvenli dönüş yolu; geçersizse `fallback`. Sorgu ve hash korunur.
 */
export function safeReturnUrl(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  const value = input.trim();
  if (value.length === 0 || value.length > 2048) return fallback;
  if (CONTROL_CHARS.test(value)) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/%2f|%5c|%00/i.test(value)) return fallback;
  if (value.includes('@') || value.includes('\\')) return fallback;
  // İkinci kod çözme turu hâlâ göreli yol vermeli
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || decoded.startsWith('/\\') || decoded.includes('\\') || decoded.includes('@')) return fallback;
  } catch {
    return fallback;
  }
  return value;
}
