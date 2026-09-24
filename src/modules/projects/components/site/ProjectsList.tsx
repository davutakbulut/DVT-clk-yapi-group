import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { pickLocale } from '@/lib/localized';
import { EMPTY_PROJECTS_PAGE, getPublicSettings } from '@/modules/site-settings';
import { Container } from '@/ui/Container';
import { CtaBand, NumberedSteps, PageHero } from '@/ui/PageSections';
import { getCachedProjectCategories, getCachedProjectList } from '../../data/projectsRepository';
import { ProjectsBrowser } from './ProjectsBrowser';

interface Props {
  readonly locale: string;
  /** Kategori sayfası: o kategori seçili başlar; başlık kategori adı. */
  readonly categorySlug?: string;
}

/** /projeler ve /projeler/kategori/[slug] (K-106): hero + sayaçlar · tarayıcı (çipler, durum, kartlar) · süreç · CTA. Metinler site_settings 'projects.page'. */
export async function ProjectsList({ locale, categorySlug }: Props) {
  const [list, cats, env, t, settings] = await Promise.all([getCachedProjectList(locale), getCachedProjectCategories(locale), readSupabasePublicEnv(), getTranslations('Projects'), getPublicSettings()]);
  if (!list.ok) logger.warn(list.error.message, { module: 'projects', code: list.error.code });
  const categories = cats.ok ? cats.data : [];
  const items = list.ok ? list.data : [];
  const current = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
  const copy = settings.projectsPage ?? EMPTY_PROJECTS_PAGE;
  const L = (v: Readonly<Record<string, string>>) => pickLocale(v, locale, { fallback: 'tr' });
  const stats = copy.stats.map((s) => ({ value: L(s.value), label: L(s.label) })).filter((s) => s.value);
  const steps = copy.steps.items.map((s) => ({ title: L(s.title), text: L(s.text) })).filter((s) => s.title);
  return (
    <Container as="div" className="pb-[var(--section-y)]">
      <PageHero eyebrow={t('kicker')} title={current ? current.name : L(copy.hero.title) || t('title')} lede={current ? current.description || undefined : L(copy.hero.lede) || t('lead')}>
        {stats.length > 0 ? (
          <dl className="hero-stats" aria-label={t('stats')}>
            {stats.map((s) => <div key={s.label}><dd><b>{s.value}</b></dd><dt>{s.label}</dt></div>)}
          </dl>
        ) : null}
      </PageHero>
      <ProjectsBrowser locale={locale} supabaseUrl={env.ok ? env.data.url : null} items={items} categories={categories} initialCategory={categorySlug} emptyTitle={L(copy.empty.title) || t('empty')} emptyText={L(copy.empty.text)} />
      <NumberedSteps id="surec" title={L(copy.steps.title)} items={steps} />
      <CtaBand title={L(copy.cta.title)} lede={L(copy.cta.lede)} primaryLabel={t('ctaButton')} phone={settings.contact.phone} phoneLabel={settings.contact.phone} />
    </Container>
  );
}
