import { useTranslations } from 'next-intl';

/** Yayın rozeti: durum + diller. Sunucu bileşenlerinde de kullanılabilir (next-intl hook RSC'de çalışır). */
export function StatusBadge({ status, locales }: { readonly status: string; readonly locales: readonly string[] }) {
  const t = useTranslations('Admin');
  const tone = status === 'published' ? 'bg-green-100 text-green-900' : status === 'archived' ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-900';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${tone}`}>
      {t(`form.${status as 'draft' | 'published' | 'archived'}`)}
      {status === 'published' ? <span className="font-mono uppercase">{locales.join('/')}</span> : null}
    </span>
  );
}
