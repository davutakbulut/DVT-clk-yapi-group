import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedServiceList } from '../../data/servicesRepository';
import { ServiceCard } from './ServiceCard';

/** /hizmetler: başlık + tüm yayındaki hizmetler. Boşsa yalnız başlık ve boş durum metni. */
export async function ServicesList({ locale }: { readonly locale: string }) {
  const [result, env, t] = await Promise.all([getCachedServiceList(locale), readSupabasePublicEnv(), getTranslations('Services')]);
  if (!result.ok) logger.warn(result.error.message, { module: 'services', code: result.error.code });
  const items = result.ok ? result.data : [];

  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={t('title')} lead={t('lead')} />
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((service) => (
            <li key={service.id}>
              <ServiceCard service={service} locale={locale} supabaseUrl={env.ok ? env.data.url : null} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
