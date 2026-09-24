-- 0054 · Hizmet sıra numaraları ardışık (K-106 tohumu 1,2,3,4,5,6,10,20…24 bırakmıştı; sürükle-bırak sözleşmesi
-- "yeni kayıt max+1'e eklenir, sıra 1..N ardışık" (slug.test). Grup sırası korunur: çelik → mühendislik → inşaat.
with ordered as (
  select id, row_number() over (order by case group_key when 'steel' then 1 when 'engineering' then 2 else 3 end, sort_order nulls last, created_at) as rn
  from public.services
)
update public.services s set sort_order = o.rn from ordered o where o.id = s.id and s.sort_order is distinct from o.rn;
