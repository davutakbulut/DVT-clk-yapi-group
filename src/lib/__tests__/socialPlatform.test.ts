import { describe, expect, it } from 'vitest';
import { socialPlatformOf } from '../social/socialPlatform';

describe('socialPlatformOf', () => {
  it('bilinen adresleri tanır', () => {
    expect(socialPlatformOf('https://www.instagram.com/clk')).toBe('instagram');
    expect(socialPlatformOf('https://linkedin.com/company/clk')).toBe('linkedin');
    expect(socialPlatformOf('https://youtu.be/abc')).toBe('youtube');
    expect(socialPlatformOf('https://twitter.com/clk')).toBe('x');
    expect(socialPlatformOf('https://wa.me/905000000000')).toBe('whatsapp');
  });
  it('bilinmeyen ya da bozuk adres → genel bağlantı simgesi', () => {
    expect(socialPlatformOf('https://ornek.com.tr')).toBe('link');
    expect(socialPlatformOf('bozuk')).toBe('link');
    expect(socialPlatformOf('https://notinstagram.com')).toBe('link');
  });
});
