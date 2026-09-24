import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import type { AppHref } from '@/i18n/navigation';

/** Ortak sayfa bölümleri (K-106): hero, numaralı süreç, "neden", CTA bandı. Tüm metinler veriden gelir; boş liste → bölüm yok. */
export function PageHero({ eyebrow, title, lede, children }: { readonly eyebrow: string; readonly title: string; readonly lede?: string; readonly children?: ReactNode }) {
  if (!title) return null;
  return (
    <header className="page-hero">
      <p className="label-mono text-[var(--color-accent-text)]">{eyebrow}</p>
      <div className="page-hero-row">
        <h1 className="page-hero-title">{title.split('\n').map((l, i) => (i === 0 ? l : <span key={i}><br />{l}</span>))}</h1>
        {lede ? <p className="page-hero-lede">{lede}</p> : null}
      </div>
      {children}
    </header>
  );
}

export function NumberedSteps({ title, items, id }: { readonly title: string; readonly items: readonly { readonly title: string; readonly text: string }[]; readonly id?: string }) {
  if (items.length === 0) return null;
  return (
    <section className="page-block" id={id} aria-labelledby={`${id ?? 'steps'}-h`}>
      <h2 id={`${id ?? 'steps'}-h`} className="page-block-title">{title}</h2>
      <ol className="steps">
        {items.map((s, i) => (
          <li key={i}><span className="label-mono text-[var(--color-accent-text)]">{String(i + 1).padStart(2, '0')}</span><strong>{s.title}</strong><p>{s.text}</p></li>
        ))}
      </ol>
    </section>
  );
}

export function WhyGrid({ title, lede, items }: { readonly title: string; readonly lede?: string; readonly items: readonly { readonly title: string; readonly text: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section className="page-block" aria-labelledby="why-h">
      <div className="ghead"><h2 id="why-h" className="page-block-title">{title}</h2>{lede ? <p>{lede}</p> : null}</div>
      <ul className="why-grid">
        {items.map((w, i) => <li key={i}><strong>{w.title}</strong><p>{w.text}</p></li>)}
      </ul>
    </section>
  );
}

export function CtaBand({ title, lede, primaryLabel, phone, phoneLabel }: { readonly title: string; readonly lede?: string; readonly primaryLabel: string; readonly phone: string | null; readonly phoneLabel: string | null }) {
  if (!title) return null;
  return (
    <section className="cta-band" data-on-dark="">
      <div>
        <h2 className="cta-band-title">{title.split('\n').map((l, i) => (i === 0 ? l : <span key={i}><br />{l}</span>))}</h2>
        {lede ? <p className="cta-band-lede">{lede}</p> : null}
      </div>
      <div className="cta-band-acts">
        <Link href={'/get-quote' as AppHref} className="btn btn-mark">{primaryLabel}</Link>
        {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="btn btn-outline-light">{phoneLabel ?? phone}</a> : null}
      </div>
    </section>
  );
}
