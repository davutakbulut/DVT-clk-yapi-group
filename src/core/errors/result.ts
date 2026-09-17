// K-42 · Beklenen hatalar fırlatılmaz, döndürülür. Çağıran "veri yok" durumunu görüp
// bölümü sessizce gizleyebilir; fırlatma olsaydı tüm sayfa hata sınırına düşerdi.

export type AppErrorCode = 'not_found' | 'validation' | 'unauthorized' | 'forbidden' | 'external_service' | 'not_configured' | 'unexpected';

export interface AppError {
  readonly code: AppErrorCode;
  /** Log içindir; kullanıcıya gösterilmez (gösterilecek metin next-intl'den gelir). */
  readonly message: string;
  /** error_logs kaydındaki modül etiketi (03-ERROR-ISOLATION Katman 6). */
  readonly module?: string;
  readonly cause?: unknown;
}

export type Result<T, E = AppError> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function appError(code: AppErrorCode, message: string, extra?: Pick<AppError, 'module' | 'cause'>): AppError {
  return { code, message, ...extra };
}
