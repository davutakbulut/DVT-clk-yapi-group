import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface AdminSystemPage {
  readonly page_key: string;
  readonly title: Record<string, string>;
  readonly body: Record<string, string>;
  readonly published_locales: string[];
  readonly reviewedEn: boolean;
}

const rec = (v: unknown): Record<string, string> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, string>) : {});

export async function listSystemPagesForAdmin(): Promise<Result<AdminSystemPage[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('static_pages').select('page_key, title, body, published_locales, translation_meta').in('kind', ['error', 'system']).order('page_key');
  if (error) return err(appError('external_service', error.message, { module: 'static-pages' }));
  return ok(
    data.map((row) => {
      const meta = row.translation_meta as { en?: { reviewed?: boolean } } | null;
      return { page_key: row.page_key, title: rec(row.title), body: rec(row.body), published_locales: row.published_locales ?? [], reviewedEn: meta?.en?.reviewed === true };
    }),
  );
}

export interface AdminLegalPage {
  readonly page_key: string;
  readonly title: Record<string, string>;
  readonly body: Record<string, string>;
  readonly status: string;
  readonly published_locales: string[];
  readonly reviewedEn: boolean;
  readonly updated_at: string;
}

export async function listLegalPagesForAdmin(): Promise<Result<AdminLegalPage[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('static_pages').select('page_key, title, body, status, published_locales, translation_meta, updated_at').eq('kind', 'legal').order('page_key');
  if (error) return err(appError('external_service', error.message, { module: 'static-pages' }));
  return ok(
    data.map((row) => {
      const meta = row.translation_meta as { en?: { reviewed?: boolean } } | null;
      return { page_key: row.page_key, title: rec(row.title), body: rec(row.body), status: row.status, published_locales: row.published_locales ?? [], reviewedEn: meta?.en?.reviewed === true, updated_at: row.updated_at };
    }),
  );
}
