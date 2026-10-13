import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { pickLocale } from '@/lib/localized';
import { getPublicSettings, mapLinkHref } from '@/modules/site-settings';

/** İletişim bilgileri: yalnız dolu alanlar (yer tutucu yok). */
export async function ContactInfo({ locale }: { readonly locale: string }) {
  const [settings, t] = await Promise.all([getPublicSettings(), getTranslations('Contact')]);
  const { contact } = settings;
  const address = pickLocale(contact.address, locale);
  const hours = pickLocale(contact.workingHours, locale);
  const directions = mapLinkHref(contact.mapUrl, address);
  type Row = { readonly label: string; readonly value: ReactNode };
  const candidates: (Row | null)[] = [
    contact.phone ? { label: t('phone'), value: <a href={`tel:${contact.phone}`}>{contact.phone}</a> } : null,
    contact.email ? { label: t('email'), value: <a href={`mailto:${contact.email}`}>{contact.email}</a> } : null,
    address
      ? {
          label: t('address'),
          // K-112: adres düz metin (kopyalanabilir) + altında "Yol tarifi al" (yeni sekme) ve sayfa içi haritaya çapa
          value: (
            <>
              <span className="block">{address}</span>
              <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--fs-sm)] font-normal">
                {directions ? <a href={directions} rel="noopener noreferrer" target="_blank" className="underline underline-offset-4">{t('directions')}</a> : null}
                <a href="#konum" className="underline underline-offset-4">{t('map')}</a>
              </span>
            </>
          ),
        }
      : null,
    hours ? { label: t('hours'), value: hours } : null,
  ];
  const rows = candidates.filter((r): r is Row => r !== null);
  if (rows.length === 0) return null;
  return (
    <dl className="grid gap-5">
      {rows.map((r) => (
        <div key={r.label} className="grid gap-1 border-l-2 border-[var(--color-accent)] pl-4">
          <dt className="label-mono text-[var(--color-text-subtle)]">{r.label}</dt>
          <dd className="font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
