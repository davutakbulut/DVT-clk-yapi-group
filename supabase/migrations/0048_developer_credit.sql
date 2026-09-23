-- 0048 · Geliştirici imzası (K-99): site ayarı — footer imzası, meta author/creator, JSON-LD WebSite.creator, humans.txt, llms.txt.
-- Panelden (Site Ayarları) düzenlenir; boş bırakılırsa hiçbir yerde görünmez (Kural 1: statik içerik yok).
insert into public.site_settings (key, value, is_public, description)
values ('site.developer', '{"name": "Davut Akbulut | Dijital Web Ajansı", "url": null}', true, 'Geliştirici imzası {name, url} — footer, meta, humans.txt')
on conflict (key) do nothing;
