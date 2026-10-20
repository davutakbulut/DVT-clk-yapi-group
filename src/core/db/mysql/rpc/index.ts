// RPC adı → işleyici (K-116). Açık harita: package.json "sideEffects: false" yan etkili kayıt içe aktarımlarını derlemeden atardı.
import type { RpcHandler } from './registry';

export const RPCS: Readonly<Record<string, RpcHandler>> = {};
