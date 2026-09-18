// Canlı SEO paneli (02-ADMIN-PANEL): 17 maddelik anlık kontrol. Saf: DOM/ağ yok; admin formunda ve testte çalışır.
// Metin karşılaştırmaları toLocaleLowerCase('tr') ile (K-16: toLowerCase yasak).
import { slugify } from '@/lib/slugify';

export type Light = 'green' | 'yellow' | 'red' | 'gray';

export interface SeoCheck {
  readonly key: SeoCheckKey;
  readonly light: Light;
  /** Kısa ölçüm: "54 karakter", "%0,7" gibi — etiket mesaj dosyasından. */
  readonly detail: string;
}

export type SeoCheckKey =
  | 'titleLength'
  | 'keywordInTitle'
  | 'metaLength'
  | 'keywordInSlug'
  | 'keywordInIntro'
  | 'headingHierarchy'
  | 'keywordDensity'
  | 'contentLength'
  | 'imageAlt'
  | 'internalLinks'
  | 'externalLinks'
  | 'readability'
  | 'coverAndOg'
  | 'authorAssigned'
  | 'faqBlock'
  | 'keywordUnique'
  | 'contentOverlap';

export interface SeoInput {
  readonly title: string;
  readonly slug: string;
  readonly metaDescription: string;
  readonly body: string;
  readonly focusKeyword: string;
  readonly hasCover: boolean;
  readonly hasOgImage: boolean;
  readonly hasAuthor: boolean;
  /** Diğer yazıların odak kelimeleri (aynı dil). */
  readonly otherKeywords: readonly string[];
  /** Diğer yazıların ilk 300 kelimesi (örtüşme ölçümü); yoksa boş. */
  readonly otherIntros?: readonly string[];
  readonly locale: 'tr' | 'en';
}

export interface SeoReport {
  readonly checks: readonly SeoCheck[];
  readonly score: number;
  readonly light: Light;
}

const WEIGHT: Readonly<Record<Light, number>> = { green: 1, yellow: 0.5, red: 0, gray: 0.5 };

function lower(text: string, locale: 'tr' | 'en'): string {
  return text.toLocaleLowerCase(locale);
}

function words(text: string): string[] {
  return text
    .replace(/[#>*_`\[\]()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function firstParagraph(body: string): string {
  const blocks = body.replace(/\r\n?/g, '\n').split(/\n\s*\n/);
  return blocks.find((b) => b.trim() && !b.trim().startsWith('#')) ?? '';
}

/** Ardışık başlık seviyeleri atlamıyor mu (# → h2 başlar; h2→h4 sıçraması hata). */
function headingHierarchyOk(body: string): { ok: boolean; count: number } {
  let prev = 1;
  let count = 0;
  for (const line of body.split('\n')) {
    const m = /^(#{1,3})\s+/.exec(line);
    if (!m) continue;
    count++;
    const level = m[1]!.length + 1;
    if (level > prev + 1) return { ok: false, count };
    prev = level;
  }
  return { ok: true, count };
}

function overlapRatio(a: string, b: string): number {
  const setA = new Set(words(a).map((w) => w.toLocaleLowerCase('tr')));
  const setB = new Set(words(b).map((w) => w.toLocaleLowerCase('tr')));
  if (setA.size === 0 || setB.size === 0) return 0;
  let common = 0;
  for (const w of setA) if (setB.has(w)) common++;
  return common / Math.min(setA.size, setB.size);
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const { locale } = input;
  const kw = lower(input.focusKeyword.trim(), locale);
  const title = input.title.trim();
  const body = input.body;
  const bodyWords = words(body);
  const wordCount = bodyWords.length;
  const checks: SeoCheck[] = [];
  const push = (key: SeoCheckKey, light: Light, detail: string) => checks.push({ key, light, detail });

  const tl = title.length;
  push('titleLength', tl >= 50 && tl <= 60 ? 'green' : tl >= 35 && tl <= 70 ? 'yellow' : 'red', `${tl}`);

  if (!kw) push('keywordInTitle', 'gray', '—');
  else {
    const idx = lower(title, locale).indexOf(kw);
    push('keywordInTitle', idx >= 0 && idx < 40 ? 'green' : idx >= 0 ? 'yellow' : 'red', idx >= 0 ? `${idx}` : '0');
  }

  const ml = input.metaDescription.trim().length;
  push('metaLength', ml >= 120 && ml <= 160 ? 'green' : ml > 0 && ml <= 200 ? 'yellow' : 'red', `${ml}`);

  push('keywordInSlug', !kw ? 'gray' : `-${input.slug}-`.includes(`-${slugify(input.focusKeyword)}-`) || input.slug.includes(slugify(input.focusKeyword)) ? 'green' : 'red', input.slug);

  push('keywordInIntro', !kw ? 'gray' : lower(firstParagraph(body), locale).includes(kw) ? 'green' : 'red', '');

  const hh = headingHierarchyOk(body);
  push('headingHierarchy', hh.count === 0 ? 'yellow' : hh.ok ? 'green' : 'red', `${hh.count}`);

  if (!kw || wordCount === 0) push('keywordDensity', 'gray', '—');
  else {
    const kwWords = kw.split(/\s+/).length;
    const text = lower(bodyWords.join(' '), locale);
    let occurrences = 0;
    let pos = text.indexOf(kw);
    while (pos >= 0) {
      occurrences++;
      pos = text.indexOf(kw, pos + kw.length);
    }
    const density = (occurrences * kwWords * 100) / wordCount;
    push('keywordDensity', density >= 0.5 && density <= 2.5 ? 'green' : density > 0 && density <= 4 ? 'yellow' : 'red', density.toFixed(1));
  }

  push('contentLength', wordCount >= 600 ? 'green' : wordCount >= 300 ? 'yellow' : 'red', `${wordCount}`);

  push('imageAlt', input.hasCover ? 'green' : 'yellow', '');

  const internal = (body.match(/\]\(\/[^)]*\)/g) ?? []).length;
  push('internalLinks', internal >= 2 ? 'green' : internal === 1 ? 'yellow' : 'red', `${internal}`);

  const external = (body.match(/\]\(https?:\/\/[^)]*\)/g) ?? []).length;
  push('externalLinks', external >= 1 && external <= 3 ? 'green' : external === 0 ? 'yellow' : 'yellow', `${external}`);

  const sentences = body
    .replace(/[#>*_`]/g, ' ')
    .split(/[.!?]+\s/)
    .map((s) => words(s).length)
    .filter((n) => n > 0);
  const avg = sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0;
  push('readability', avg === 0 ? 'gray' : avg <= 20 ? 'green' : avg <= 28 ? 'yellow' : 'red', avg ? avg.toFixed(0) : '—');

  push('coverAndOg', input.hasCover && input.hasOgImage ? 'green' : input.hasCover ? 'yellow' : 'red', '');

  push('authorAssigned', input.hasAuthor ? 'green' : 'red', '');

  push('faqBlock', /^#{1,3}\s+(sss|s\.s\.s|faq|sık sorulan|frequently asked)/im.test(body) ? 'green' : 'yellow', ''); // static-ok: başlık deseni, görünen metin değil

  push('keywordUnique', !kw ? 'gray' : input.otherKeywords.some((k) => lower(k, locale) === kw) ? 'red' : 'green', '');

  const intros = input.otherIntros ?? [];
  if (intros.length === 0 || wordCount === 0) push('contentOverlap', 'gray', '—');
  else {
    const mine = bodyWords.slice(0, 300).join(' ');
    const worst = Math.max(...intros.map((o) => overlapRatio(mine, o)));
    push('contentOverlap', worst < 0.6 ? 'green' : worst < 0.8 ? 'yellow' : 'red', `${Math.round(worst * 100)}`);
  }

  const scored = checks.filter((c) => c.light !== 'gray');
  const score = scored.length ? Math.round((scored.reduce((a, c) => a + WEIGHT[c.light], 0) / scored.length) * 100) : 0;
  return { checks, score, light: score >= 80 ? 'green' : score >= 55 ? 'yellow' : 'red' };
}
