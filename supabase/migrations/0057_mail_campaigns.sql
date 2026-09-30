-- 0057 · Toplu e-posta / kampanyalar (K-108)
-- Panelden alıcı kitlesi seçilir (kurumsal müşteriler · izinli bireysel müşteriler · pazarlama izni veren talep sahipleri · elle liste),
-- içerik yazılır, test gönderilir, hemen ya da zamanlanmış olarak başlatılır. Gönderim cron'da, saatlik sınırla yapılır.
-- Yazmaların TAMAMI rol denetimli RPC'den geçer (tabloya doğrudan yazma yetkisi yok): taslak dışı kampanya değiştirilemez,
-- alıcı listesi başlatma anında dondurulur, "listeden çık" diyen adrese bir daha gönderilmez.

-- ── 1 · Bireysel müşteride ticari ileti izni (kurumsal müşteri tacir/esnaf istisnasına girer) ──────────────────────────
alter table public.customers
  add column marketing_consent boolean not null default false,
  add column marketing_consent_at timestamptz;

-- ── 2 · Tablolar ───────────────────────────────────────────────────────────────────────────────────────────────────────
create table public.mail_campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 2 and 120),          -- panelde görünen iç ad
  locale       text not null default 'tr' check (locale in ('tr','en')),                  -- alt bilgi ve "listeden çık" dili
  subject      text not null default '' check (char_length(subject) <= 200),
  preheader    text not null default '' check (char_length(preheader) <= 200),            -- gelen kutusunda konunun yanında görünen özet
  body         text not null default '' check (char_length(body) <= 20000),               -- sade biçimlendirme: ## başlık, - liste, **kalın**, [metin](https://…)
  cta_label    text not null default '' check (char_length(cta_label) <= 80),
  cta_url      text not null default '' check (cta_url = '' or (cta_url ~ '^https://[^\s]+$' and char_length(cta_url) <= 500)),
  audience     jsonb not null default '{}' check (jsonb_typeof(audience) = 'object' and pg_column_size(audience) <= 262144),
  status       text not null default 'draft' check (status in ('draft','scheduled','sending','paused','sent','cancelled')),
  scheduled_at timestamptz,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  started_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index mail_campaigns_status_idx on public.mail_campaigns (status, scheduled_at);
call app_private.track_updated_at('public.mail_campaigns');
call app_private.secure('public.mail_campaigns');
call app_private.allow_staff_read('public.mail_campaigns', 'super_admin', 'admin');
-- audit_row bilinçli olarak YOK: her durum değişikliğinde 20 KB gövde + alıcı listesi audit_logs'a kopyalanırdı; kim başlattı → started_by.

create table public.mail_campaign_recipients (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.mail_campaigns(id) on delete cascade,
  email           text not null check (email = lower(email) and char_length(email) <= 254),
  full_name       text check (full_name is null or char_length(full_name) <= 160),
  company         text check (company is null or char_length(company) <= 200),
  source          text not null check (source in ('customer','lead','manual')),
  status          text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
  error           text check (error is null or char_length(error) <= 500),
  token           uuid not null default gen_random_uuid() unique,     -- "listeden çık" bağlantısı; tahmin edilemez
  locked_at       timestamptz,
  sent_at         timestamptz,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (campaign_id, email)
);
create index mail_campaign_recipients_status_idx on public.mail_campaign_recipients (campaign_id, status);
call app_private.track_updated_at('public.mail_campaign_recipients');
call app_private.secure('public.mail_campaign_recipients');
call app_private.allow_staff_read('public.mail_campaign_recipients', 'super_admin', 'admin');

-- Gönderilmeyecek adresler: listeden çıkanlar, geri dönen (bounce) ve şikâyet eden adresler, elle eklenenler.
create table public.mail_suppressions (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email) and char_length(email) <= 254),
  reason      text not null check (reason in ('unsubscribed','bounced','complaint','manual')),
  campaign_id uuid references public.mail_campaigns(id) on delete set null,
  note        text check (note is null or char_length(note) <= 300),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
call app_private.secure('public.mail_suppressions');
call app_private.allow_staff_read('public.mail_suppressions', 'super_admin', 'admin');
call app_private.audited('public.mail_suppressions');

-- ── 3 · Kitle çözümü ───────────────────────────────────────────────────────────────────────────────────────────────────
-- audience: {"segments": ["customers_corporate","customers_individual","leads"], "city": "İzmir",
--            "manual": [{"email": "...", "name": "..."}], "manual_attested": true}
-- Aynı adres bir kez (öncelik: müşteri → talep → elle). Anonimleştirilmiş kayıt, pasif müşteri, teste ayrılmış alan adı (RFC 2606) dışarıda.
-- İl süzgeci TAM eşleşmedir (liste panelde mevcut illerden seçilir) → Türkçe büyük/küçük harf çevrimi gerekmez.
create function app_private.mail_audience(p jsonb) returns table (email text, full_name text, company text, source text, suppressed boolean)
language sql stable set search_path = '' as $$
  with seg as (
    select case when jsonb_typeof(p->'segments') = 'array' then p->'segments' else '[]'::jsonb end as s,
           nullif(btrim(coalesce(p->>'city', '')), '') as city
  ),
  pool as (
    select lower(btrim(c.email)) as email, coalesce(nullif(btrim(c.contact_person), ''), nullif(btrim(c.full_name), '')) as full_name,
           nullif(btrim(c.company_title), '') as company, 'customer'::text as source, 1 as prio
      from public.customers c, seg
     where c.is_active and c.anonymized_at is null and c.email is not null
       and ((c.type = 'corporate' and seg.s ? 'customers_corporate') or (c.type = 'individual' and c.marketing_consent and seg.s ? 'customers_individual'))
       and (seg.city is null or c.city = seg.city)
    union all
    select lower(btrim(l.email)), nullif(btrim(l.full_name), ''), nullif(btrim(l.company), ''), 'lead', 2
      from public.leads l, seg
     where l.consent_marketing and l.anonymized_at is null and l.email is not null and seg.s ? 'leads'
       and (seg.city is null or l.city = seg.city)
    union all
    select lower(btrim(e->>'email')), nullif(btrim(left(coalesce(e->>'name', ''), 160)), ''), null, 'manual', 3
      from jsonb_array_elements(case when jsonb_typeof(p->'manual') = 'array' and coalesce(p->>'manual_attested', '') = 'true' then p->'manual' else '[]'::jsonb end) e
  ),
  uniq as (
    select distinct on (pool.email) pool.email, left(pool.full_name, 160) as full_name, left(pool.company, 200) as company, pool.source
      from pool
     where pool.email ~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$' and char_length(pool.email) <= 254
       and pool.email !~ '(@|\.)example\.(com|net|org)$' and pool.email !~ '\.(test|example|invalid|localhost)$'
     order by pool.email, pool.prio
  )
  select u.email, u.full_name, u.company, u.source, exists (select 1 from public.mail_suppressions s where s.email = u.email)
    from uniq u
$$;
revoke execute on function app_private.mail_audience(jsonb) from public, anon, authenticated;

create function app_private.require_mail_admin(p_fn text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.has_role('super_admin', 'admin') then raise exception '%: yetki yok', p_fn using errcode = '42501'; end if;
end $$;
revoke execute on function app_private.require_mail_admin(text) from public, anon, authenticated;

-- ── 4 · Panel RPC'leri (hepsi: yalnız super_admin/admin) ───────────────────────────────────────────────────────────────
/** Kitle önizlemesi: toplam, kaynak kırılımı, listeden çıktığı için elenen adet ve ilk 20 alıcı. Hiçbir şey yazmaz. */
create function public.mail_audience_preview(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app_private.require_mail_admin('mail_audience_preview');
  if pg_column_size(p) > 262144 then raise exception 'mail_audience_preview: kitle çok büyük' using errcode = '22023'; end if;
  return (
    select jsonb_build_object(
      'total', count(*) filter (where not a.suppressed),
      'suppressed', count(*) filter (where a.suppressed),
      'customer', count(*) filter (where not a.suppressed and a.source = 'customer'),
      'lead', count(*) filter (where not a.suppressed and a.source = 'lead'),
      'manual', count(*) filter (where not a.suppressed and a.source = 'manual'),
      'sample', coalesce((select jsonb_agg(jsonb_build_object('email', x.email, 'name', x.full_name, 'company', x.company, 'source', x.source))
                            from (select b.* from app_private.mail_audience(p) b where not b.suppressed order by b.email limit 20) x), '[]'::jsonb))
      from app_private.mail_audience(p) a
  );
end $$;

/** İl süzgeci seçenekleri: e-postası olan müşteri ve taleplerde geçen iller. */
create function public.mail_audience_cities() returns text[]
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app_private.require_mail_admin('mail_audience_cities');
  return coalesce((
    select array_agg(x.city order by x.city) from (
      select distinct btrim(c.city) as city from public.customers c where c.email is not null and c.anonymized_at is null and nullif(btrim(c.city), '') is not null
      union
      select distinct btrim(l.city) from public.leads l where l.email is not null and l.anonymized_at is null and l.consent_marketing and nullif(btrim(l.city), '') is not null
    ) x), '{}');
end $$;

/** Taslak oluşturur/günceller. Taslak dışındaki kampanya değiştirilemez. Alan sınırları tablo CHECK'lerinde. */
create function public.save_mail_campaign(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_audience jsonb := case when jsonb_typeof(p->'audience') = 'object' then p->'audience' else '{}'::jsonb end;
  v_status text;
begin
  perform app_private.require_mail_admin('save_mail_campaign');
  if pg_column_size(p) > 300000 then raise exception 'save_mail_campaign: gövde çok büyük' using errcode = '22023'; end if;
  if jsonb_typeof(v_audience->'manual') = 'array' and jsonb_array_length(v_audience->'manual') > 2000 then
    raise exception 'save_mail_campaign: elle liste en çok 2000 adres' using errcode = '22023';
  end if;
  if v_id is null then
    insert into public.mail_campaigns (name, locale, subject, preheader, body, cta_label, cta_url, audience, created_by)
    values (btrim(coalesce(p->>'name', '')), coalesce(nullif(p->>'locale', ''), 'tr'), btrim(coalesce(p->>'subject', '')), btrim(coalesce(p->>'preheader', '')),
            coalesce(p->>'body', ''), btrim(coalesce(p->>'cta_label', '')), btrim(coalesce(p->>'cta_url', '')), v_audience, auth.uid())
    returning id into v_id;
  else
    select status into v_status from public.mail_campaigns where id = v_id for update;
    if v_status is null then raise exception 'save_mail_campaign: kampanya yok' using errcode = 'P0002'; end if;
    if v_status <> 'draft' then raise exception 'save_mail_campaign: yalnız taslak düzenlenir' using errcode = '22023'; end if;
    update public.mail_campaigns
       set name = btrim(coalesce(p->>'name', '')), locale = coalesce(nullif(p->>'locale', ''), 'tr'), subject = btrim(coalesce(p->>'subject', '')),
           preheader = btrim(coalesce(p->>'preheader', '')), body = coalesce(p->>'body', ''), cta_label = btrim(coalesce(p->>'cta_label', '')),
           cta_url = btrim(coalesce(p->>'cta_url', '')), audience = v_audience
     where id = v_id;
  end if;
  return v_id;
end $$;

/** Yalnız taslak silinir: gönderilmiş kampanyanın alıcı satırları "listeden çık" bağlantılarını taşır, kayıt kalmalıdır. */
create function public.delete_mail_campaign(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_mail_admin('delete_mail_campaign');
  delete from public.mail_campaigns where id = p_id and status = 'draft';
  if not found then raise exception 'delete_mail_campaign: yalnız taslak silinir' using errcode = '22023'; end if;
end $$;

create function public.duplicate_mail_campaign(p_id uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform app_private.require_mail_admin('duplicate_mail_campaign');
  insert into public.mail_campaigns (name, locale, subject, preheader, body, cta_label, cta_url, audience, created_by)
  select left(btrim(p_name), 120), c.locale, c.subject, c.preheader, c.body, c.cta_label, c.cta_url, c.audience, auth.uid()
    from public.mail_campaigns c where c.id = p_id
  returning id into v_id;
  if v_id is null then raise exception 'duplicate_mail_campaign: kampanya yok' using errcode = 'P0002'; end if;
  return v_id;
end $$;

/**
 * Başlat: alıcı listesi O ANDA dondurulur (listeden çıkanlar girmez), durum sending ya da (p_at ilerideyse) scheduled olur.
 * Gönderimi cron yapar; her alıcıdan önce engel listesine yeniden bakılır.
 */
create function public.start_mail_campaign(p_id uuid, p_at timestamptz default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v public.mail_campaigns%rowtype;
  v_n integer;
begin
  perform app_private.require_mail_admin('start_mail_campaign');
  select * into v from public.mail_campaigns where id = p_id for update;
  if not found then raise exception 'start_mail_campaign: kampanya yok' using errcode = 'P0002'; end if;
  if v.status <> 'draft' then raise exception 'start_mail_campaign: yalnız taslak başlatılır' using errcode = '22023'; end if;
  if char_length(btrim(v.subject)) < 3 or char_length(btrim(v.body)) < 10 then raise exception 'start_mail_campaign: konu ve metin gerekli' using errcode = '22023'; end if;
  if p_at is not null and p_at > now() + interval '90 days' then raise exception 'start_mail_campaign: tarih en çok 90 gün ileri' using errcode = '22023'; end if;
  insert into public.mail_campaign_recipients (campaign_id, email, full_name, company, source)
  select p_id, a.email, a.full_name, a.company, a.source from app_private.mail_audience(v.audience) a where not a.suppressed;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'start_mail_campaign: alıcı yok' using errcode = '22023'; end if;
  if v_n > 10000 then raise exception 'start_mail_campaign: alıcı sınırı (10000)' using errcode = '22023'; end if;
  update public.mail_campaigns
     set status = case when p_at is not null and p_at > now() then 'scheduled' else 'sending' end,
         scheduled_at = case when p_at is not null and p_at > now() then p_at end,
         started_by = auth.uid()
   where id = p_id;
  return v_n;
end $$;

/** pause · resume · cancel (bekleyenler atlanır) · retry (başarısızlar yeniden kuyruğa). Yeni durumu döner. */
create function public.set_mail_campaign_state(p_id uuid, p_action text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_at timestamptz;
  v_new text;
begin
  perform app_private.require_mail_admin('set_mail_campaign_state');
  select status, scheduled_at into v_status, v_at from public.mail_campaigns where id = p_id for update;
  if v_status is null then raise exception 'set_mail_campaign_state: kampanya yok' using errcode = 'P0002'; end if;
  if p_action = 'pause' and v_status in ('sending', 'scheduled') then
    v_new := 'paused';
  elsif p_action = 'resume' and v_status = 'paused' then
    v_new := case when v_at is not null and v_at > now() then 'scheduled' else 'sending' end;
  elsif p_action = 'cancel' and v_status in ('scheduled', 'sending', 'paused') then
    v_new := 'cancelled';
    update public.mail_campaign_recipients set status = 'skipped', error = 'cancelled', locked_at = null where campaign_id = p_id and status in ('pending', 'sending');
    update public.mail_campaigns set finished_at = now() where id = p_id;
  elsif p_action = 'retry' and v_status in ('sent', 'sending', 'paused') then
    update public.mail_campaign_recipients set status = 'pending', error = null, locked_at = null where campaign_id = p_id and status = 'failed';
    if not found then raise exception 'set_mail_campaign_state: başarısız alıcı yok' using errcode = '22023'; end if;
    v_new := case when v_status = 'sent' then 'sending' else v_status end;
    update public.mail_campaigns set finished_at = null where id = p_id;
  else
    raise exception 'set_mail_campaign_state: % bu durumda (%) uygulanamaz', p_action, v_status using errcode = '22023';
  end if;
  update public.mail_campaigns set status = v_new where id = p_id;
  return v_new;
end $$;

/** Kampanya başına alıcı sayaçları (liste ve ilerleme çubuğu). INVOKER: satırları RLS süzer. */
create function public.mail_campaign_stats(p_ids uuid[] default null)
returns table (campaign_id uuid, total integer, pending integer, sent integer, failed integer, skipped integer, unsubscribed integer)
language sql stable set search_path = '' as $$
  select r.campaign_id, count(*)::int, (count(*) filter (where r.status in ('pending', 'sending')))::int, (count(*) filter (where r.status = 'sent'))::int,
         (count(*) filter (where r.status = 'failed'))::int, (count(*) filter (where r.status = 'skipped'))::int, (count(*) filter (where r.unsubscribed_at is not null))::int
    from public.mail_campaign_recipients r
   where p_ids is null or r.campaign_id = any(p_ids)
   group by r.campaign_id
$$;

/** Engel listesine elle ekleme (geri dönen ileti, telefonla gelen "göndermeyin" isteği). */
create function public.add_mail_suppression(p_email text, p_reason text, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  perform app_private.require_mail_admin('add_mail_suppression');
  if v_email !~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$' or char_length(v_email) > 254 then raise exception 'add_mail_suppression: e-posta' using errcode = '22023'; end if;
  if p_reason not in ('manual', 'bounced', 'complaint') then raise exception 'add_mail_suppression: neden' using errcode = '22023'; end if;
  insert into public.mail_suppressions (email, reason, note, created_by) values (v_email, p_reason, nullif(btrim(left(coalesce(p_note, ''), 300)), ''), auth.uid())
  on conflict (email) do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.mail_suppressions where email = v_email; end if;
  return v_id;
end $$;

/** Kişinin KENDİ isteğiyle çıktığı kayıt panelden kaldırılamaz (yeniden izin alınmadan gönderim yapılamaz). */
create function public.remove_mail_suppression(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_mail_admin('remove_mail_suppression');
  delete from public.mail_suppressions where id = p_id and reason <> 'unsubscribed';
  if not found then raise exception 'remove_mail_suppression: kayıt yok ya da kişinin kendi isteği' using errcode = '22023'; end if;
end $$;

-- ── 5 · Anonim uç: "listeden çık" (K-104: kapı + eşik; parametre sabit boyutlu uuid) ───────────────────────────────────
/** Bilinmeyen anahtar da hata vermez (false) → anahtar denemesi sızdırmaz. İzin kayıtları da geri alınır. */
create function public.mail_unsubscribe(p_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_campaign uuid;
begin
  perform app_private.require_gate();
  perform app_private.throttle('unsub:global', 300, interval '10 minutes');
  if p_token is null then return false; end if;
  select r.email, r.campaign_id into v_email, v_campaign from public.mail_campaign_recipients r where r.token = p_token;
  if v_email is null then return false; end if;
  insert into public.mail_suppressions as s (email, reason, campaign_id) values (v_email, 'unsubscribed', v_campaign)
  on conflict (email) do update set reason = 'unsubscribed', campaign_id = excluded.campaign_id where s.reason <> 'unsubscribed';
  update public.mail_campaign_recipients set unsubscribed_at = coalesce(unsubscribed_at, now()) where token = p_token;
  update public.leads set consent_marketing = false where consent_marketing and lower(btrim(email)) = v_email;
  update public.customers set marketing_consent = false where marketing_consent and lower(btrim(email)) = v_email;
  return true;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('mail_audience_preview', 'jsonb'), ('mail_audience_cities', ''), ('save_mail_campaign', 'jsonb'), ('delete_mail_campaign', 'uuid'),
    ('duplicate_mail_campaign', 'uuid, text'), ('start_mail_campaign', 'uuid, timestamptz'), ('set_mail_campaign_state', 'uuid, text'),
    ('mail_campaign_stats', 'uuid[]'), ('add_mail_suppression', 'text, text, text'), ('remove_mail_suppression', 'uuid')) as v(name, args)
  loop
    execute format('revoke execute on function public.%I(%s) from public, anon', r.name, r.args);
    execute format('grant execute on function public.%I(%s) to authenticated, service_role', r.name, r.args);
  end loop;
end $$;
revoke execute on function public.mail_unsubscribe(uuid) from public;
grant execute on function public.mail_unsubscribe(uuid) to anon, authenticated, service_role;

-- ── 6 · Gönderim ayarları (panel: Toplu E-posta → Gönderim ayarları). Alt bilgi metni içeriktir → veritabanında. ────────
insert into public.site_settings (key, value, is_public, description) values
('mail.bulk', '{"hourly_limit": 100, "batch_size": 10, "reply_to": "",
  "name_fallback": {"tr": "Yetkili", "en": "Sir or Madam"},
  "footer": {"tr": "Bu e-postayı {{site_name}} gönderdi. Bu tür iletileri almak istemiyorsanız aşağıdaki bağlantıyla listeden çıkabilirsiniz.", "en": "This e-mail was sent by {{site_name}}. If you no longer wish to receive these messages, you can unsubscribe using the link below."},
  "unsubscribe_label": {"tr": "Listeden çık", "en": "Unsubscribe"}}'::jsonb, false, 'Toplu e-posta gönderim ayarları (K-108)')
on conflict (key) do nothing;
