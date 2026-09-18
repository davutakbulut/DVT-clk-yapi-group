import { getLocale, getTranslations } from 'next-intl/server';
import { ErrorPage, getErrorPage } from '@/modules/static-pages';

// (marketing) dışındaki route gruplarının (ör. konfigüratör) düştüğü dilli 404: çatı yok, içerik aynı.
export default async function LocaleNotFound() {
  const locale = await getLocale();
  const [page, t] = await Promise.all([getErrorPage('error-404', locale), getTranslations('Errors')]);
  return (
    <main id="main-content">
      <ErrorPage variant="not-found" code={t('notFoundCode')} title={page?.title ?? t('notFoundTitle')} body={page?.body || t('notFoundBody')} homeLabel={t('backHome')} />
    </main>
  );
}
