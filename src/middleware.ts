import createIntlMiddleware from 'next-intl/middleware';
import { refreshSession } from '@/core/auth/refreshSession';
import { composeMiddleware } from '@/core/middleware/compose';
import { routing } from '@/i18n/routing';

// Middleware yetkilendirme DEĞİLDİR (K-14, CVE-2025-29927). Yalnız deneyim: düzgün yönlendirme.
// Asıl kapı sunucu bileşenindeki rol kontrolü, gerçek sınır RLS.
export default composeMiddleware({
  refreshSession: (request) => refreshSession(request.cookies),
  intl: createIntlMiddleware(routing),
});

export const config = {
  // .*\..* uzantılı dosyaları dışlar → hero videosunun her Range isteğinde auth turu atılmaz.
  // Noktalı sayfa URL'si olamaz: slug'lar ^[a-z0-9-]+$ CHECK kısıtıyla ASCII tutulur.
  matcher: ['/((?!_next/static|_next/image|_vercel|favicon\\.ico|.*\\..*).*)'],
};
