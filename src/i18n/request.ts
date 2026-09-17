import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // Faz 18'de ui_translations tablosundaki override'lar bu nesnenin üstüne bindirilecek.
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'Europe/Istanbul',
  };
});
