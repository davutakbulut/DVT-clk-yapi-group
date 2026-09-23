import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/i18n/alternates';
import { Link, redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

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
  const t = await getTranslations('Configurator');
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
              <TypeGlyph type={type.key} />
              <span className="configurator-type-title">{t(`types.${type.key}.title`)}</span>
              <span className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t(`types.${type.key}.body`)}</span>
              <span className="configurator-type-params">{t(`types.${type.key}.params`)}</span>
              <span className="configurator-type-cta">
                {t('chooser.open')} <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tür simgesi: çizgisel kesit şeması (görsel dosyası yok, Three.js yok — seçim sayfası hafif kalır). */
function TypeGlyph({ type }: { readonly type: (typeof TYPES)[number]['key'] }) {
  return (
    <svg viewBox="0 0 120 72" className="configurator-type-glyph" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {type === 'hall' ? (
        <>
          <path d="M10 66V34L60 12l50 22v32" />
          <path d="M10 34h100M35 66V23M60 66V12M85 66V23" opacity="0.55" />
          <path d="M4 66h112" />
        </>
      ) : type === 'multiStorey' ? (
        <>
          <path d="M26 66V8h68v58" />
          <path d="M26 22h68M26 36h68M26 50h68M48 8v58M72 8v58" opacity="0.55" />
          <path d="M14 66h92v4H14z" />
        </>
      ) : type === 'cladding' ? (
        <>
          <path d="M8 40L60 14l52 26" />
          <path d="M20 34v30M100 34v30M8 64h104" />
          <path d="M30 29l-6 12M44 22l-8 16M58 15l-9 20M72 16l6 14M86 23l6 12M100 30l6 10" opacity="0.55" />
        </>
      ) : type === 'mezzanine' ? (
        <>
          <path d="M10 30h100" />
          <path d="M18 30v36M50 30v36M82 30v36M110 30v36" />
          <path d="M10 42h100M10 54h100" opacity="0.55" />
          <path d="M4 66h112" />
        </>
      ) : type === 'fence' ? (
        <>
          <path d="M14 66V22M46 66V22M78 66V22M110 66V22" />
          <path d="M8 32h108M8 56h108" />
          <path d="M22 32v24M30 32v24M38 32v24M54 32v24M62 32v24M70 32v24M86 32v24M94 32v24M102 32v24" opacity="0.55" />
          <path d="M4 66h116" />
        </>
      ) : (
        <>
          <path d="M14 10h92v56H14z" />
          <path d="M14 38h92M46 10v56M78 10v56" opacity="0.55" />
          <path d="M30 10v56M62 10v56M94 10v56" opacity="0.3" />
        </>
      )}
    </svg>
  );
}
