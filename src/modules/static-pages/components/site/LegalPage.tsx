import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { renderMarkdown } from '@/lib/markdown';
import { Container } from '@/ui/Container';

interface Props {
  readonly title: string;
  readonly body: string;
  readonly updatedAt: string;
}

/** Yasal metin: tek sütun, düzyazı; son güncelleme tarihi görünür (E-E-A-T). */
export async function LegalPage({ title, body, updatedAt }: Props) {
  const [t, format] = await Promise.all([getTranslations('Legal'), getFormatter()]);
  return (
    <Container as="article" className="grid max-w-[var(--prose-max)] gap-8 py-[var(--section-y)]">
      <nav aria-label={t('legal')} className="label-mono text-[var(--color-text-subtle)]">
        <Link href="/">{t('home')}</Link> <span aria-hidden="true">/</span> {t('legal')}
      </nav>
      <header className="grid gap-3">
        <h1>{title}</h1>
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-subtle)]">
          {t('updated')}: {format.dateTime(new Date(updatedAt), { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>
      <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
    </Container>
  );
}
