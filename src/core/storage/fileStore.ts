import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { getSiteUrl } from '@/core/config/site';
import { appError, err, ok, type Result } from '@/core/errors/result';

// K-116 · Dosyalar kendi hosting'imizde (Supabase Storage yerine). İki depo:
//   media              → MEDIA_DIR (~/public_html/media): Apache/LiteSpeed doğrudan sunar (.htaccess PassengerEnabled off)
//   private-documents  → PRIVATE_DIR (~/storage/private-documents): web'e kapalı, yalnız imzalı süreli bağlantıyla (/api/files)
// Yerel geliştirmede (STORAGE_DRIVER=cpanel) dosyalar cPanel API'siyle sunucuya yazılır: veritabanı tek, dosyalar da tek yerde.

export type Bucket = 'media' | 'private-documents';
const BUCKETS: readonly Bucket[] = ['media', 'private-documents'];

const isBucket = (b: string): b is Bucket => (BUCKETS as readonly string[]).includes(b);

/** Yol güvenliği: göreli, '..' yok, yalnız güvenli karakterler (yükleme yolları uygulamada üretilir). */
export function safePath(path: string): string | null {
  const clean = normalize(path).replace(/^\/+/, '');
  if (!clean || clean.startsWith('..') || clean.includes('/../') || !/^[A-Za-z0-9._/-]+$/.test(clean)) return null;
  return clean;
}

const fail = (message: string, cause?: unknown) => err(appError('external_service', message, { module: 'core/storage', cause }));

function localRoot(bucket: Bucket): string | null {
  return (bucket === 'media' ? process.env['MEDIA_DIR'] : process.env['PRIVATE_DIR']) ?? null;
}

function remoteRoot(bucket: Bucket): string {
  const home = `/home/${process.env['CPANEL_USER'] ?? ''}`;
  return bucket === 'media' ? `${home}/public_html/media` : `${home}/storage/private-documents`;
}

const viaCpanel = () => process.env['STORAGE_DRIVER'] === 'cpanel';

async function cpanel(path: string, init: RequestInit): Promise<unknown> {
  const host = process.env['CPANEL_HOST'];
  const res = await fetch(`https://${host}:2083${path}`, {
    ...init,
    headers: { Authorization: `cpanel ${process.env['CPANEL_USER']}:${process.env['CPANEL_TOKEN']}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`cPanel ${res.status}`);
  return res.json();
}

async function cpanelMkdirs(dir: string): Promise<void> {
  const home = `/home/${process.env['CPANEL_USER'] ?? ''}`;
  let cur = home;
  for (const seg of dir.slice(home.length + 1).split('/')) {
    const body = new URLSearchParams({ cpanel_jsonapi_user: process.env['CPANEL_USER'] ?? '', cpanel_jsonapi_apiversion: '2', cpanel_jsonapi_module: 'Fileman', cpanel_jsonapi_func: 'mkdir', path: cur, name: seg });
    await cpanel('/json-api/cpanel', { method: 'POST', body }); // var olan klasörde hata döner, yok sayılır
    cur = `${cur}/${seg}`;
  }
}

export async function putFile(bucket: Bucket, path: string, body: Uint8Array, contentType: string): Promise<Result<void>> {
  const rel = safePath(path);
  if (!rel) return fail(`Geçersiz dosya yolu: ${path}`);
  try {
    if (viaCpanel()) {
      const target = `${remoteRoot(bucket)}/${rel}`;
      await cpanelMkdirs(dirname(target));
      const form = new FormData();
      form.set('dir', dirname(target));
      form.set('overwrite', '1');
      form.set('file-1', new Blob([new Uint8Array(body)], { type: contentType }), target.slice(target.lastIndexOf('/') + 1));
      const out = (await cpanel('/execute/Fileman/upload_files', { method: 'POST', body: form })) as { status?: number; errors?: unknown };
      if (out.status !== 1) return fail(`Yükleme reddedildi: ${JSON.stringify(out.errors)}`);
      return ok(undefined);
    }
    const root = localRoot(bucket);
    if (!root) return err(appError('not_configured', `${bucket} klasörü tanımsız (MEDIA_DIR / PRIVATE_DIR)`, { module: 'core/storage' }));
    const target = join(root, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    return ok(undefined);
  } catch (cause) {
    return fail('Dosya yazılamadı', cause);
  }
}

export async function removeFiles(bucket: Bucket, paths: readonly string[]): Promise<Result<number>> {
  let removed = 0;
  try {
    for (const path of paths) {
      const rel = safePath(path);
      if (!rel) continue;
      if (viaCpanel()) {
        const body = new URLSearchParams({ cpanel_jsonapi_user: process.env['CPANEL_USER'] ?? '', cpanel_jsonapi_apiversion: '2', cpanel_jsonapi_module: 'Fileman', cpanel_jsonapi_func: 'fileop', op: 'unlink', sourcefiles: `${remoteRoot(bucket)}/${rel}`, doubledecode: '0' });
        await cpanel('/json-api/cpanel', { method: 'POST', body });
      } else {
        const root = localRoot(bucket);
        if (!root) return err(appError('not_configured', `${bucket} klasörü tanımsız`, { module: 'core/storage' }));
        await rm(join(root, rel), { force: true });
      }
      removed++;
    }
    return ok(removed);
  } catch (cause) {
    return fail('Dosya silinemedi', cause);
  }
}

/** Gizli dosyayı okur (yalnız sunucuda, /api/files imza doğrulamasından sonra). */
export async function readPrivateFile(bucket: string, path: string): Promise<Result<Buffer>> {
  const rel = safePath(path);
  const root = isBucket(bucket) ? localRoot(bucket) : null;
  if (!rel || !root) return err(appError('not_found', 'Dosya yok', { module: 'core/storage' }));
  try {
    return ok(await readFile(join(root, rel)));
  } catch {
    return err(appError('not_found', 'Dosya yok', { module: 'core/storage' }));
  }
}

function signature(bucket: string, path: string, expires: number): string | null {
  const secret = process.env['FILE_URL_SECRET'];
  if (!secret) return null;
  return createHmac('sha256', secret).update(`${bucket}/${path}:${expires}`).digest('base64url');
}

/** Süreli imzalı bağlantı (Supabase createSignedUrl karşılığı). Dosya sunucuda olduğundan adres canlı siteyi gösterebilir (FILES_ORIGIN). */
export function signedUrl(bucket: Bucket, path: string, ttlSeconds: number): string | null {
  const rel = safePath(path);
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = rel ? signature(bucket, rel, expires) : null;
  if (!rel || !sig) return null;
  const origin = process.env['FILES_ORIGIN'] ?? getSiteUrl().origin;
  return `${origin}/api/files/${bucket}/${rel.split('/').map(encodeURIComponent).join('/')}?exp=${expires}&sig=${sig}`;
}

export function verifySignedUrl(bucket: string, path: string, exp: string | null, sig: string | null): boolean {
  const expires = Number(exp);
  if (!sig || !Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const rel = safePath(path);
  const expected = rel ? signature(bucket, rel, expires) : null;
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
