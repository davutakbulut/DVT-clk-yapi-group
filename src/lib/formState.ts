/** Admin Server Action'larının ortak dönüşü. Metin değil anahtar taşır; bileşen messages'tan çevirir. */
export type ActionErrorKey = 'forbidden' | 'validation' | 'unexpected' | 'notConfigured' | 'fileType' | 'fileMagic' | 'fileSize' | 'lastSuperAdmin';

export interface ActionState {
  readonly ok: boolean;
  readonly error?: ActionErrorKey;
  readonly fieldErrors?: Readonly<Record<string, string>>;
  readonly done?: boolean;
  /** Başarı sonrası yönlendirme gerektiğinde. */
  readonly redirectTo?: string;
}

export const IDLE: ActionState = { ok: false };
export const DONE: ActionState = { ok: true, done: true };

export function failed(error: ActionErrorKey, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}
