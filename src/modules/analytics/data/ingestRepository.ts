import { createPublicClient } from '@/core/db/createPublicClient';
import { logger } from '@/core/observability/logger';
import type { Json } from '@/types/database';
import { classifyReferrer, collectSchema, isBot, maskIp, parseUserAgent } from '../domain/classify';

export interface IngestContext {
  readonly userAgent: string | null;
  readonly ip: string | null;
  readonly host: string;
  readonly allowBots?: boolean;
}

/** Doğrula → sınıflandır (referrer, cihaz UA, IP maskesi) → anonim security definer RPC (0035). Hata yutulur, loglanır. */
export async function ingestBatch(body: unknown, ctx: IngestContext): Promise<boolean> {
  if (!ctx.allowBots && isBot(ctx.userAgent)) return false;
  const parsed = collectSchema.safeParse(body);
  if (!parsed.success) return false;
  const b = parsed.data;
  const { kind, host } = classifyReferrer(b.session.referrer, b.session.utm, ctx.host.replace(/^www\./, ''));
  const ua = parseUserAgent(ctx.userAgent);
  const client = createPublicClient();
  if (!client.ok) return false;
  const payload = {
    session: { id: b.session.id, visitor: b.session.visitor, device: b.session.device, browser: ua.browser, os: ua.os, locale: b.session.locale ?? null, referrer_host: host, referrer_kind: kind, utm: b.session.utm, landing_path: b.session.landing_path ?? null, ip_masked: maskIp(ctx.ip) },
    pageviews: b.pageviews,
    events: b.events,
    vitals: b.vitals,
    forms: b.forms,
  };
  const { error } = await client.data.rpc('ingest_analytics', { p: payload as unknown as Json });
  if (error) {
    logger.warn('Analitik paketi yazilamadi', { module: 'analytics', code: error.code, message: error.message });
    return false;
  }
  return true;
}
