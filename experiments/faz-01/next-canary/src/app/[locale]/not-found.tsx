import { useTranslations } from 'next-intl';

export default function LocaleNotFound() {
  const t = useTranslations('Canary');
  return <h1 data-testid="locale-404">{t('notFound')}</h1>;
}
