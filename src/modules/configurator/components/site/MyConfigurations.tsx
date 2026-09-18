import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { listMyConfigurations } from '../../data/configurationsRepository';

/** Hesabım → kayıtlı konfigürasyonlar (RLS: yalnız kendi kayıtları). Veri gelmezse sessizce hiç render edilmez. */
export async function MyConfigurations() {
  const [t, format, rows] = await Promise.all([getTranslations('Configurator.mine'), getFormatter(), listMyConfigurations()]);
  if (!rows.ok) return null;
  return (
    <section className="grid gap-3" aria-labelledby="my-configs">
      <h2 id="my-configs" className="text-[length:var(--fs-h4)]">
        {t('title')}
      </h2>
      {rows.data.length === 0 ? (
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">
          {t('empty')}{' '}
          <Link href="/configurator" className="underline underline-offset-4">
            {t('start')}
          </Link>
        </p>
      ) : (
        <ul className="grid gap-2">
          {rows.data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--color-border)] pb-2 text-[length:var(--fs-sm)]">
              <Link href={{ pathname: '/configurator/k/[token]', params: { token: c.public_token } }} className="font-medium underline-offset-4 hover:underline">
                {c.name || c.ref_code}
              </Link>
              <span className="font-mono text-[length:var(--fs-xs)] text-[var(--color-text-muted)]">
                {c.ref_code} · v{c.current_version}
              </span>
              {c.tonnage_kg !== null ? <span className="tabular-nums">{format.number(c.tonnage_kg / 1000, { maximumFractionDigits: 2 })} t</span> : null}
              <span className="ml-auto text-[length:var(--fs-xs)] text-[var(--color-text-muted)]">{format.dateTime(new Date(c.updated_at), { dateStyle: 'medium' })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
