// RPC adı → işleyici (K-116). Açık harita: package.json "sideEffects: false" yan etkili kayıt içe aktarımlarını derlemeden atardı.
import { ACCOUNT_RPCS } from './account';
import { LEADS_RPCS } from './leads';
import { MAIL_RPCS } from './mail';
import type { RpcHandler } from './registry';
import { SALES_RPCS } from './sales';

export const RPCS: Readonly<Record<string, RpcHandler>> = { ...MAIL_RPCS, ...LEADS_RPCS, ...SALES_RPCS, ...ACCOUNT_RPCS };
