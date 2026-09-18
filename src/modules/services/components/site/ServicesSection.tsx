import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedServiceList } from '../../data/servicesRepository';
import { ServiceCard } from './ServiceCard';

/** Ana sayfa 04 — hizmet kartları (öne çıkanlar önce, en çok 6). Hizmet yoksa bölüm render edilmez. */
export async function ServicesSection({ locale, index = '02' }: { readonly locale: string; readonly index?: string }) {
  const [result, env, t] = await Promise.all([getCachedServiceList(locale), readSupabasePublicEnv(), getTranslations('Services')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'services', code: result.error.code });
    return null;
  }
  if (result.data.length === 0) return null;
  const items = [...result.data].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 6);

  return (
    <section className="section-dark" data-on-dark="" aria-labelledby="services-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading index={index} kicker={t('kicker')} title={<span id="services-title">{t('homeTitle')}</span>} onDark />
          <Button href="/services" variant="ghost">
            {t('all')}
          </Button>
        </div>
        <ul className="card-grid card-grid-dark">
          {items.map((service) => (
            <li key={service.id}>
              <ServiceCard service={service} locale={locale} supabaseUrl={env.ok ? env.data.url : null} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
