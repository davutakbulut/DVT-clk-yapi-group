import { NextResponse, type NextRequest } from 'next/server';
import { safeReturnUrl } from '@/core/auth';
import { redeemLink } from '@/core/auth/authFlow';
import { isTokenPurpose } from '@/core/auth/authRules';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/core/auth/session';
import { getSiteUrl } from '@/core/config/site';
import type { TokenPurpose } from '@/core/db/mysql/authStore';
import { logger } from '@/core/observability/logger';
import { bodyTooLarge, rateLimit } from '@/core/rate-limit';
import { clientIp } from '@/core/request/clientIp';

/** Mutlak adresler site ayarından (K-84): request.nextUrl.origin, Passenger arkasında 0.0.0.0:3000 çıkıyordu. */
function failure(locale: string): NextResponse {
  const url = new URL(`/${locale}/${locale === 'en' ? 'login' : 'giris'}`, getSiteUrl().origin);
  url.searchParams.set('error', 'link');
  return NextResponse.redirect(url, { status: 303 });
}
function localeOf(next: string): string {
  return next.startsWith('/en') ? 'en' : 'tr';
}

/**
 * E-posta bağlantıları (davet, kayıt doğrulama, şifre sıfırlama, e-posta değişikliği) buraya iner (K-116).
 * Jeton GET'te TÜKETİLMEZ: e-posta tarayıcıları (Outlook Safe Links, kurumsal filtreler) bağlantıyı önceden açıp tek
 * kullanımlık jetonu yakıyordu. GET bir onay düğmesi gösterir; doğrulama POST'ta yapılır (K-84).
 * Middleware /auth'a dokunmaz (K-13); oturum çerezini bu yanıt yazar. `next` yalnız site içi yol olabilir.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const next = safeReturnUrl(searchParams.get('next'), '/tr');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') ?? '';
  if (tokenHash && isTokenPurpose(type)) return confirmPage(localeOf(next), tokenHash, type, next);
  return failure(localeOf(next));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // K-104: anonim uç → boyut + IP eşiği (jeton 256 bit, tahmin edilemez; sel yine durdurulur)
  if (bodyTooLarge(request.headers, 4096) || !(await rateLimit(`auth-callback:${clientIp(request.headers)}`, 30, 600)).allowed) return failure('tr');
  const form = await request.formData();
  const tokenHash = String(form.get('token_hash') ?? '');
  const type = String(form.get('type') ?? '');
  const next = safeReturnUrl(String(form.get('next') ?? ''), '/tr');
  const locale = localeOf(next);
  if (!tokenHash || !isTokenPurpose(type)) return failure(locale);
  const res = await redeemLink(type, tokenHash, request.headers.get('user-agent'));
  if (!res.ok) {
    logger.warn('Tek kullanımlık bağlantı doğrulanamadı', { module: 'auth', type, reason: res.error });
    return failure(locale);
  }
  const response = NextResponse.redirect(new URL(next, getSiteUrl().origin), { status: 303 });
  response.cookies.set(SESSION_COOKIE, res.data.token, SESSION_COOKIE_OPTIONS);
  return response;
}

const COPY = {
  tr: { title: 'Devam etmek için onaylayın', body: 'Güvenlik için bağlantı yalnız siz tıklayınca kullanılır.', button: { recovery: 'Şifremi sıfırla', invite: 'Daveti kabul et', magiclink: 'Giriş yap', signup: 'Hesabımı doğrula', email_change: 'Yeni e-postamı doğrula' } }, // static-ok: /auth grubunda site layout'u ve next-intl yok; tek kullanımlık onay sayfasının mikro-metni
  en: { title: 'Confirm to continue', body: 'For security, the link is used only when you click.', button: { recovery: 'Reset my password', invite: 'Accept invitation', magiclink: 'Sign in', signup: 'Verify my account', email_change: 'Verify my new e-mail' } },
} as const;

/** Ara onay sayfası: bağımlılıksız, inline stil (tasarım tokenlarıyla aynı renkler) — /auth grubunda site layout'u yok. */
function confirmPage(locale: string, tokenHash: string, type: TokenPurpose, next: string): NextResponse {
  const c = COPY[locale === 'en' ? 'en' : 'tr'];
  const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);
  const label = c.button[type];
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(c.title)}</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#F2F2F2;color:#1E1F21;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{width:min(92vw,420px);padding:32px;background:#fff;border:1px solid #D3D3D5}h1{font-size:1.25rem;margin:0 0 8px}p{margin:0 0 20px;color:#3A4750;line-height:1.5}button{width:100%;padding:14px;border:0;background:#406180;color:#F2F2F2;font:inherit;font-weight:600;cursor:pointer}button:focus-visible{outline:2px solid #1E1F21;outline-offset:2px}</style></head>
<body><main><h1>${esc(c.title)}</h1><p>${esc(c.body)}</p><form method="post" action="/auth/callback"><input type="hidden" name="token_hash" value="${esc(tokenHash)}"><input type="hidden" name="type" value="${esc(type)}"><input type="hidden" name="next" value="${esc(next)}"><button type="submit">${esc(label)}</button></form></main></body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
