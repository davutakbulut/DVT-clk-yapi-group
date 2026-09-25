import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/i18n/alternates';
import { Link, redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { CHOOSER_TO_KEY, getCachedGuideList } from '@/modules/configurator-pages';
import { ConfiguratorGlyph } from '@/ui/ConfiguratorGlyph';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | undefined>>;
}

// Yeni tür eklemek: buraya bir satır + route + Configurator.types.<key> mesajları (K-80)
const TYPES = [
  { key: 'hall', href: '/configurator/hall' },
  { key: 'multiStorey', href: '/configurator/multi-storey' },
  // K-100: ürün/hizmet kataloğuna bağlı dört metraj konfigüratörü
  { key: 'cladding', href: '/configurator/cladding' },
  { key: 'mezzanine', href: '/configurator/mezzanine' },
  { key: 'fence', href: '/configurator/fence' },
  { key: 'drywall', href: '/configurator/drywall' },
] as const;
const LEGACY_HALL_KEYS = ['w', 'l', 'e', 'r', 'b'];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Configurator' });
  return { title: t('title'), description: t('lead'), alternates: buildAlternates(locale as Locale, { tr: '/configurator', en: '/configurator' }) };
}

/** Konfigüratör seçimi: menüden gelen ziyaretçi önce yapı türünü seçer. Eski paylaşım bağlantıları (?w=&l=&e=…) hol konfigüratörüne yönlenir. */
export default async function ConfiguratorChooserPage({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale as Locale);
  if (LEGACY_HALL_KEYS.some((k) => sp[k] !== undefined)) {
    const query: Record<string, string> = {};
    for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') query[k] = v;
    redirect({ href: { pathname: '/configurator/hall', query }, locale: locale as Locale });
  }
  const [t, tg, guides] = await Promise.all([getTranslations('Configurator'), getTranslations('ConfiguratorGuide'), getCachedGuideList(locale)]);
  const guideSlug = (key: string) => (guides.ok ? guides.data.find((g) => g.key === CHOOSER_TO_KEY[key])?.slug : undefined);
  return (
    <div className="configurator-chooser">
      <div className="grid gap-3">
        <p className="label-mono text-[var(--color-accent-on-dark)]">{t('chooser.kicker')}</p>
        <h1 className="text-[length:var(--fs-h2)]">{t('chooser.title')}</h1>
        <p className="max-w-[var(--prose-max)] text-[var(--color-text-muted)]">{t('chooser.lead')}</p>
      </div>
      <ul className="configurator-chooser-grid">
        {TYPES.map((type, i) => (
          <li key={type.key}>
            <Link href={type.href} className="configurator-type" data-type={type.key}>
              <span className="label-mono text-[var(--color-accent-on-dark)]">{String(i + 1).padStart(2, '0')}</span>
              <ConfiguratorGlyph type={type.key} />
              <span className="configurator-type-title">{t(`types.${type.key}.title`)}</span>
              <span className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t(`types.${type.key}.body`)}</span>
              <span className="configurator-type-params">{t(`types.${type.key}.params`)}</span>
              <span className="configurator-type-cta">
                {t('chooser.open')} <span aria-hidden="true">→</span>
              </span>
            </Link>
            {guideSlug(type.key) ? (
              <Link href={{ pathname: '/configurator-guide/[slug]', params: { slug: guideSlug(type.key)! } }} className="configurator-type-guide">{tg('howItWorks')} →</Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
