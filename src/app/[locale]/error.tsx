'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { logger } from '@/core/observability/logger';

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Errors');

  useEffect(() => {
    logger.error(error.message, { module: 'app/[locale]', digest: error.digest });
  }, [error]);

  return (
    <main id="main-content" className="mx-auto grid max-w-[var(--prose-max)] gap-4 px-[var(--gutter)] py-[var(--section-y)] text-center">
      <h1 className="text-3xl font-semibold">{t('serverErrorTitle')}</h1>
      <p className="text-[var(--color-text-muted)]">{t('serverErrorBody')}</p>
      <p>
        <button type="button" onClick={reset} className="border border-[var(--color-border-strong)] px-5 py-2">
          {t('retry')}
        </button>
      </p>
    </main>
  );
}
