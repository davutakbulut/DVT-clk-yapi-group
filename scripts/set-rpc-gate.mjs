#!/usr/bin/env node
/**
 * RPC kapısı sırrını (K-104) veritabanına yazar: public.set_rpc_gate(secret) — yalnız service_role çağırabilir.
 *   node --env-file=.env.local scripts/set-rpc-gate.mjs          → .env.local'daki RPC_GATE_SECRET'ı yazar (yoksa üretip .env.local'a ekler)
 *   node --env-file=.env.local scripts/set-rpc-gate.mjs --off    → kapıyı kaldırır (fonksiyonlar yine açık kalır)
 * SIRA ÖNEMLİ: sır önce sunucu secrets.env'e (scripts/cpanel-secret-set.sh RPC_GATE_SECRET) ve dağıtıma girmeli,
 * SONRA burada veritabanına yazılmalı; tersi canlıdaki yazma RPC'lerini (talep formu!) reddettirir. Değer ekrana basılmaz.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY yok'); process.exit(1); }
const off = process.argv.includes('--off');
let secret = process.env.RPC_GATE_SECRET ?? '';
if (!off && !secret) {
  secret = randomBytes(32).toString('base64url');
  const env = readFileSync('.env.local', 'utf8');
  appendFileSync('.env.local', `${env.endsWith('\n') ? '' : '\n'}RPC_GATE_SECRET=${secret}\n`);
  console.log('RPC_GATE_SECRET üretildi ve .env.local\'a eklendi (değer gösterilmedi)');
}
const s = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await s.rpc('set_rpc_gate', { p_secret: off ? '' : secret });
if (error) { console.error('set_rpc_gate hata:', error.message); process.exit(1); }
console.log(off ? 'Kapı kaldırıldı: fonksiyonlar başlıksız da çalışır' : 'Kapı yazıldı: yazma RPC\'leri artık yalnız x-clk-gate başlığıyla çalışır');
