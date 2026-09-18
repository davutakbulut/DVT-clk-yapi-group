import type { Instrumentation } from 'next';

/**
 * 03-ERROR-ISOLATION Katman 6 (görünürlük): sunucu tarafı yakalanmamış hatalar burada tek noktadan loglanır.
 * Üretimde Next hata mesajını gizler; yığın yalnız burada görünür. error_logs'a yazım Faz 23 (analitik/hata takip).
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const err = error as { message?: string; stack?: string; digest?: string };
  console.error('[request-error]', JSON.stringify({ path: request.path, method: request.method, routerKind: context.routerKind, routePath: context.routePath, routeType: context.routeType, digest: err.digest, message: err.message }), '\n', err.stack ?? '');
};
