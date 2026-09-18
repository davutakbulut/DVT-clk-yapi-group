import { NextResponse, type NextRequest } from 'next/server';
import { safeReturnUrl } from '@/core/auth';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';

/**
 * PKCE kod değişimi (ya da token_hash doğrulaması): davet, e-posta doğrulama ve şifre sıfırlama bağlantıları buraya iner.
 * Middleware /auth'a dokunmaz (K-13); çerezleri bu yanıt yazar. `next` yalnız site içi yol olabilir.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeReturnUrl(searchParams.get('next'), '/tr');
  const failure = new URL('/tr/giris', origin);
  failure.searchParams.set('error', 'link');

  // Yönetici üretimli tek kullanımlık bağlantılar (scripts/admin-recovery-link.mjs) ve token_hash'li e-posta şablonları:
  // PKCE doğrulayıcısı tarayıcıda olmadığı için kod değişimi yapılamaz → token sunucuda doğrulanır (Supabase SSR deseni).
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (!code && tokenHash && (type === 'recovery' || type === 'invite' || type === 'email' || type === 'signup')) {
    const otpClient = await createServerClient();
    if (!otpClient.ok) return NextResponse.redirect(failure);
    const { error: otpError } = await otpClient.data.auth.verifyOtp({ token_hash: tokenHash, type });
    if (otpError) {
      logger.warn('Tek kullanımlık bağlantı doğrulanamadı', { module: 'auth', code: otpError.code });
      return NextResponse.redirect(failure);
    }
    return NextResponse.redirect(new URL(next, origin));
  }

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
