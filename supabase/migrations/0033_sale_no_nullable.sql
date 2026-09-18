-- 0033 · sales.sale_no: tetikleyici atar (0007 assign_sale_no); NOT NULL kısıtı Insert tipinde alanı zorunlu kılıyordu.
-- BEFORE INSERT tetikleyicisi boş/NULL değeri her zaman doldurur → kolon nullable ama satırda asla boş kalmaz (CHECK).
alter table public.sales alter column sale_no drop not null;
alter table public.sales add constraint sales_sale_no_present check (sale_no is not null and sale_no <> '');
create or replace function app_private.assign_sale_no() returns trigger
language plpgsql as $$
begin
  if new.sale_no is null or new.sale_no = '' then new.sale_no := app_private.next_document_no('SAT', new.sale_date); end if;
  return new;
end $$;
