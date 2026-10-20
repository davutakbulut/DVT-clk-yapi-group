import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { putFile, readPrivateFile, removeFiles, safePath, signedUrl, verifySignedUrl } = await import('../fileStore');

describe('fileStore', () => {
  beforeAll(async () => {
    process.env['MEDIA_DIR'] = await mkdtemp(join(tmpdir(), 'media-'));
    process.env['PRIVATE_DIR'] = await mkdtemp(join(tmpdir(), 'private-'));
    process.env['FILE_URL_SECRET'] = 'test-secret';
    process.env['FILES_ORIGIN'] = 'https://ornek.com';
    delete process.env['STORAGE_DRIVER'];
  });

  it('yol güvenliği: dizin dışına çıkan ve garip karakterli yollar reddedilir', () => {
    expect(safePath('hero/a.webp')).toBe('hero/a.webp');
    expect(safePath('../etc/passwd')).toBeNull();
    expect(safePath('a/../../b')).toBeNull();
    expect(safePath('a b.pdf')).toBeNull();
  });

  it('yaz, oku, sil', async () => {
    expect((await putFile('private-documents', 'cv/x.pdf', new Uint8Array([1, 2, 3]), 'application/pdf')).ok).toBe(true);
    const read = await readPrivateFile('private-documents', 'cv/x.pdf');
    expect(read.ok && [...read.data]).toEqual([1, 2, 3]);
    expect((await putFile('media', 'hero/a.webp', new Uint8Array([9]), 'image/webp')).ok).toBe(true);
    expect([...(await readFile(join(process.env['MEDIA_DIR']!, 'hero/a.webp')))]).toEqual([9]);
    const removed = await removeFiles('private-documents', ['cv/x.pdf']);
    expect(removed.ok && removed.data).toBe(1);
    expect((await readPrivateFile('private-documents', 'cv/x.pdf')).ok).toBe(false);
  });

  it('imzalı bağlantı: doğru imza geçer; başka dosya, değişmiş imza ve süresi geçmiş bağlantı reddedilir', () => {
    const url = new URL(signedUrl('private-documents', 'cv/x.pdf', 600)!);
    expect(url.origin).toBe('https://ornek.com');
    const exp = url.searchParams.get('exp');
    const sig = url.searchParams.get('sig');
    expect(verifySignedUrl('private-documents', 'cv/x.pdf', exp, sig)).toBe(true);
    expect(verifySignedUrl('private-documents', 'cv/y.pdf', exp, sig)).toBe(false);
    expect(verifySignedUrl('private-documents', 'cv/x.pdf', exp, `${sig}x`)).toBe(false);
    expect(verifySignedUrl('private-documents', 'cv/x.pdf', String(Math.floor(Date.now() / 1000) - 1), sig)).toBe(false);
  });
});
