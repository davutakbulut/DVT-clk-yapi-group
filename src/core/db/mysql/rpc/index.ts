// RPC adı → işleyici (K-116). Açık harita: package.json "sideEffects: false" yan etkili kayıt içe aktarımlarını derlemeden atardı.
import { MAIL_RPCS } from './mail';
import type { RpcHandler } from './registry';

export const RPCS: Readonly<Record<string, RpcHandler>> = { ...MAIL_RPCS };
