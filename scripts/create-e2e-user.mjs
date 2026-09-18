#!/usr/bin/env node
// E2E testleri için AYRI bir personel hesabı açar (rol: admin — super_admin DEĞİL). BİR KEZ, yerelde:
//
//   node --env-file=.env.local scripts/create-e2e-user.mjs
//
// Rastgele şifre üretir ve .env.local'a E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD olarak yazar; sohbete/log'a basmaz.
// Secret key yalnız burada (yerel betik); istekle erişilebilen hiçbir yerde kullanılmaz (Kural 4).
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error('.env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY dolu olmalı.');
  process.exit(1);
}
const envFile = new URL('../.env.local', import.meta.url);
if (/^E2E_ADMIN_EMAIL=/m.test(readFileSync(envFile, 'utf8'))) {
  console.log('E2E_ADMIN_EMAIL zaten .env.local içinde; yeniden oluşturmak için satırları silin.');
  process.exit(0);
}

const email = `e2e-admin+${Date.now()}@clk-yapi-group.test`;
const password = randomBytes(24).toString('base64url');
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'E2E Admin' } });
if (created.error) {
  console.error('Kullanıcı oluşturulamadı:', created.error.message);
  process.exit(1);
}
const roled = await supabase.from('profiles').update({ role: 'admin' }).eq('id', created.data.user.id);
if (roled.error) {
  console.error('Rol atanamadı:', roled.error.message);
  process.exit(1);
}
appendFileSync(envFile, `\n# E2E test hesabı (scripts/create-e2e-user.mjs) — yalnız yerel/CI gizli değişkeni\nE2E_ADMIN_EMAIL=${email}\nE2E_ADMIN_PASSWORD=${password}\n`);
console.log(`✔ ${email} (admin) oluşturuldu; kimlik bilgileri .env.local'a yazıldı.`);
