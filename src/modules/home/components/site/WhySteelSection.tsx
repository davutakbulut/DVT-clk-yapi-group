import { getTranslations } from 'next-intl/server';
import { pickLocale } from '@/lib/localized';
import { getPublicSettings } from '@/modules/site-settings';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

/**
 * 03 · Neden çelik yapı + süreç (K-111): koyu band. Maddeler ve adımlar hizmetler sayfasıyla aynı kaynaktan
 * (site_settings services.page: why / steps) — tek yerden düzenlenir, iki yerde görünür. Madde yoksa bölüm çizilmez.
 */
export async function WhySteelSection({ locale, index = '03' }: { readonly locale: string; readonly index?: string }) {
  const [settings, t] = await Promise.all([getPublicSettings(), getTranslations('Home')]);
  const L = (v: Readonly<Partial<Record<string, string>>> | null | undefined) => pickLocale(v, locale, { fallback: 'tr' });
  const why = settings.servicesPage.why;
  const steps = settings.servicesPage.steps;
  const benefits = why.items.map((w) => ({ title: L(w.title), text: L(w.text) })).filter((w) => w.title);
  const stepItems = steps.items.map((s) => ({ title: L(s.title), text: L(s.text) })).filter((s) => s.title);
  if (benefits.length === 0 && stepItems.length === 0) return null;

  return (
    <section className="section-dark" data-on-dark="" aria-labelledby="why-steel-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <SectionHeading index={index} kicker={t('whyKicker')} title={<span id="why-steel-title">{L(why.title) || t('whyTitle')}</span>} lead={L(why.lede) || undefined} onDark />
        {benefits.length > 0 ? (
          <ul className="home-benefits">
            {benefits.map((b) => (
              <li key={b.title}><strong>{b.title}</strong>{b.text ? <p>{b.text}</p> : null}</li>
            ))}
          </ul>
        ) : null}
        {stepItems.length > 0 ? (
          <ol className="home-steps" aria-label={L(steps.title) || t('processLabel')}>
            {stepItems.map((s, i) => (
              <li key={s.title}>
                <span className="home-step-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <strong>{s.title}</strong>
                {s.text ? <p>{s.text}</p> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </Container>
    </section>
  );
}
