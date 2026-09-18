/** YouTube video kimliği: 11 karakter. Kabul edilen biçimler: watch?v=, youtu.be/, shorts/, embed/, live/ ya da çıplak kimlik. */
const ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (ID.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1] ?? '';
    return ID.test(id) ? id : null;
  }
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com' && host !== 'music.youtube.com') return null;
  const v = url.searchParams.get('v');
  if (v && ID.test(v)) return v;
  const m = /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/.exec(url.pathname);
  return m ? m[1]! : null;
}

/** Gizlilik dostu gömme (çerez yazmaz, yalnız oynatınca yüklenir): kullanıcı tıklayınca otomatik başlar. */
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
}

export function youTubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
