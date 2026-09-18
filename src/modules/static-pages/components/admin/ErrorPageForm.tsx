'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { saveErrorPage } from '../../actions';
import type { AdminSystemPage } from '../../data/adminStaticPageRepository';

export function ErrorPageForm({ page }: { readonly page: AdminSystemPage }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveErrorPage, IDLE);
  const k = page.page_key;

  return (
    <form action={action} className="grid gap-4 rounded-md border bg-card p-4">
      <input type="hidden" name="pageKey" value={k} />
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">{k}</h2>
      {state.error && state.error !== 'validation' ? <p role="alert" className="text-sm text-destructive">{t(`errors.${state.error}`)}</p> : null}
      {state.error === 'validation' ? <p role="alert" className="text-sm text-destructive">{t('errors.validation')}</p> : null}
      {state.done ? <p role="status" className="text-sm text-green-700">{t('common.saved')}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${k}-titleTr`}>{t('errorPages.pageTitle')} (TR)</Label>
          <Input id={`${k}-titleTr`} name="titleTr" defaultValue={page.title['tr'] ?? ''} required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${k}-titleEn`}>{t('errorPages.pageTitle')} (EN)</Label>
          <Input id={`${k}-titleEn`} name="titleEn" defaultValue={page.title['en'] ?? ''} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${k}-bodyTr`}>{t('errorPages.body')} (TR)</Label>
          <Textarea id={`${k}-bodyTr`} name="bodyTr" rows={3} defaultValue={page.body['tr'] ?? ''} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${k}-bodyEn`}>{t('errorPages.body')} (EN)</Label>
          <Textarea id={`${k}-bodyEn`} name="bodyEn" rows={3} defaultValue={page.body['en'] ?? ''} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="reviewedEn" defaultChecked={page.reviewedEn} /> {t('errorPages.reviewedEn')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="publishEn" defaultChecked={page.published_locales.includes('en')} /> {t('errorPages.publishedEn')}
        </label>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
