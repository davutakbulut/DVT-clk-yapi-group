import { describe, expect, it } from 'vitest';
import { detectFileType, mimeMatches } from '../domain/fileType';

const bytes = (...b: number[]) => Uint8Array.from(b);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

describe('media › sihirli bayt', () => {
  it('jpeg / png / webp / pdf / mp4 / webm tanınır', () => {
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe('image/jpeg');
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe('image/png');
    expect(detectFileType(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))?.mime).toBe('image/webp');
    expect(detectFileType(bytes(...ascii('%PDF-')))?.mime).toBe('application/pdf');
    expect(detectFileType(bytes(0, 0, 0, 0x18, ...ascii('ftyp')))?.mime).toBe('video/mp4');
    expect(detectFileType(bytes(0x1a, 0x45, 0xdf, 0xa3))?.mime).toBe('video/webm');
  });

  it('bilinmeyen içerik ve uyuşmayan MIME reddedilir', () => {
    expect(detectFileType(bytes(...ascii('<script>')))).toBeNull();
    const png = detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))!;
    expect(mimeMatches('image/jpeg', png)).toBe(false);
    expect(mimeMatches('image/png', png)).toBe(true);
  });
});
