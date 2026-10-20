// Giriş sisteminin (K-116) MariaDB'ye karşı bütünleşik testi: authStore + core/auth akışları. MYSQL_TEST_URL yoksa atlanır.
//   set -a; . ./.env.local; set +a; export MYSQL_URL=$MYSQL_TEST_URL; npx vitest run src/core/db/mysql/__tests__/auth.int.test.ts
// Posta GÖNDERİLMEZ: kuyruk işçisi taklit; adresler example.com (ayrılmış, cron da göndermez). Oluşan satırlar sonda silinir.
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { after, jar } = vi.hoisted(() => ({ after: vi.fn(), jar: new Map<string, string>() }));
vi.mock('next/server', () => ({ after }));
vi.mock('@/core/jobs/mailQueue', () => ({ processMailQueue: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string, opts?: { maxAge?: number }) => (opts?.maxAge === 0 ? jar.delete(name) : jar.set(name, value)),
  }),
}));

const enabled = !!process.env['MYSQL_URL'] && process.env['MYSQL_URL'] === process.env['MYSQL_TEST_URL'];
const TAG = `t${Date.now().toString(36)}`;
const mail = (name: string) => `${TAG}-${name}@example.com`;
const ip = (name: string) => `${TAG}-${name}`;
const CLIENT = { ip: ip('main'), userAgent: 'vitest' };
process.env['AUTH_RATE_LIMIT'] = '1';

describe.skipIf(!enabled)('giriş sistemi (MariaDB)', async () => {
  const store = await import('../authStore');
  const flow = await import('@/core/auth/authFlow');
  const session = await import('@/core/auth/session');
  const { withConnection } = await import('../pool');
  const sql = async (query: string, params: unknown[] = []) => {
    const r = await withConnection({ kind: 'service' }, async (c) => (await c.query(query, params))[0] as Record<string, unknown>[]);
    if (!r.ok) throw new Error(r.error.message);
    return r.data;
  };
  /** Kuyruktaki son giriş postası ve bağlantısındaki jeton */
  const lastMail = async (to: string) => {
    const [row] = await sql('SELECT template_key, priority, locale, payload FROM email_queue WHERE to_email = ? ORDER BY created_at DESC LIMIT 1', [to]);
    if (!row) return null;
    const link = new URL(String((typeof row['payload'] === 'string' ? JSON.parse(row['payload']) : row['payload']).link));
    return { template: row['template_key'], priority: row['priority'], locale: row['locale'], token: link.searchParams.get('token_hash')!, type: link.searchParams.get('type'), next: link.searchParams.get('next') };
  };
  const mailCount = async (to: string) => Number((await sql('SELECT COUNT(*) AS n FROM email_queue WHERE to_email = ?', [to]))[0]!['n']);
  const user = async (email: string) => (await sql('SELECT u.id, u.email, u.password_hash, u.email_confirmed_at, p.role, p.full_name FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.email = ?', [email]))[0];

  afterAll(async () => {
    const like = `${TAG}%`;
    await sql('DELETE FROM email_queue WHERE to_email LIKE ?', [like]);
    await sql('DELETE FROM auth_attempts WHERE email LIKE ? OR ip LIKE ?', [like, like]);
    await sql("DELETE FROM audit_logs WHERE table_name = 'profiles' AND row_id IN (SELECT id FROM users WHERE email LIKE ?)", [like]);
    await sql('DELETE FROM users WHERE email LIKE ?', [like]); // oturum, jeton ve profil CASCADE
  });

  it('kayıt → onaysız giriş reddi → doğrulama bağlantısı → şifreyle giriş', async () => {
    const email = mail('signup');
    expect((await flow.signUpWithPassword({ email: email.toLocaleUpperCase('en'), password: 'gizli-sifre-1', fullName: 'Deneme Üye', locale: 'en', next: '/en/account' })).ok).toBe(true);
    const u = await user(email);
    expect(u).toMatchObject({ role: 'member', full_name: 'Deneme Üye', email_confirmed_at: null });
    expect(await lastMail(email)).toMatchObject({ template: 'auth.signup', priority: 1, locale: 'en', type: 'signup', next: '/en/account' });
    expect(after).toHaveBeenCalled();

    expect(await flow.passwordSignIn(email, 'gizli-sifre-1', CLIENT)).toEqual({ ok: false, error: 'emailNotConfirmed' });
    const link = (await lastMail(email))!;
    const redeemed = await flow.redeemLink('signup', link.token, 'vitest');
    expect(redeemed.ok).toBe(true);
    expect((await user(email))!['email_confirmed_at']).not.toBeNull();

    const signed = await flow.passwordSignIn(email, 'gizli-sifre-1', CLIENT);
    expect(signed.ok && signed.data.role).toBe('member');
    expect(await flow.passwordSignIn(email, 'yanlis-sifre', CLIENT)).toEqual({ ok: false, error: 'invalidCredentials' });
    expect(await flow.passwordSignIn(mail('kimse'), 'yanlis-sifre', CLIENT)).toEqual({ ok: false, error: 'invalidCredentials' });

    // onaylı adrese ikinci kayıt: aynı yanıt, posta yok
    const before = await mailCount(email);
    expect((await flow.signUpWithPassword({ email, password: 'baska-sifre-2', fullName: 'X', locale: 'tr', next: '/tr/hesabim' })).ok).toBe(true);
    expect(await mailCount(email)).toBe(before);
  });

  it('K-104: e-posta başına 10, IP başına 30 başarısız denemeden sonra giriş durur; posta kotası 3', async () => {
    const email = mail('limit');
    await flow.signUpWithPassword({ email, password: 'dogru-sifre-1', fullName: 'Sınır', locale: 'tr', next: '/tr/hesabim' });
    await sql('UPDATE users SET email_confirmed_at = UTC_TIMESTAMP(6) WHERE email = ?', [email]);
    const c = { ip: ip('limit'), userAgent: null };
    for (let i = 0; i < 10; i++) expect(await flow.passwordSignIn(email, 'yanlis', c)).toEqual({ ok: false, error: 'invalidCredentials' });
    expect(await flow.passwordSignIn(email, 'dogru-sifre-1', { ip: ip('limit-baska'), userAgent: null })).toEqual({ ok: false, error: 'rateLimited' });

    const flood = ip('flood');
    for (let i = 0; i < 30; i++) await store.recordAttempt('signin', mail(`f${i}`), flood, false);
    expect(await flow.passwordSignIn(mail('signup'), 'gizli-sifre-1', { ip: flood, userAgent: null })).toEqual({ ok: false, error: 'rateLimited' });

    const m = mail('quota');
    const q = ip('quota');
    expect([await flow.mailAllowed('recovery', m, q), await flow.mailAllowed('recovery', m, q), await flow.mailAllowed('recovery', m, q), await flow.mailAllowed('recovery', m, q)]).toEqual([true, true, true, false]);
    expect(await flow.mailAllowed('signup', m, q)).toBe(true); // tür ayrı sayılır
  });

  it('şifre sıfırlama: tek kullanım, süre aşımı, kayıtsız adreste sessiz', async () => {
    const email = mail('signup');
    expect((await flow.sendRecovery({ email, locale: 'tr', next: '/tr/sifre-yenile' })).ok).toBe(true);
    const link = (await lastMail(email))!;
    expect(link).toMatchObject({ template: 'auth.recovery', type: 'recovery', next: '/tr/sifre-yenile' });
    expect((await flow.redeemLink('signup', link.token, null)).ok).toBe(false); // tür eşleşmeli
    expect((await flow.redeemLink('recovery', link.token, null)).ok).toBe(true);
    expect(await flow.redeemLink('recovery', link.token, null)).toEqual({ ok: false, error: 'invalid' });

    await flow.sendRecovery({ email, locale: 'tr', next: '/tr/sifre-yenile' });
    const late = (await lastMail(email))!;
    await sql('UPDATE auth_tokens SET expires_at = UTC_TIMESTAMP(6) - INTERVAL 1 MINUTE WHERE token_hash = ?', [store.tokenHash(late.token)]);
    expect(await flow.redeemLink('recovery', late.token, null)).toEqual({ ok: false, error: 'invalid' });

    // yeni bağlantı eskisini geçersiz kılar
    await flow.sendRecovery({ email, locale: 'tr', next: '/tr/sifre-yenile' });
    const first = (await lastMail(email))!;
    await flow.sendRecovery({ email, locale: 'tr', next: '/tr/sifre-yenile' });
    expect(await flow.redeemLink('recovery', first.token, null)).toEqual({ ok: false, error: 'invalid' });

    expect((await flow.sendRecovery({ email: mail('kayitsiz'), locale: 'tr', next: '/tr/sifre-yenile' })).ok).toBe(true);
    expect(await mailCount(mail('kayitsiz'))).toBe(0);
  });

  it('oturum: okuma, süre aşımı, silme; şifre değişince diğer oturumlar kapanır', async () => {
    const email = mail('signup');
    const id = String((await user(email))!['id']);
    const a = await store.createSession(id, 'a');
    const b = await store.createSession(id, 'b');
    if (!a.ok || !b.ok) throw new Error('oturum açılamadı');
    expect(await store.readSession(a.data)).toEqual({ ok: true, data: { id, email, role: 'member' } });

    expect(await flow.checkPassword(id, 'gizli-sifre-1')).toBe(true);
    expect((await flow.replacePassword(id, 'yeni-sifre-3', a.data)).ok).toBe(true);
    expect(await store.readSession(b.data)).toEqual({ ok: true, data: null });
    expect(await flow.checkPassword(id, 'gizli-sifre-1')).toBe(false);
    expect((await flow.passwordSignIn(email, 'yeni-sifre-3', CLIENT)).ok).toBe(true);

    await sql('UPDATE auth_sessions SET expires_at = UTC_TIMESTAMP(6) - INTERVAL 1 SECOND WHERE token_hash = ?', [store.tokenHash(a.data)]);
    expect(await store.readSession(a.data)).toEqual({ ok: true, data: null });

    // çerez yardımcıları (next/headers taklit)
    const c = await store.createSession(id, 'c');
    if (!c.ok) throw new Error('oturum açılamadı');
    await session.setSessionCookie(c.data);
    expect(await session.getSessionToken()).toBe(c.data);
    await session.endSession();
    expect(await session.getSessionToken()).toBeNull();
    expect(await store.readSession(c.data)).toEqual({ ok: true, data: null });
  });

  it('e-posta değişikliği: bağlantı yeni adrese gider, onayla adres değişir; dolu adreste sessiz', async () => {
    const email = mail('signup');
    const id = String((await user(email))!['id']);
    const keep = await store.createSession(id, 'eski cihaz');
    const fresh = mail('yeni');
    expect((await flow.requestEmailChange({ userId: id, newEmail: fresh.toLocaleUpperCase('en'), locale: 'tr', next: '/tr/hesabim' })).ok).toBe(true);
    const link = (await lastMail(fresh))!;
    expect(link).toMatchObject({ template: 'auth.email_change', type: 'email_change' });
    expect((await flow.redeemLink('email_change', link.token, null)).ok).toBe(true);
    expect((await user(fresh))!['id']).toBe(id);
    expect(await flow.passwordSignIn(email, 'yeni-sifre-3', CLIENT)).toEqual({ ok: false, error: 'invalidCredentials' });
    expect((await flow.passwordSignIn(fresh, 'yeni-sifre-3', CLIENT)).ok).toBe(true);
    if (keep.ok) expect(await store.readSession(keep.data)).toEqual({ ok: true, data: null });

    const other = mail('limit');
    expect((await flow.requestEmailChange({ userId: id, newEmail: other, locale: 'tr', next: '/tr/hesabim' })).ok).toBe(true);
    expect(await sql("SELECT 1 FROM email_queue WHERE to_email = ? AND template_key = 'auth.email_change'", [other])).toHaveLength(0);
  });

  it('davet: kullanıcı ve member profili açılır, bağlantı şifre belirlemeye götürür ve oturum açar', async () => {
    const email = mail('davet');
    const paths = { setPasswordPath: '/tr/sifre-yenile', accountPath: '/tr/hesabim' };
    expect((await flow.inviteByEmail({ email, fullName: 'Davetli Personel', locale: 'tr', ...paths })).ok).toBe(true);
    expect(await user(email)).toMatchObject({ role: 'member', full_name: 'Davetli Personel', password_hash: null, email_confirmed_at: null });
    const link = (await lastMail(email))!;
    expect(link).toMatchObject({ template: 'auth.invite', type: 'invite', next: '/tr/sifre-yenile' });
    const redeemed = await flow.redeemLink('invite', link.token, null);
    expect(redeemed.ok && redeemed.data.role).toBe('member');
    expect((await user(email))!['email_confirmed_at']).not.toBeNull();

    // şifresi olan kullanıcıya davet hesabım sayfasına götürür
    await flow.inviteByEmail({ email: mail('yeni'), fullName: '', locale: 'tr', ...paths });
    expect((await lastMail(mail('yeni')))!.next).toBe('/tr/hesabim');
  });
});
