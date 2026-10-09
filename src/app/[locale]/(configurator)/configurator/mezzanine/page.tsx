import type { Metadata } from 'next';
import { EngineConfiguratorPage, engineMetadata } from '@/modules/configurator/server';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | undefined>>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return engineMetadata('mezzanine', locale);
}
/** K-110 · mezzanine konfigüratörü; iş mantığı modülde (motor + sahne). Durum sorgu dizesinde, paylaşılabilir. */
export default async function Page({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  return <EngineConfiguratorPage kind="mezzanine" locale={locale} searchParams={sp} />;
}
