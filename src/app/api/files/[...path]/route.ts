import { NextResponse, type NextRequest } from 'next/server';
import { readPrivateFile, verifySignedUrl } from '@/core/storage/fileStore';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

/** K-116 · Gizli dosya (CV vb.): yalnız süreli HMAC imzalı bağlantıyla; imzayı yetkili sunucu kodu üretir (signedUrl). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const [bucket, ...rest] = (await params).path;
  const path = rest.join('/');
  const { searchParams } = request.nextUrl;
  if (!bucket || !verifySignedUrl(bucket, path, searchParams.get('exp'), searchParams.get('sig'))) return new NextResponse(null, { status: 403 });
  const file = await readPrivateFile(bucket, path);
  if (!file.ok) return new NextResponse(null, { status: 404 });
  const ext = path.slice(path.lastIndexOf('.') + 1).toLocaleLowerCase('en');
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${path.slice(path.lastIndexOf('/') + 1).replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
