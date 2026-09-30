'use client';

import { useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';
import { campaignVariables, unsubscribeUrls, type BulkMailSettings } from '@/core/mail/bulkSettings';
import { renderCampaignMail } from '@/core/mail/render';

export interface PreviewContext {
  readonly settings: BulkMailSettings;
  readonly siteName: { readonly tr: string; readonly en: string };
  readonly siteUrl: string;
  readonly userEmail: string;
  readonly userName: string;
}

interface Props extends PreviewContext {
  readonly locale: 'tr' | 'en';
  readonly subject: string;
  readonly preheader: string;
  readonly body: string;
  readonly ctaLabel: string;
  readonly ctaUrl: string;
  /** Önizlemenin üstünde gösterilecek not (ör. "şablon önizlemesi" bandı). */
  readonly banner?: ReactNode;
}

/** Alıcının göreceği ileti: gelen kutusu satırı (konu + ön başlık) ve gövde. Gönderimdeki render ile AYNI fonksiyon kullanılır. */
export function MailPreview({ locale, subject, preheader, body, ctaLabel, ctaUrl, settings, siteName, siteUrl, userEmail, userName, banner }: Props) {
  const t = useTranslations('Admin');
  const html = useMemo(() => {
    const links = unsubscribeUrls(siteUrl, locale, '00000000-0000-4000-8000-000000000000');
    return renderCampaignMail({
      subject, preheader, body, ctaLabel, ctaUrl,
      variables: campaignVariables({ email: userEmail, full_name: userName || null, company: null }, settings, locale),
      siteName: siteName[locale], siteUrl, footer: settings.footer[locale] || settings.footer.tr,
      unsubscribeLabel: settings.unsubscribe_label[locale] || settings.unsubscribe_label.tr || links.page, unsubscribeUrl: links.page,
    }).html;
  }, [subject, preheader, body, ctaLabel, ctaUrl, locale, settings, siteName, siteUrl, userEmail, userName]);
  return (
    <div className="grid gap-2">
      <h2 className="text-base font-semibold">{t('campaigns.preview')}</h2>
      {banner ?? <p className="text-xs text-muted-foreground">{t('campaigns.previewHint')}</p>}
      <div className="rounded-md border bg-card p-3 text-sm">
        <p className="truncate font-medium">{subject || t('campaigns.subject')}</p>
        <p className="truncate text-xs text-muted-foreground">{preheader}</p>
      </div>
      <iframe title={t('campaigns.preview')} srcDoc={html} sandbox="" className="h-[36rem] w-full rounded-md border bg-white" />
    </div>
  );
}
