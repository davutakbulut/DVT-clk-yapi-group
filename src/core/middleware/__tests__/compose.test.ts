import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import type { SessionRefresh } from '@/core/auth/refreshSession';
import { composeMiddleware } from '../compose';

const REFRESHED: SessionRefresh = {
  userId: 'user-1',
  cookiesToSet: [
    { name: 'sb-ref-auth-token.0', value: 'yeni-0', options: { path: '/', httpOnly: true } },
    { name: 'sb-ref-auth-token.1', value: 'yeni-1', options: { path: '/', httpOnly: true } },
  ],
};
const ANONYMOUS: SessionRefresh = { userId: null, cookiesToSet: [] };

const request = (path: string) => new NextRequest(new URL(path, 'https://example.test'));

function setup(session: SessionRefresh, intlResponse: () => NextResponse) {
  const refreshSession = vi.fn(async () => session);
  const intl = vi.fn(intlResponse);
  return { middleware: composeMiddleware({ refreshSession, intl }), refreshSession, intl };
}

describe('composeMiddleware — K-13', () => {
  // Hatanın kendisi: next-intl kendi yanıtını döndürür; çerezler başka nesneye yazılmışsa kaybolur.
  it("next-intl'in REDIRECT yanıtı yenilenmiş oturum çerezlerini taşır", async () => {
    const { middleware } = setup(REFRESHED, () => NextResponse.redirect('https://example.test/tr'));
    const response = await middleware(request('/'));

    expect(response.status).toBe(307);
    expect(response.cookies.get('sb-ref-auth-token.0')?.value).toBe('yeni-0');
    expect(response.cookies.get('sb-ref-auth-token.1')?.value).toBe('yeni-1');
  });

  it("next-intl'in REWRITE yanıtı yenilenmiş oturum çerezlerini taşır", async () => {
    const { middleware } = setup(REFRESHED, () => NextResponse.rewrite('https://example.test/tr/projects/x'));
    const response = await middleware(request('/tr/projeler/x'));

    expect(response.headers.get('x-middleware-rewrite')).toContain('/tr/projects/x');
    expect(response.cookies.getAll().map((cookie) => cookie.name)).toEqual(['sb-ref-auth-token.0', 'sb-ref-auth-token.1']);
  });

  it('Set-Cookie taşıyan yanıt paylaşımlı önbelleğe giremez', async () => {
    const { middleware } = setup(REFRESHED, () => NextResponse.next());
    expect((await middleware(request('/tr'))).headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('anonim ziyaretçide Cache-Control ezilmez — ISR önbelleği korunur', async () => {
    const { middleware } = setup(ANONYMOUS, () => NextResponse.next());
    const response = await middleware(request('/tr'));

    expect(response.headers.get('Cache-Control')).toBeNull();
    expect(response.cookies.getAll()).toHaveLength(0);
  });

  it('oturum yenileme dallanmadan ÖNCE çalışır', async () => {
    const order: string[] = [];
    const middleware = composeMiddleware({
      refreshSession: async () => (order.push('supabase'), ANONYMOUS),
      intl: () => (order.push('intl'), NextResponse.next()),
    });
    await middleware(request('/tr'));
    expect(order).toEqual(['supabase', 'intl']);
  });

  it.each(['/admin', '/admin/products', '/api/revalidate'])('%s locale dışıdır: next-intl çalışmaz, çerezler yine basılır (K-12)', async (path) => {
    const { middleware, intl } = setup(REFRESHED, () => NextResponse.next());
    const response = await middleware(request(path));

    expect(intl).not.toHaveBeenCalled();
    expect(response.cookies.get('sb-ref-auth-token.0')?.value).toBe('yeni-0');
  });

  it('/administrator gibi benzer önekler locale dışı SAYILMAZ', async () => {
    const { middleware, intl } = setup(ANONYMOUS, () => NextResponse.next());
    await middleware(request('/administrator'));
    expect(intl).toHaveBeenCalledOnce();
  });

  it('/auth/* — PKCE kod değişimine hiç dokunulmaz', async () => {
    const { middleware, refreshSession, intl } = setup(REFRESHED, () => NextResponse.next());
    await middleware(request('/auth/callback?code=abc'));

    expect(refreshSession).not.toHaveBeenCalled();
    expect(intl).not.toHaveBeenCalled();
  });
});
