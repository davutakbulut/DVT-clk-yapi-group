'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { TechDrawing } from '@/ui/TechDrawing';
import type { CategoryRef, ProjectCardData } from '../../data/projectsRepository';
import { ProjectCard } from './ProjectCard';

type PhaseFilter = 'all' | 'done' | 'open';
interface Props {
  readonly locale: string;
  readonly supabaseUrl: string | null;
  readonly items: readonly ProjectCardData[];
  readonly categories: readonly CategoryRef[];
  /** Kategori sayfasından gelindiyse (JS'siz yol) o kategori seçili başlar. */
  readonly initialCategory?: string;
  readonly emptyTitle: string;
  readonly emptyText: string;
}

/** Proje tarayıcı (K-106): kategori çipleri (adetli) + durum sekmeleri + sayaç + kart ızgarası + boş durum. Kategori seçimi ?kategori= ile paylaşılır. */
export function ProjectsBrowser({ locale, supabaseUrl, items, categories, initialCategory, emptyTitle, emptyText }: Props) {
  const t = useTranslations('Projects');
  const [cat, setCat] = useState<string>(initialCategory ?? 'all');
  const [phase, setPhase] = useState<PhaseFilter>('all');
  useEffect(() => {
    if (initialCategory) return;
    try { const q = new URLSearchParams(window.location.search).get('kategori'); if (q && categories.some((c) => c.slug === q)) setCat(q); } catch { /* yok say */ }
  }, [initialCategory, categories]);
  const pick = (slug: string) => {
    setCat(slug);
    try { const u = new URL(window.location.href); if (slug === 'all') u.searchParams.delete('kategori'); else u.searchParams.set('kategori', slug); history.replaceState(null, '', u); } catch { /* yok say */ }
  };
  const count = (slug: string) => (slug === 'all' ? items.length : items.filter((p) => p.categories.some((c) => c.slug === slug)).length);
  const list = items.filter((p) => (cat === 'all' || p.categories.some((c) => c.slug === cat)) && (phase === 'all' || (phase === 'done' ? p.phase === 'completed' : p.phase !== 'completed')));
  const current = cat === 'all' ? null : categories.find((c) => c.slug === cat) ?? null;
  const tabs: readonly { key: PhaseFilter; label: string }[] = [{ key: 'all', label: t('phaseAll') }, { key: 'done', label: t('phaseDone') }, { key: 'open', label: t('phaseOpen') }];
  return (
    <div>
      <section aria-label={t('filters')}>
        <div className="proj-cats" role="group" aria-label={t('category')}>
          <button type="button" aria-pressed={cat === 'all'} onClick={() => pick('all')}>{t('allCategories')}<span className="n">{count('all')}</span></button>
          {categories.map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.slug} onClick={() => pick(c.slug)}>{c.name}<span className="n">{count(c.slug)}</span></button>
          ))}
        </div>
        <div className="proj-bar">
          <div className="proj-tabs" role="group" aria-label={t('status')}>
            {tabs.map((tab) => <button key={tab.key} type="button" aria-pressed={phase === tab.key} onClick={() => setPhase(tab.key)}>{tab.label}</button>)}
          </div>
          <p className="proj-count" aria-live="polite">{current ? current.name : t('allCategories')} · {t('count', { count: list.length })}</p>
        </div>
      </section>
      {list.length === 0 ? (
        <div className="proj-empty">
          <div className="tech-art"><TechDrawing name={current?.drawing ?? 'proje'} /></div>
          <div>
            <h3>{emptyTitle.replace('{category}', current ? current.name : t('allCategories'))}</h3>
            <p>{emptyText}</p>
            <Link href="/get-quote" className="btn btn-primary">{t('emptyButton')}</Link>
          </div>
        </div>
      ) : (
        <ul className="proj-grid">
          {list.map((p, i) => (
            <li key={p.id} className={i === 0 && list.length > 2 && cat === 'all' ? 'proj-wide' : undefined}>
              <ProjectCard project={p} locale={locale} supabaseUrl={supabaseUrl} headingLevel="h2" wide={i === 0 && list.length > 2 && cat === 'all'} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
