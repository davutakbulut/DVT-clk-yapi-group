import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { applyOverrides, getCachedUiOverrides } from '@/core/i18n/uiOverrides';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // K-40 istisnası: mesaj dosyası varsayılan, ui_translations override'ları üstüne biner (etiket 'ui_translations', admin düşürür).
    messages: applyOverrides((await import(`../../messages/${locale}.json`)).default, await overridesFor(locale)),
    timeZone: 'Europe/Istanbul',
  };
});

/** Asla fırlatmaz: veritabanı yoksa varsayılan mesajlar. */
async function overridesFor(locale: string) {
  try {
    const result = await getCachedUiOverrides(locale);
    return result.ok ? result.data : [];
  } catch {
    return [];
  }
}
