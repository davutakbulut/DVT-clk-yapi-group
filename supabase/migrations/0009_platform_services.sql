-- 0009 · Servis tabloları: mail kuyruğu, arayüz çevirileri, terim sözlüğü, WhatsApp, cron canlılık denetimi

create table public.email_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_.]*$'),      -- 'lead.received.customer'
  name        text not null,
  subject     jsonb not null check (nullif(subject->>'tr', '') is not null),
  body        jsonb not null,
  variables   jsonb not null default '[]' check (jsonb_typeof(variables) = 'array'),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
  -- Otomatik çeviri YOK: şablonlar hukuki/ticari metin taşır (Kural 7) — kolon bile açılmadı.
);

-- Form anında tamamlanır; gönderim cron'da. Senkron olsaydı Resend 8 sn yanıt vermezse kullanıcı 8 sn beklerdi.
create table public.email_queue (
  id              uuid primary key default gen_random_uuid(),
  template_key    text not null,
  to_email        text not null,
  to_name         text,
  locale          text not null default 'tr' check (locale in ('tr','en')),
  payload         jsonb not null default '{}',
  status          text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  priority        smallint not null default 5 check (priority between 1 and 9),
  attempts        integer not null default 0,
  max_attempts    integer not null default 5 check (max_attempts > 0),
  next_attempt_at timestamptz not null default now(),
  locked_at       timestamptz,                         -- çöken işçinin kilidi zaman aşımıyla düşer
  last_error      text,
  related_type    text,
  related_id      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index email_queue_due_idx on public.email_queue (priority, next_attempt_at) where status = 'pending';

create table public.email_logs (
  id                  uuid primary key default gen_random_uuid(),
  queue_id            uuid references public.email_queue(id) on delete set null,
  template_key        text,
  to_email            text not null,
  subject             text not null,
  provider            text not null check (provider in ('resend','smtp')),   -- hangi sağlayıcı gerçekten gönderdi
  status              text not null check (status in ('sent','failed')),
  provider_message_id text,
  error               text,
  related_type        text,
  related_id          uuid,
  created_at          timestamptz not null default now()
);
create index email_logs_related_idx on public.email_logs (related_type, related_id);
create index email_logs_created_idx on public.email_logs (created_at desc);

alter table public.lead_replies
  add constraint lead_replies_email_log_fk foreign key (email_log_id) references public.email_logs(id) on delete set null;

call app_private.track_updated_at('public.email_templates');
call app_private.secure('public.email_templates');
call app_private.allow_staff_write('public.email_templates', 'super_admin', 'admin');
call app_private.audited('public.email_templates');

-- Kuyruğa uygulama kodu DOĞRUDAN yazmaz; yazma güvenilir bağlamdan (cron/RPC) gelir. Yönetici yalnız izler.
call app_private.track_updated_at('public.email_queue');
call app_private.secure('public.email_queue');
call app_private.allow_staff_read('public.email_queue', 'super_admin', 'admin');
call app_private.secure('public.email_logs');
call app_private.allow_staff_read('public.email_logs', 'super_admin', 'admin', 'sales');

-- Tekil ayar satırı
create table public.whatsapp_settings (
  id                 uuid primary key default gen_random_uuid(),
  key                text not null unique default 'main',
  is_enabled         boolean not null default false,       -- numara girilene kadar KAPALI
  phone_e164         text check (phone_e164 is null or phone_e164 ~ '^\+[1-9]\d{7,14}$'),
  display_name       jsonb not null default '{}',
  greeting           jsonb not null default '{}',
  reply_time         jsonb not null default '{}',
  message_templates  jsonb not null default '{}',          -- {"service": {"tr": "\"{{hizmet_adi}}\" …"}, …}
  working_hours      jsonb not null default '{}',
  hidden_paths       text[] not null default '{}',
  show_delay_seconds integer not null default 3 check (show_delay_seconds >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (not is_enabled or phone_e164 is not null)
);
call app_private.track_updated_at('public.whatsapp_settings');
call app_private.secure('public.whatsapp_settings');
call app_private.allow_public_read('public.whatsapp_settings', 'is_enabled');
call app_private.allow_staff_read('public.whatsapp_settings', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.whatsapp_settings', 'super_admin', 'admin');

-- messages/*.json üzerine bindirilen override'lar ("sıfır statik veri"nin tek istisnasını da yönetilebilir kılar)
create table public.ui_translations (
  id         uuid primary key default gen_random_uuid(),
  namespace  text not null,
  key        text not null,
  locale     text not null check (locale in ('tr','en')),
  value      text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (namespace, key, locale)
);
call app_private.track_updated_at('public.ui_translations');
call app_private.secure('public.ui_translations');
call app_private.allow_public_read('public.ui_translations');
call app_private.allow_staff_write('public.ui_translations', 'super_admin', 'admin', 'editor');

-- Makine çevirisine verilen terim sözlüğü
create table public.translation_glossary (
  id               uuid primary key default gen_random_uuid(),
  term_tr          text not null,
  term_en          text not null,
  context          text not null default '',
  do_not_translate boolean not null default false,       -- marka/ürün adları
  is_case_sensitive boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (term_tr, context)
);
call app_private.track_updated_at('public.translation_glossary');
call app_private.secure('public.translation_glossary');
call app_private.allow_staff_read('public.translation_glossary', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.translation_glossary', 'super_admin', 'admin', 'editor');

-- error_logs sistem HATA VERDİĞİNDE çalışır; sistem SESSİZCE durursa kimse fark etmez (mail cron'u çöker,
-- müşteriler günlerce onay maili almaz). Her kritik iş çalıştığında buraya iz bırakır.
create table public.cron_heartbeats (
  id                        uuid primary key default gen_random_uuid(),
  job_key                   text not null unique,
  expected_interval_seconds integer not null check (expected_interval_seconds > 0),
  last_run_at               timestamptz,
  last_status               text check (last_status in ('ok','error')),
  last_error                text,
  last_duration_ms          integer,
  alerted_at                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
call app_private.track_updated_at('public.cron_heartbeats');
call app_private.secure('public.cron_heartbeats');
call app_private.allow_staff_read('public.cron_heartbeats', 'super_admin', 'admin');

create view public.stale_cron_jobs as
  select h.job_key, h.last_run_at, h.expected_interval_seconds, h.last_status
    from public.cron_heartbeats h
   where h.last_run_at is null
      or h.last_run_at < now() - make_interval(secs => h.expected_interval_seconds * 2)
      or h.last_status = 'error';
alter view public.stale_cron_jobs set (security_invoker = true);
revoke all on public.stale_cron_jobs from anon, authenticated;
grant select on public.stale_cron_jobs to authenticated;
