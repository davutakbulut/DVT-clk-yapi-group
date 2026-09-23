# Hesabım (üye alanı) — uygulama planı (K-103) — **uygulandı** (migration 0051, `src/modules/account`)

> Ürün sahibi isteği: "kullanıcı her şeye erişebilsin — teklifler, konfigürasyonlar, profil, üyelik silme, şifre/e-posta değiştirme, teklif düzenleme isteği, yarım kalan sepetler…"

## Mevcut durum
- `/hesabim`: ad/telefon/dil formu + kayıtlı konfigürasyon listesi + çıkış. Talepler ve sepet yok.
- Veri: `leads.user_id` üyeye bağlı (submit_lead `auth.uid()` yazar); RLS "member reads own leads" + `lead_items/lead_replies/lead_attachments` için "member reads own". `configurations` "own configurations" (tam yetki). `notifications` (user_id) okunur, `mark_notifications_read`. `profiles` own read/update. `customers.profile_id` var ama üyeye açık politika yok. `sales` personel-only.

## Sayfa yapısı (alt rotalar, `/hesabim/...`)
| Rota | İçerik | Veri / RPC |
|---|---|---|
| `/hesabim` | özet kartları (talep, konfigürasyon, sepet, okunmamış bildirim), son 3 talep, son 3 konfigürasyon | mevcut RLS okumaları |
| `/hesabim/teklifler` | talep listesi (ref_no, tarih, durum rozeti, kalem adedi) | `leads` (own) |
| `/hesabim/teklifler/[id]` | kalemler + nitelikler, personel cevapları, **mesaj / revizyon isteği / iptal isteği** formu | yeni `lead_replies.direction` ('inbound') + RPC `customer_lead_message(lead_id, kind, body)` → satış rolüne bildirim + şirkete e-posta |
| `/hesabim/konfigurasyonlar` | liste + yeniden adlandır / arşivle / paylaş bağlantısı | `configurations` own update |
| `/hesabim/sepet` | tarayıcıdaki sepet (istemci) + **hesaba kaydedilmiş sepet** (cihazlar arası) | yeni `profiles.saved_basket jsonb` + server action `saveBasket`/`restoreBasket`; giriş yapılmışsa değişimde 2 sn gecikmeli otomatik kayıt |
| `/hesabim/profil` | ad, telefon, dil + **firma bilgileri** (ünvan, vergi dairesi/no, adres, il/ilçe) | `profiles` + RPC `upsert_my_customer(jsonb)` (customers.profile_id = auth.uid()) |
| `/hesabim/guvenlik` | şifre değiştir (mevcut şifreyle yeniden doğrulama), e-posta değiştir (yeni adrese onay), **hesabı sil** ("SİL" yazarak onay) | Supabase `auth.updateUser`; RPC `delete_my_account()` (security definer: `delete from auth.users where id = auth.uid()`; leads.user_id → null, konfigürasyonlar cascade) |
| `/hesabim/bildirimler` | kişiye özel bildirimler, okundu işaretleme | `notifications` + `mark_notifications_read` |
| `/hesabim/verilerim` | KVKK: verilerimi indir (JSON: profil, talepler, konfigürasyonlar) | server action, kendi satırları |

Ortak kabuk: sol/üst sekme gezinmesi (mobilde yatay kaydırmalı çipler, K-92/93 kuralları), her bölüm `ModuleBoundary`.

## Migration 0051 (uygulandı; 0050 numarası arama parçasına gitti)
- `lead_replies.direction text not null default 'outbound' check (direction in ('outbound','inbound'))`, `lead_replies.kind text not null default 'reply' check (kind in ('reply','revision_request','cancel_request'))`; üye kendi talebine inbound satır ekleyebilir (RPC).
- `profiles.saved_basket jsonb not null default '[]'`.
- RPC: `customer_lead_message`, `claim_my_leads()` (aynı e-postayla üye olunca eski anonim talepler üyeye bağlanır, K-30 benzeri), `upsert_my_customer`, `delete_my_account`.
- Panel: talep detayında inbound mesajlar "Müşteriden" rozetiyle; bildirim türü `lead.customer_message`.

## Testler
- PGlite: RPC'ler (başkasının talebine mesaj → hata; hesap silme → profil/konfigürasyon gider, talep kalır user_id null), RLS.
- E2E: kayıt → talep → hesabım/teklifler görür → revizyon isteği → admin görür; şifre değiştir; sepet kaydet/yükle; hesap sil.
