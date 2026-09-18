'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, LocalizedField } from '@/modules/admin-shell';
import { saveTaxonomy } from '../../actions';
import type { Taxonomy } from '../../data/adminBlogRepository';

interface Props {
  readonly table: 'blog_categories' | 'blog_tags';
  readonly item: Taxonomy | null;
}

/** Kategori (açıklama + aktif) ya da etiket (ad + slug) formu. */
export function TaxonomyForm({ table, item }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveTaxonomy, IDLE);
  const k = `${table}-${item?.id ?? 'new'}`;
  return (
    <form action={action} className="grid gap-4 rounded-md border bg-card p-4">
      <input type="hidden" name="id" value={item?.id ?? ''} />
      <input type="hidden" name="table" value={table} />
      <ActionMessage state={state} />
      <LocalizedField name="name" label={t('blogTaxonomy.name')} value={item?.name} state={state} required />
      {table === 'blog_categories' ? <LocalizedField name="description" label={t('blogTaxonomy.description')} value={item?.description} state={state} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${k}-slugTr`}>{t('form.slugTr')}</Label>
          <Input id={`${k}-slugTr`} name="slugTr" defaultValue={item?.slug['tr'] ?? ''} placeholder={t('form.slugAuto')} />
          <FieldError state={state} name="slugTr" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${k}-slugEn`}>{t('form.slugEn')}</Label>
          <Input id={`${k}-slugEn`} name="slugEn" defaultValue={item?.slug['en'] ?? ''} />
        </div>
      </div>
      {table === 'blog_categories' ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={item?.is_active ?? true} /> {t('blogTaxonomy.active')}
        </label>
      ) : (
        <input type="hidden" name="isActive" value="on" />
      )}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {item ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
