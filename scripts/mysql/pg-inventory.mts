// Göç dosyalarını PGlite'a uygulayıp son PostgreSQL şemasının envanterini çıkarır (K-116: MariaDB'ye taşıma girdisi).
//   node scripts/mysql/pg-inventory.mts > scripts/mysql/pg-inventory.json
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const dir = join(import.meta.dirname, '..', '..', 'supabase');
const db = new PGlite();
await db.exec(readFileSync(join(dir, 'tests/helpers/supabase-shim.sql'), 'utf8'));
for (const f of readdirSync(join(dir, 'migrations')).filter((n) => n.endsWith('.sql')).sort()) await db.exec(readFileSync(join(dir, 'migrations', f), 'utf8'));
const q = async (sql: string) => (await db.query(sql)).rows;
const out = {
  columns: await q(`select table_name t, column_name c, data_type dt, udt_name udt, is_nullable n, column_default d, character_maximum_length len, is_generated gen, generation_expression ge, ordinal_position pos
    from information_schema.columns where table_schema='public' and table_name in (select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE') order by table_name, ordinal_position`),
  constraints: await q(`select conrelid::regclass::text t, conname name, contype type, pg_get_constraintdef(oid) def from pg_constraint where connamespace='public'::regnamespace and conrelid<>0 order by 1,2`),
  indexes: await q(`select tablename t, indexname name, indexdef def from pg_indexes where schemaname='public' order by 1,2`),
  enums: await q(`select t.typname name, array_agg(e.enumlabel order by e.enumsortorder) labels from pg_type t join pg_enum e on e.enumtypid=t.oid group by 1`),
  functions: await q(`select p.proname name, pg_get_function_identity_arguments(p.oid) args, l.lanname lang, p.prosecdef secdef, pg_get_functiondef(p.oid) def from pg_proc p join pg_language l on l.oid=p.prolang where p.pronamespace='public'::regnamespace order by 1`),
  triggers: await q(`select event_object_table t, trigger_name name, action_timing timing, string_agg(event_manipulation, ',') ev, action_statement stmt from information_schema.triggers where trigger_schema='public' group by 1,2,3,5 order by 1,2`),
  policies: await q(`select tablename t, policyname name, cmd, roles::text roles, qual, with_check from pg_policies where schemaname='public' order by 1,2`),
  views: await q(`select table_name t, view_definition def from information_schema.views where table_schema='public'`),
  grants: await q(`select routine_name r, grantee g from information_schema.routine_privileges where routine_schema='public' and grantee in ('anon','authenticated') order by 1,2`),
};
console.log(JSON.stringify(out, null, 1));
