#!/usr/bin/env node
// E2E'nin yarım bıraktığı kayıtları (e2e-proje-*, e2e-hizmet-*) E2E admin hesabıyla siler. Şifre yalnız .env.local'dan okunur.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error } = await client.auth.signInWithPassword({ email: env.E2E_ADMIN_EMAIL, password: env.E2E_ADMIN_PASSWORD });
if (error) throw error;
for (const [table, prefix] of [
  ['projects', 'e2e-proje-'],
  ['services', 'e2e-hizmet-'],
  ['blog_posts', 'e2e-yazi-'],
  ['job_postings', 'e2e-ilan-'],
  ['products', 'e2e-urun-'],
  ['solutions', 'e2e-cozum-'],
  ['price_guides', 'e2e-fiyat-'],
]) {
  const { data } = await client.from(table).select('id, slug').like('slug->>tr', `${prefix}%`);
  for (const row of data ?? []) {
    const { error: e } = await client.from(table).delete().eq('id', row.id);
    console.log(table, row.slug.tr, e ? `HATA ${e.message}` : 'silindi');
  }
}
{
  const { data } = await client.from('leads').select('id, full_name').like('full_name', 'E2E %');
  for (const row of data ?? []) {
    const { error: e } = await client.from('leads').delete().eq('id', row.id);
    console.log('leads', row.full_name, e ? `HATA ${e.message}` : 'silindi');
  }
}
{
  const { data } = await client.from('job_applications').select('id, email').like('email', 'e2e-%');
  for (const row of data ?? []) {
    const { error: e } = await client.from('job_applications').delete().eq('id', row.id);
    console.log('job_applications', row.email, e ? `HATA ${e.message}` : 'silindi');
  }
}
await client.auth.signOut({ scope: 'local' });
{
  const { data } = await client.from('material_prices').select('id, code').like('code', 'E2E-%');
  for (const row of data ?? []) {
    const { error: e } = await client.from('material_prices').delete().eq('id', row.id);
    console.log('material_prices', row.code, e ? `HATA ${e.message}` : 'silindi');
  }
}
