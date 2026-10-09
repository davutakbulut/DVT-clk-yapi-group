'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FormSection, LocalizedField } from '@/modules/admin-shell';
import { saveHomeCopy } from '../../actions';
import { itemsToLines, type HomePageCopy } from '../../domain/pageCopy';

/** Ana sayfa bölüm metinleri (K-111). Hero video/poster ve ana başlık `HeroForm`'da; burada bölüm başlıkları, kartlar ve CTA'lar. */
export function HomePageSettingsForm({ copy }: { readonly copy: HomePageCopy }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveHomeCopy, IDLE);
  const lines = (items: readonly { title: Record<string, string>; text: Record<string, string> }[]) => ({ tr: itemsToLines(items, 'tr'), en: itemsToLines(items, 'en') });
  const paths = { tr: copy.hero.paths.map((p) => [p.tag['tr'] ?? '', p.title['tr'] ?? '', p.text['tr'] ?? ''].join(' | ')).join('\n'), en: copy.hero.paths.map((p) => [p.tag['en'] ?? '', p.title['en'] ?? '', p.text['en'] ?? ''].join(' | ')).join('\n') };
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('homePage.hero')}>
        <p className="text-xs text-muted-foreground">{t('homePage.heroHint')}</p>
        <LocalizedField name="hEyebrow" label={t('homePage.eyebrow')} value={copy.hero.eyebrow} state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <LocalizedField name="hMaterialsCta" label={t('homePage.materialsCta')} value={copy.hero.materialsCta} state={state} />
          <LocalizedField name="hServicesCta" label={t('homePage.servicesCta')} value={copy.hero.servicesCta} state={state} />
          <LocalizedField name="hNote" label={t('homePage.note')} value={copy.hero.note} state={state} />
          <LocalizedField name="hNoteLink" label={t('homePage.noteLink')} value={copy.hero.noteLink} state={state} />
        </div>
        <LocalizedField name="hPaths" label={t('homePage.paths')} value={paths} state={state} multiline rows={3} />
      </FormSection>
      <FormSection title={t('homePage.materials')}>
        <p className="text-xs text-muted-foreground">{t('homePage.materialsHint')}</p>
        <LocalizedField name="mTitle" label={t('homePage.sectionTitle')} value={copy.materials.title} state={state} multiline rows={2} />
        <LocalizedField name="mLede" label={t('homePage.sectionLede')} value={copy.materials.lede} state={state} multiline rows={3} />
        <LocalizedField name="mWhy" label={t('homePage.why')} value={lines(copy.materials.why)} state={state} multiline rows={4} />
        <div className="grid gap-3 sm:grid-cols-3">
          <LocalizedField name="mCtaTitle" label={t('homePage.ctaTitle')} value={copy.materials.cta.title} state={state} />
          <LocalizedField name="mCtaText" label={t('homePage.ctaText')} value={copy.materials.cta.text} state={state} multiline rows={3} />
          <LocalizedField name="mCtaButton" label={t('homePage.ctaButton')} value={copy.materials.cta.button} state={state} />
        </div>
      </FormSection>
      <FormSection title={t('homePage.services')}>
        <p className="text-xs text-muted-foreground">{t('homePage.servicesHint')}</p>
        <LocalizedField name="sTitle" label={t('homePage.sectionTitle')} value={copy.services.title} state={state} multiline rows={2} />
        <LocalizedField name="sLede" label={t('homePage.sectionLede')} value={copy.services.lede} state={state} multiline rows={3} />
      </FormSection>
      <FormSection title={t('homePage.configurator')}>
        <LocalizedField name="cTitle" label={t('homePage.sectionTitle')} value={copy.configurator.title} state={state} multiline rows={2} />
        <LocalizedField name="cLede" label={t('homePage.sectionLede')} value={copy.configurator.lede} state={state} multiline rows={3} />
        <LocalizedField name="cButton" label={t('homePage.ctaButton')} value={copy.configurator.button} state={state} />
      </FormSection>
      <FormSection title={t('homePage.projects')}>
        <LocalizedField name="pTitle" label={t('homePage.sectionTitle')} value={copy.projects.title} state={state} />
        <div className="grid gap-3 sm:grid-cols-3">
          <LocalizedField name="pCtaKicker" label={t('homePage.ctaKicker')} value={copy.projects.cta.kicker} state={state} />
          <LocalizedField name="pCtaTitle" label={t('homePage.ctaTitle')} value={copy.projects.cta.title} state={state} />
          <LocalizedField name="pCtaText" label={t('homePage.ctaText')} value={copy.projects.cta.text} state={state} multiline rows={3} />
        </div>
      </FormSection>
      <FormSection title={t('homePage.contact')}>
        <LocalizedField name="kTitle" label={t('homePage.sectionTitle')} value={copy.contact.title} state={state} />
        <LocalizedField name="kLede" label={t('homePage.sectionLede')} value={copy.contact.lede} state={state} multiline rows={3} />
      </FormSection>
      <div><Button type="submit" size="sm" disabled={pending}>{t('common.save')}</Button></div>
    </form>
  );
}
