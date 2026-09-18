import { describe, expect, it } from 'vitest';
import { parseYouTubeId, youTubeEmbedUrl } from '../domain/youtube';

describe('parseYouTubeId', () => {
  it('yaygın bağlantı biçimleri ve çıplak kimlik', () => {
    const id = 'dQw4w9WgXcQ';
    for (const url of [`https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?si=abc`, `https://www.youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`, `https://m.youtube.com/watch?v=${id}&t=10s`, `youtube.com/live/${id}`, id]) {
      expect(parseYouTubeId(url)).toBe(id);
    }
  });
  it('geçersiz ya da başka site → null; gömme adresi çerezsiz alan adı', () => {
    expect(parseYouTubeId('https://vimeo.com/123456')).toBeNull();
    expect(parseYouTubeId('https://www.youtube.com/watch?v=kisa')).toBeNull();
    expect(parseYouTubeId('https://evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYouTubeId('')).toBeNull();
    expect(youTubeEmbedUrl('dQw4w9WgXcQ')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});
