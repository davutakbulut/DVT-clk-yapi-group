import { getLocale, getTranslations } from 'next-intl/server';
import { getMenu } from '@/modules/navigation';
import { ErrorPage, getErrorPage } from '@/modules/static-pages';
import { MenuSuggestions } from '@/ui/MenuSuggestions';

// (marketing)/layout.tsx içinde render edilir → 404'te de gezinme ve dil değiştirici görünür.
// Metin admin'den (static_pages.error-404); o dilde yayında değilse messages'taki nötr metin.
export default async function MarketingNotFound() {
  const locale = await getLocale();
  const [page, menu, t] = await Promise.all([getErrorPage('error-404', locale), getMenu('header', locale), getTranslations('Errors')]);
  const suggestions = menu.filter((n) => !n.isCta && n.link.kind === 'internal');

  return (
    <ErrorPage
      variant="not-found"
      code={t('notFoundCode')}
      title={page?.title ?? t('notFoundTitle')}
      body={page?.body || t('notFoundBody')}
      homeLabel={t('backHome')}
      suggestions={suggestions.length > 0 ? { heading: t('popularPages'), items: <MenuSuggestions items={suggestions} /> } : null}
    />
  );
}

