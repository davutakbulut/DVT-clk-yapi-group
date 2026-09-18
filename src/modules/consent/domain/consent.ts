/** Çerez onayı: tek çerez `clk_consent` (JSON, 180 gün). Zorunlu her zaman açık; analitik/pazarlama onayı Faz 23'te script yüklemeyi kapılar. */
export const CONSENT_COOKIE = 'clk_consent';
export const CONSENT_MAX_AGE_DAYS = 180;
export const CONSENT_VERSION = 1;

export interface Consent {
  readonly v: number;
  readonly necessary: true;
  readonly analytics: boolean;
  readonly marketing: boolean;
  readonly at: string;
}

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<Consent>;
    if (value.v !== CONSENT_VERSION) return null;
    return { v: CONSENT_VERSION, necessary: true, analytics: value.analytics === true, marketing: value.marketing === true, at: typeof value.at === 'string' ? value.at : '' };
  } catch {
    return null;
  }
}

export function serializeConsent(input: { readonly analytics: boolean; readonly marketing: boolean }): string {
  const consent: Consent = { v: CONSENT_VERSION, necessary: true, analytics: input.analytics, marketing: input.marketing, at: new Date().toISOString() };
  return encodeURIComponent(JSON.stringify(consent));
}

export function readConsentFromDocument(): Consent | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match ? match.slice(CONSENT_COOKIE.length + 1) : null);
}

export function writeConsentToDocument(input: { readonly analytics: boolean; readonly marketing: boolean }): void {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(input)}; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent('clk:consent', { detail: readConsentFromDocument() }));
}
