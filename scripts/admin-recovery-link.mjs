#!/usr/bin/env node
// Bir hesap için TEK KULLANIMLIK şifre belirleme bağlantısı üretir ve YALNIZ bu terminale yazar.
// Şifreyi kişi tarayıcıda kendisi belirler; şifre hiçbir betikten, sohbetten ya da dosyadan geçmez.
//
//   node --env-file=.env.local scripts/admin-recovery-link.mjs ad@firma.com [http://localhost:3000]
//
// Bağlantı ~1 saat geçerlidir, bir kez kullanılır. Secret key yalnız bu yerel betikte (Kural 4).
import { createClient } from '@supabase/supabase-js';

const [email, origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !url || !secret) {
  console.error('Kullanım: node --env-file=.env.local scripts/admin-recovery-link.mjs <e-posta> [site-adresi]');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.auth.admin.generateLink({ type: 'recovery', email });
if (error || !data?.properties?.hashed_token) {
  console.error(`Bağlantı üretilemedi: ${error?.message ?? 'bilinmeyen hata'}`);
  process.exit(1);
}
const link = new URL('/auth/callback', origin);
link.searchParams.set('token_hash', data.properties.hashed_token);
link.searchParams.set('type', 'recovery');
link.searchParams.set('next', '/tr/sifre-yenile');
console.log(`\n${email} için tek kullanımlık bağlantı (1 saat, bir kez):\n\n${link.toString()}\n\nTarayıcıda açın, yeni şifrenizi yazın. Bağlantıyı kimseyle paylaşmayın.\n`);
