-- 0045 · Örnek yorum işareti (K-78)
-- Tasarımı içerikle görebilmek için "örnek" yorum kartları eklenebilir; bunlar gerçek müşteri yorumu DEĞİLDİR:
-- kartta "Örnek" rozetiyle gösterilir, puan ortalamasına ve Review/AggregateRating JSON-LD'ye GİRMEZ.
-- Tohum yok: örnekler `scripts/sample-testimonials.mjs add|remove` ile yazılır/silinir (üretime migration'la taşınmaz).

alter table public.testimonials add column if not exists is_sample boolean not null default false;
comment on column public.testimonials.is_sample is 'Örnek (tasarım önizleme) kaydı: sitede "Örnek" rozetiyle görünür; puan ortalamasına ve yapılandırılmış veriye girmez (K-78).';

-- Ziyaretçi ve Google kaynaklı kayıt örnek olamaz: örnek yalnız panelden/betikle elle yazılır
alter table public.testimonials drop constraint if exists testimonials_sample_manual_only;
alter table public.testimonials add constraint testimonials_sample_manual_only check (not is_sample or source = 'manual');
