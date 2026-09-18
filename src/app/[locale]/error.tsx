'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { logger } from '@/core/observability/logger';
import { ErrorPage } from '@/modules/static-pages';

// İstemci bileşeni: veritabanına gidemez → metin messages'tan (ui_translations override'ı Faz 18'de).
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Errors');

  useEffect(() => {
    logger.error(error.message, { module: 'app/[locale]', digest: error.digest });
  }, [error]);

  return (
    <main id="main-content">
      <ErrorPage
        variant="server-error"
        code={t('serverErrorCode')}
        title={t('serverErrorTitle')}
        body={t('serverErrorBody')}
        homeLabel={t('backHome')}
        action={
          <button type="button" onClick={reset} className="btn btn-ghost">
            {t('retry')}
          </button>
        }
      />
    </main>
  );
}
