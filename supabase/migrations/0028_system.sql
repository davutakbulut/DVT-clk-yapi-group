-- 0028 · Sistem yönetimi (Faz 18): kill switch bayrağı herkese açık, yönlendirme isabet sayacı, CV purge sarmalayıcısı,
-- bildirim/ purge heartbeat. Denetim kaydı (audit_logs), arayüz etiketleri (ui_translations), sözlük ve redirects tabloları 0001/0009'da.

-- Modül bayrakları gizli değildir: kapalı modülün sayfası zaten 404 verir, menü bağlantısı da gizlenir → anonim okuyabilir (K-61).
update public.site_settings set is_public = true where key = 'modules.enabled';

-- Yönlendirme isabeti: middleware anonim olarak sayar; yalnız aktif kayıt, yalnız sayaç (payload değişmez).
create function public.record_redirect_hit(p_path text) returns void
language sql security definer set search_path = '' as $$
  update public.redirects set hit_count = hit_count + 1, last_hit_at = now() where source_path = p_path and is_active
$$;
revoke all on function public.record_redirect_hit(text) from public;
grant execute on function public.record_redirect_hit(text) to anon, authenticated;

-- KVKK purge (0004 app_private): PostgREST yalnız public şemayı açar → service-role'ün çağırabileceği sarmalayıcı.
-- Dönen yollar cron işi tarafından Storage'dan da silinir (yetim dosya kalmasın).
create function public.purge_expired_job_applications() returns table (cv_bucket text, cv_path text)
language sql security definer set search_path = '' as $$
  select * from app_private.purge_expired_job_applications()
$$;
revoke all on function public.purge_expired_job_applications() from public, anon, authenticated;
grant execute on function public.purge_expired_job_applications() to service_role;

insert into public.cron_heartbeats (job_key, expected_interval_seconds)
values ('purge_applications', 129600)
on conflict (job_key) do nothing;

-- Arayüz etiketi override'ları: değişince site önbelleği düşer (revalidateTag 'ui_translations'); anonim okur (0009).
-- Sözlük: 0012 tohumu; CRUD panelden. Denetim kaydı yalnız-ekleme (0001) — silme yolu YOK.
