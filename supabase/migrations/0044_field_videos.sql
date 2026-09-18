-- 0044 · Sahadan Videolar (ana sayfa bölümü + panel yönetimi): dikey video kartları; kaynak YouTube bağlantısı YA DA medya
-- kütüphanesine yüklenmiş video. Poster isteğe bağlı (YouTube'da verilmezse küçük resim kullanılır; yüklemede ilk kare).
-- Tohum YOK: videolar firmanın kendi sahası; panelden eklenir. Kayıt yoksa bölüm hiç çizilmez (Kural 3).
create table public.field_videos (
  id          uuid primary key default gen_random_uuid(),
  title       jsonb not null check (nullif(title->>'tr', '') is not null),     -- kart altı başlık (ör. proje/şantiye adı)
  caption     jsonb not null default '{}',                                     -- kart üstü kısa alıntı/açıklama
  source      text not null check (source in ('youtube', 'upload')),
  youtube_id  text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  video_id    uuid references public.media_library(id) on delete restrict,
  poster_id   uuid references public.media_library(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- kaynak tutarlılığı: youtube → kimlik zorunlu, dosya yok; upload → dosya zorunlu, kimlik yok
  check ((source = 'youtube' and youtube_id is not null and video_id is null) or (source = 'upload' and video_id is not null and youtube_id is null))
);
call app_private.sortable('public.field_videos');
call app_private.track_updated_at('public.field_videos');
call app_private.secure('public.field_videos');
call app_private.allow_public_read('public.field_videos', 'is_active');
call app_private.allow_staff_read('public.field_videos', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.field_videos', 'super_admin', 'admin', 'editor');
call app_private.audited('public.field_videos');
