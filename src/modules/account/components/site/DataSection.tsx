import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function DataSection() {
  const t = await getTranslations('Account.data');
  return (
    <div className="grid max-w-prose gap-4">
      <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('includes')}</p>
      <div className="flex flex-wrap gap-3">
        <a href="/api/account/export" download className="btn btn-primary">{t('download')}</a>
        <Link href="/privacy-policy" className="btn btn-ghost">{t('privacy')}</Link>
      </div>
    </div>
  );
}
