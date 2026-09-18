'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/** Üst çubuktaki geri bağlantısı: konfigüratörün içindeyken seçim sayfasına, seçim sayfasındayken ana sayfaya döner. */
export function ConfiguratorBackLink() {
  const t = useTranslations('Configurator');
  const inside = usePathname() !== '/configurator';
  return (
    <Link href={inside ? '/configurator' : '/'} className="font-[family-name:var(--font-heading)] font-bold tracking-tight">
      ← {inside ? t('backToTypes') : t('backHome')}
    </Link>
  );
}
