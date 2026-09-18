import { describe, expect, it } from 'vitest';
import { interpolate, renderMail } from '../render';

describe('mail render', () => {
  it('yer tutucuları doldurur, bilinmeyeni boş bırakır', () => {
    expect(interpolate('Sayın {{ full_name }}, {{ref_no}} {{yok}}!', { full_name: 'Ali', ref_no: 'TLP-1' })).toBe('Sayın Ali, TLP-1 !');
  });

  it('HTML kaçırılır; paragraflar ayrılır; düz metin korunur', () => {
    const r = renderMail({ subject: 'Konu {{ref_no}}', body: 'Merhaba {{name}},\n\nMesaj: {{message}}', variables: { ref_no: 'TLP-2', name: 'Ayşe', message: '<script>alert(1)</script>' }, siteName: 'CLK' });
    expect(r.subject).toBe('Konu TLP-2');
    expect(r.text).toContain('<script>');
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html.match(/<p /g)?.length).toBe(2);
  });
});
