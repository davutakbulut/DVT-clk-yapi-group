import 'server-only';
import { after } from 'next/server';
import { getSiteUrl } from '@/core/config/site';
import * as store from '@/core/db/mysql/authStore';
import type { TokenPurpose } from '@/core/db/mysql/authStore';
import { err, ok, type Result } from '@/core/errors/result';
import { processMailQueue } from '@/core/jobs/mailQueue';
import { logger } from '@/core/observability/logger';
import { authLink, authMultiplier, LOGIN_LIMIT, MAIL_LIMIT, overLimit, TOKEN_TTL_MINUTES } from './authRules';

// K-116 · Giriş akışları. Modüller veri katmanına (authStore) değil buraya bağlanır; çerez yazımı session.ts'te.

const MODULE = 'core/auth';

export type SignInError = 'invalidCredentials' | 'emailNotConfirmed' | 'rateLimited' | 'unexpected';
export interface ClientInfo {
  readonly ip: string;
  readonly userAgent: string | null;
}
export interface NewSession {
  readonly token: string;
  readonly role: string | null;
}

async function openSession(userId: string, userAgent: string | null): Promise<Result<NewSession, 'unexpected'>> {
  const token = await store.createSession(userId, userAgent);
  if (!token.ok) return err('unexpected');
  const session = await store.readSession(token.data);
  return ok({ token: token.data, role: session.ok ? (session.data?.role ?? null) : null });
}

export async function passwordSignIn(email: string, password: string, client: ClientInfo): Promise<Result<NewSession, SignInError>> {
  const counts = await store.recentAttempts('signin', email, client.ip, LOGIN_LIMIT.minutes);
  if (!counts.ok) return err('unexpected');
  if (overLimit(counts.data, LOGIN_LIMIT, authMultiplier())) return err('rateLimited');
  const user = await store.findUserByEmail(email);
  if (!user.ok) return err('unexpected');
  const valid = await store.verifyPassword(password, user.data?.passwordHash ?? null);
  if (!valid || !user.data) {
    await store.recordAttempt('signin', email, client.ip, false);
    return err('invalidCredentials');
  }
  // doğru şifreden sonra söylenir: adres varlığı şifresiz sızmaz
  if (!user.data.emailConfirmed) return err('emailNotConfirmed');
  return openSession(user.data.id, client.userAgent);
}

/** K-104 bağlantı postası kotası; izin verilen istek sayılır. Veritabanı hatasında kapalı kalır. */
export async function mailAllowed(kind: 'signup' | 'recovery', email: string, ip: string): Promise<boolean> {
  const counts = await store.recentAttempts(kind, email, ip, MAIL_LIMIT.minutes, true);
  if (!counts.ok || overLimit(counts.data, MAIL_LIMIT, authMultiplier())) return false;
  await store.recordAttempt(kind, email, ip, true);
  return true;
}

type Locale = 'tr' | 'en';

async function sendLink(input: { userId: string; to: string; purpose: TokenPurpose; next: string; locale: Locale; newEmail?: string }): Promise<Result<void>> {
  const token = await store.createToken({ purpose: input.purpose, userId: input.userId, newEmail: input.newEmail ?? null, ttlMinutes: TOKEN_TTL_MINUTES[input.purpose] });
  if (!token.ok) return token;
  const queued = await store.enqueueMail({ templateKey: `auth.${input.purpose}`, to: input.to, locale: input.locale, payload: { link: authLink(getSiteUrl().origin, token.data, input.purpose, input.next) }, userId: input.userId });
  if (!queued.ok) return queued;
  // dakikalık cron'u beklemez; yanıt gittikten sonra gönderilir → süre adresin varlığını sızdırmaz. Olmazsa cron yeniden dener.
  after(async () => {
    const sent = await processMailQueue(1, [queued.data]);
    if (!sent.ok) logger.warn('Giriş postası hemen gönderilemedi, kuyrukta', { module: MODULE, template: input.purpose });
  });
  return ok(undefined);
}

/** Kayıt: var olan adreste de aynı sonuç (hesap varlığı sızmaz); onaylanmamışsa doğrulama bağlantısı yeniden gider. */
export async function signUpWithPassword(input: { email: string; password: string; fullName: string; locale: Locale; next: string }): Promise<Result<void>> {
  const hash = await store.hashPassword(input.password); // var olan adreste de hesaplanır: süre farkı olmasın
  const found = await store.findUserByEmail(input.email);
  if (!found.ok) return found;
  if (found.data?.emailConfirmed) return ok(undefined);
  let user = found.data;
  if (user) {
    // onaysız kayıtta son kayıt olanın şifresi geçer: başkasının önceden açtığı kayıt sahibine kalmasın
    const set = await store.setPassword(user.id, hash);
    if (!set.ok) return set;
  } else {
    const created = await store.createUser({ email: input.email, passwordHash: hash, meta: { full_name: input.fullName }, confirmed: false });
    if (!created.ok) return created;
    user = created.data;
  }
  return sendLink({ userId: user.id, to: user.email, purpose: 'signup', next: input.next, locale: input.locale });
}

export async function sendRecovery(input: { email: string; locale: Locale; next: string }): Promise<Result<void>> {
  const found = await store.findUserByEmail(input.email);
  if (!found.ok) return found;
  if (!found.data) return ok(undefined);
  return sendLink({ userId: found.data.id, to: found.data.email, purpose: 'recovery', next: input.next, locale: input.locale });
}

/** Davet: kullanıcı yoksa şifresiz açılır ('member' profilini tetikleyici açar). Şifresi olmayan şifre belirleme sayfasına gider. */
export async function inviteByEmail(input: { email: string; fullName: string; locale: Locale; setPasswordPath: string; accountPath: string }): Promise<Result<void>> {
  const found = await store.findUserByEmail(input.email);
  if (!found.ok) return found;
  let user = found.data;
  if (!user) {
    const created = await store.createUser({ email: input.email, passwordHash: null, meta: input.fullName ? { full_name: input.fullName } : {}, confirmed: false });
    if (!created.ok) return created;
    user = created.data;
  }
  return sendLink({ userId: user.id, to: user.email, purpose: 'invite', next: user.passwordHash ? input.accountPath : input.setPasswordPath, locale: input.locale });
}

export async function checkPassword(userId: string, password: string): Promise<boolean> {
  const user = await store.findUserById(userId);
  return store.verifyPassword(password, user.ok ? (user.data?.passwordHash ?? null) : null);
}

/** Yeni şifre; bu cihaz dışındaki oturumlar kapanır. */
export async function replacePassword(userId: string, password: string, keepToken: string | null): Promise<Result<void>> {
  const set = await store.setPassword(userId, await store.hashPassword(password));
  if (!set.ok) return set;
  return store.deleteOtherSessions(userId, keepToken);
}

/** Onay bağlantısı YENİ adrese gider. Adres başka hesaptaysa sessizce gönderilmez (hesap varlığı sızmaz). */
export async function requestEmailChange(input: { userId: string; newEmail: string; locale: Locale; next: string }): Promise<Result<void>> {
  const taken = await store.findUserByEmail(input.newEmail);
  if (!taken.ok) return taken;
  if (taken.data) return ok(undefined);
  const newEmail = store.normalizeEmail(input.newEmail);
  return sendLink({ userId: input.userId, to: newEmail, purpose: 'email_change', next: input.next, locale: input.locale, newEmail });
}

/** E-posta bağlantısını tüketir ve oturum açar. Bağlantıyı açabilmek adresin sahibi olmak demek → e-posta onaylanır. */
export async function redeemLink(purpose: TokenPurpose, token: string, userAgent: string | null): Promise<Result<NewSession, 'invalid' | 'unexpected'>> {
  const used = await store.consumeToken([purpose], token);
  if (!used.ok) return err('unexpected');
  if (!used.data) return err('invalid');
  const { userId, newEmail } = used.data;
  if (purpose === 'email_change' && !newEmail) return err('invalid');
  const applied = purpose === 'email_change' ? await store.setEmail(userId, newEmail!) : await store.confirmEmail(userId);
  if (!applied.ok) {
    logger.warn('Bağlantı uygulanamadı', { module: MODULE, purpose, message: applied.error.message });
    return err('unexpected');
  }
  const session = await openSession(userId, userAgent);
  if (session.ok && purpose === 'email_change') await store.deleteOtherSessions(userId, session.data.token);
  return session;
}
