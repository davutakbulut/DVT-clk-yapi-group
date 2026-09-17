import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

// Dilsiz 404: yalnız middleware matcher'ının dışladığı (noktalı) yollarda görünür. Kök layout
// geçirgen olduğu için kendi <html>'ini kurar; globals.css yüklü değildir → stiller satır içi.
export default async function RootNotFound() {
  const locale = routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'Errors' });

  return (
    <html lang={locale}>
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: 12, padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif', background: '#f7f6f4', color: '#0f1315' }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>{t('notFoundTitle')}</h1>
        <p style={{ margin: 0, color: '#3a4750' }}>{t('notFoundBody')}</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- next-intl Link sağlayıcı ister; burada bağlam yok */}
        <a href="/" style={{ color: '#0f1315' }}>
          {t('backHome')}
        </a>
      </body>
    </html>
  );
}
