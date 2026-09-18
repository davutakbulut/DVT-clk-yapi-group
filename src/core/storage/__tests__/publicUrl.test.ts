import { describe, expect, it } from 'vitest';
import { mediaAlt, mediaSrcSet, publicStorageUrl, type MediaAsset } from '../publicUrl';

const URL = 'https://abc.supabase.co/';
const asset: MediaAsset = {
  bucket: 'media',
  path: 'celik-konstruksiyon/abcdef123456.webp',
  width: 1600,
  height: 1200,
  variants: { w960: 'celik-konstruksiyon/abcdef123456-w960.webp', w480: 'celik-konstruksiyon/abcdef123456-w480.webp' },
  blurDataUrl: null,
  alt: { tr: 'Çelik konstrüksiyon' }, // static-ok: test verisi
};

describe('core/storage', () => {
  it('public URL: sondaki / temizlenir, yol parçaları kodlanır', () => {
    expect(publicStorageUrl(URL, { bucket: 'media', path: 'a b/c.webp' })).toBe('https://abc.supabase.co/storage/v1/object/public/media/a%20b/c.webp');
  });

  it('srcset: varyantlar küçükten büyüğe, tam boy en sonda', () => {
    expect(mediaSrcSet(URL, asset)).toBe(
      'https://abc.supabase.co/storage/v1/object/public/media/celik-konstruksiyon/abcdef123456-w480.webp 480w, ' +
        'https://abc.supabase.co/storage/v1/object/public/media/celik-konstruksiyon/abcdef123456-w960.webp 960w, ' +
        'https://abc.supabase.co/storage/v1/object/public/media/celik-konstruksiyon/abcdef123456.webp 1600w',
    );
    expect(mediaSrcSet(URL, { ...asset, width: null, variants: {} })).toBe('');
  });

  it('alt: dil yoksa boş — İngilizce sayfada Türkçe alt çıkmaz', () => {
    expect(mediaAlt(asset, 'tr')).toBe('Çelik konstrüksiyon'); // static-ok: test verisi
    expect(mediaAlt(asset, 'en')).toBe('');
  });
});
