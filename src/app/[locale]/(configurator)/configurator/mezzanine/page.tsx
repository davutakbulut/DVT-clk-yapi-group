import type { Metadata } from 'next';
import { SimpleConfiguratorPage, simpleConfiguratorMetadata } from '@/modules/configurator/server';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | undefined>>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return simpleConfiguratorMetadata('mezzanine', locale);
}
/** K-100 · mezzanine konfigüratörü; iş mantığı modülde. */
export default async function Page({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  return <SimpleConfiguratorPage kind="mezzanine" locale={locale} searchParams={sp} />;
}
