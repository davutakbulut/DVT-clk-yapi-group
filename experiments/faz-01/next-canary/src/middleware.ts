import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  // HIPOTEZ: ic yol bir kez isitilirsa (onbellege girerse) rewrite'li istekler HIT alir mi?
  // Isitma istegi intl middleware'i atlar; yoksa ic yol 307 ile dis yola doner.
  if (req.headers.get('x-warm') === 'canary-secret') return NextResponse.next();
  return intl(req);
}

export const config = { matcher: ['/((?!_next/static|_next/image|_vercel|favicon\\.ico|.*\\..*).*)'] };
