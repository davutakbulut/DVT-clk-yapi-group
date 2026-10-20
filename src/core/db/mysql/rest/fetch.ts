import 'server-only';
import { withConnection, withTransaction, type Actor } from '../pool';
import { RPCS } from '../rpc';
import { RpcError } from '../rpc/registry';
import { handleTable, mapError, type RestError } from './engine';

/** postgrest-js'in istek attığı sanal kök: ağa çıkmaz, `createDbFetch` yakalar. */
export const DB_BASE_URL = 'http://mariadb.internal';

// 204/205/304 gövde taşıyamaz: Response yapıcısı boş dizeyle bile "Invalid response status code" fırlatır (güncelle/sil yanıtları)
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body == null || status === 204 || status === 205 || status === 304 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const errorResponse = (e: RestError) => json(e.status, { code: e.code, message: e.message, details: e.details, hint: e.hint });

/**
 * postgrest-js için fetch: istek MariaDB'de, aktörün erişim kurallarıyla yürütülür (K-116). Okumalar tek bağlantıda,
 * yazmalar ve RPC'ler tek transaction'da (PostgREST'in istek başına transaction davranışı).
 */
export function createDbFetch(actor: Actor): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === 'string' && init.body.length ? (JSON.parse(init.body) as unknown) : null;
    const path = url.pathname.replace(/^\/+/, '');

    if (path.startsWith('rpc/')) {
      const name = path.slice(4);
      const handler = Object.hasOwn(RPCS, name) ? RPCS[name] : undefined;
      if (!handler) return errorResponse({ status: 404, code: 'PGRST202', message: `Could not find the function public.${name} in the schema cache`, details: null, hint: null });
      const args = method === 'GET' || method === 'HEAD' ? Object.fromEntries(url.searchParams) : ((body ?? {}) as Record<string, unknown>);
      const res = await withTransaction(actor, (conn) => handler(conn, actor, args));
      if (!res.ok) {
        const cause = res.error.cause;
        if (cause instanceof RpcError) return errorResponse({ status: cause.status, code: cause.code, message: cause.message, details: null, hint: null });
        return errorResponse(mapError(cause));
      }
      return json(200, res.data ?? null);
    }

    const run = method === 'GET' || method === 'HEAD' ? withConnection : withTransaction;
    const res = await run(actor, (conn) =>
      handleTable(conn, actor, {
        method,
        table: path,
        params: url.searchParams,
        prefer: headers.get('prefer') ?? '',
        accept: headers.get('accept') ?? 'application/json',
        body,
      }),
    );
    if (!res.ok) return errorResponse(mapError(res.error.cause));
    const { status, body: out, contentRange } = res.data;
    return json(status, method === 'HEAD' ? null : out, contentRange ? { 'content-range': contentRange } : {});
  };
}
