-- 0013 · Storage bucket'ları ve nesne politikaları (Faz 3)
--
-- `storage` şeması Supabase platformuna aittir; PGlite testlerinde YOKTUR (K-47 bilinen bedeli).
-- Bu yüzden tüm migration bir koruma bloğu içinde: şema yoksa sessizce atlanır ve yalnız
-- uzak projede uygulanır. Politikalar burada; "istek geldiğinde kim ne yapabilir" kuralı
-- yine RLS'te (Kural 4), storage-js'in kendi ACL'i yok.
--
-- media             : herkese açık okunur (site görselleri/videoları). Yazma: super_admin/admin/editor.
-- private-documents : hiç kimseye açık değil; staff okur/yazar. Teklif ekleri, CV'ler (0006 leads).
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice '0013: storage şeması yok (PGlite) — bucket ve politikalar atlandı';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('media', 'media', true, 52428800,
      array['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf']),
    ('private-documents', 'private-documents', false, 26214400,
      array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  -- Yeniden çalıştırılabilir: politikalar önce düşürülür.
  drop policy if exists "media public read"        on storage.objects;
  drop policy if exists "media staff insert"       on storage.objects;
  drop policy if exists "media staff update"       on storage.objects;
  drop policy if exists "media staff delete"       on storage.objects;
  drop policy if exists "private staff read"       on storage.objects;
  drop policy if exists "private staff insert"     on storage.objects;
  drop policy if exists "private staff update"     on storage.objects;
  drop policy if exists "private staff delete"     on storage.objects;

  -- media: anonim + üye okur (public bucket'ta CDN yolu zaten RLS'e uğramaz; bu politika
  -- liste/imzalı URL gibi API çağrıları için)
  create policy "media public read" on storage.objects for select
    to anon, authenticated using (bucket_id = 'media');
  create policy "media staff insert" on storage.objects for insert
    to authenticated with check (bucket_id = 'media' and (select app_private.has_role('super_admin', 'admin', 'editor')));
  create policy "media staff update" on storage.objects for update
    to authenticated
    using (bucket_id = 'media' and (select app_private.has_role('super_admin', 'admin', 'editor')))
    with check (bucket_id = 'media' and (select app_private.has_role('super_admin', 'admin', 'editor')));
  create policy "media staff delete" on storage.objects for delete
    to authenticated using (bucket_id = 'media' and (select app_private.has_role('super_admin', 'admin', 'editor')));

  -- private-documents: yalnız staff (sales dahil — teklif ekleri onların işi)
  create policy "private staff read" on storage.objects for select
    to authenticated using (bucket_id = 'private-documents' and (select app_private.has_role('super_admin', 'admin', 'editor', 'sales')));
  create policy "private staff insert" on storage.objects for insert
    to authenticated with check (bucket_id = 'private-documents' and (select app_private.has_role('super_admin', 'admin', 'editor', 'sales')));
  create policy "private staff update" on storage.objects for update
    to authenticated
    using (bucket_id = 'private-documents' and (select app_private.has_role('super_admin', 'admin', 'editor', 'sales')))
    with check (bucket_id = 'private-documents' and (select app_private.has_role('super_admin', 'admin', 'editor', 'sales')));
  create policy "private staff delete" on storage.objects for delete
    to authenticated using (bucket_id = 'private-documents' and (select app_private.has_role('super_admin', 'admin')));
end $$;
