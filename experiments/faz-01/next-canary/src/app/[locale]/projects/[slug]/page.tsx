import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

// VARSAYIM #1: bu sayfa IC yolda (/tr/projects/x) on-uretilir; ziyaretci DIS yoldan (/tr/projeler/x) gelir.
export const revalidate = 5;
export const dynamicParams = true;

const SLUGS: Record<string, string[]> = { tr: ['fabrika-celik-cati'], en: ['factory-steel-roof'] };

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return (SLUGS[params.locale] ?? []).map((slug) => ({ slug }));
}

export default async function Project({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (slug.startsWith('yok-')) notFound();
  return (
    <main>
      <h1>{slug}</h1>
      <p data-testid="rendered-at">{new Date().toISOString()}</p>
    </main>
  );
}
