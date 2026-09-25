import { Link } from '@/i18n/navigation';
import type { AppHref } from '@/i18n/navigation';
import { ConfiguratorGlyph, type GlyphKey } from '@/ui/ConfiguratorGlyph';

interface Props {
  readonly title: string;
  readonly lead?: string;
  readonly button: string;
  readonly href: AppHref;
  readonly glyph?: GlyphKey;
  readonly secondary?: { readonly label: string; readonly href: AppHref };
}

/** "Kendiniz inşa etmek ister misiniz?" bandı (K-107): ızgaralı koyu zemin, çizgisel şema, altın düğme. Metin veriden gelir. */
export function ConfiguratorBanner({ title, lead, button, href, glyph = 'hall', secondary }: Props) {
  if (!title) return null;
  return (
    <aside className="cfg-banner" data-on-dark="" aria-label={title}>
      <div className="cfg-banner-art" aria-hidden="true"><ConfiguratorGlyph type={glyph} /></div>
      <div className="cfg-banner-body">
        <p className="cfg-banner-title">{title}</p>
        {lead ? <p className="cfg-banner-lead">{lead}</p> : null}
        <div className="cfg-banner-acts">
          <Link href={href} className="btn btn-mark">{button} →</Link>
          {secondary ? <Link href={secondary.href} className="btn btn-outline-light">{secondary.label}</Link> : null}
        </div>
      </div>
    </aside>
  );
}
