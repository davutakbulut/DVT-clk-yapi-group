// Güvenli, küçük Markdown → HTML (K-53). Tiptap yerine v1'de Markdown: sunucuda render edilir, çıktı yalnız izinli
// etiketlerden oluşur ve her metin parçası kaçırılır → dangerouslySetInnerHTML'e sanitize edilmiş HTML gider.
// Desteklenen: # başlıklar (h2–h4, id'li), paragraf, - listeler, 1. listeler, **kalın**, *italik*, [bağlantı](https://…), > alıntı, --- çizgi.
import { slugify } from './slugify';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SAFE_HREF = /^(https?:\/\/|\/|mailto:|tel:)/i;

function inline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]+)\]\(([^\s]+)\)/g, (_m, label: string, href: string) => {
    if (!SAFE_HREF.test(href)) return label;
    const external = /^https?:\/\//i.test(href) && !href.startsWith('/');
    return `<a href="${href}"${external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

export interface MarkdownHeading {
  readonly level: 2 | 3 | 4;
  readonly text: string;
  readonly id: string;
}

const HEADING = /^(#{1,3})\s+(.+)$/;

/** Başlık listesi (içindekiler). id'ler renderMarkdown ile birebir aynı; çakışan id'ye -2, -3 eklenir. */
export function extractHeadings(source: string): MarkdownHeading[] {
  const seen = new Map<string, number>();
  const out: MarkdownHeading[] = [];
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const m = HEADING.exec(raw.trimEnd());
    if (!m) continue;
    const level = Math.min(m[1]!.length + 1, 4) as 2 | 3 | 4;
    const text = m[2]!.replace(/[*_`]/g, '').trim();
    const base = slugify(text) || 'baslik';
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ level, text, id: n === 1 ? base : `${base}-${n}` });
  }
  return out;
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const headings = extractHeadings(source);
  let headingIndex = 0;
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = HEADING.exec(line);
    const ul = /^[-*]\s+(.+)$/.exec(line);
    const ol = /^\d+[.)]\s+(.+)$/.exec(line);
    if (line.trim() === '') {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1]!.length + 1, 4); // # → h2: sayfada tek h1 (01-DESIGN-SYSTEM)
      const id = headings[headingIndex++]?.id;
      html.push(`<h${level}${id ? ` id="${id}"` : ''}>${inline(heading[2]!)}</h${level}>`);
    } else if (line === '---') {
      flushParagraph();
      flushList();
      html.push('<hr />');
    } else if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      html.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`);
    } else if (ul || ol) {
      flushParagraph();
      const type = ul ? 'ul' : 'ol';
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((ul ?? ol)![1]!);
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return html.join('\n');
}

/** Düz metin özeti (meta description, kart özeti): Markdown işaretleri atılır. */
export function markdownToText(source: string, maxLength = 160): string {
  const text = source
    .replace(/[#>*_`]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

/** Yaklaşık okuma süresi (dk): 200 kelime/dk. */
export function readingMinutes(source: string): number {
  const words = source.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
