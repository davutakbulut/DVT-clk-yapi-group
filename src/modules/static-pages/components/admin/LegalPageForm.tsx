'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FormSection, LocalizedField, PublishFields } from '@/modules/admin-shell';
import { saveLegalPage } from '../../actions';
import type { AdminLegalPage } from '../../data/adminStaticPageRepository';

export function LegalPageForm({ page }: { readonly page: AdminLegalPage }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveLegalPage, IDLE);
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="pageKey" value={page.page_key} />
      <ActionMessage state={state} />
      <FormSection title={page.title['tr'] || page.page_key}>
        <p className="text-xs text-muted-foreground">{t('legalPages.translationDisabled')}</p>
        <LocalizedField name="title" label={t('legalPages.pageTitle')} value={page.title} state={state} required />
        <LocalizedField name="body" label={t('legalPages.body')} value={page.body} state={state} multiline rows={24} />
      </FormSection>
      <PublishFields withSlug={false} state={state} value={{ status: page.status, published_locales: page.published_locales, reviewedEn: page.reviewedEn }} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
