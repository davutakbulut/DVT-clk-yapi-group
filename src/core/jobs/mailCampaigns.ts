import 'server-only';
import { getSiteUrl } from '@/core/config/site';
import { createServiceClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { campaignVariables, parseBulkMailSettings, unsubscribeUrls, type MailLocale } from '@/core/mail/bulkSettings';
import { isMailConfigured, sendWithFallback } from '@/core/mail/provider';
import { renderCampaignMail } from '@/core/mail/render';
import { isReservedTestAddress } from '@/core/mail/reservedAddress';
import { logger } from '@/core/observability/logger';

export interface CampaignRunSummary {
  readonly campaigns: number;
  readonly sent: number;
  readonly failed: number;
  readonly skipped: number;
  /** Bu saat için kalan gönderim hakkı (koşu başında). */
  readonly budget: number;
}

const LOCK_TIMEOUT_MS = 10 * 60_000;
const MODULE = 'jobs/campaigns';

/**
 * Toplu e-posta işçisi (K-108): her dakika mail cron'unun ardından koşar.
 * Vadesi gelen zamanlanmış kampanyayı başlatır → saatlik sınırdan kalan hak kadar alıcıyı kilitler → engel listesine YENİDEN bakar →
 * gönderir → email_logs + alıcı durumu. Bekleyen alıcı kalmayınca kampanya 'sent' olur ve yöneticiye bildirim düşer.
 * Saatlik sınır hesap genelidir: son 1 saatte gönderilen TÜM iletiler (talep yanıtları dahil) sayılır.
 */
export async function processMailCampaigns(): Promise<Result<CampaignRunSummary>> {
  const client = createServiceClient();
  if (!client.ok) return client;
  const db = client.data;
  const now = new Date();
  const fail = (message: string) => err(appError('external_service', message, { module: MODULE }));

  // Boşta tek sorgu: ne gönderilen ne de vadesi gelen kampanya varsa hiçbir şey yazılmaz (cron dakikada bir koşar)
  const idle = await db.from('mail_campaigns').select('id', { count: 'exact', head: true }).or(`status.eq.sending,and(status.eq.scheduled,scheduled_at.lte.${now.toISOString()})`);
  if (idle.error) return fail(idle.error.message);
  if ((idle.count ?? 0) === 0) return ok({ campaigns: 0, sent: 0, failed: 0, skipped: 0, budget: 0 });

  // Zamanı gelen kampanyalar gönderime geçer; çöken işçinin kilitlediği alıcılar serbest kalır
  const promoted = await db.from('mail_campaigns').update({ status: 'sending' }).eq('status', 'scheduled').lte('scheduled_at', now.toISOString());
  if (promoted.error) return fail(promoted.error.message);
  await db.from('mail_campaign_recipients').update({ status: 'pending', locked_at: null }).eq('status', 'sending').lt('locked_at', new Date(now.getTime() - LOCK_TIMEOUT_MS).toISOString());

  const { data: active, error: activeError } = await db.from('mail_campaigns').select('id, name, locale, subject, preheader, body, cta_label, cta_url, started_at').eq('status', 'sending').order('created_at').limit(5);
  if (activeError) return fail(activeError.message);
  if (!active || active.length === 0) return ok({ campaigns: 0, sent: 0, failed: 0, skipped: 0, budget: 0 });
  if (!isMailConfigured()) return fail('Mail saglayicisi yapilandirilmamis (RESEND_API_KEY / SMTP_*)');

  const [{ data: settingsRow }, { data: siteNameRow }, sentLastHour] = await Promise.all([
    db.from('site_settings').select('value').eq('key', 'mail.bulk').maybeSingle(),
    db.from('site_settings').select('value').eq('key', 'site.name').maybeSingle(),
    db.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', new Date(now.getTime() - 3_600_000).toISOString()),
  ]);
  if (sentLastHour.error) return fail(sentLastHour.error.message);
  const settings = parseBulkMailSettings(settingsRow?.value);
  const siteNames = (siteNameRow?.value as { tr?: string; en?: string } | null) ?? {};
  const siteUrl = getSiteUrl().origin;
  const budget = Math.max(0, settings.hourly_limit - (sentLastHour.count ?? 0));
  let remaining = Math.min(settings.batch_size, budget);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let touched = 0;

  for (const campaign of active) {
    if (remaining <= 0) break;
    touched++;
    const locale: MailLocale = campaign.locale === 'en' ? 'en' : 'tr';
    const siteName = (siteNames[locale] ?? siteNames.tr ?? getSiteUrl().hostname).toString();
    if (!campaign.started_at) await db.from('mail_campaigns').update({ started_at: now.toISOString() }).eq('id', campaign.id);

    const { data: due } = await db.from('mail_campaign_recipients').select('id').eq('campaign_id', campaign.id).eq('status', 'pending').order('created_at').order('id').limit(remaining);
    const ids = (due ?? []).map((r) => r.id);
    if (ids.length > 0) {
      const { data: claimed, error: claimError } = await db.from('mail_campaign_recipients').update({ status: 'sending', locked_at: new Date().toISOString() }).in('id', ids).eq('status', 'pending').select('id, email, full_name, company, token');
      if (claimError) return fail(claimError.message);
      const emails = (claimed ?? []).map((r) => r.email);
      const { data: blocked } = emails.length > 0 ? await db.from('mail_suppressions').select('email').in('email', emails) : { data: [] };
      const suppressed = new Set((blocked ?? []).map((b) => b.email));

      for (const recipient of claimed ?? []) {
        remaining--;
        if (suppressed.has(recipient.email) || isReservedTestAddress(recipient.email)) {
          skipped++;
          await db.from('mail_campaign_recipients').update({ status: 'skipped', locked_at: null, error: suppressed.has(recipient.email) ? 'suppressed' : 'reserved-address' }).eq('id', recipient.id);
          continue;
        }
        const links = unsubscribeUrls(siteUrl, locale, recipient.token);
        const rendered = renderCampaignMail({
          subject: campaign.subject, preheader: campaign.preheader, body: campaign.body, ctaLabel: campaign.cta_label, ctaUrl: campaign.cta_url,
          variables: campaignVariables(recipient, settings, locale), siteName, siteUrl,
          footer: settings.footer[locale] || settings.footer.tr, unsubscribeLabel: settings.unsubscribe_label[locale] || settings.unsubscribe_label.tr || links.page, unsubscribeUrl: links.page,
        });
        const outcome = await sendWithFallback({
          ...rendered, to: recipient.email, toName: recipient.full_name,
          headers: { 'List-Unsubscribe': `<${links.oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          ...(settings.reply_to ? { replyTo: settings.reply_to } : {}),
        });
        await db.from('email_logs').insert({ template_key: 'campaign', to_email: recipient.email, subject: rendered.subject, provider: outcome.provider, status: outcome.ok ? 'sent' : 'failed', provider_message_id: outcome.messageId ?? null, error: outcome.error ?? null, related_type: 'campaign', related_id: campaign.id });
        if (outcome.ok) {
          sent++;
          await db.from('mail_campaign_recipients').update({ status: 'sent', locked_at: null, error: null, sent_at: new Date().toISOString() }).eq('id', recipient.id);
        } else {
          failed++;
          await db.from('mail_campaign_recipients').update({ status: 'failed', locked_at: null, error: (outcome.error ?? 'bilinmeyen hata').slice(0, 500) }).eq('id', recipient.id);
          logger.warn('Kampanya iletisi gonderilemedi', { module: MODULE, campaign: campaign.id, error: outcome.error });
        }
      }
    }

    // Bekleyen/kilitli alıcı kalmadıysa kampanya biter
    const open = await db.from('mail_campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id).in('status', ['pending', 'sending']);
    if (!open.error && (open.count ?? 0) === 0) {
      const done = await db.from('mail_campaigns').update({ status: 'sent', finished_at: new Date().toISOString() }).eq('id', campaign.id).eq('status', 'sending').select('id');
      if ((done.data ?? []).length > 0) {
        const [okCount, failCount] = await Promise.all([
          db.from('mail_campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('status', 'sent'),
          db.from('mail_campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('status', 'failed'),
        ]);
        await db.from('notifications').insert(['admin', 'super_admin'].map((role) => ({ target_role: role, type: 'campaign.finished', payload: { name: campaign.name, sent: okCount.count ?? 0, failed: failCount.count ?? 0 }, link_path: `/admin/campaigns/${campaign.id}` })));
      }
    }
  }
  return ok({ campaigns: touched, sent, failed, skipped, budget });
}
