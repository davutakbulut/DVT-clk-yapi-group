'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { logger } from '@/core/observability/logger';
import { Link } from '@/i18n/navigation';

/** WebGL yok / bellek yetersiz / çökme → statik yedek: açıklama + projeler + teklif bağlantısı (dönüşüm kurtarma, 04-CONFIGURATOR). */
export default function ConfiguratorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Configurator');
  useEffect(() => {
    logger.error(error.message, { module: 'configurator', digest: error.digest, stack: error.stack });
  }, [error]);
  return (
    <section className="grid max-w-[60ch] gap-4 p-6 lg:p-10">
      <h1 className="text-[length:var(--fs-h2)]">{t('fallback.title')}</h1>
      <p className="text-[var(--color-text-muted)]">{t('fallback.body')}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-ghost">
          {t('fallback.retry')}
        </button>
        <Link href="/projects" className="btn btn-ghost">
          {t('fallback.projects')}
        </Link>
        <Link href="/get-quote" className="btn btn-primary">
          {t('fallback.quote')}
        </Link>
      </div>
    </section>
  );
}
