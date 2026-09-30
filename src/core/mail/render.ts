// Mail şablonu render'ı: {{degisken}} yer tutucuları; her değer HTML'de kaçırılır, düz metin sürümü de üretilir.
// React Email yok (v1): şablon gövdesi düz metin/satır sonu; HTML sarmalayıcı burada.

export interface RenderedMail {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** {{key}} → değer; bilinmeyen anahtar boş kalır (şablon kırılmaz). */
export function interpolate(template: string, variables: Readonly<Record<string, unknown>>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function renderMail(input: { readonly subject: string; readonly body: string; readonly variables: Readonly<Record<string, unknown>>; readonly siteName: string }): RenderedMail {
  const subject = interpolate(input.subject, input.variables).replace(/\s+/g, ' ').trim();
  const text = interpolate(input.body, input.variables).trim();
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f7f6f4;font-family:Arial,Helvetica,sans-serif;color:#0f1315">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-top:4px solid #5c7fa3">
<tr><td style="padding:24px 32px 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#4a6a8c">${escapeHtml(input.siteName)}</td></tr>
<tr><td style="padding:8px 32px 32px;font-size:16px">${paragraphs}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

// ── Toplu e-posta (K-108) ───────────────────────────────────────────────────────────────────────────────────────────────
// Gövde sade biçimlendirme taşır: "## Başlık", "- madde", **kalın**, [metin](https://…). Ham HTML YAZILAMAZ (önce kaçırılır).
// Kişisel değişkenler biçimlendirmeden SONRA ve kaçırılarak yerleştirilir → alıcı adındaki "[x](…)" bağlantıya dönüşmez.

export interface CampaignMailInput {
  readonly subject: string;
  readonly preheader?: string;
  readonly body: string;
  readonly ctaLabel?: string;
  readonly ctaUrl?: string;
  /** Alıcıya özel değerler: full_name, company, email */
  readonly variables: Readonly<Record<string, unknown>>;
  readonly siteName: string;
  readonly siteUrl: string;
  /** Alt bilgi metni (ayarlar); {{site_name}} ve {{site_url}} kullanılabilir. */
  readonly footer: string;
  readonly unsubscribeLabel: string;
  readonly unsubscribeUrl: string;
}

const LINK_PATTERN = /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g;
const BOLD_PATTERN = /\*\*([^*\n]+)\*\*/g;

function inlineHtml(escaped: string): string {
  return escaped.replace(LINK_PATTERN, '<a href="$2" style="color:#4a6a8c;text-decoration:underline">$1</a>').replace(BOLD_PATTERN, '<strong>$1</strong>');
}

function inlineText(raw: string): string {
  return raw.replace(LINK_PATTERN, '$1 ($2)').replace(BOLD_PATTERN, '$1');
}

function escapeValues(variables: Readonly<Record<string, unknown>>): Record<string, string> {
  return Object.fromEntries(Object.entries(variables).map(([k, v]) => [k, v === undefined || v === null ? '' : escapeHtml(String(v))]));
}

/** Gövdeyi bloklara ayırır: başlık · liste · paragraf. */
function campaignBlocks(body: string): { readonly kind: 'h' | 'ul' | 'p'; readonly lines: readonly string[] }[] {
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== ''))
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0]!)) return { kind: 'h' as const, lines: [lines[0]!.replace(/^#{1,3}\s+/, '')] };
      if (lines.every((l) => /^[-*]\s+/.test(l))) return { kind: 'ul' as const, lines: lines.map((l) => l.replace(/^[-*]\s+/, '')) };
      return { kind: 'p' as const, lines };
    });
}

export function renderCampaignMail(input: CampaignMailInput): RenderedMail {
  const safe = escapeValues(input.variables);
  const subject = interpolate(input.subject, input.variables).replace(/\s+/g, ' ').trim();
  const blocks = campaignBlocks(input.body);
  const footerVars = { site_name: input.siteName, site_url: input.siteUrl };
  const footerText = interpolate(input.footer, footerVars).trim();
  const hasCta = Boolean(input.ctaLabel?.trim() && input.ctaUrl?.trim());

  const text = [
    ...blocks.map((b) => (b.kind === 'ul' ? b.lines.map((l) => `- ${inlineText(l)}`).join('\n') : b.lines.map(inlineText).join('\n'))).map((b) => interpolate(b, input.variables)),
    ...(hasCta ? [`${input.ctaLabel!.trim()}: ${input.ctaUrl!.trim()}`] : []),
    '--',
    ...(footerText ? [footerText] : []),
    `${input.unsubscribeLabel}: ${input.unsubscribeUrl}`,
  ].join('\n\n');

  const htmlBlocks = blocks
    .map((b) => {
      if (b.kind === 'h') return `<h2 style="margin:24px 0 12px;font-size:20px;line-height:1.3;color:#0f1315">${inlineHtml(escapeHtml(b.lines[0]!))}</h2>`;
      if (b.kind === 'ul') return `<ul style="margin:0 0 16px;padding-left:20px;line-height:1.6">${b.lines.map((l) => `<li>${inlineHtml(escapeHtml(l))}</li>`).join('')}</ul>`;
      return `<p style="margin:0 0 16px;line-height:1.6">${b.lines.map((l) => inlineHtml(escapeHtml(l))).join('<br />')}</p>`;
    })
    .map((b) => interpolate(b, safe))
    .join('');
  const cta = hasCta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px"><tr><td style="background:#4a6a8c;border-radius:4px"><a href="${escapeHtml(input.ctaUrl!.trim())}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none">${escapeHtml(input.ctaLabel!.trim())}</a></td></tr></table>`
    : '';
  const preheader = input.preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(interpolate(input.preheader, input.variables).trim())}</div>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#f7f6f4;font-family:Arial,Helvetica,sans-serif;color:#0f1315">${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-top:4px solid #5c7fa3">
<tr><td style="padding:24px 32px 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#4a6a8c">${escapeHtml(input.siteName)}</td></tr>
<tr><td style="padding:8px 32px 24px;font-size:16px">${htmlBlocks}${cta}</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #e5e2dc;font-size:12px;line-height:1.6;color:#5b6166">${footerText ? `${escapeHtml(footerText).replace(/\n/g, '<br />')}<br />` : ''}<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#5b6166;text-decoration:underline">${escapeHtml(input.unsubscribeLabel)}</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}
