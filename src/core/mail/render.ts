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
