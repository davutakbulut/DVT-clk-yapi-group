// ============================================================
// DENEY #3 — Supabase SSR istemcisi oturumu hangi çerez adlarıyla yazıyor?
// Varsayım: adlar "sb-<project-ref>-auth-token" ile başlar ("sb-" ön eki).
// Ağ yok: /auth/v1/user isteği taklit edilir, böylece istemci oturumu
// "doğrulandı" sayar ve storage'a (= çerezlere) yazar.
// ============================================================
import { createServerClient } from '@supabase/ssr';

const PROJECT_REF = 'exifnifijxnrxagkqwam';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
// Gövde 3 KB üstü → chunk'lama davranışını da göreceğiz
const fakeJwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
  sub: '00000000-0000-0000-0000-000000000000', exp, role: 'authenticated',
  aud: 'authenticated', session_id: 'x', user_metadata: { pad: 'x'.repeat(3500) },
})}.sig`;

// Ağ taklidi
globalThis.fetch = async (url) => {
  const u = String(url);
  console.log('  [fetch taklit]', u.replace(`https://${PROJECT_REF}.supabase.co`, ''));
  if (u.includes('/auth/v1/user')) {
    return new Response(JSON.stringify({
      id: '00000000-0000-0000-0000-000000000000', aud: 'authenticated',
      role: 'authenticated', email: 'test@example.com',
      app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(),
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const written = [];
const supabase = createServerClient(
  `https://${PROJECT_REF}.supabase.co`,
  'sb_publishable_fake',
  { cookies: { getAll: () => [], setAll: (list) => written.push(...list) } },
);

const { error } = await supabase.auth.setSession({ access_token: fakeJwt, refresh_token: 'r' });
console.log('\nsetSession hata:', error?.message ?? 'yok');
console.log('\nYazılan Set-Cookie adları:');
for (const c of written) {
  console.log(`   ${c.name}  (${c.value.length} byte)  path=${c.options?.path} sameSite=${c.options?.sameSite}`);
}
const allSb = written.length > 0 && written.every((c) => c.name.startsWith('sb-'));
console.log('\nSONUÇ  →  hepsi "sb-" ile başlıyor mu?', allSb ? 'EVET ✅' : 'HAYIR ❌');
console.log('           beklenen ön ek: sb-' + PROJECT_REF + '-auth-token');
console.log('           chunk sayısı:', written.length);
