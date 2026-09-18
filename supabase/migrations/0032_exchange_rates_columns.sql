-- 0032 · exchange_rates şema sözleşmesi (conventions.test): created_at + updated_at + tetikleyici.
alter table public.exchange_rates
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();
call app_private.track_updated_at('public.exchange_rates');
