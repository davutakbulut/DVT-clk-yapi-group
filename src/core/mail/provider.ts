import 'server-only';
import { createTransport } from 'nodemailer';
import type { RenderedMail } from './render';

export interface MailMessage extends RenderedMail {
  readonly to: string;
  readonly toName?: string | null;
}

export interface SendOutcome {
  readonly provider: 'resend' | 'smtp';
  readonly ok: boolean;
  readonly messageId?: string;
  readonly error?: string;
}

export interface MailProvider {
  readonly name: 'resend' | 'smtp';
  readonly isConfigured: () => boolean;
  readonly send: (message: MailMessage) => Promise<SendOutcome>;
}

function from(): string {
  return process.env['MAIL_FROM'] ?? 'no-reply@localhost';
}

/** Resend HTTP API — SDK gerekmez, tek fetch. */
export const resendProvider: MailProvider = {
  name: 'resend',
  isConfigured: () => Boolean(process.env['RESEND_API_KEY']),
  async send(message) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env['RESEND_API_KEY']}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: from(), to: [message.toName ? `${message.toName} <${message.to}>` : message.to], subject: message.subject, html: message.html, text: message.text }),
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (!res.ok) return { provider: 'resend', ok: false, error: `${res.status} ${body.message ?? body.name ?? ''}`.trim() };
      return { provider: 'resend', ok: true, messageId: body.id };
    } catch (cause) {
      return { provider: 'resend', ok: false, error: cause instanceof Error ? cause.message : String(cause) };
    }
  },
};

/** SMTP yedek (07-MAIL): Resend başarısızsa denenir. */
export const smtpProvider: MailProvider = {
  name: 'smtp',
  isConfigured: () => Boolean(process.env['SMTP_HOST'] && process.env['SMTP_USER'] && process.env['SMTP_PASSWORD']),
  async send(message) {
    try {
      const transport = createTransport({
        host: process.env['SMTP_HOST'],
        port: Number(process.env['SMTP_PORT'] ?? 587),
        secure: Number(process.env['SMTP_PORT'] ?? 587) === 465,
        auth: { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASSWORD'] },
        connectionTimeout: 10_000,
      });
      const info = await transport.sendMail({ from: from(), to: message.toName ? `"${message.toName}" <${message.to}>` : message.to, subject: message.subject, text: message.text, html: message.html });
      return { provider: 'smtp', ok: true, messageId: info.messageId };
    } catch (cause) {
      return { provider: 'smtp', ok: false, error: cause instanceof Error ? cause.message : String(cause) };
    }
  },
};

/** Sırayla dener: ilk başarılı sağlayıcı kazanır; hiçbiri yapılandırılmamışsa açık hata. */
export async function sendWithFallback(message: MailMessage, providers: readonly MailProvider[] = [resendProvider, smtpProvider]): Promise<SendOutcome> {
  const configured = providers.filter((p) => p.isConfigured());
  if (configured.length === 0) return { provider: 'resend', ok: false, error: 'Mail saglayicisi yapilandirilmamis (RESEND_API_KEY / SMTP_*)' };
  let last: SendOutcome = { provider: configured[0]!.name, ok: false, error: 'denenmedi' };
  for (const provider of configured) {
    last = await provider.send(message);
    if (last.ok) return last;
  }
  return last;
}
