import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// Görsel tasarım (eksik kolonlu çelik iskelet animasyonu) ve veritabanından gelen metin Faz 4'te.
export function NotFoundContent() {
  const t = useTranslations('Errors');

  return (
    <section className="mx-auto grid max-w-[var(--prose-max)] gap-4 px-[var(--gutter)] py-[var(--section-y)] text-center">
      <h1 className="text-3xl font-semibold">{t('notFoundTitle')}</h1>
      <p className="text-[var(--color-text-muted)]">{t('notFoundBody')}</p>
      <p>
        <Link href="/" className="underline underline-offset-4">
          {t('backHome')}
        </Link>
      </p>
    </section>
  );
}
