import { getPublicSettings } from '@/modules/site-settings';
import { pickLocale } from '@/lib/localized';

export const revalidate = 3600;

/** /humans.txt (humanstxt.org, K-99): site sahibi + geliştirici imzası; her ikisi site ayarlarından. */
export async function GET() {
  const settings = await getPublicSettings();
  const name = pickLocale(settings.siteName, 'tr', { fallback: 'tr' });
  const lines = ['/* SITE */', `Name: ${name}`, ...(settings.contact.email ? [`Contact: ${settings.contact.email}`] : []), ''];
  if (settings.developer) lines.push('/* TEAM */', `Design & development: ${settings.developer.name}`, ...(settings.developer.url ? [`Site: ${settings.developer.url}`] : []), '');
  lines.push('/* THANKS */', 'Built with Next.js, Supabase and Three.js.');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
