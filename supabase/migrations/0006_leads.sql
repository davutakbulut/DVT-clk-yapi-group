-- 0006 · Talep (6). Anonim ziyaretçi tabloya DOĞRUDAN yazamaz; form gönderimi Faz 10'da doğrulamalı RPC ile gelir.

create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  ref_no            text not null unique,                       -- TLP-2026-0118 (tetikleyici atar)
  source            text not null check (source in ('contact_form','quote_form','quote_basket','configurator','whatsapp','phone','manual')),
  status            text not null default 'new' check (status in ('new','in_review','quoted','won','lost')),
  full_name         text not null,
  company           text,
  email             text,
  phone             text,
  city              text,
  subject           text,
  message           text,
  form_data         jsonb not null default '{}',               -- /admin/settings/form ile tanımlanan dinamik seçenekler
  service_id        uuid references public.services(id) on delete set null,
  locale            text not null default 'tr' check (locale in ('tr','en')),
  user_id           uuid references public.profiles(id) on delete set null,
  customer_id       uuid,                                       -- FK 0007'de
  configuration_id  uuid,                                       -- FK 0008'de
  assigned_to       uuid references public.profiles(id) on delete set null,
  quoted_amount     numeric(14,2) check (quoted_amount >= 0),
  quoted_currency   text check (quoted_currency in ('TRY','USD','EUR')),
  lost_reason       text,
  consent_kvkk_at   timestamptz not null,
  consent_marketing boolean not null default false,
  utm               jsonb not null default '{}',
  page_url          text,
  ip_masked         text,
  anonymized_at     timestamptz,                                -- K-34: silme değil anonimleştirme
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (email is not null or phone is not null or anonymized_at is not null)
);
create index leads_status_idx on public.leads (status, created_at desc);
create index leads_assigned_idx on public.leads (assigned_to, status);
create index leads_user_idx on public.leads (user_id) where user_id is not null;

create function app_private.assign_lead_ref_no() returns trigger
language plpgsql as $$
begin
  if new.ref_no is null then new.ref_no := app_private.next_document_no('TLP'); end if;
  return new;
end $$;
create trigger leads_assign_ref_no before insert on public.leads
  for each row execute function app_private.assign_lead_ref_no();

call app_private.track_updated_at('public.leads');
call app_private.secure('public.leads');
call app_private.allow_staff_read('public.leads', 'super_admin', 'admin', 'editor', 'sales', 'viewer');
call app_private.allow_staff_write('public.leads', 'super_admin', 'admin', 'sales');
create policy "member reads own leads" on public.leads for select to authenticated using (user_id = (select auth.uid()));

-- Teklif sepeti kalemleri. Anlık görüntü kolonları: ürün sonradan silinse/yeniden adlandırılsa da talep okunabilir kalır.
create table public.lead_items (
  id                     uuid primary key default gen_random_uuid(),
  lead_id                uuid not null references public.leads(id) on delete cascade,
  product_id             uuid references public.products(id) on delete set null,
  variant_id             uuid references public.product_variants(id) on delete set null,
  product_name_snapshot  text not null,
  variant_label_snapshot text,
  stock_code_snapshot    text,
  quantity               numeric(14,3) not null check (quantity > 0),
  unit                   text,
  note                   text,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index lead_items_lead_idx on public.lead_items (lead_id, sort_order);

create table public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  is_pinned  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

create table public.lead_replies (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  author_id    uuid references public.profiles(id) on delete set null,
  subject      text not null,
  body         text not null,
  email_log_id uuid,                                  -- FK 0009'da
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index lead_replies_lead_idx on public.lead_replies (lead_id, created_at desc);

create table public.lead_attachments (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.leads(id) on delete cascade,
  storage_bucket      text not null default 'private-documents',
  storage_path        text not null,
  file_name           text not null,
  mime_type           text not null,
  size_bytes          bigint not null check (size_bytes >= 0),
  uploaded_by_visitor boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);
create index lead_attachments_lead_idx on public.lead_attachments (lead_id);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['lead_items','lead_replies','lead_attachments'] loop
    call app_private.track_updated_at(('public.' || v_table)::regclass);
    call app_private.secure(('public.' || v_table)::regclass);
    call app_private.allow_staff_read(('public.' || v_table)::regclass, 'super_admin', 'admin', 'editor', 'sales', 'viewer');
    call app_private.allow_staff_write(('public.' || v_table)::regclass, 'super_admin', 'admin', 'sales');
    -- Üye kendi talebinin kalemlerini/cevaplarını görür; görünürlük leads politikasından miras alınır.
    execute format('create policy "member reads own" on public.%I for select to authenticated using (exists (select 1 from public.leads l where l.id = lead_id and l.user_id = (select auth.uid())))', v_table);
  end loop;
end $$;

-- İç notlar üyeye ASLA görünmez ("müşteri pazarlıkçı" gibi bir not müşterinin hesabında çıkmamalı).
call app_private.track_updated_at('public.lead_notes');
call app_private.secure('public.lead_notes');
call app_private.allow_staff_read('public.lead_notes', 'super_admin', 'admin', 'editor', 'sales', 'viewer');
call app_private.allow_staff_write('public.lead_notes', 'super_admin', 'admin', 'sales');

create table public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  locale          text not null default 'tr' check (locale in ('tr','en')),
  status          text not null default 'pending' check (status in ('pending','subscribed','unsubscribed','bounced')),
  confirm_token   uuid not null default gen_random_uuid(),
  source          text,
  consent_at      timestamptz not null,
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  ip_masked       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (email)
);
call app_private.track_updated_at('public.newsletter_subscribers');
call app_private.secure('public.newsletter_subscribers');
call app_private.allow_staff_read('public.newsletter_subscribers', 'super_admin', 'admin', 'viewer');
call app_private.allow_staff_write('public.newsletter_subscribers', 'super_admin', 'admin');
