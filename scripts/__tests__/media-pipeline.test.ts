import { describe, expect, it } from 'vitest';
import {
  altFor, folderSlug, imagePaths, mimeFor, planWidths, readMp4Metadata, uuidFromHash, videoPath,
} from '../lib/media-pipeline.mjs';

describe('medya boru hattı — saf parçalar', () => {
  it('Türkçe klasör adları toLowerCase olmadan slug olur (K-16)', () => {
    expect(folderSlug('ÇELİK KONSTRÜKSİYON')).toBe('celik-konstruksiyon');
    expect(folderSlug('KUTU PROFİL ALÇIPAN')).toBe('kutu-profil-alcipan');
    expect(folderSlug('KÖRKASA')).toBe('korkasa');
  });

  it('varyant planı: kaynaktan küçük genişlikler + 1920 tavanı', () => {
    expect(planWidths(1600)).toEqual({ full: 1600, variants: [480, 960, 1440] });
    expect(planWidths(2048)).toEqual({ full: 1920, variants: [480, 960, 1440] });
    expect(planWidths(738)).toEqual({ full: 738, variants: [480] });
    expect(planWidths(447)).toEqual({ full: 447, variants: [] });
  });

  it('yollar ASCII ve kararlı; içerik hash\'i id\'ye çevrilir', () => {
    const hash = 'a'.repeat(64);
    const paths = imagePaths('HAFİF ÇELİK', hash);
    expect(paths.full).toBe('hafif-celik/aaaaaaaaaaaa.webp');
    expect(paths.variant(480)).toBe('hafif-celik/aaaaaaaaaaaa-w480.webp');
    expect(uuidFromHash(hash)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidFromHash(hash)).toBe(uuidFromHash(hash));
    expect(videoPath('videos', 'yapı-video-1.webm')).toBe('videos/yapi-video-1.webm');
  });

  it('mime ve alt metni', () => {
    expect(mimeFor('x.JPG')).toBe('image/jpeg');
    expect(mimeFor('x.webm')).toBe('video/webm');
    expect(altFor('KÖRKASA')).toEqual({ tr: 'Körkasa' });
    expect(altFor('bilinmeyen')).toEqual({});
  });

  it('mp4: moov/mvhd/tkhd kutularından süre ve boyut okunur', () => {
    const box = (type: string, body: Buffer) => {
      const head = Buffer.alloc(8);
      head.writeUInt32BE(8 + body.length, 0);
      head.write(type, 4, 'latin1');
      return Buffer.concat([head, body]);
    };
    const mvhd = Buffer.alloc(100);
    mvhd.writeUInt32BE(1000, 12); // timescale
    mvhd.writeUInt32BE(6500, 16); // duration → 6.5 sn
    const tkhd = Buffer.alloc(84);
    tkhd.writeUInt32BE(1920 << 16, 76);
    tkhd.writeUInt32BE(1080 << 16, 80);
    const file = Buffer.concat([box('ftyp', Buffer.alloc(4)), box('moov', Buffer.concat([box('mvhd', mvhd), box('trak', box('tkhd', tkhd))]))]);
    expect(readMp4Metadata(file)).toEqual({ width: 1920, height: 1080, durationMs: 6500 });
    expect(readMp4Metadata(Buffer.from('not an mp4'))).toBeNull();
  });
});
