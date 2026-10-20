// İçerik RPC'leri (K-116): slug ile detay, eski slug çözümü, site araması, sıralama, panel sayaçları.
// get_*_by_slug (fiyat rehberi hariç), resolve_old_slug, reorder_*, admin_dashboard_counts SECURITY INVOKER'dı → her tablo
// çağıranın RLS'iyle okunur (readable). get_price_guide_by_slug ve search_site DEFINER'dı → kuralsız, süzgeç sorguda.
import { escape, type PoolConnection } from 'mysql2/promise';
import type { Actor } from '../pool';
import { at, DEFINER, elements, readable, textAt, updatable, uuidList } from './contentHelpers';
import { btrim, charLen, denied, invalid, select, toInt } from './pgCast';
import type { RpcHandler } from './registry';

type Loc = 'tr' | 'en';
type Row = Record<string, unknown>;
type Read = (table: string) => string;

const asLocale = (v: unknown): Loc | null => (v === 'tr' || v === 'en' ? v : null);

// ---------------------------------------------------------------- SQL parçaları (dil yalnız 'tr'|'en' → gömülür)

const B = (e: string) => `IF((${e}) IS NULL, NULL, IF(${e}, JSON_EXTRACT('true', '$'), JSON_EXTRACT('false', '$')))`;
const TS = (e: string) => `DATE_FORMAT(${e}, '%Y-%m-%dT%H:%i:%s.%f+00:00')`;
const D = (e: string) => `DATE_FORMAT(${e}, '%Y-%m-%d')`;
const J = (e: string) => `JSON_EXTRACT(${e}, '$')`;
/** ASC NULLS LAST (PostgreSQL varsayılanı; MariaDB null'ı başa koyar). */
const asc = (e: string) => `(${e}) IS NULL, ${e}`;
/** coalesce(x, '') <> '' — MariaDB PAD SPACE karşılaştırması boşluklu metni boş sayardı. */
const filled = (e: string) => `CHAR_LENGTH(COALESCE(${e}, '')) > 0`;
const nullIfEmpty = (e: string) => `IF(CHAR_LENGTH(${e}) = 0, NULL, ${e})`;
const NOW = 'UTC_TIMESTAMP(6)';
const live = (a: string) => `${a}.status = 'published' AND (${a}.published_at IS NULL OR ${a}.published_at <= ${NOW})`;
/** coalesce((select jsonb_agg(...)), '[]') */
const agg = (obj: string, from: string, order?: string) => `COALESCE((SELECT JSON_ARRAYAGG(${obj}${order ? ` ORDER BY ${order}` : ''}) FROM ${from}), JSON_ARRAY())`;

function frag(l: Loc, R: Read) {
  const t = (col: string) => `JSON_VALUE(${col}, '$.${l}')`;
  const has = (col: string) => `JSON_CONTAINS(${col}, '"${l}"')`;
  const media = (m: string, full: boolean) =>
    `JSON_OBJECT('bucket', ${m}.storage_bucket, 'path', ${m}.storage_path, 'width', ${m}.width, 'height', ${m}.height${full ? `, 'alt', ${t(`${m}.alt`)}, 'blur', ${m}.blur_data_url, 'variants', ${J(`${m}.variants`)}` : ''})`;
  const mediaOf = (id: string, full: boolean, m = 'm0') => `(SELECT ${media(m, full)} FROM ${R('media_library')} ${m} WHERE ${m}.id = ${id} LIMIT 1)`;
  return {
    t,
    has,
    media,
    mediaOf,
    /** Slug eşleşmesi: üretilmiş sütun (indeks) + ikili karşılaştırma (tablo harmanlaması büyük/küçük harf duyarsız). */
    slugIs: (a: string, slug: string) => `${a}.slug_${l} = ${escape(slug)} AND BINARY ${a}.slug_${l} = ${escape(slug)}`,
    alternates: (a: string) =>
      `JSON_OBJECT('tr', IF(JSON_CONTAINS(${a}.published_locales, '"tr"'), ${a}.slug_tr, NULL), 'en', IF(JSON_CONTAINS(${a}.published_locales, '"en"'), ${a}.slug_en, NULL))`,
    seo: (a: string, ...extra: string[]) =>
      `JSON_OBJECT('title', ${t(`${a}.seo_title`)}, 'description', ${t(`${a}.seo_description`)}, 'canonical_url', ${a}.canonical_url, 'noindex', ${B(`${a}.noindex`)}${extra.map((x) => `, ${x}`).join('')})`,
    faqs: (entity: string, id: string) =>
      agg(
        `JSON_OBJECT('question', ${t('f.question')}, 'answer', ${t('f.answer')})`,
        `${R('faqs')} f WHERE f.entity_type = '${entity}' AND f.entity_id = ${id} AND f.status = 'published' AND ${has('f.published_locales')}`,
        asc('f.sort_order'),
      ),
    image: (i: string, m: string, caption: boolean) =>
      `JSON_OBJECT('bucket', ${m}.storage_bucket, 'path', ${m}.storage_path, 'width', ${m}.width, 'height', ${m}.height, 'alt', COALESCE(${nullIfEmpty(t(`${i}.alt`))}, ${t(`${m}.alt`)})${caption ? `, 'caption', ${t(`${i}.caption`)}` : ''}, 'blur', ${m}.blur_data_url, 'variants', ${J(`${m}.variants`)})`,
  };
}

/** Tek satırlık jsonb sonucu (sql fonksiyonu ilk satırı döndürür; satır yoksa null). */
async function one(conn: PoolConnection, sql: string): Promise<Row | null> {
  const [row] = await select<{ r: unknown }>(conn, sql);
  if (!row) return null;
  return (typeof row.r === 'string' ? JSON.parse(row.r) : row.r) as Row;
}

/** jsonb_array_elements(x) → o dildeki alanlar; `required` alanı boş olan öğe düşer. */
function localized(raw: unknown, l: Loc, keys: readonly string[], required: readonly string[]): Row[] {
  return elements(raw)
    .filter((e) => required.every((k) => (textAt(e, k, l) ?? '') !== ''))
    .map((e) => Object.fromEntries(keys.map((k) => [k, textAt(e, k, l)])));
}
const cta = (raw: unknown, l: Loc) => ({ title: textAt(raw, 'title', l), lead: textAt(raw, 'lead', l), button: textAt(raw, 'button', l) });

function slugArgs(args: Row): { l: Loc; slug: string } | null {
  const l = asLocale(args['p_locale']);
  const slug = args['p_slug'];
  return l && typeof slug === 'string' ? { l, slug } : null;
}

// ---------------------------------------------------------------- slug ile detay

const getProductBySlug: RpcHandler = async (conn, actor, args) => {
  const a = slugArgs(args);
  if (!a) return null;
  const R: Read = (tb) => readable(actor, tb);
  const f = frag(a.l, R);
  const { t, has } = f;
  return one(
    conn,
    `SELECT JSON_OBJECT(
      'id', p.id, 'slug', ${t('p.slug')}, 'name', ${t('p.name')}, 'short_description', ${t('p.short_description')}, 'description', ${t('p.description')},
      'usage_areas', ${t('p.usage_areas')}, 'is_featured', ${B('p.is_featured')}, 'options', ${J('p.options')}, 'facts', ${J('p.facts')},
      'published_at', ${TS('p.published_at')}, 'updated_at', ${TS('p.updated_at')},
      'seo', ${f.seo('p', `'og_image', ${f.mediaOf('p.og_image_id', false)}`)},
      'alternates', ${f.alternates('p')},
      'cover', ${f.mediaOf('p.cover_image_id', true)},
      'category', (SELECT JSON_OBJECT('id', c.id, 'slug', ${t('c.slug')}, 'name', ${t('c.name')}) FROM ${R('product_categories')} c
                    WHERE c.id = p.category_id AND c.is_active AND ${t('c.slug')} IS NOT NULL LIMIT 1),
      'service', (SELECT JSON_OBJECT('slug', ${t('s.slug')}, 'title', ${t('s.title')}) FROM ${R('services')} s
                   WHERE s.id = p.service_id AND s.status = 'published' AND ${has('s.published_locales')} LIMIT 1),
      'images', ${agg(f.image('i', 'm', false), `${R('product_images')} i JOIN ${R('media_library')} m ON m.id = i.media_id WHERE i.product_id = p.id`, asc('i.sort_order'))},
      'specs', ${agg(
        `JSON_OBJECT('group', ${t('s.group_name')}, 'name', ${t('s.name')}, 'value', ${t('s.value')}, 'unit', s.unit)`,
        `${R('product_specs')} s WHERE s.product_id = p.id AND ${filled(t('s.name'))}`,
        asc('s.sort_order'),
      )},
      'variants', ${agg(
        `JSON_OBJECT('id', v.id, 'size_label', v.size_label, 'size_key', v.size_key, 'width_mm', v.width_mm, 'height_mm', v.height_mm, 'thickness_mm', v.thickness_mm,
                     'length_mm', v.length_mm, 'kg_per_m', v.kg_per_m, 'kg_per_m2', v.kg_per_m2, 'stock_code', v.stock_code, 'dims', ${J('v.dims')},
                     'variant_group', COALESCE(JSON_VALUE(v.variant_group, '$.code'), ${t('v.variant_group')}, JSON_VALUE(v.variant_group, '$.tr')), 'props', ${J('v.props')})`,
        `${R('product_variants')} v WHERE v.product_id = p.id AND v.is_active`,
        asc('v.sort_order'),
      )},
      'documents', ${agg(
        `JSON_OBJECT('title', ${t('d.title')}, 'doc_type', d.doc_type, 'bucket', m.storage_bucket, 'path', m.storage_path, 'size_bytes', m.size_bytes)`,
        `${R('product_documents')} d JOIN ${R('media_library')} m ON m.id = d.media_id WHERE d.product_id = p.id AND ${has('d.locales')} AND ${filled(t('d.title'))}`,
        asc('d.sort_order'),
      )},
      'projects', ${agg(
        `JSON_OBJECT('slug', ${t('pr.slug')}, 'title', ${t('pr.title')})`,
        `${R('service_projects')} sp JOIN ${R('projects')} pr ON pr.id = sp.project_id WHERE sp.service_id = p.service_id AND ${live('pr')} AND ${has('pr.published_locales')}`,
        asc('pr.sort_order'),
      )},
      'faqs', ${f.faqs('product', 'p.id')}
    ) AS r
    FROM ${R('products')} p WHERE ${f.slugIs('p', a.slug)} AND ${has('p.published_locales')} LIMIT 1`,
  );
};

const getProjectBySlug: RpcHandler = async (conn, actor, args) => {
  const a = slugArgs(args);
  if (!a) return null;
  const R: Read = (tb) => readable(actor, tb);
  const f = frag(a.l, R);
  const { t, has } = f;
  return one(
    conn,
    `SELECT JSON_OBJECT(
      'id', p.id, 'slug', ${t('p.slug')}, 'title', ${t('p.title')}, 'excerpt', ${t('p.excerpt')}, 'body', JSON_EXTRACT(p.body, '$.${a.l}'),
      'location', ${t('p.location')}, 'client_name', p.client_name, 'area_m2', p.area_m2, 'tonnage', p.tonnage,
      'started_on', ${D('p.started_on')}, 'completed_on', ${D('p.completed_on')}, 'published_at', ${TS('p.published_at')}, 'updated_at', ${TS('p.updated_at')},
      'seo', ${f.seo('p')},
      'alternates', ${f.alternates('p')},
      'cover', ${f.mediaOf('p.cover_image_id', true)},
      'images', ${agg(f.image('i', 'm', true), `${R('project_images')} i JOIN ${R('media_library')} m ON m.id = i.media_id WHERE i.project_id = p.id`, asc('i.sort_order'))},
      'categories', ${agg(
        `JSON_OBJECT('slug', ${t('c.slug')}, 'name', ${t('c.name')})`,
        `${R('project_category_relations')} r JOIN ${R('project_categories')} c ON c.id = r.category_id WHERE r.project_id = p.id AND ${t('c.slug')} IS NOT NULL`,
        asc('c.sort_order'),
      )},
      'services', ${agg(
        `JSON_OBJECT('slug', ${t('s.slug')}, 'title', ${t('s.title')})`,
        `${R('service_projects')} sp JOIN ${R('services')} s ON s.id = sp.service_id WHERE sp.project_id = p.id AND ${has('s.published_locales')}`,
        asc('s.sort_order'),
      )}
    ) AS r
    FROM ${R('projects')} p WHERE ${f.slugIs('p', a.slug)} AND ${has('p.published_locales')} LIMIT 1`,
  );
};

/** Hizmet/çözüm sayfalarındaki proje kartı (kapaklı). */
const projectCard = (f: ReturnType<typeof frag>) =>
  `JSON_OBJECT('slug', ${f.t('p.slug')}, 'title', ${f.t('p.title')}, 'location', ${f.t('p.location')}, 'cover', ${f.mediaOf('p.cover_image_id', true, 'm1')})`;

const getServiceBySlug: RpcHandler = async (conn, actor, args) => {
  const a = slugArgs(args);
  if (!a) return null;
  const R: Read = (tb) => readable(actor, tb);
  const f = frag(a.l, R);
  const { t, has } = f;
  const r = await one(
    conn,
    `SELECT JSON_OBJECT(
      'id', s.id, 'slug', ${t('s.slug')}, 'title', ${t('s.title')}, 'excerpt', ${t('s.excerpt')}, 'body', ${t('s.body')}, 'icon', s.icon,
      'is_featured', ${B('s.is_featured')}, 'published_at', ${TS('s.published_at')}, 'updated_at', ${TS('s.updated_at')},
      'process_steps', ${J('s.process_steps')},
      'seo', ${f.seo('s', `'og_image', ${f.mediaOf('s.og_image_id', false)}`)},
      'alternates', ${f.alternates('s')},
      'cover', ${f.mediaOf('s.cover_image_id', true)},
      'images', ${agg(f.image('i', 'm', true), `${R('service_images')} i JOIN ${R('media_library')} m ON m.id = i.media_id WHERE i.service_id = s.id`, asc('i.sort_order'))},
      'projects', ${agg(projectCard(f), `${R('service_projects')} sp JOIN ${R('projects')} p ON p.id = sp.project_id WHERE sp.service_id = s.id AND ${live('p')} AND ${has('p.published_locales')}`, asc('p.sort_order'))},
      'faqs', ${f.faqs('service', 's.id')}
    ) AS r
    FROM ${R('services')} s WHERE ${f.slugIs('s', a.slug)} AND ${has('s.published_locales')} LIMIT 1`,
  );
  if (r) r['process_steps'] = localized(r['process_steps'], a.l, ['title', 'description'], ['title']);
  return r;
};

const getSolutionBySlug: RpcHandler = async (conn, actor, args) => {
  const a = slugArgs(args);
  if (!a) return null;
  const R: Read = (tb) => readable(actor, tb);
  const f = frag(a.l, R);
  const { t, has } = f;
  const r = await one(
    conn,
    `SELECT JSON_OBJECT(
      'id', s.id, 'slug', ${t('s.slug')}, 'title', ${t('s.title')}, 'hero_summary', ${t('s.hero_summary')}, 'problem', ${t('s.problem')},
      'technical_basis', ${t('s.technical_basis')}, 'published_at', ${TS('s.published_at')}, 'updated_at', ${TS('s.updated_at')},
      'comparison', ${J('s.comparison')}, 'advantages', ${J('s.advantages')}, 'cta', ${J('s.cta')},
      'seo', ${f.seo('s', `'og_image', ${f.mediaOf('s.og_image_id', false)}`)},
      'alternates', ${f.alternates('s')},
      'cover', ${f.mediaOf('s.cover_image_id', true)},
      'service', (SELECT JSON_OBJECT('slug', ${t('sv.slug')}, 'title', ${t('sv.title')}) FROM ${R('services')} sv
                   WHERE sv.id = s.service_id AND ${live('sv')} AND ${has('sv.published_locales')} LIMIT 1),
      'projects', COALESCE((SELECT JSON_ARRAYAGG(${projectCard(f)} ORDER BY ${asc('p.sort_order')} LIMIT 6)
                   FROM ${R('service_projects')} sp JOIN ${R('projects')} p ON p.id = sp.project_id
                  WHERE sp.service_id = s.service_id AND ${live('p')} AND ${has('p.published_locales')}), JSON_ARRAY()),
      'faqs', ${f.faqs('solution', 's.id')}
    ) AS r
    FROM ${R('solutions')} s WHERE ${f.slugIs('s', a.slug)} AND ${has('s.published_locales')} AND ${live('s')} LIMIT 1`,
  );
  if (!r) return null;
  const cmp = r['comparison'];
  r['comparison'] = {
    alternative: textAt(cmp, 'alternative', a.l),
    rows: localized(at(cmp, 'rows') ?? [], a.l, ['criterion', 'steel', 'alternative'], ['criterion']),
  };
  r['advantages'] = localized(r['advantages'], a.l, ['title', 'description'], ['title']);
  r['cta'] = cta(r['cta'], a.l);
  return r;
};

const getBlogPostBySlug: RpcHandler = async (conn, actor, args) => {
  const a = slugArgs(args);
  if (!a) return null;
  const R: Read = (tb) => readable(actor, tb);
  const f = frag(a.l, R);
  const { t, has } = f;
  return one(
    conn,
    `SELECT JSON_OBJECT(
      'id', b.id, 'slug', ${t('b.slug')}, 'title', ${t('b.title')}, 'excerpt', ${t('b.excerpt')}, 'body', ${t('b.body')},
      'reading_minutes', CAST(${t('b.reading_minutes')} AS SIGNED), 'is_featured', ${B('b.is_featured')}, 'allow_comments', ${B('b.allow_comments')},
      'published_at', ${TS('b.published_at')}, 'updated_at', ${TS('b.updated_at')},
      'seo', ${f.seo('b', `'focus_keyword', ${t('b.focus_keyword')}`, `'og_image', ${f.mediaOf('b.og_image_id', false)}`)},
      'alternates', ${f.alternates('b')},
      'cover', ${f.mediaOf('b.cover_image_id', true)},
      'category', (SELECT JSON_OBJECT('slug', ${t('c.slug')}, 'name', ${t('c.name')}) FROM ${R('blog_categories')} c
                    WHERE c.id = b.category_id AND c.is_active AND ${t('c.slug')} IS NOT NULL LIMIT 1),
      'tags', ${agg(
        `JSON_OBJECT('slug', ${t('tg.slug')}, 'name', ${t('tg.name')})`,
        `${R('blog_post_tags')} pt JOIN ${R('blog_tags')} tg ON tg.id = pt.tag_id WHERE pt.post_id = b.id AND ${t('tg.slug')} IS NOT NULL`,
        asc(t('tg.name')),
      )},
      'author', (SELECT JSON_OBJECT('name', tm.full_name, 'position', ${t('tm.position')}, 'bio', ${t('tm.bio')}, 'linkedin_url', tm.linkedin_url,
                                    'photo', ${f.mediaOf('tm.photo_id', true)})
                   FROM ${R('team_members')} tm WHERE tm.id = b.author_id AND tm.status = 'published' AND ${has('tm.published_locales')} LIMIT 1)
    ) AS r
    FROM ${R('blog_posts')} b WHERE ${f.slugIs('b', a.slug)} AND ${has('b.published_locales')} LIMIT 1`,
  );
};

const getPriceGuideBySlug: RpcHandler = async (conn, _actor, args) => {
  const a = slugArgs(args);
  if (!a) return null;
  const R: Read = (tb) => readable(DEFINER, tb);
  const f = frag(a.l, R);
  const { t, has } = f;
  return one(
    conn,
    `SELECT JSON_OBJECT(
      'id', g.id, 'slug', ${t('g.slug')}, 'title', ${t('g.title')}, 'intro', ${t('g.intro')}, 'factors', ${t('g.factors')}, 'formula', ${t('g.formula')},
      'disclaimer', COALESCE(${nullIfEmpty(t('g.disclaimer'))}, JSON_VALUE(g.disclaimer, '$.tr')),
      'quantity_unit', g.quantity_unit, 'quantity_presets', ${J('g.quantity_presets')}, 'vat_included', ${B('g.vat_included')},
      'prices_updated_at', ${TS('g.prices_updated_at')},
      'is_stale', ${B(`g.prices_updated_at IS NULL OR g.prices_updated_at + INTERVAL g.stale_after_days DAY < ${NOW}`)},
      'published_at', ${TS('g.published_at')}, 'updated_at', ${TS('g.updated_at')},
      'seo', ${f.seo('g', `'og_image', ${f.mediaOf('g.og_image_id', false)}`)},
      'alternates', ${f.alternates('g')},
      'service', (SELECT JSON_OBJECT('slug', ${t('sv.slug')}, 'title', ${t('sv.title')}) FROM ${R('services')} sv
                   WHERE sv.id = g.service_id AND ${live('sv')} AND ${has('sv.published_locales')} LIMIT 1),
      'rows', ${agg(
        `JSON_OBJECT('id', r.id, 'system_type', ${t('r.system_type')}, 'description', ${t('r.description')}, 'min_factor', r.min_factor, 'max_factor', r.max_factor,
                     'unit_price', m.unit_price, 'currency', m.currency, 'unit', m.unit, 'price_valid_from', ${D('m.valid_from')},
                     'min_price', IF(m.unit_price IS NULL, NULL, ROUND(m.unit_price * r.min_factor, 2)),
                     'max_price', IF(m.unit_price IS NULL, NULL, ROUND(m.unit_price * r.max_factor, 2)))`,
        `${R('price_guide_rows')} r LEFT JOIN ${R('material_prices')} m ON m.id = r.material_price_id WHERE r.price_guide_id = g.id AND ${filled(t('r.system_type'))}`,
        asc('r.sort_order'),
      )},
      'faqs', ${f.faqs('price_guide', 'g.id')}
    ) AS r
    FROM ${R('price_guides')} g WHERE ${f.slugIs('g', a.slug)} AND ${has('g.published_locales')} AND ${live('g')} LIMIT 1`,
  );
};

const getConfiguratorPageBySlug: RpcHandler = async (conn, actor, args) => {
  const a = slugArgs(args);
  if (!a) return null;
  const R: Read = (tb) => readable(actor, tb);
  const f = frag(a.l, R);
  const { t, has } = f;
  const r = await one(
    conn,
    `SELECT JSON_OBJECT(
      'id', c.id, 'configurator_key', c.configurator_key, 'slug', ${t('c.slug')}, 'title', ${t('c.title')}, 'hero_summary', ${t('c.hero_summary')},
      'body', ${t('c.body')}, 'published_at', ${TS('c.published_at')}, 'updated_at', ${TS('c.updated_at')},
      'benefits', ${J('c.benefits')}, 'steps', ${J('c.steps')}, 'faqs', ${J('c.faqs')}, 'cta', ${J('c.cta')},
      'seo', ${f.seo('c', `'og_image', ${f.mediaOf('c.og_image_id', false)}`)},
      'alternates', ${f.alternates('c')},
      'cover', ${f.mediaOf('c.cover_image_id', true)}
    ) AS r
    FROM ${R('configurator_pages')} c WHERE ${f.slugIs('c', a.slug)} AND ${live('c')} AND ${has('c.published_locales')} LIMIT 1`,
  );
  if (!r) return null;
  r['benefits'] = localized(r['benefits'], a.l, ['title', 'description'], ['title']);
  r['steps'] = localized(r['steps'], a.l, ['title', 'description'], ['title']);
  r['faqs'] = localized(r['faqs'], a.l, ['question', 'answer'], ['question', 'answer']);
  r['cta'] = cta(r['cta'], a.l);
  return r;
};

// ---------------------------------------------------------------- eski slug

const SLUG_TABLES: Readonly<Record<string, string>> = {
  service: 'services', solution: 'solutions', price_guide: 'price_guides', project: 'projects', project_category: 'project_categories',
  blog_post: 'blog_posts', blog_category: 'blog_categories', blog_tag: 'blog_tags', product: 'products', product_category: 'product_categories',
  job_posting: 'job_postings', static_page: 'static_pages', configurator_page: 'configurator_pages',
};

const resolveOldSlug: RpcHandler = async (conn, actor, args) => {
  const type = args['p_entity_type'];
  const l = asLocale(args['p_locale']);
  const old = args['p_old_slug'];
  const table = typeof type === 'string' && Object.hasOwn(SLUG_TABLES, type) ? SLUG_TABLES[type]! : null;
  if (!table || !l || typeof old !== 'string') return null;
  const [row] = await select<{ s: string | null }>(
    conn,
    `SELECT JSON_VALUE(t.slug, '$.${l}') AS s FROM ${readable(actor, 'slug_history')} h JOIN ${readable(actor, table)} t ON t.id = h.entity_id
      WHERE h.entity_type = ? AND h.locale = ? AND h.old_slug = ? AND BINARY h.old_slug = ? LIMIT 1`,
    [type, l, old, old],
  );
  return row?.s ?? null;
};

// ---------------------------------------------------------------- site araması

/** app_private.search_norm: Türkçe harfleri ASCII'ye çevirip küçültür. */
const NORM_FROM = 'ÇĞİÖŞÜçğıöşüÂÎÛâîû';
const NORM_TO = 'CGIOSUcgiosuAIUaiu';
export function searchNorm(s: string): string {
  return Array.from(s, (c) => {
    const i = NORM_FROM.indexOf(c);
    return i >= 0 ? NORM_TO[i]! : c;
  })
    .join('')
    .toLocaleLowerCase('en');
}

/** app_private.search_snippet: markdown süzülmüş metinden eşleşme çevresinde 150 karakter. */
export function searchSnippet(textIn: string | null, q: string): string | null {
  if (textIn == null) return null; // STRICT fonksiyon
  const plain = textIn
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>`[\]()|\n\r\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ');
  const chars = Array.from(plain);
  const norm = searchNorm(plain);
  const idx = norm.indexOf(searchNorm(q));
  if (idx < 0) return chars.slice(0, 150).join('');
  const pos = Array.from(norm.slice(0, idx)).length + 1; // position(): 1 tabanlı, kod noktası
  const start = Math.max(1, pos - 60);
  return (start > 1 ? '…' : '') + chars.slice(start - 1, start - 1 + 150).join('') + (start + 150 < chars.length ? '…' : '');
}

interface Hit {
  kind: string;
  slug: string | null;
  title: string | null;
  field: string;
  snippet: string | null;
  rank: number;
  at: string | null;
}

/** Aday satır (SQL ön süzgecinden): b=özet, c/d/e=gövde parçaları; türe göre anlamı değişir. */
interface Cand {
  kind: string;
  slug: string | null;
  title: string | null;
  b: string | null;
  c: string | null;
  d: string | null;
  e: string | null;
  at: string | null;
}

const cat = (...xs: (string | null)[]) => xs.map((x) => x ?? '').join(' ');

/** search_site_impl'in CASE dalları: alan, parça, sıra. */
function classify(c: Cand, like: (s: string | null) => boolean, q: string): Hit | null {
  const hit = (field: string, snippet: string | null, rank: number): Hit => ({ kind: c.kind, slug: c.slug, title: c.title, field, snippet, rank, at: c.at });
  const tiered = (all: string, ranks: [number, number, number], bodyText: string | null) => {
    if (!like(all)) return null;
    if (like(c.title)) return hit('title', searchSnippet(c.b ?? c.title, q), ranks[0]);
    if (like(c.b ?? '')) return hit('excerpt', searchSnippet(c.b, q), ranks[1]);
    return hit('body', searchSnippet(bodyText, q), ranks[2]);
  };
  switch (c.kind) {
    case 'product': {
      // b=kısa açıklama c=açıklama d=kullanım e=ölçü kodları
      const body = cat(c.c, c.d);
      if (!like(cat(c.title, c.b, c.c, c.d, c.e))) return null;
      if (like(c.title)) return hit('title', searchSnippet(c.b ?? c.title, q), 30);
      if (like(c.b ?? '')) return hit('excerpt', searchSnippet(c.b, q), 20);
      if (like(body)) return hit('body', searchSnippet(body, q), 10);
      return hit('variants', searchSnippet(c.e, q), 15);
    }
    case 'post':
      return tiered(cat(c.title, c.b, c.c), [28, 18, 9], c.c);
    case 'service':
      return tiered(cat(c.title, c.b, c.c), [29, 19, 9], c.c);
    case 'solution':
      return tiered(cat(c.title, c.b, c.c, c.d), [27, 17, 8], cat(c.c, c.d));
    case 'project': {
      // b=özet c=gövde d=konum e=müşteri
      if (!like(cat(c.title, c.b, c.c, c.d, c.e))) return null;
      if (like(c.title)) return hit('title', searchSnippet(c.b ?? c.title, q), 26);
      if (like(cat(c.b, c.d, c.e))) return hit('excerpt', searchSnippet(`${c.b ?? ''} · ${c.d ?? ''} ${c.e ?? ''}`, q), 16);
      return hit('body', searchSnippet(c.c, q), 8);
    }
    case 'page':
      if (!like(cat(c.title, c.c))) return null;
      return like(c.title) ? hit('title', searchSnippet(c.c, q), 22) : hit('body', searchSnippet(c.c, q), 6);
    case 'faq':
      if (!like(cat(c.title, c.c))) return null;
      return like(c.title) ? hit('title', searchSnippet(c.c, q), 24) : hit('body', searchSnippet(c.c, q), 7);
    default:
      return null;
  }
}

/**
 * search_site (DEFINER) + search_site_impl. PostgreSQL normalize edilmiş metinde LIKE '%q%' yapıyordu; burada SQL yalnız ön süzgeç
 * (uca1400_ai_ci büyük/küçük harf ve aksan duyarsız, 'ı'→'i' elle) — eşleşmenin üst kümesi. Alan/parça/sıra ve kesin eşleşme
 * aynı kurallarla JS'te.
 */
const searchSite: RpcHandler = async (conn, _actor, args) => {
  const raw = args['p_q'];
  const l = asLocale(args['p_locale']);
  if (typeof raw !== 'string') return [];
  const trimmed = btrim(raw);
  if (charLen(trimmed) < 2 || charLen(raw) > 60) return [];
  const limit = Math.min(Math.max(toInt(args['p_limit'] == null ? null : String(args['p_limit'])) ?? 20, 1), 50);
  const n = searchNorm(trimmed);
  if (!l || charLen(n) < 2) return [];
  const pattern = n.replace(/[%_]/g, '');
  // PostgreSQL LIKE'ta ters bölü kaçış karakteridir
  const needle = pattern.replace(/\\(.?)/gs, '$1');
  const like = (s: string | null) => s != null && searchNorm(s).includes(needle);

  const t = (col: string) => `JSON_VALUE(${col}, '$.${l}')`;
  const has = (col: string) => `JSON_CONTAINS(${col}, '"${l}"')`;
  const P = escape(`%${pattern}%`);
  const pre = (...cols: string[]) => `REPLACE(CONCAT_WS(' ', ${cols.map((c) => `COALESCE(${c}, '')`).join(', ')}), 'ı', 'i') COLLATE utf8mb4_uca1400_ai_ci LIKE ${P}`;
  const row = (kind: string, slug: string, title: string, b: string, c: string, d: string, e: string, atCol: string) =>
    `SELECT JSON_OBJECT('kind', '${kind}', 'slug', ${slug}, 'title', ${title}, 'b', ${b}, 'c', ${c}, 'd', ${d}, 'e', ${e}, 'at', ${TS(atCol)}) AS r`;
  const N = 'NULL';
  const sql = [
    `${row('product', t('p.slug'), t('p.name'), t('p.short_description'), t('p.description'), t('p.usage_areas'), 'p.codes', 'COALESCE(p.published_at, p.updated_at)')}
       FROM (SELECT x.*, (SELECT GROUP_CONCAT(CONCAT(pv.stock_code, ' ', pv.size_label) ORDER BY ${asc('pv.sort_order')} SEPARATOR ' · ')
                            FROM product_variants pv WHERE pv.product_id = x.id AND pv.is_active) AS codes
               FROM products x WHERE x.status = 'published' AND ${has('x.published_locales')} AND x.slug_${l} IS NOT NULL) p
      WHERE ${pre(t('p.name'), t('p.short_description'), t('p.description'), t('p.usage_areas'), 'p.codes')}`,
    `${row('post', t('b.slug'), t('b.title'), t('b.excerpt'), t('b.body'), N, N, 'COALESCE(b.published_at, b.updated_at)')}
       FROM blog_posts b WHERE ${live('b')} AND ${has('b.published_locales')} AND b.slug_${l} IS NOT NULL AND ${pre(t('b.title'), t('b.excerpt'), t('b.body'))}`,
    `${row('service', t('s.slug'), t('s.title'), t('s.excerpt'), t('s.body'), N, N, 'COALESCE(s.published_at, s.updated_at)')}
       FROM services s WHERE s.status = 'published' AND ${has('s.published_locales')} AND s.slug_${l} IS NOT NULL AND ${pre(t('s.title'), t('s.excerpt'), t('s.body'))}`,
    `${row('solution', t('o.slug'), t('o.title'), t('o.hero_summary'), t('o.problem'), t('o.technical_basis'), N, 'COALESCE(o.published_at, o.updated_at)')}
       FROM solutions o WHERE o.status = 'published' AND ${has('o.published_locales')} AND o.slug_${l} IS NOT NULL
        AND ${pre(t('o.title'), t('o.hero_summary'), t('o.problem'), t('o.technical_basis'))}`,
    `${row('project', t('r.slug'), t('r.title'), t('r.excerpt'), t('r.body'), t('r.location'), 'r.client_name', 'COALESCE(r.published_at, r.updated_at)')}
       FROM projects r WHERE ${live('r')} AND ${has('r.published_locales')} AND r.slug_${l} IS NOT NULL
        AND ${pre(t('r.title'), t('r.excerpt'), t('r.body'), t('r.location'), 'r.client_name')}`,
    `${row('page', 'sp.page_key', t('sp.title'), N, t('sp.body'), N, N, 'COALESCE(sp.published_at, sp.updated_at)')}
       FROM static_pages sp WHERE sp.kind IN ('legal', 'generic') AND sp.status = 'published' AND ${has('sp.published_locales')} AND ${pre(t('sp.title'), t('sp.body'))}`,
    `${row('faq', 'CAST(f.id AS CHAR)', t('f.question'), N, t('f.answer'), N, N, 'COALESCE(f.published_at, f.updated_at)')}
       FROM faqs f WHERE f.entity_type IS NULL AND f.status = 'published' AND ${has('f.published_locales')} AND ${pre(t('f.question'), t('f.answer'))}`,
  ].join('\nUNION ALL\n');
  const rows = await select<{ r: unknown }>(conn, sql);
  const hits = rows
    .map((x) => (typeof x.r === 'string' ? JSON.parse(x.r) : x.r) as Cand)
    .map((c) => classify(c, like, raw))
    .filter((h): h is Hit => h !== null && h.slug != null && h.title != null);
  // rank desc, at desc nulls last (ISO metin sıralaması = zaman sırası)
  hits.sort((x, y) => y.rank - x.rank || (x.at === y.at ? 0 : x.at == null ? 1 : y.at == null ? -1 : x.at < y.at ? 1 : -1));
  return hits.slice(0, limit).map(({ kind, slug, title, field, snippet, rank }) => ({ kind, slug, title, field, snippet, rank }));
};

// ---------------------------------------------------------------- sıralama

const REORDERABLE = new Set(['services', 'projects', 'project_categories', 'products', 'product_categories', 'solutions', 'price_guides', 'testimonials', 'team_members', 'certificates', 'faqs', 'blog_categories', 'job_postings']);

/** unnest(p_ids) with ordinality → sort_order; yalnız değişen ve RLS'in izin verdiği satırlar sayılır. */
async function reorder(conn: PoolConnection, actor: Actor, table: string, idsArg: unknown): Promise<number> {
  const { using, check } = updatable(actor, table);
  const ids = uuidList(idsArg);
  if (!ids.length) return 0;
  const order = `CASE id ${ids.map((id, i) => `WHEN ${escape(id)} THEN ${i + 1}`).join(' ')} END`;
  const where = `id IN (${ids.map((id) => escape(id)).join(', ')}) AND NOT (sort_order <=> ${order}) AND (${using})`;
  // WITH CHECK: sort_order hiçbir kuralda geçmediği için yeni satır = eski satır; ihlal varsa PostgreSQL gibi hata
  if (check !== 'TRUE') {
    const [bad] = await select<{ n: number }>(conn, `SELECT COUNT(*) AS n FROM \`${table}\` WHERE ${where} AND NOT (${check})`);
    if (Number(bad?.n ?? 0) > 0) throw denied(actor, `new row violates row-level security policy for table "${table}"`);
  }
  // PostgreSQL'de sort_order benzersizliği DEFERRABLE'dı (commit'te denetlenir); MariaDB satır satır denetler → yer değiştirmede
  // ara çakışma olmasın diye önce negatif geçici değer, sonra asıl sıra.
  const [res] = await conn.query(`UPDATE \`${table}\` SET sort_order = -(${order}) WHERE ${where}`);
  await conn.query(`UPDATE \`${table}\` SET sort_order = ${order} WHERE id IN (${ids.map((id) => escape(id)).join(', ')}) AND sort_order = -(${order})`);
  return (res as { affectedRows: number }).affectedRows;
}

const reorderContent: RpcHandler = async (conn, actor, args) => {
  const table = args['p_table'];
  if (typeof table !== 'string' || !REORDERABLE.has(table)) throw invalid(`reorder_content: tablo izinli degil: ${String(table)}`);
  return reorder(conn, actor, table, args['p_ids']);
};

const reorderMenuItems: RpcHandler = (conn, actor, args) => reorder(conn, actor, 'menu_items', args['p_ids']);

// ---------------------------------------------------------------- panel sayaçları

const adminDashboardCounts: RpcHandler = async (conn, actor) => {
  const R: Read = (tb) => readable(actor, tb);
  const uid = actor.kind === 'user' ? escape(actor.userId) : 'NULL';
  const role = actor.kind === 'user' && actor.role != null ? escape(actor.role) : 'NULL';
  const n = (table: string, where = 'TRUE') => `(SELECT COUNT(*) FROM ${R(table)} x WHERE ${where})`;
  return one(
    conn,
    `SELECT JSON_OBJECT(
      'media', ${n('media_library')},
      'staff', ${n('profiles', "x.role <> 'member' AND x.is_active")},
      'members', ${n('profiles', "x.role = 'member'")},
      'leads_open', ${n('leads', "x.status IN ('new', 'in_review')")},
      'leads_today', ${n('leads', 'x.created_at >= UTC_DATE()')},
      'customers', ${n('customers', 'x.is_active')},
      'overdue_schedules', ${n('payment_schedules', "x.status IN ('pending', 'partially_paid') AND x.due_date < UTC_DATE()")},
      'pending_reviews', ${n('testimonials', "x.status = 'pending'")},
      'errors_24h', ${n('error_logs', `x.last_seen_at >= ${NOW} - INTERVAL 24 HOUR`)},
      'notifications', ${n('notifications', `NOT JSON_CONTAINS(x.read_by, JSON_QUOTE(${uid})) AND (x.user_id = ${uid} OR x.target_role = ${role})`)}
    ) AS r`,
  );
};

export const CONTENT_RPCS: Readonly<Record<string, RpcHandler>> = {
  get_product_by_slug: getProductBySlug,
  get_project_by_slug: getProjectBySlug,
  get_service_by_slug: getServiceBySlug,
  get_solution_by_slug: getSolutionBySlug,
  get_blog_post_by_slug: getBlogPostBySlug,
  get_price_guide_by_slug: getPriceGuideBySlug,
  get_configurator_page_by_slug: getConfiguratorPageBySlug,
  resolve_old_slug: resolveOldSlug,
  search_site: searchSite,
  reorder_content: reorderContent,
  reorder_menu_items: reorderMenuItems,
  admin_dashboard_counts: adminDashboardCounts,
};
