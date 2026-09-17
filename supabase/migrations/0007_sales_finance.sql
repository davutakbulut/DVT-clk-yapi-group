-- 0007 · Satış & Finans (7) — K-31, K-32, K-33, K-34
-- 🔒 Maliyet/kâr kolonları `sales` rolüne VERİTABANI seviyesinde kapalıdır (arayüzde gizlemek yetmez:
--    ağ isteği tarayıcıdan incelenebilir). Temel tablolar yalnız admin'e açık; satış personeli
--    maliyet kolonu İÇERMEYEN görünümleri okur/yazar.

create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  type           text not null default 'corporate' check (type in ('individual','corporate')),
  full_name      text,
  company_title  text,
  tax_office     text,
  tax_id         text,                                   -- VKN (10) / TCKN (11)
  address        text,
  city           text,
  district       text,
  email          text,
  phone          text,
  contact_person text,
  contact_phone  text,
  notes          text,
  source         text not null default 'manual' check (source in ('lead','configurator','manual')),
  profile_id     uuid references public.profiles(id) on delete set null,
  is_active      boolean not null default true,
  anonymized_at  timestamptz,                            -- K-34: VUK 5 yıl saklama ↔ KVKK silme → maskeleme
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (tax_id is null or tax_id ~ '^\d{10,11}$'),
  check (anonymized_at is not null or coalesce(nullif(full_name, ''), nullif(company_title, '')) is not null)
);
create index customers_tax_id_idx on public.customers (tax_id) where tax_id is not null;
call app_private.track_updated_at('public.customers');
call app_private.secure('public.customers');
call app_private.allow_staff_read('public.customers', 'super_admin', 'admin', 'sales', 'viewer');
call app_private.allow_staff_write('public.customers', 'super_admin', 'admin', 'sales');
call app_private.audited('public.customers');

alter table public.leads
  add constraint leads_customer_fk foreign key (customer_id) references public.customers(id) on delete set null;

create table public.sales (
  id                   uuid primary key default gen_random_uuid(),
  sale_no              text not null unique,               -- SAT-2026-0042
  customer_id          uuid not null references public.customers(id) on delete restrict,
  lead_id              uuid references public.leads(id) on delete set null,
  configuration_id     uuid,                               -- FK 0008'de
  project_id           uuid references public.projects(id) on delete set null,
  sale_date            date not null default current_date,
  status               text not null default 'draft' check (status in ('draft','confirmed','in_progress','completed','cancelled')),
  -- K-32: İŞLEM TARİHİNDEKİ kur kayda yazılır; yoksa 2 yıl önceki satışın kârı bugünkü kurla hesaplanır.
  currency             text not null default 'TRY' check (currency in ('TRY','USD','EUR')),
  exchange_rate        numeric(14,6) not null default 1 check (exchange_rate > 0),
  exchange_rate_date   date,
  exchange_rate_source text not null default 'tcmb' check (exchange_rate_source in ('tcmb','manual')),
  subtotal             numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_pct         numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  discount_amount      numeric(14,2) not null default 0 check (discount_amount >= 0),
  is_invoiced          boolean not null default true,
  vat_rate             numeric(5,4) not null default 0.20 check (vat_rate between 0 and 1),
  vat_amount           numeric(14,2) not null default 0 check (vat_amount >= 0),
  grand_total          numeric(14,2) not null default 0,
  grand_total_try      numeric(16,2) not null default 0,
  total_cost           numeric(14,2) check (total_cost >= 0),          -- 🔒
  gross_profit         numeric(14,2),                                   -- 🔒
  margin_pct           numeric(7,2),                                    -- 🔒
  notes                text,
  assigned_to          uuid references public.profiles(id) on delete set null,
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Tutarlar servis katmanında (saf domain fonksiyonları) hesaplanır; bu kısıtlar oradaki bir hatanın
  -- yanlış satış kaydına dönüşmesine karşı son emniyettir.
  check (currency <> 'TRY' or exchange_rate = 1),
  check (discount_amount <= subtotal),
  check (grand_total = subtotal - discount_amount + vat_amount),
  check (grand_total_try = round(grand_total * exchange_rate, 2)),
  check (gross_profit is null or gross_profit = subtotal - discount_amount - total_cost)
);
create index sales_customer_idx on public.sales (customer_id, sale_date desc);
create index sales_status_idx on public.sales (status, sale_date desc);

create table public.sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.sales(id) on delete cascade,
  service_id  uuid references public.services(id) on delete set null,
  product_id  uuid references public.products(id) on delete set null,
  description text not null,                               -- listeden seçim anlık görüntüsü VEYA serbest metin (vinç kiralama)
  quantity    numeric(14,3) not null check (quantity > 0),
  unit        text not null,
  unit_price  numeric(14,2) not null check (unit_price >= 0),
  line_total  numeric(14,2) not null,
  unit_cost   numeric(14,2) check (unit_cost >= 0),       -- 🔒
  line_cost   numeric(14,2),                               -- 🔒
  line_profit numeric(14,2),                               -- 🔒
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (line_total = round(quantity * unit_price, 2)),
  check (line_profit is null or line_profit = line_total - line_cost)
);
create index sale_items_sale_idx on public.sale_items (sale_id, sort_order);

-- 🔒 Tablonun TAMAMI maliyettir
create table public.sale_expenses (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales(id) on delete cascade,
  category     text not null check (category in ('shipping','labor','equipment','travel','subcontractor','other')),
  description  text,
  amount       numeric(14,2) not null check (amount >= 0),
  expense_date date,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index sale_expenses_sale_idx on public.sale_expenses (sale_id);

create function app_private.assign_sale_no() returns trigger
language plpgsql as $$
begin
  if new.sale_no is null then new.sale_no := app_private.next_document_no('SAT', new.sale_date); end if;
  return new;
end $$;
create trigger sales_assign_no before insert on public.sales
  for each row execute function app_private.assign_sale_no();

-- Temel tablolar: yalnız admin. `sales` ve `viewer` buraya HİÇ erişemez.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['sales','sale_items','sale_expenses'] loop
    call app_private.track_updated_at(('public.' || v_table)::regclass);
    call app_private.secure(('public.' || v_table)::regclass);
    call app_private.allow_staff_write(('public.' || v_table)::regclass, 'super_admin', 'admin');
    call app_private.audited(('public.' || v_table)::regclass);
  end loop;
end $$;

-- Görünümler sahibinin (postgres) yetkisiyle çalışır ve temel tablonun RLS'ini atlar — BİLİNÇLİ:
-- dar kolon listesi + WHERE içindeki rol kontrolü erişimin kendisidir. security_barrier, kullanıcı
-- koşullarının rol kontrolünden ÖNCE çalışıp satır sızdırmasını engeller.
-- (Supabase linter'ı "security definer view" uyarısı verir; burada tasarımın kendisidir.)
create view public.sales_without_cost with (security_barrier = true) as
  select s.id, s.sale_no, s.customer_id, s.lead_id, s.configuration_id, s.project_id, s.sale_date, s.status,
         s.currency, s.exchange_rate, s.exchange_rate_date, s.exchange_rate_source,
         s.subtotal, s.discount_pct, s.discount_amount, s.is_invoiced, s.vat_rate, s.vat_amount,
         s.grand_total, s.grand_total_try, s.notes, s.assigned_to, s.created_by, s.created_at, s.updated_at
    from public.sales s
   where (select app_private.has_role('super_admin','admin','sales','viewer'))
  with cascaded check option;

create view public.sale_items_without_cost with (security_barrier = true) as
  select i.id, i.sale_id, i.service_id, i.product_id, i.description, i.quantity, i.unit,
         i.unit_price, i.line_total, i.sort_order, i.created_at, i.updated_at
    from public.sale_items i
   where (select app_private.has_role('super_admin','admin','sales','viewer'))
  with cascaded check option;

revoke all on public.sales_without_cost, public.sale_items_without_cost from anon, authenticated;
grant select, insert, update on public.sales_without_cost to authenticated;
grant select, insert, update, delete on public.sale_items_without_cost to authenticated;

-- Görünüm üzerinden yazma temel tabloya sahibin yetkisiyle iner → RLS devrede değildir. Yazma yetkisini
-- bu tetikleyici denetler: viewer okur ama YAZAMAZ; sales yazar ama maliyet kolonlarına DOKUNAMAZ.
-- security INVOKER (bilinçli): is_trusted_context() çağıranın gerçek DB rolünü görebilmeli.
create function app_private.guard_sales_write() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_col text;
begin
  if app_private.is_trusted_context() or app_private.has_role('super_admin','admin') then
    return coalesce(new, old);
  end if;
  if not app_private.has_role('sales') then
    raise exception 'Satış kaydı yazma yetkiniz yok' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' and tg_table_name = 'sales' then
    raise exception 'Satış kaydını yalnız yönetici silebilir' using errcode = '42501';
  end if;
  foreach v_col in array array['total_cost','gross_profit','margin_pct','unit_cost','line_cost','line_profit'] loop
    if (v_new->v_col) is distinct from (v_old->v_col) and (v_new->>v_col) is not null then
      raise exception 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (%)', v_col using errcode = '42501';
    end if;
  end loop;
  return coalesce(new, old);
end $$;

create trigger sales_guard_write before insert or update or delete on public.sales
  for each row execute function app_private.guard_sales_write();
create trigger sale_items_guard_write before insert or update or delete on public.sale_items
  for each row execute function app_private.guard_sales_write();

alter table public.projects
  add constraint projects_sale_fk foreign key (sale_id) references public.sales(id) on delete set null;

-- ── Fatura + tevkifat (K-31). Yapım işlerinde standart 4/10; varsayılan KAPALI (null).
create table public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  invoice_no         text unique,                           -- e-Fatura sistemi verir; kesilene kadar boş
  sale_id            uuid not null references public.sales(id) on delete restrict,
  customer_id        uuid not null references public.customers(id) on delete restrict,
  type               text not null check (type in ('e_invoice','e_archive','proforma')),
  status             text not null default 'not_issued' check (status in ('not_issued','issued','sent','paid','partially_paid','cancelled')),
  issue_date         date,
  due_date           date,
  currency           text not null default 'TRY' check (currency in ('TRY','USD','EUR')),
  exchange_rate      numeric(14,6) not null default 1 check (exchange_rate > 0),
  base_amount        numeric(14,2) not null check (base_amount >= 0),      -- matrah
  vat_rate           numeric(5,4) not null default 0.20 check (vat_rate between 0 and 1),
  vat_amount         numeric(14,2) not null,
  total_amount       numeric(14,2) not null,
  withholding_ratio  numeric(3,2) check (withholding_ratio in (0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1.0)),
  withholding_amount numeric(14,2) not null default 0,
  collectable_amount numeric(14,2) not null,                               -- tahsil edilecek tutar
  notes              text,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Yanlış hesap = yanlış fatura = vergi sorunu. Hesap domain/ katmanında; bu kısıtlar son emniyet.
  check (vat_amount = round(base_amount * vat_rate, 2)),
  check (total_amount = base_amount + vat_amount),
  check (withholding_amount = round(vat_amount * coalesce(withholding_ratio, 0), 2)),
  check (collectable_amount = total_amount - withholding_amount),
  check (status = 'not_issued' or (invoice_no is not null and issue_date is not null) or type = 'proforma')
);
create index invoices_sale_idx on public.invoices (sale_id);
create index invoices_status_idx on public.invoices (status, due_date);

-- Hakediş / ödeme planı
create table public.payment_schedules (
  id               uuid primary key default gen_random_uuid(),
  sale_id          uuid not null references public.sales(id) on delete cascade,
  seq              integer not null check (seq > 0),
  description      text not null,
  ratio_pct        numeric(5,2) check (ratio_pct > 0 and ratio_pct <= 100),
  amount           numeric(14,2) not null check (amount > 0),
  due_date         date not null,
  status           text not null default 'pending' check (status in ('pending','paid','partially_paid','cancelled')),
  reminder_sent_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (sale_id, seq) deferrable initially deferred
);
-- "Vadesi geçti" saklanmaz, TÜRETİLİR: saklansaydı her gece güncelleyen bir cron'a bağımlı olurdu.
create index payment_schedules_due_idx on public.payment_schedules (due_date) where status in ('pending','partially_paid');

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references public.sales(id) on delete restrict,
  invoice_id    uuid references public.invoices(id) on delete set null,
  schedule_id   uuid references public.payment_schedules(id) on delete set null,
  paid_on       date not null,
  amount        numeric(14,2) not null check (amount > 0),
  currency      text not null default 'TRY' check (currency in ('TRY','USD','EUR')),
  exchange_rate numeric(14,6) not null default 1 check (exchange_rate > 0),
  amount_try    numeric(16,2) not null,
  method        text not null check (method in ('bank_transfer','cash','check','credit_card','other')),
  reference     text,
  notes         text,
  recorded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (amount_try = round(amount * exchange_rate, 2))
);
create index payments_sale_idx on public.payments (sale_id, paid_on desc);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['invoices','payment_schedules','payments'] loop
    call app_private.track_updated_at(('public.' || v_table)::regclass);
    call app_private.secure(('public.' || v_table)::regclass);
    call app_private.allow_staff_read(('public.' || v_table)::regclass, 'super_admin', 'admin', 'sales', 'viewer');
    call app_private.allow_staff_write(('public.' || v_table)::regclass, 'super_admin', 'admin');
    call app_private.audited(('public.' || v_table)::regclass);
  end loop;
end $$;
