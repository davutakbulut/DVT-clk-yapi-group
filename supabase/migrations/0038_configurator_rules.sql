-- 0038 · Konfigüratör kuralları (Faz 26): limitler, sistem seçim eşiği, işçilik katsayısı; yasal uyarı metni (K-29, 04-CONFIGURATOR).
-- steel_profiles / panel_types / material_prices tohumu YOK (K-55) — kg/m ve fiyatlar panelden girilir.
insert into public.configurator_rules (key, value, description) values
  ('limits', '{"width": {"min": 8, "max": 60, "step": 1}, "length": {"min": 10, "max": 120, "step": 1}, "eave": {"min": 3, "max": 12, "step": 0.5}, "ridge_extra": {"min": 0.5, "max": 6, "step": 0.5}, "bay": {"min": 4, "max": 8, "step": 0.5}}', 'Parametre sınırları (m)'),
  ('truss_threshold_m', '30', 'Bu açıklığın üstünde kafes makas (2L köşebent), altında düz IPE makas'),
  ('purlin_spacing_m', '1', 'Aşık/kuşak aralığı'),
  ('labor_factor', '1', 'İşçilik katsayısı (malzeme bedeli × katsayı) — Faz 28'),
  ('profile_map', '{"column": "HEB360", "rafter": "IPE500", "secondary": "IPE300", "wind_column": "IPE300", "purlin_small_bay": "UNP160", "purlin_large_bay": "UNP200", "brace": "PIPE139.7x6", "truss_chord": "2L100x100x10", "door_frame": "L140x60"}', 'Eleman grubu → profil kodu (steel_profiles.code ile eşleşir)')
on conflict (key) do nothing;

insert into public.site_settings (key, value, is_public, description)
values ('configurator.disclaimer', '{"tr": "Bu bir ön metraj tahminidir; statik hesap ve resmî teklif yerine geçmez.", "en": "This is a preliminary take-off estimate; it does not replace structural design or a formal quotation."}', true, 'Konfigüratör yasal uyarısı (zorunlu, 04-CONFIGURATOR)')
on conflict (key) do nothing;
