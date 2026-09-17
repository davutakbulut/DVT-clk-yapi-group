import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, migrationFiles } from './helpers/db';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); }, 120_000);
afterAll(async () => { await db.close(); });

describe('migration zinciri', () => {
  it('dosya adları <4 hane sıra>_<konu>.sql biçiminde ve sıra kesintisiz', () => {
    const files = migrationFiles();
    expect(files.length).toBeGreaterThan(0);
    files.forEach((file, index) => {
      expect(file).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
      expect(Number(file.slice(0, 4))).toBe(index + 1);
    });
  });

  it('sıfırdan uygulanır (supabase db reset karşılığı)', async () => {
    const { rows } = await db.query<{ n: number }>(`select count(*)::int n from pg_tables where schemaname = 'public'`);
    expect(rows[0]!.n).toBeGreaterThan(0);
  });
});
