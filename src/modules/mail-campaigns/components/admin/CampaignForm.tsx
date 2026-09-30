'use client';

import { useTranslations } from 'next-intl';
import { startTransition, useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { campaignVariables, unsubscribeUrls, type BulkMailSettings } from '@/core/mail/bulkSettings';
import { renderCampaignMail } from '@/core/mail/render';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { computeAudience, saveCampaign, sendTestCampaign, startCampaign, type AudienceState, type StartState, type TestSendState } from '../../actions';
import type { CampaignDetail } from '../../data/adminCampaignsRepository';
import { CAMPAIGN_SEGMENTS, estimateMinutes, formatManualList, MANUAL_LIMIT } from '../../domain/types';

interface Props {
  readonly campaign: CampaignDetail | null;
  readonly cities: readonly string[];
  readonly settings: BulkMailSettings;
  readonly siteName: { readonly tr: string; readonly en: string };
  readonly siteUrl: string;
  readonly userEmail: string;
  readonly userName: string;
  readonly providerConfigured: boolean;
}

const AUDIENCE_IDLE: AudienceState = { ok: false };
const TEST_IDLE: TestSendState = { ok: false };
const START_IDLE: StartState = { ok: false };
const VARIABLES = ['full_name', 'company', 'email'] as const;

/**
 * Kampanya taslağı (K-108): içerik · alıcılar · canlı önizleme · test iletisi · başlat/zamanla.
 * Tek form, üç eylem (kaydet / alıcıları hesapla / test gönder) — alan değerleri ortak. Başlatma ayrı formdur ve
 * yalnız KAYDEDİLMİŞ içeriği gönderir: kaydedilmemiş değişiklik varken düğme kapalıdır.
 * Eylemler `action=` ile DEĞİL onSubmit içinden çağrılır: React, form eylemi bitince formu sıfırlar ve denetimli onay kutuları
 * ekranda işaretsiz kalır (durum işaretli dese de) → "alıcıları hesapla" seçimi silmiş gibi görünürdü.
 */
export function CampaignForm({ campaign, cities, settings, siteName, siteUrl, userEmail, userName, providerConfigured }: Props) {
  const t = useTranslations('Admin');
  const c = campaign;
  const [state, saveAction, saving] = useActionState(saveCampaign, IDLE);
  const [audience, audienceAction, counting] = useActionState(computeAudience, AUDIENCE_IDLE);
  const [test, testAction, testing] = useActionState(sendTestCampaign, TEST_IDLE);
  const [start, startAction, starting] = useActionState(startCampaign, START_IDLE);

  // Alanların TAMAMI denetimlidir: React, form eylemi bitince denetimsiz alanları sıfırlar → "alıcıları hesapla" işaretleri silerdi.
  const [name, setName] = useState(c?.name ?? '');
  const [segments, setSegments] = useState<readonly string[]>(c?.audience.segments ?? []);
  const [city, setCity] = useState(c?.audience.city ?? '');
  const [manualList, setManualList] = useState(c ? formatManualList(c.audience.manual) : '');
  const [manualAttested, setManualAttested] = useState(c?.audience.manual_attested ?? false);
  const [testEmail, setTestEmail] = useState(userEmail);
  const [locale, setLocale] = useState<'tr' | 'en'>(c?.locale ?? 'tr');
  const [subject, setSubject] = useState(c?.subject ?? '');
  const [preheader, setPreheader] = useState(c?.preheader ?? '');
  const [body, setBody] = useState(c?.body ?? '');
  const [ctaLabel, setCtaLabel] = useState(c?.cta_label ?? '');
  const [ctaUrl, setCtaUrl] = useState(c?.cta_url ?? '');
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<'now' | 'later'>('now');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (state.done) setDirty(false); }, [state]);

  const submitMain = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const data = new FormData(event.currentTarget);
    const dispatch = submitter?.value === 'audience' ? audienceAction : submitter?.value === 'test' ? testAction : saveAction;
    startTransition(() => dispatch(data));
  };
  const submitStart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => startAction(data));
  };

  const html = useMemo(() => {
    const links = unsubscribeUrls(siteUrl, locale, '00000000-0000-4000-8000-000000000000');
    return renderCampaignMail({
      subject, preheader, body, ctaLabel, ctaUrl,
      variables: campaignVariables({ email: userEmail, full_name: userName || null, company: null }, settings, locale),
      siteName: siteName[locale], siteUrl, footer: settings.footer[locale] || settings.footer.tr,
      unsubscribeLabel: settings.unsubscribe_label[locale] || settings.unsubscribe_label.tr || links.page, unsubscribeUrl: links.page,
    }).html;
  }, [subject, preheader, body, ctaLabel, ctaUrl, locale, settings, siteName, siteUrl, userEmail, userName]);

  const insertVariable = (name: string) => {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    const at = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    setBody(`${body.slice(0, at)}${token}${body.slice(end)}`);
    setDirty(true);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + token.length, at + token.length); });
  };

  const p = audience.preview;
  const recipientCount = p?.total;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="grid content-start gap-6">
        <form onSubmit={submitMain} onChange={() => setDirty(true)} className="grid gap-6">
          <input type="hidden" name="id" value={c?.id ?? ''} />
          <FormSection title={t('campaigns.sectionCampaign')}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="grid gap-1">
                <Label htmlFor="cm-name">{t('campaigns.name')}</Label>
                <Input id="cm-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} aria-invalid={state.fieldErrors?.['name'] ? 'true' : undefined} />
                <FieldError state={state} name="name" />
                <p className="text-xs text-muted-foreground">{t('campaigns.nameHint')}</p>
              </div>
              <div className="grid content-start gap-1">
                <Label htmlFor="cm-locale">{t('campaigns.locale')}</Label>
                <select id="cm-locale" name="locale" value={locale} onChange={(e) => setLocale(e.target.value === 'en' ? 'en' : 'tr')} className="h-9 rounded-md border bg-background px-2 text-sm">
                  <option value="tr">{t('common.tr')}</option>
                  <option value="en">{t('common.en')}</option>
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection title={t('campaigns.sectionContent')}>
            <div className="grid gap-1">
              <Label htmlFor="cm-subject">{t('campaigns.subject')}</Label>
              <Input id="cm-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} aria-invalid={state.fieldErrors?.['subject'] ? 'true' : undefined} />
              <p className="text-xs text-muted-foreground">{t('campaigns.subjectHint', { count: subject.length })}</p>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cm-preheader">{t('campaigns.preheader')}</Label>
              <Input id="cm-preheader" name="preheader" value={preheader} onChange={(e) => setPreheader(e.target.value)} maxLength={200} />
              <p className="text-xs text-muted-foreground">{t('campaigns.preheaderHint')}</p>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cm-body">{t('campaigns.body')}</Label>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t('campaigns.insert')}</span>
                {VARIABLES.map((v) => (
                  <button key={v} type="button" onClick={() => insertVariable(v)} className="rounded border px-2 py-1 font-mono hover:bg-muted">
                    {`{{${v}}}`} <span className="font-sans text-muted-foreground">{t(`campaigns.variables.${v}`)}</span>
                  </button>
                ))}
              </div>
              <Textarea ref={bodyRef} id="cm-body" name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={16} maxLength={20000} className="font-mono text-sm" aria-invalid={state.fieldErrors?.['body'] ? 'true' : undefined} />
              <p className="text-xs text-muted-foreground">{t('campaigns.bodyHint')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="cm-ctaLabel">{t('campaigns.ctaLabel')}</Label>
                <Input id="cm-ctaLabel" name="ctaLabel" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={80} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="cm-ctaUrl">{t('campaigns.ctaUrl')}</Label>
                <Input id="cm-ctaUrl" name="ctaUrl" type="url" inputMode="url" placeholder="https://" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} maxLength={500} aria-invalid={state.fieldErrors?.['ctaUrl'] ? 'true' : undefined} />
                <FieldError state={state} name="ctaUrl" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('campaigns.ctaHint')}</p>
          </FormSection>

          <FormSection title={t('campaigns.sectionAudience')}>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">{t('campaigns.segments')}</legend>
              {CAMPAIGN_SEGMENTS.map((s) => (
                <label key={s} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                  <input type="checkbox" name="segments" value={s} checked={segments.includes(s)} onChange={(e) => setSegments(e.target.checked ? [...segments, s] : segments.filter((x) => x !== s))} className="mt-1" />
                  <span>
                    <span className="font-medium">{t(`campaigns.segment.${s}.title`)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`campaigns.segment.${s}.hint`)}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-1 sm:max-w-xs">
              <Label htmlFor="cm-city">{t('campaigns.city')}</Label>
              <select id="cm-city" name="city" value={city} onChange={(e) => setCity(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="">{t('campaigns.cityAll')}</option>
                {cities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">{t('campaigns.cityHint')}</p>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cm-manual">{t('campaigns.manual')}</Label>
              <Textarea id="cm-manual" name="manualList" rows={6} value={manualList} onChange={(e) => setManualList(e.target.value)} className="font-mono text-sm" placeholder={t('campaigns.manualPlaceholder')} />
              <p className="text-xs text-muted-foreground">{t('campaigns.manualHint', { limit: MANUAL_LIMIT })}</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="manualAttested" checked={manualAttested} onChange={(e) => setManualAttested(e.target.checked)} className="mt-1" />
                <span>{t('campaigns.manualAttest')}</span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" variant="outline" name="intent" value="audience" disabled={counting}>
                {counting ? t('common.loading') : t('campaigns.compute')}
              </Button>
              <span className="text-xs text-muted-foreground">{t('campaigns.computeHint')}</span>
            </div>
            <div aria-live="polite">
              {audience.error ? <p role="alert" className="text-sm text-destructive">{t(`errors.${audience.error}`)}</p> : null}
              {p ? (
                <div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="text-base font-semibold">{t('campaigns.audienceTotal', { count: p.total })}</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <li>{t('campaigns.source.customer')}: {p.customer}</li>
                    <li>{t('campaigns.source.lead')}: {p.lead}</li>
                    <li>{t('campaigns.source.manual')}: {p.manual}</li>
                    <li>{t('campaigns.audienceSuppressed', { count: p.suppressed })}</li>
                    {audience.duplicates ? <li>{t('campaigns.audienceDuplicates', { count: audience.duplicates })}</li> : null}
                  </ul>
                  {p.total > 0 ? <p className="text-xs text-muted-foreground">{t('campaigns.estimate', { minutes: estimateMinutes(p.total, settings.hourly_limit, settings.batch_size), limit: settings.hourly_limit })}</p> : null}
                  {audience.invalid && audience.invalid.length > 0 ? (
                    <div className="text-xs text-destructive">
                      <p>{t('campaigns.audienceInvalid', { count: audience.invalid.length })}</p>
                      <ul className="font-mono">{audience.invalid.map((line, i) => <li key={i}>{line}</li>)}</ul>
                    </div>
                  ) : null}
                  {p.sample.length > 0 ? (
                    <details>
                      <summary className="cursor-pointer text-xs underline underline-offset-4">{t('campaigns.sample', { count: p.sample.length })}</summary>
                      <ul className="mt-2 grid gap-1 text-xs">
                        {p.sample.map((s) => (
                          <li key={s.email} className="flex flex-wrap gap-x-2">
                            <span className="font-mono">{s.email}</span>
                            <span className="text-muted-foreground">{[s.name, s.company, t(`campaigns.source.${s.source as 'customer'}`)].filter(Boolean).join(' · ')}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </div>
          </FormSection>

          <FormSection title={t('campaigns.sectionTest')}>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1">
                <Label htmlFor="cm-testEmail">{t('campaigns.testEmail')}</Label>
                <Input id="cm-testEmail" name="testEmail" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="w-72" />
              </div>
              <Button type="submit" size="sm" variant="outline" name="intent" value="test" disabled={testing || !providerConfigured}>
                {testing ? t('common.loading') : t('campaigns.testSend')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{providerConfigured ? t('campaigns.testHint') : t('campaigns.providerMissing')}</p>
            <div aria-live="polite">
              {test.ok ? <p role="status" className="text-sm text-green-700">{t('campaigns.testSent', { to: test.to ?? '' })}</p> : null}
              {test.error ? <p role="alert" className="text-sm text-destructive">{test.error === 'sendFailed' ? t('campaigns.testFailed', { detail: test.detail ?? '' }) : t(`errors.${test.error}`)}</p> : null}
            </div>
          </FormSection>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" name="intent" value="save" disabled={saving}>{t('campaigns.saveDraft')}</Button>
            <ActionMessage state={state} />
            {dirty ? <span className="text-xs text-amber-700">{t('campaigns.unsaved')}</span> : null}
          </div>
        </form>

        {c ? (
          <FormSection title={t('campaigns.sectionSend')}>
            <form onSubmit={submitStart} className="grid gap-3 text-sm">
              <input type="hidden" name="id" value={c.id} />
              <fieldset className="grid gap-2">
                <legend className="sr-only">{t('campaigns.sectionSend')}</legend>
                <label className="flex items-center gap-2">
                  <input type="radio" name="when" value="now" checked={mode === 'now'} onChange={() => setMode('now')} /> {t('campaigns.sendNow')}
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="when" value="later" checked={mode === 'later'} onChange={() => setMode('later')} /> {t('campaigns.sendLater')}
                </label>
              </fieldset>
              {mode === 'later' ? (
                <div className="grid gap-1 sm:max-w-xs">
                  <Label htmlFor="cm-scheduledAt">{t('campaigns.scheduledAt')}</Label>
                  <Input id="cm-scheduledAt" name="scheduledAt" type="datetime-local" required />
                  <p className="text-xs text-muted-foreground">{t('campaigns.scheduledHint')}</p>
                </div>
              ) : null}
              <label className="flex items-start gap-2">
                <input type="checkbox" name="confirm" required className="mt-1" />
                <span>{recipientCount === undefined ? t('campaigns.confirmSend') : t('campaigns.confirmSendCount', { count: recipientCount })}</span>
              </label>
              <p className="text-xs text-muted-foreground">{t('campaigns.sendHint', { limit: settings.hourly_limit })}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="sm" disabled={starting || dirty}>{mode === 'later' ? t('campaigns.schedule') : t('campaigns.start')}</Button>
                {dirty ? <span className="text-xs text-amber-700">{t('campaigns.saveFirst')}</span> : null}
              </div>
              <div aria-live="polite">
                {start.error ? <p role="alert" className="text-sm text-destructive">{t(`campaigns.startErrors.${start.error}`)}</p> : null}
                {start.ok ? <p role="status" className="text-sm text-green-700">{t('campaigns.started', { count: start.count ?? 0 })}</p> : null}
              </div>
            </form>
          </FormSection>
        ) : (
          <p className="text-sm text-muted-foreground">{t('campaigns.saveToSend')}</p>
        )}
      </div>

      <aside className="grid content-start gap-2 xl:sticky xl:top-4 xl:self-start">
        <h2 className="text-base font-semibold">{t('campaigns.preview')}</h2>
        <p className="text-xs text-muted-foreground">{t('campaigns.previewHint')}</p>
        <div className="rounded-md border bg-card p-3 text-sm">
          <p className="truncate font-medium">{subject || t('campaigns.subject')}</p>
          <p className="truncate text-xs text-muted-foreground">{preheader}</p>
        </div>
        <iframe title={t('campaigns.preview')} srcDoc={html} sandbox="" className="h-[36rem] w-full rounded-md border bg-white" />
      </aside>
    </div>
  );
}
