'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, PublishFields, type MediaOption } from '@/modules/admin-shell';
import { saveMaterialPrice, savePriceGuide } from '../../actions';
import type { AdminMaterialPrice, AdminPriceGuide, Choice } from '../../data/adminPricingRepository';
import { formatPriceRows } from '../../domain/priceLines';
import { MediaPicker } from '@/modules/media';

const UNITS = ['ton', 'kg', 'm2', 'm', 'piece'] as const;
const MATERIAL_UNITS = ['kg', 'ton', 'm2', 'm', 'piece', 'hour'] as const;
const CATEGORIES = ['steel', 'panel', 'labor', 'fastener', 'coating', 'other'] as const;
const CURRENCIES = ['TRY', 'USD', 'EUR'] as const;

interface GuideProps {
  readonly guide: AdminPriceGuide | null;
  readonly images: readonly MediaOption[];
  readonly services: readonly Choice[];
  readonly materials: readonly Choice[];
}

/** Rehber formu: metin · satırlar (malzeme koduyla bağlanır) · metraj ön ayarları · uyarı (zorunlu) · SEO · yayın. */
export function PriceGuideForm({ guide, images, services, materials }: GuideProps) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(savePriceGuide, IDLE);
  const g = guide;
  const select = (name: string, label: string, options: readonly { value: string; label: string }[], value: string | null | undefined, hint?: string) => (
    <div className="grid gap-1">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={g?.id ?? ''} />
      <ActionMessage state={state} />

      <FormSection title={t('pricing.content')}>
        <LocalizedField name="title" label={t('pricing.name')} value={g?.title} state={state} required />
        <LocalizedField name="intro" label={t('pricing.intro')} value={g?.intro} state={state} multiline rows={2} />
        {select('serviceId', t('pricing.service'), [{ value: '', label: t('common.none') }, ...services.map((s) => ({ value: s.id, label: s.label }))], g?.service_id)}
      </FormSection>

      <FormSection title={t('pricing.rows')}>
        <LocalizedField name="rows" label={t('pricing.rows')} value={g ? { tr: formatPriceRows(g.rows, 'tr'), en: formatPriceRows(g.rows, 'en') } : null} state={state} multiline rows={6} hint={t('pricing.rowsHint')} />
        {materials.length > 0 ? (
          <details className="text-xs text-muted-foreground">
            <summary>{t('pricing.materialCodes')}</summary>
            <ul className="mt-2 grid gap-1 font-mono">
              {materials.map((m) => (
                <li key={m.id}>{m.label}</li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="text-xs text-muted-foreground">{t('pricing.noMaterials')}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {select('quantityUnit', t('pricing.quantityUnit'), UNITS.map((u) => ({ value: u, label: u })), g?.quantity_unit ?? 'ton')}
          <div className="grid gap-1">
            <Label htmlFor="f-quantityPresets">{t('pricing.presets')}</Label>
            <Input id="f-quantityPresets" name="quantityPresets" defaultValue={(g?.quantity_presets ?? [50, 100, 200]).join(', ')} />
            <p className="text-xs text-muted-foreground">{t('pricing.presetsHint')}</p>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-staleAfterDays">{t('pricing.staleAfterDays')}</Label>
            <Input id="f-staleAfterDays" name="staleAfterDays" type="number" min={1} max={3650} defaultValue={g?.stale_after_days ?? 90} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="vatIncluded" defaultChecked={g?.vat_included ?? false} /> {t('pricing.vatIncluded')}
        </label>
      </FormSection>

      <FormSection title={t('pricing.texts')}>
        <LocalizedField name="factors" label={t('pricing.factors')} value={g?.factors} state={state} multiline rows={6} />
        <LocalizedField name="formula" label={t('pricing.formula')} value={g?.formula} state={state} multiline rows={4} />
        <LocalizedField name="disclaimer" label={t('pricing.disclaimer')} value={g?.disclaimer} state={state} multiline rows={2} required hint={t('pricing.disclaimerHint')} />
      </FormSection>

      <FormSection title={t('services.seo')}>
        <LocalizedField name="seoTitle" label={t('services.seoTitle')} value={g?.seo_title} state={state} />
        <LocalizedField name="seoDescription" label={t('services.seoDescription')} value={g?.seo_description} state={state} multiline rows={2} />
        <LocalizedField name="focusKeyword" label={t('services.focusKeyword')} value={g?.focus_keyword} state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MediaPicker name="ogImageId" label={t('services.ogImage')} options={images} value={g?.og_image_id} folder="pricing" />
          <div className="grid gap-1">
            <Label htmlFor="f-canonicalUrl">{t('services.canonical')}</Label>
            <Input id="f-canonicalUrl" name="canonicalUrl" type="url" defaultValue={g?.canonical_url ?? ''} aria-invalid={state.fieldErrors?.['canonicalUrl'] ? 'true' : undefined} />
            <FieldError state={state} name="canonicalUrl" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="noindex" defaultChecked={g?.noindex ?? false} /> {t('services.noindex')}
        </label>
      </FormSection>

      <PublishFields state={state} value={g ? { status: g.status, published_locales: g.published_locales, reviewedEn: g.reviewedEn, slug: g.slug } : null} />

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

/** Malzeme fiyatı (yalnız admin): kod · ad · kategori · birim · fiyat · para birimi · geçerlilik · not. Değişiklik geçmişe düşer. */
export function MaterialPriceForm({ material }: { readonly material: AdminMaterialPrice | null }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveMaterialPrice, IDLE);
  const m = material;
  const field = (name: string, label: string, props: React.ComponentProps<typeof Input>) => (
    <div className="grid gap-1">
      <Label htmlFor={`m-${m?.id ?? 'new'}-${name}`}>{label}</Label>
      <Input id={`m-${m?.id ?? 'new'}-${name}`} name={name} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} {...props} />
      <FieldError state={state} name={name} />
    </div>
  );
  const sel = (name: string, label: string, options: readonly string[], value: string) => (
    <div className="grid gap-1">
      <Label htmlFor={`m-${m?.id ?? 'new'}-${name}`}>{label}</Label>
      <select id={`m-${m?.id ?? 'new'}-${name}`} name={name} defaultValue={value} className="h-9 rounded-md border bg-background px-2 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>
            {name === 'category' ? t(`materials.categories.${o as 'steel'}`) : o}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <form action={action} className="grid gap-3 rounded-md border p-4">
      <input type="hidden" name="id" value={m?.id ?? ''} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {field('code', t('materials.code'), { defaultValue: m?.code ?? '', required: true, placeholder: 'S235' })}
        {field('nameTr', t('materials.nameTr'), { defaultValue: m?.name['tr'] ?? '', required: true })}
        {field('nameEn', t('materials.nameEn'), { defaultValue: m?.name['en'] ?? '' })}
        {sel('category', t('materials.category'), CATEGORIES, m?.category ?? 'steel')}
        {sel('unit', t('materials.unit'), MATERIAL_UNITS, m?.unit ?? 'ton')}
        {field('unitPrice', t('materials.unitPrice'), { defaultValue: m ? String(m.unit_price) : '', required: true, inputMode: 'decimal' })}
        {sel('currency', t('materials.currency'), CURRENCIES, m?.currency ?? 'TRY')}
        {field('validFrom', t('materials.validFrom'), { type: 'date', defaultValue: m?.valid_from ?? '' })}
        <div className="sm:col-span-2 lg:col-span-4">{field('note', t('materials.note'), { defaultValue: m?.note ?? '' })}</div>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {m ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
