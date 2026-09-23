import { NextResponse, type NextRequest } from 'next/server';
import { safeReturnUrl } from '@/core/auth';
import { getSiteUrl } from '@/core/config/site';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';

const TOKEN_TYPES = new Set(['recovery', 'invite', 'email', 'signup', 'email_change']);
type TokenType = 'recovery' | 'invite' | 'email' | 'signup' | 'email_change';

/** Mutlak adresler site ayarından (K-84): request.nextUrl.origin, Passenger arkasında 0.0.0.0:3000 çıkıyordu. */
function failure(locale: string): NextResponse {
  const url = new URL(`/${locale}/${locale === 'en' ? 'login' : 'giris'}`, getSiteUrl().origin);
  url.searchParams.set('error', 'link');
  return NextResponse.redirect(url);
}
function localeOf(next: string): string {
  return next.startsWith('/en') ? 'en' : 'tr';
}

/**
 * PKCE kod değişimi ya da token_hash doğrulaması: davet, e-posta doğrulama ve şifre sıfırlama bağlantıları buraya iner.
 * token_hash bağlantıları GET'te DOĞRULANMAZ: e-posta tarayıcıları (Outlook Safe Links, kurumsal filtreler) bağlantıyı önceden
 * açıp tek kullanımlık jetonu tüketiyordu → "otp_expired". GET bir onay düğmesi gösterir; doğrulama POST'ta yapılır (K-84).
 * Middleware /auth'a dokunmaz (K-13); çerezleri bu yanıt yazar. `next` yalnız site içi yol olabilir.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeReturnUrl(searchParams.get('next'), '/tr');
  const locale = localeOf(next);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') ?? '';

  if (!code && tokenHash && TOKEN_TYPES.has(type)) return confirmPage(locale, tokenHash, type, next);
  if (!code) return failure(locale);
  const client = await createServerClient();
  if (!client.ok) return failure(locale);
  const { error } = await client.data.auth.exchangeCodeForSession(code);
  if (error) {
    logger.warn('PKCE kod değişimi başarısız', { module: 'auth', code: error.code });
    return failure(locale);
  }
  return NextResponse.redirect(new URL(next, getSiteUrl().origin));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const tokenHash = String(form.get('token_hash') ?? '');
  const type = String(form.get('type') ?? '');
  const next = safeReturnUrl(String(form.get('next') ?? ''), '/tr');
  const locale = localeOf(next);
  if (!tokenHash || !TOKEN_TYPES.has(type)) return failure(locale);
  const client = await createServerClient();
  if (!client.ok) return failure(locale);
  const { error } = await client.data.auth.verifyOtp({ token_hash: tokenHash, type: type as TokenType });
  if (error) {
    logger.warn('Tek kullanımlık bağlantı doğrulanamadı', { module: 'auth', code: error.code });
    return failure(locale);
  }
  return NextResponse.redirect(new URL(next, getSiteUrl().origin), { status: 303 });
}

const COPY = {
  tr: { title: 'Devam etmek için onaylayın', body: 'Güvenlik için bağlantı yalnız siz tıklayınca kullanılır.', button: { recovery: 'Şifremi sıfırla', invite: 'Daveti kabul et', email: 'E-postamı doğrula', signup: 'Hesabımı doğrula', email_change: 'Yeni e-postamı doğrula' } }, // static-ok: /auth grubunda site layout'u ve next-intl yok; tek kullanımlık onay sayfasının mikro-metni
  en: { title: 'Confirm to continue', body: 'For security, the link is used only when you click.', button: { recovery: 'Reset my password', invite: 'Accept invitation', email: 'Verify my e-mail', signup: 'Verify my account', email_change: 'Verify my new e-mail' } },
} as const;

/** Ara onay sayfası: bağımlılıksız, inline stil (tasarım tokenlarıyla aynı renkler) — /auth grubunda site layout'u yok. */
function confirmPage(locale: string, tokenHash: string, type: string, next: string): NextResponse {
  const c = COPY[locale === 'en' ? 'en' : 'tr'];
  const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);
  const label = c.button[type as TokenType] ?? c.button.email;
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(c.title)}</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#F7F6F4;color:#0F1315;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{width:min(92vw,420px);padding:32px;background:#fff;border:1px solid #D8D3C8}h1{font-size:1.25rem;margin:0 0 8px}p{margin:0 0 20px;color:#3A4750;line-height:1.5}button{width:100%;padding:14px;border:0;background:#4A6A8C;color:#F7F6F4;font:inherit;font-weight:600;cursor:pointer}button:focus-visible{outline:2px solid #0F1315;outline-offset:2px}</style></head>
<body><main><h1>${esc(c.title)}</h1><p>${esc(c.body)}</p><form method="post" action="/auth/callback"><input type="hidden" name="token_hash" value="${esc(tokenHash)}"><input type="hidden" name="type" value="${esc(type)}"><input type="hidden" name="next" value="${esc(next)}"><button type="submit">${esc(label)}</button></form></main></body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
