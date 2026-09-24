'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FormSection, LocalizedField } from '@/modules/admin-shell';
import { savePagesCopy } from '../../actions';
import { itemsToLines, type ProjectsPageCopy, type ServicesPageCopy } from '../../domain/pageCopy';

/** Hizmetler & Projeler sayfa metinleri (K-106): liste alanları "Başlık | Metin" satırları (süreç adımlarıyla aynı sözleşme). */
export function PagesSettingsForm({ services, projects }: { readonly services: ServicesPageCopy; readonly projects: ProjectsPageCopy }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(savePagesCopy, IDLE);
  const lines = (items: readonly { title: Record<string, string>; text: Record<string, string> }[]) => ({ tr: itemsToLines(items, 'tr'), en: itemsToLines(items, 'en') });
  const groups = services.groups.map((g) => ({ title: g.title, text: g.lede }));
  const tools = { tr: services.tools.items.map((i) => [i.title['tr'] ?? '', i.text['tr'] ?? '', i.cta['tr'] ?? ''].join(' | ')).join('\n'), en: services.tools.items.map((i) => [i.title['en'] ?? '', i.text['en'] ?? '', i.cta['en'] ?? ''].join(' | ')).join('\n') };
  const faq = lines(services.faq.items.map((f) => ({ title: f.q, text: f.a })));
  const stats = lines(projects.stats.map((s) => ({ title: s.value, text: s.label })));
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('pagesSettings.services')}>
        <LocalizedField name="sHeroTitle" label={t('pagesSettings.heroTitle')} value={services.hero.title} state={state} multiline rows={3} required />
        <LocalizedField name="sHeroLede" label={t('pagesSettings.heroLede')} value={services.hero.lede} state={state} multiline rows={3} />
        <LocalizedField name="sGroups" label={t('pagesSettings.groups')} value={lines(groups)} state={state} multiline rows={4} />
        <LocalizedField name="sWhyTitle" label={t('pagesSettings.whyTitle')} value={services.why.title} state={state} />
        <LocalizedField name="sWhyLede" label={t('pagesSettings.whyLede')} value={services.why.lede ?? null} state={state} />
        <LocalizedField name="sWhy" label={t('pagesSettings.why')} value={lines(services.why.items)} state={state} multiline rows={5} />
        <LocalizedField name="sStepsTitle" label={t('pagesSettings.stepsTitle')} value={services.steps.title} state={state} />
        <LocalizedField name="sSteps" label={t('pagesSettings.steps')} value={lines(services.steps.items)} state={state} multiline rows={5} />
        <LocalizedField name="sToolsTitle" label={t('pagesSettings.toolsTitle')} value={services.tools.title} state={state} />
        <LocalizedField name="sToolsLede" label={t('pagesSettings.toolsLede')} value={services.tools.lede ?? null} state={state} />
        <LocalizedField name="sTools" label={t('pagesSettings.tools')} value={tools} state={state} multiline rows={4} />
        <LocalizedField name="sFaqTitle" label={t('pagesSettings.faqTitle')} value={services.faq.title} state={state} />
        <LocalizedField name="sFaq" label={t('pagesSettings.faq')} value={faq} state={state} multiline rows={6} />
        <LocalizedField name="sCtaTitle" label={t('pagesSettings.ctaTitle')} value={services.cta.title} state={state} multiline rows={2} />
        <LocalizedField name="sCtaLede" label={t('pagesSettings.ctaLede')} value={services.cta.lede} state={state} multiline rows={2} />
      </FormSection>
      <FormSection title={t('pagesSettings.projects')}>
        <LocalizedField name="pHeroTitle" label={t('pagesSettings.heroTitle')} value={projects.hero.title} state={state} multiline rows={3} required />
        <LocalizedField name="pHeroLede" label={t('pagesSettings.heroLede')} value={projects.hero.lede} state={state} multiline rows={3} />
        <LocalizedField name="pStats" label={t('pagesSettings.stats')} value={stats} state={state} multiline rows={4} />
        <LocalizedField name="pStepsTitle" label={t('pagesSettings.stepsTitle')} value={projects.steps.title} state={state} />
        <LocalizedField name="pSteps" label={t('pagesSettings.steps')} value={lines(projects.steps.items)} state={state} multiline rows={5} />
        <LocalizedField name="pEmptyTitle" label={t('pagesSettings.emptyTitle')} value={projects.empty.title} state={state} />
        <LocalizedField name="pEmptyText" label={t('pagesSettings.emptyText')} value={projects.empty.text} state={state} multiline rows={2} />
        <LocalizedField name="pCtaTitle" label={t('pagesSettings.ctaTitle')} value={projects.cta.title} state={state} multiline rows={2} />
        <LocalizedField name="pCtaLede" label={t('pagesSettings.ctaLede')} value={projects.cta.lede} state={state} multiline rows={2} />
      </FormSection>
      <div><Button type="submit" size="sm" disabled={pending}>{t('common.save')}</Button></div>
    </form>
  );
}
