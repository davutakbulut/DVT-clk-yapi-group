import { describe, expect, it } from 'vitest';
import { parseSocialLines } from '../domain/social';

describe('site-settings › sosyal bağlantı satırları', () => {
  it('geçerli satırları alır, bozukları atlar', () => {
    expect(parseSocialLines('instagram | https://instagram.com/x\nbozuk satır\nlinkedin|http://linkedin.com/company/x\n | https://x')).toEqual([
      { platform: 'instagram', url: 'https://instagram.com/x' },
      { platform: 'linkedin', url: 'http://linkedin.com/company/x' },
    ]);
  });
});
