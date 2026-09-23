'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, PublishFields, type MediaOption } from '@/modules/admin-shell';
import { saveProduct, saveProductCategory } from '../../actions';
import type { AdminProduct, AdminProductCategory, Choice } from '../../data/adminProductsRepository';
import { formatFacts } from '../../domain/productConfig';
import { formatSpecs, formatVariants } from '../../domain/productLines';
import { MediaPicker } from '@/modules/media';

const DOC_TYPES = ['datasheet', 'certificate', 'installation_guide', 'other'] as const;

interface ProductFormProps {
  readonly product: AdminProduct | null;
  readonly images: readonly MediaOption[];
  readonly documents: readonly MediaOption[];
  readonly categories: readonly Choice[];
  readonly services: readonly Choice[];
}

export function ProductForm({ product, images, documents, categories, services }: ProductFormProps) {
  const t = useTranslations('Admin');
  const tp = useTranslations('Products');
  const [state, action, pending] = useActionState(saveProduct, IDLE);
  const select = (name: string, label: string, options: readonly Choice[], value: string | null | undefined) => (
    <div className="grid gap-1">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
        <option value="">{t('common.none')}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
  const docRows = [...(product?.documents ?? []), ...Array.from({ length: Math.max(0, 3 - (product?.documents.length ?? 0)) }, () => null)].slice(0, 6);

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={product?.id ?? ''} />
      <ActionMessage state={state} />
      <FormSection title={t('products.content')}>
        <LocalizedField name="name" label={t('products.name')} value={product?.name} state={state} required />
        <LocalizedField name="short" label={t('products.short')} value={product?.short_description} state={state} multiline rows={2} />
        <LocalizedField name="description" label={t('products.description')} value={product?.description} state={state} multiline rows={10} />
        <LocalizedField name="usage" label={t('products.usage')} value={product?.usage_areas} state={state} multiline rows={4} />
        <div className="grid gap-3 sm:grid-cols-2">
          {select('categoryId', t('products.category'), categories, product?.category_id)}
          {select('serviceId', t('products.service'), services, product?.service_id)}
        </div>
      </FormSection>
      <FormSection title={t('products.selector')}>
        <p className="text-xs text-muted-foreground">{t('products.selectorHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="f-grades">{t('products.grades')}</Label>
            <Input id="f-grades" name="grades" defaultValue={product?.options.grades.join(', ') ?? ''} placeholder="S235JRH, S275J0H, S355J2H" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-lengthsM">{t('products.lengths')}</Label>
            <Input id="f-lengthsM" name="lengthsM" defaultValue={product?.options.lengthsM.join(', ') ?? ''} placeholder="6, 12" inputMode="decimal" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-unit">{t('products.unit')}</Label>
            <Input id="f-unit" name="unit" defaultValue={product?.options.unit ?? ''} placeholder={tp('unitDefault')} maxLength={20} />
          </div>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="customLength" defaultChecked={product?.options.customLength ?? false} /> {t('products.customLength')}
          </label>
        </div>
        <LocalizedField name="facts" label={t('products.facts')} value={product ? { tr: formatFacts(product.facts, 'tr'), en: formatFacts(product.facts, 'en') } : null} state={state} multiline rows={3} hint={t('products.factsHint')} />
      </FormSection>
      <FormSection title={t('products.specs')}>
        <LocalizedField name="specs" label={t('products.specs')} value={product ? { tr: formatSpecs(product.specs, 'tr'), en: formatSpecs(product.specs, 'en') } : null} state={state} multiline rows={6} hint={t('products.specsHint')} />
        <div className="grid gap-1">
          <Label htmlFor="f-variants">{t('products.variants')}</Label>
          <Textarea id="f-variants" name="variants" rows={10} defaultValue={product ? formatVariants(product.variants) : ''} className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">{t('products.variantsHint')}</p>
        </div>
      </FormSection>
      <FormSection title={t('products.media')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <MediaPicker name="coverImageId" label={t('products.cover')} options={images} value={product?.cover_image_id} folder="products" />
          <MediaPicker name="ogImageId" label={t('products.ogImage')} options={images} value={product?.og_image_id} folder="products" />
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="f-gallery">{t('products.gallery')}</Label>
            <select id="f-gallery" name="gallery" multiple size={6} defaultValue={product?.gallery ? [...product.gallery] : []} className="rounded-md border bg-background px-2 py-1 text-sm">
              {images.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.path}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t('products.galleryHint')}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={product?.is_featured ?? false} /> {t('form.featured')}
        </label>
      </FormSection>
      <FormSection title={t('products.documents')}>
        <div className="grid gap-3">
          {docRows.map((doc, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[2fr_2fr_2fr_1fr]">
              <MediaPicker name={`docMedia_${i}`} label={`${t('products.docMedia')} ${i + 1}`} options={documents} value={doc?.media_id} folder="documents" kind="document" />
              <div className="grid gap-1">
                <Label htmlFor={`f-docTitleTr_${i}`}>{t('products.docTitle')} (TR)</Label>
                <Input id={`f-docTitleTr_${i}`} name={`docTitleTr_${i}`} defaultValue={doc?.title['tr'] ?? ''} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`f-docTitleEn_${i}`}>{t('products.docTitle')} (EN)</Label>
                <Input id={`f-docTitleEn_${i}`} name={`docTitleEn_${i}`} defaultValue={doc?.title['en'] ?? ''} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`f-docType_${i}`}>{t('products.docType')}</Label>
                <select id={`f-docType_${i}`} name={`docType_${i}`} defaultValue={doc?.doc_type ?? 'datasheet'} className="h-9 rounded-md border bg-background px-2 text-sm">
                  {DOC_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {tp(`docTypes.${d}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </FormSection>
      <FormSection title={t('products.seo')}>
        <LocalizedField name="seoTitle" label={t('products.seoTitle')} value={product?.seo_title} state={state} />
        <LocalizedField name="seoDescription" label={t('products.seoDescription')} value={product?.seo_description} state={state} multiline rows={2} />
        <LocalizedField name="focusKeyword" label={t('products.focusKeyword')} value={product?.focus_keyword} state={state} />
        <div className="grid gap-1 sm:max-w-md">
          <Label htmlFor="f-canonicalUrl">{t('products.canonical')}</Label>
          <Input id="f-canonicalUrl" name="canonicalUrl" type="url" defaultValue={product?.canonical_url ?? ''} />
          <FieldError state={state} name="canonicalUrl" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="noindex" defaultChecked={product?.noindex ?? false} /> {t('products.noindex')}
        </label>
      </FormSection>
      <PublishFields state={state} value={product ? { status: product.status, published_locales: product.published_locales, reviewedEn: product.reviewedEn, slug: product.slug } : null} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

export function ProductCategoryForm({ category, categories, images }: { readonly category: AdminProductCategory | null; readonly categories: readonly AdminProductCategory[]; readonly images: readonly MediaOption[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveProductCategory, IDLE);
  const k = category?.id ?? 'new';
  return (
    <form action={action} className="grid gap-4 rounded-md border bg-card p-4">
      <input type="hidden" name="id" value={category?.id ?? ''} />
      <ActionMessage state={state} />
      <LocalizedField name="name" label={t('productCategories.name')} value={category?.name} state={state} required />
      <LocalizedField name="description" label={t('productCategories.description')} value={category?.description} state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label htmlFor={`c-${k}-parent`}>{t('productCategories.parent')}</Label>
          <select id={`c-${k}-parent`} name="parentId" defaultValue={category?.parent_id ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">{t('productCategories.root')}</option>
            {categories
              .filter((c) => c.id !== category?.id && !c.parent_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name['tr']}
                </option>
              ))}
          </select>
          <FieldError state={state} name="parentId" />
        </div>
        <MediaPicker name="imageId" label={t('productCategories.image')} options={images} value={category?.image_id} folder="products" />
        <div className="grid gap-1">
          <Label htmlFor={`c-${k}-slugTr`}>{t('form.slugTr')}</Label>
          <Input id={`c-${k}-slugTr`} name="slugTr" defaultValue={category?.slug['tr'] ?? ''} placeholder={t('form.slugAuto')} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`c-${k}-slugEn`}>{t('form.slugEn')}</Label>
          <Input id={`c-${k}-slugEn`} name="slugEn" defaultValue={category?.slug['en'] ?? ''} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={category?.is_active ?? true} /> {t('productCategories.active')}
      </label>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {category ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
