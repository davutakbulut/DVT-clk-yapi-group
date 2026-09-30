'use client';

import { useTranslations } from 'next-intl';
import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { saveCampaignTemplate } from '../../actions';
import { findPlaceholders, TEMPLATE_CATEGORIES, type CampaignTemplate, type LocalizedPair } from '../../domain/types';
import { MailPreview, type PreviewContext } from './MailPreview';

interface Props extends PreviewContext {
  readonly template: CampaignTemplate | null;
}

const EMPTY: LocalizedPair = { tr: '', en: '' };

/**
 * Hazır şablon düzenleyici (K-109): ad · durum · açıklama + TR/EN içerik, sağda seçilen dilin canlı önizlemesi.
 * Köşeli parantezli alanlar ([tarih]) kampanyayı hazırlayanın dolduracağı yerlerdir; burada bırakılır.
 */
export function TemplateForm({ template, ...context }: Props) {
  const t = useTranslations('Admin');
  const x = template;
  const [state, action, pending] = useActionState(saveCampaignTemplate, IDLE);
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [name, setName] = useState(x?.name ?? '');
  const [category, setCategory] = useState<string>(x?.category ?? 'announcement');
  const [description, setDescription] = useState(x?.description ?? '');
  const [sortOrder, setSortOrder] = useState(String(x?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(x?.is_active ?? true);
  const [subject, setSubject] = useState<LocalizedPair>(x?.subject ?? EMPTY);
  const [preheader, setPreheader] = useState<LocalizedPair>(x?.preheader ?? EMPTY);
  const [body, setBody] = useState<LocalizedPair>(x?.body ?? EMPTY);
  const [ctaLabel, setCtaLabel] = useState<LocalizedPair>(x?.cta_label ?? EMPTY);
  const [ctaUrl, setCtaUrl] = useState<LocalizedPair>(x?.cta_url ?? EMPTY);

  // Eylem onSubmit içinden çağrılır (form sıfırlanmasın; bkz. CampaignForm)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  const suffix = lang === 'tr' ? 'Tr' : 'En';
  const set = (setter: (v: LocalizedPair) => void, value: LocalizedPair) => (text: string) => setter({ ...value, [lang]: text });
  const placeholders = findPlaceholders(subject[lang], preheader[lang], body[lang], ctaLabel[lang]);
  const other = lang === 'tr' ? 'en' : 'tr';
  const otherSuffix = lang === 'tr' ? 'En' : 'Tr';
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <form onSubmit={submit} className="grid content-start gap-6">
        <input type="hidden" name="id" value={x?.id ?? ''} />
        {/* Görünmeyen dilin değerleri de gönderilir */}
        <input type="hidden" name={`subject${otherSuffix}`} value={subject[other]} />
        <input type="hidden" name={`preheader${otherSuffix}`} value={preheader[other]} />
        <input type="hidden" name={`body${otherSuffix}`} value={body[other]} />
        <input type="hidden" name={`ctaLabel${otherSuffix}`} value={ctaLabel[other]} />
        <input type="hidden" name={`ctaUrl${otherSuffix}`} value={ctaUrl[other]} />
        <FormSection title={t('campaigns.templates.sectionInfo')}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="grid gap-1">
              <Label htmlFor="tp-name">{t('campaigns.templates.name')}</Label>
              <Input id="tp-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} aria-invalid={state.fieldErrors?.['name'] ? 'true' : undefined} />
              <FieldError state={state} name="name" />
            </div>
            <div className="grid content-start gap-1">
              <Label htmlFor="tp-category">{t('campaigns.templates.category')}</Label>
              <select id="tp-category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`campaigns.templates.categories.${c}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="tp-description">{t('campaigns.templates.description')}</Label>
            <Input id="tp-description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
            <p className="text-xs text-muted-foreground">{t('campaigns.templates.descriptionHint')}</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1">
              <Label htmlFor="tp-sortOrder">{t('campaigns.templates.sortOrder')}</Label>
              <Input id="tp-sortOrder" name="sortOrder" type="number" min={0} max={9999} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-28" />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> {t('campaigns.templates.active')}
            </label>
          </div>
        </FormSection>

        <FormSection title={t('campaigns.sectionContent')}>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('campaigns.templates.language')}>
            {(['tr', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`rounded-full border px-3 py-1 text-xs ${lang === l ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                {t(`common.${l}`)}
              </button>
            ))}
            <span className="text-xs text-muted-foreground">{t('campaigns.templates.languageHint')}</span>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="tp-subject">{t('campaigns.subject')}</Label>
            <Input id="tp-subject" name={`subject${suffix}`} value={subject[lang]} onChange={(e) => set(setSubject, subject)(e.target.value)} maxLength={200} aria-invalid={state.fieldErrors?.['subjectTr'] ? 'true' : undefined} />
            <FieldError state={state} name="subjectTr" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="tp-preheader">{t('campaigns.preheader')}</Label>
            <Input id="tp-preheader" name={`preheader${suffix}`} value={preheader[lang]} onChange={(e) => set(setPreheader, preheader)(e.target.value)} maxLength={200} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="tp-body">{t('campaigns.body')}</Label>
            <Textarea id="tp-body" name={`body${suffix}`} value={body[lang]} onChange={(e) => set(setBody, body)(e.target.value)} rows={16} maxLength={20000} className="font-mono text-sm" aria-invalid={state.fieldErrors?.['bodyTr'] ? 'true' : undefined} />
            <FieldError state={state} name="bodyTr" />
            <p className="text-xs text-muted-foreground">{t('campaigns.bodyHint')} {t('campaigns.templates.bodyHint')}</p>
            {placeholders.length > 0 ? <p className="text-xs text-muted-foreground">{t('campaigns.templates.fieldsInTemplate')} <span className="font-mono">{placeholders.join(' · ')}</span></p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="tp-ctaLabel">{t('campaigns.ctaLabel')}</Label>
              <Input id="tp-ctaLabel" name={`ctaLabel${suffix}`} value={ctaLabel[lang]} onChange={(e) => set(setCtaLabel, ctaLabel)(e.target.value)} maxLength={80} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="tp-ctaUrl">{t('campaigns.ctaUrl')}</Label>
              <Input id="tp-ctaUrl" name={`ctaUrl${suffix}`} type="url" inputMode="url" placeholder="https://" value={ctaUrl[lang]} onChange={(e) => set(setCtaUrl, ctaUrl)(e.target.value)} maxLength={500} aria-invalid={state.fieldErrors?.[`ctaUrl${suffix}`] ? 'true' : undefined} />
              <FieldError state={state} name={`ctaUrl${suffix}`} />
            </div>
          </div>
        </FormSection>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>{t('common.save')}</Button>
          <ActionMessage state={state} />
        </div>
      </form>
      <aside className="xl:sticky xl:top-4 xl:self-start">
        <MailPreview locale={lang} subject={subject[lang]} preheader={preheader[lang]} body={body[lang]} ctaLabel={ctaLabel[lang]} ctaUrl={ctaUrl[lang]} {...context} />
      </aside>
    </div>
  );
}
