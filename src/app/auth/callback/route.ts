import { NextResponse, type NextRequest } from 'next/server';
import { safeReturnUrl } from '@/core/auth';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';

/**
 * PKCE kod değişimi: davet, e-posta doğrulama ve şifre sıfırlama bağlantıları buraya iner.
 * Middleware /auth'a dokunmaz (K-13); çerezleri bu yanıt yazar. `next` yalnız site içi yol olabilir.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeReturnUrl(searchParams.get('next'), '/tr');
  const failure = new URL('/tr/giris', origin);
  failure.searchParams.set('error', 'link');

  if (!code) return NextResponse.redirect(failure);
  const client = await createServerClient();
  if (!client.ok) return NextResponse.redirect(failure);

  const { error } = await client.data.auth.exchangeCodeForSession(code);
  if (error) {
    logger.warn('PKCE kod değişimi başarısız', { module: 'auth', code: error.code });
    return NextResponse.redirect(failure);
  }
  return NextResponse.redirect(new URL(next, origin));
}
