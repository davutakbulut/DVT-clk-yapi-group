import { useTranslations } from 'next-intl';
import type { CampaignStatus } from '../../domain/types';

const TONES: Record<CampaignStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-sky-100 text-sky-900',
  sending: 'bg-amber-100 text-amber-900',
  paused: 'bg-orange-100 text-orange-900',
  sent: 'bg-green-100 text-green-900',
  cancelled: 'bg-red-100 text-red-900',
};

/** Kampanya durum rozeti; renk tek başına anlam taşımaz (metin her zaman yazılır). */
export function CampaignStatusBadge({ status }: { readonly status: CampaignStatus }) {
  const t = useTranslations('Admin');
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${TONES[status]}`}>{t(`campaigns.statuses.${status}`)}</span>;
}
