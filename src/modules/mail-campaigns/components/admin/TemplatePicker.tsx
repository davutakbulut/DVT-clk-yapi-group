'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { templateContent, type CampaignTemplate, type TemplateCategory } from '../../domain/types';

interface Props {
  readonly templates: readonly CampaignTemplate[];
  readonly locale: 'tr' | 'en';
  /** Önizlemesi açık olan şablon. */
  readonly previewId: string | null;
  /** Formda yazılmış metin var mı? Varsa "kullan" önce üzerine yazma onayı ister. */
  readonly hasContent: boolean;
  readonly onPreview: (template: CampaignTemplate | null) => void;
  readonly onUse: (template: CampaignTemplate) => void;
}

/**
 * Hazır şablon seçici (K-109): kategori süzgeci + kartlar. Karta basınca sağdaki önizleme o şablonu gösterir (form değişmez);
 * "Bu şablonu kullan" içeriği forma yazar. Formda metin varken üzerine yazmadan önce aynı kartta onay istenir.
 */
export function TemplatePicker({ templates, locale, previewId, hasContent, onPreview, onUse }: Props) {
  const t = useTranslations('Admin');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const categories = [...new Set(templates.map((x) => x.category))];
  const shown = templates.filter((x) => category === 'all' || x.category === category);
  const use = (template: CampaignTemplate) => {
    if (hasContent && confirmId !== template.id) { setConfirmId(template.id); return; }
    setConfirmId(null);
    onUse(template);
  };
  if (templates.length === 0) return <p className="text-sm text-muted-foreground">{t('campaigns.templates.empty')}</p>;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('campaigns.templates.category')}>
        {(['all', ...categories] as const).map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`rounded-full border px-3 py-1 text-xs ${category === c ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            {c === 'all' ? t('campaigns.templates.all', { count: templates.length }) : t(`campaigns.templates.categories.${c}`)}
          </button>
        ))}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((template) => {
          const active = previewId === template.id;
          return (
            <li key={template.id} className={`grid content-start gap-2 rounded-md border p-3 text-sm ${active ? 'border-primary ring-1 ring-primary' : ''}`}>
              <div>
                <p className="text-xs text-muted-foreground">{t(`campaigns.templates.categories.${template.category}`)}</p>
                <p className="font-medium">{template.name}</p>
                {template.description ? <p className="text-xs text-muted-foreground">{template.description}</p> : null}
                <p className="mt-1 truncate text-xs">
                  <span className="text-muted-foreground">{t('campaigns.subject')}: </span>
                  {templateContent(template, locale).subject}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" aria-pressed={active} onClick={() => { setConfirmId(null); onPreview(active ? null : template); }}>
                  {active ? t('campaigns.templates.closePreview') : t('common.preview')}
                </Button>
                <Button type="button" size="sm" onClick={() => use(template)}>
                  {confirmId === template.id ? t('campaigns.templates.confirmReplace') : t('campaigns.templates.use')}
                </Button>
                {confirmId === template.id ? (
                  <button type="button" className="text-xs underline underline-offset-4" onClick={() => setConfirmId(null)}>{t('common.cancel')}</button>
                ) : null}
              </div>
              {confirmId === template.id ? <p role="alert" className="text-xs text-amber-700">{t('campaigns.templates.replaceWarning')}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
