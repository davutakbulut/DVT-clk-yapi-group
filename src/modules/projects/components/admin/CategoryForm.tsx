'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, LocalizedField } from '@/modules/admin-shell';
import { saveCategory } from '../../actions';
import type { AdminCategory } from '../../data/adminProjectsRepository';

/** Kategori: tek kartta düzenle (ya da yeni). Slug TR boşsa addan üretilir (K-09), EN elle. */
export function CategoryForm({ category }: { readonly category: AdminCategory | null }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveCategory, IDLE);
  const k = category?.id ?? 'new';
  return (
    <form action={action} className="grid gap-4 rounded-md border bg-card p-4">
      <input type="hidden" name="id" value={category?.id ?? ''} />
      <ActionMessage state={state} />
      <LocalizedField name="name" label={t('projectCategories.name')} value={category?.name} state={state} required />
      <LocalizedField name="description" label={t('projectCategories.description')} value={category?.description} state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`c-${k}-slugTr`}>{t('form.slugTr')}</Label>
          <Input id={`c-${k}-slugTr`} name="slugTr" defaultValue={category?.slug['tr'] ?? ''} placeholder={t('form.slugAuto')} />
          <FieldError state={state} name="slugTr" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`c-${k}-slugEn`}>{t('form.slugEn')}</Label>
          <Input id={`c-${k}-slugEn`} name="slugEn" defaultValue={category?.slug['en'] ?? ''} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={category?.is_active ?? true} /> {t('projectCategories.active')}
      </label>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {category ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
