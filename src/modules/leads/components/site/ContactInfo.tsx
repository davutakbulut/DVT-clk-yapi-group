import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { pickLocale } from '@/lib/localized';
import { getPublicSettings } from '@/modules/site-settings';

/** İletişim bilgileri: yalnız dolu alanlar (yer tutucu yok). */
export async function ContactInfo({ locale }: { readonly locale: string }) {
  const [settings, t] = await Promise.all([getPublicSettings(), getTranslations('Contact')]);
  const { contact } = settings;
  const address = pickLocale(contact.address, locale);
  const hours = pickLocale(contact.workingHours, locale);
  type Row = { readonly label: string; readonly value: ReactNode };
  const candidates: (Row | null)[] = [
    contact.phone ? { label: t('phone'), value: <a href={`tel:${contact.phone}`}>{contact.phone}</a> } : null,
    contact.email ? { label: t('email'), value: <a href={`mailto:${contact.email}`}>{contact.email}</a> } : null,
    address ? { label: t('address'), value: contact.mapUrl ? <a href={contact.mapUrl} rel="noopener noreferrer" target="_blank">{address}</a> : address } : null,
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
