import type messages from '../../messages/tr.json';
import type { routing } from './routing';

// Mesaj anahtarları ve locale derleme zamanında denetlenir: t('Olmayan.anahtar') → tip hatası.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
