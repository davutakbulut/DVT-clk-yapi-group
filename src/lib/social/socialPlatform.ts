/** Sosyal bağlantı → platform anahtarı. URL'den tanınır; panelde yazılan etiket ("Instagram") yalnız erişilebilir ad olarak kalır. */
export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'x' | 'tiktok' | 'whatsapp' | 'pinterest' | 'threads' | 'link';

const HOSTS: readonly [RegExp, SocialPlatform][] = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)linkedin\.com$/, 'linkedin'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'whatsapp'],
  [/(^|\.)pinterest\.(com|[a-z]{2})$/, 'pinterest'],
  [/(^|\.)threads\.(net|com)$/, 'threads'],
];

export function socialPlatformOf(url: string): SocialPlatform {
  let host = '';
  try {
    host = new URL(url).hostname.toLocaleLowerCase('en-US').replace(/^www\./, '');
  } catch {
    return 'link';
  }
  return HOSTS.find(([re]) => re.test(host))?.[1] ?? 'link';
}
