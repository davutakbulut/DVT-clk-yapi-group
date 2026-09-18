import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText } from '@/lib/localized';

export interface OverrideRow {
  readonly id: string;
  readonly namespace: string;
  readonly key: string;
  readonly locale: string;
  readonly value: string;
  readonly updated_at: string;
}

export interface GlossaryTerm {
  readonly id: string;
  readonly term_tr: string;
  readonly term_en: string;
  readonly context: string;
  readonly do_not_translate: boolean;
  readonly is_case_sensitive: boolean;
}

export interface MissingRow {
  readonly table: string;
  readonly id: string;
  readonly title: string;
  readonly reason: 'no_en' | 'unreviewed';
  readonly adminPath: string;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'translations' }));

export async function listOverrides(): Promise<Result<OverrideRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('ui_translations').select('id, namespace, key, locale, value, updated_at').order('namespace').order('key').order('locale');
  if (error) return fail(error.message);
  return ok(data);
}

export async function listGlossary(): Promise<Result<GlossaryTerm[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('translation_glossary').select('id, term_tr, term_en, context, do_not_translate, is_case_sensitive').order('term_tr');
  if (error) return fail(error.message);
  return ok(data);
}

/**
 * Çevirisi eksikler (02-ADMIN-PANEL): yayındaki içerikte EN başlık yok ya da EN makine taslağı onaysız (K-08).
 * Tablo başına tek sorgu; başlık kolonu tabloya göre değişir.
 */
export async function listMissingTranslations(): Promise<Result<MissingRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const sources: { table: 'services' | 'projects' | 'blog_posts' | 'products' | 'solutions' | 'price_guides' | 'job_postings'; titleCol: 'title' | 'name'; admin: string }[] = [
    { table: 'services', titleCol: 'title', admin: '/admin/services' },
    { table: 'projects', titleCol: 'title', admin: '/admin/projects' },
    { table: 'blog_posts', titleCol: 'title', admin: '/admin/blog' },
    { table: 'products', titleCol: 'name', admin: '/admin/products' },
    { table: 'solutions', titleCol: 'title', admin: '/admin/solutions' },
    { table: 'price_guides', titleCol: 'title', admin: '/admin/pricing' },
    { table: 'job_postings', titleCol: 'title', admin: '/admin/careers' },
  ];
  const out: MissingRow[] = [];
  for (const s of sources) {
    const { data, error } = await client.data.from(s.table).select(`id, ${s.titleCol}, translation_meta, status`).eq('status', 'published').limit(500);
    if (error) return fail(error.message);
    for (const row of data as unknown as Record<string, unknown>[]) {
      const title = row[s.titleCol];
      const t = isLocalizedText(title) ? title : {};
      const meta = (row['translation_meta'] ?? {}) as { en?: { reviewed?: boolean } };
      const reason: MissingRow['reason'] | null = !t['en'] ? 'no_en' : meta.en?.reviewed === true ? null : 'unreviewed';
      if (reason) out.push({ table: s.table, id: String(row['id']), title: t['tr'] ?? '', reason, adminPath: `${s.admin}/${String(row['id'])}` });
    }
  }
  return ok(out);
}
