'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { saveGooglePlaceId, saveTestimonial, syncGoogleReviewsNow } from '../../actions';
import type { AdminTestimonial, Choice } from '../../data/adminTestimonialsRepository';

interface FormProps {
  readonly testimonial: AdminTestimonial | null;
  readonly services: readonly Choice[];
  readonly projects: readonly Choice[];
  readonly products: readonly Choice[];
}

/** Elle yorum (manual) oluştur/düzenle. Google kaynaklı satırda metin alanları salt-okunur: yalnız durum, öne çıkan ve bağlantılar. */
export function TestimonialForm({ testimonial, services, projects, products }: FormProps) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveTestimonial, IDLE);
  const m = testimonial;
  const readOnly = m?.source === 'google';
  const key = m?.id ?? 'new';
  const select = (name: string, label: string, options: readonly Choice[], value: string | null | undefined) => (
    <div className="grid gap-1">
      <Label htmlFor={`t-${key}-${name}`}>{label}</Label>
      <select id={`t-${key}-${name}`} name={name} defaultValue={value ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
        <option value="">{t('common.none')}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={m?.id ?? ''} />
      <ActionMessage state={state} />
      {readOnly ? <p className="text-xs text-muted-foreground">{t('testimonials.googleReadOnly')}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`t-${key}-authorName`}>{t('testimonials.author')}</Label>
          <Input id={`t-${key}-authorName`} name="authorName" defaultValue={m?.author_name ?? ''} required readOnly={readOnly} aria-invalid={state.fieldErrors?.['authorName'] ? 'true' : undefined} />
          <FieldError state={state} name="authorName" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`t-${key}-company`}>{t('testimonials.company')}</Label>
          <Input id={`t-${key}-company`} name="company" defaultValue={m?.company ?? ''} readOnly={readOnly} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`t-${key}-rating`}>{t('testimonials.rating')}</Label>
          <select id={`t-${key}-rating`} name="rating" defaultValue={String(m?.rating ?? 5)} disabled={readOnly} className="h-9 rounded-md border bg-background px-2 text-sm">
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} ★
              </option>
            ))}
          </select>
          {readOnly ? <input type="hidden" name="rating" value={m?.rating ?? 5} /> : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`t-${key}-authorTitleTr`}>{t('testimonials.authorTitleTr')}</Label>
          <Input id={`t-${key}-authorTitleTr`} name="authorTitleTr" defaultValue={m?.author_title['tr'] ?? ''} readOnly={readOnly} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`t-${key}-authorTitleEn`}>{t('testimonials.authorTitleEn')}</Label>
          <Input id={`t-${key}-authorTitleEn`} name="authorTitleEn" defaultValue={m?.author_title['en'] ?? ''} readOnly={readOnly} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`t-${key}-reviewedOn`}>{t('testimonials.reviewedOn')}</Label>
          <Input id={`t-${key}-reviewedOn`} name="reviewedOn" type="date" defaultValue={m?.reviewed_on ?? ''} readOnly={readOnly} />
        </div>
        <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
          <Label htmlFor={`t-${key}-bodyTr`}>{t('testimonials.bodyTr')}</Label>
          <Textarea id={`t-${key}-bodyTr`} name="bodyTr" rows={3} defaultValue={m?.body['tr'] ?? ''} readOnly={readOnly} aria-invalid={state.fieldErrors?.['bodyTr'] ? 'true' : undefined} />
          <FieldError state={state} name="bodyTr" />
        </div>
        <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
          <Label htmlFor={`t-${key}-bodyEn`}>{t('testimonials.bodyEn')}</Label>
          <Textarea id={`t-${key}-bodyEn`} name="bodyEn" rows={3} defaultValue={m?.body['en'] ?? ''} readOnly={readOnly} />
        </div>
        {select('serviceId', t('testimonials.service'), services, m?.service_id)}
        {select('projectId', t('testimonials.project'), projects, m?.project_id)}
        {select('productId', t('testimonials.product'), products, m?.product_id)}
        <div className="grid gap-1">
          <Label htmlFor={`t-${key}-status`}>{t('form.status')}</Label>
          <select id={`t-${key}-status`} name="status" defaultValue={m?.status ?? 'published'} className="h-9 rounded-md border bg-background px-2 text-sm">
            {(['pending', 'published', 'rejected', 'archived'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`testimonials.statuses.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={m?.is_featured ?? false} /> {t('form.featured')}
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="isVerified" defaultChecked={m?.is_verified ?? false} disabled={readOnly} /> {t('testimonials.verified')}
        </label>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {m ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}

/** Google Places: Place ID ayarı + "şimdi senkronla" (yalnız admin). API anahtarı ortam değişkeninde. */
export function GoogleSyncPanel({ placeId, apiKeyConfigured }: { readonly placeId: string; readonly apiKeyConfigured: boolean }) {
  const t = useTranslations('Admin');
  const [saveState, saveAction, saving] = useActionState(saveGooglePlaceId, IDLE);
  const [syncState, syncAction, syncing] = useActionState(syncGoogleReviewsNow, IDLE);
  return (
    <div className="grid gap-4 rounded-md border p-4">
      <form action={saveAction} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-1">
          <Label htmlFor="g-placeId">{t('testimonials.placeId')}</Label>
          <Input id="g-placeId" name="placeId" defaultValue={placeId} placeholder="ChIJ…" aria-invalid={saveState.fieldErrors?.['placeId'] ? 'true' : undefined} />
          <p className="text-xs text-muted-foreground">{t('testimonials.placeIdHint')}</p>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={saving}>
          {t('common.save')}
        </Button>
        <div className="sm:col-span-2">
          <ActionMessage state={saveState} />
        </div>
      </form>
      <form action={syncAction} className="grid gap-2">
        <p className="text-xs text-muted-foreground">{apiKeyConfigured ? t('testimonials.apiKeyOk') : t('testimonials.apiKeyMissing')}</p>
        <div>
          <Button type="submit" size="sm" disabled={syncing || !apiKeyConfigured || !placeId}>
            {syncing ? t('testimonials.syncing') : t('testimonials.syncNow')}
          </Button>
        </div>
        <ActionMessage state={syncState} />
        {syncState.done && syncState.data ? (
          <p className="text-sm">{t('testimonials.syncResult', { fetched: syncState.data['fetched'] ?? '0', inserted: syncState.data['inserted'] ?? '0', updated: syncState.data['updated'] ?? '0' })}</p>
        ) : null}
      </form>
    </div>
  );
}
