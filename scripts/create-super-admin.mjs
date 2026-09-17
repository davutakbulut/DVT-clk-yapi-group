#!/usr/bin/env node
// İlk super_admin hesabını açar. BİR KEZ, kendi bilgisayarınızda çalıştırılır:
//
//   node --env-file=.env.local scripts/create-super-admin.mjs ad@firma.com "Ad Soyad"
//
// Şifre bu betikten GEÇMEZ: Supabase davet e-postası gönderir, şifreyi kişi kendi belirler.
// Secret key yalnız burada (yerel betik) kullanılır; istekle erişilebilen hiçbir yerde kullanılmaz (Kural 4).
import { createClient } from '@supabase/supabase-js';

const [email, fullName = ''] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Kullanım: node --env-file=.env.local scripts/create-super-admin.mjs <e-posta> ["Ad Soyad"]');
  process.exit(1);
}
if (!url || !secret) {
  console.error('.env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY dolu olmalı.');
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const existing = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin');
if (existing.error) {
  console.error('profiles okunamadı — migration\'lar uygulandı mı? (supabase db push)\n', existing.error.message);
  process.exit(1);
}
if ((existing.count ?? 0) > 0) {
  console.error(`Zaten ${existing.count} super_admin var. Yenisini panelden (Faz 18) veya mevcut super_admin ile ekleyin.`);
  process.exit(1);
}

const invited = await supabase.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
if (invited.error) {
  console.error('Davet gönderilemedi:', invited.error.message);
  process.exit(1);
}

// handle_new_user tetikleyicisi profili 'member' olarak açtı; service_role güvenilir bağlam olduğu için yükseltebilir.
const promoted = await supabase.from('profiles').update({ role: 'super_admin', full_name: fullName || null, must_change_password: false }).eq('id', invited.data.user.id);
if (promoted.error) {
  console.error('Rol atanamadı:', promoted.error.message);
  process.exit(1);
}

console.log(`✔ ${email} super_admin olarak davet edildi. Gelen kutusundaki bağlantıdan şifre belirlenecek.`);
