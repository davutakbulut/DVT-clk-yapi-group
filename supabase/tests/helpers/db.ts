import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';

const ROOT = join(__dirname, '..', '..');
const MIGRATIONS_DIR = join(ROOT, 'migrations');

export const ROLES = ['super_admin', 'admin', 'editor', 'sales', 'viewer', 'member'] as const;
export type AppRole = (typeof ROLES)[number];

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort();
}

/** Boş PGlite + Supabase şimi + sıradaki TÜM migration'lar — `supabase db reset`in Docker'sız karşılığı. */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(join(__dirname, 'supabase-shim.sql'), 'utf8'));
  for (const file of migrationFiles()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    } catch (cause) {
      throw new Error(`Migration uygulanamadı: ${file}\n${(cause as Error).message}`, { cause });
    }
  }
  return db;
}

export interface TestUsers {
  readonly ids: Readonly<Record<AppRole, string>>;
  /** İkinci bir üye: "başkasının kaydını göremez" testleri için. */
  readonly otherMember: string;
}

/** Her rol için bir auth.users satırı açar (tetikleyici profili üretir), sonra rolü atar. */
export async function seedUsers(db: PGlite): Promise<TestUsers> {
  const ids = {} as Record<AppRole, string>;
  for (const role of ROLES) {
    const { rows } = await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [`${role}@test.local`]);
    ids[role] = rows[0]!.id;
    await db.query(`update public.profiles set role = $1 where id = $2`, [role, ids[role]]);
  }
  const other = await db.query<{ id: string }>(`insert into auth.users (email) values ('member2@test.local') returning id`);
  return { ids, otherMember: other.rows[0]!.id };
}

type Actor = { readonly role: 'anon' } | { readonly role: 'authenticated'; readonly userId: string } | { readonly role: 'service_role' };

/**
 * Gövdeyi PostgREST'in yapacağı gibi çalıştırır: DB rolüne geçer, JWT claim'lerini yazar.
 * Her çağrı kendi transaction'ında koşar ve SONUNDA GERİ ALINIR → testler birbirini kirletmez.
 */
export async function as<T>(db: PGlite, actor: Actor, body: (tx: Transaction) => Promise<T>): Promise<T> {
  let result: T;
  const ROLLBACK = Symbol('rollback');
  try {
    await db.transaction(async (tx) => {
      const claims = actor.role === 'authenticated' ? { sub: actor.userId, role: 'authenticated' } : { role: actor.role };
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
      await tx.exec(`set local role ${actor.role}`);
      result = await body(tx);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }
  return result!;
}

export const anon = { role: 'anon' } as const;
export const user = (userId: string) => ({ role: 'authenticated', userId }) as const;

/** RLS'in satırı GİZLEDİĞİ durum: hata yok, sonuç boş. */
export async function count(tx: Transaction, sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await tx.query<{ n: number }>(`select count(*)::int as n from (${sql}) q`, params);
  return rows[0]!.n;
}

/** Yetkisiz YAZMA iki biçimde reddedilir: izin/RLS hatası ya da 0 satır etkilenmesi. İkisi de "yazamadı"dır. */
export async function cannotWrite(tx: Transaction, sql: string, params: unknown[] = []): Promise<boolean> {
  await tx.exec('savepoint w');
  try {
    const result = await tx.query(sql, params);
    await tx.exec('rollback to savepoint w');
    return (result.affectedRows ?? 0) === 0;
  } catch {
    await tx.exec('rollback to savepoint w');
    return true;
  }
}
