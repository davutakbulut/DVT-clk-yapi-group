'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { slugify } from '@/lib/slugify';
import { analyzeSeo, type SeoReport } from '../../domain/seoAnalysis';

interface Props {
  readonly formId: string;
  readonly otherKeywords: Readonly<Record<'tr' | 'en', readonly string[]>>;
  readonly otherIntros: Readonly<Record<'tr' | 'en', readonly string[]>>;
  readonly hasAuthorChoice: boolean;
}

const DOT: Record<string, string> = { green: '🟢', yellow: '🟡', red: '🔴', gray: '⚪' }; // static-ok: durum işareti, metin değil

/** Canlı SEO paneli (02-ADMIN-PANEL): formun `input` olaylarını dinler, TR sekmesini analiz eder. Saf analiz: domain/seoAnalysis. */
export function SeoPanel({ formId, otherKeywords, otherIntros, hasAuthorChoice }: Props) {
  const t = useTranslations('Admin');
  const [locale, setLocale] = useState<'tr' | 'en'>('tr');
  const [report, setReport] = useState<SeoReport | null>(null);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const read = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? '';
    const compute = () => {
      const suffix = locale === 'tr' ? 'Tr' : 'En';
      const title = read(`title${suffix}`);
      const slug = read(`slug${suffix}`) || (locale === 'tr' ? slugify(title) : '');
      setReport(
        analyzeSeo({
          title,
          slug,
          metaDescription: read(`seoDescription${suffix}`) || read(`excerpt${suffix}`),
          body: read(`body${suffix}`),
          focusKeyword: read(`focusKeyword${suffix}`),
          hasCover: read('coverImageId') !== '',
          hasOgImage: read('ogImageId') !== '' || read('coverImageId') !== '',
          hasAuthor: hasAuthorChoice && read('authorId') !== '',
          otherKeywords: otherKeywords[locale],
          otherIntros: otherIntros[locale],
          locale,
        }),
      );
    };
    compute();
    form.addEventListener('input', compute);
    form.addEventListener('change', compute);
    return () => {
      form.removeEventListener('input', compute);
      form.removeEventListener('change', compute);
    };
  }, [formId, locale, otherKeywords, otherIntros, hasAuthorChoice]);

  return (
    <aside aria-label={t('seoPanel.title')} className="grid content-start gap-3 rounded-md border bg-card p-4 text-sm lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t('seoPanel.title')}</h2>
        <div role="group" aria-label={t('common.tr')} className="flex gap-1 text-xs">
          {(['tr', 'en'] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l} className={`rounded px-2 py-1 uppercase ${locale === l ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {report ? (
        <>
          <p className="text-2xl font-semibold" aria-live="polite">
            {t('seoPanel.score')}: {report.score}/100 <span aria-hidden="true">{DOT[report.light]}</span>
          </p>
          <ol className="grid gap-1">
            {report.checks.map((c) => (
              <li key={c.key} className="flex items-baseline gap-2">
                <span aria-hidden="true">{DOT[c.light]}</span>
                <span className="sr-only">{c.light}</span>
                <span className="flex-1">{t(`seoPanel.${c.key}`)}</span>
                {c.detail ? <span className="font-mono text-xs text-muted-foreground">{c.detail}</span> : null}
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </aside>
  );
}
