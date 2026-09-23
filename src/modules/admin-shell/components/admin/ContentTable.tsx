import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LocalizedText } from '@/lib/localized';
import { StatusBadge } from './StatusBadge';
import { Thumb, type ThumbSrc } from './Thumb';

export interface ContentRow {
  readonly id: string;
  readonly title: LocalizedText;
  readonly slug?: LocalizedText | null;
  readonly status?: string;
  readonly published_locales?: readonly string[];
  readonly is_featured?: boolean;
  /** Serbest ek sütun (kategori, tarih, konum…). */
  readonly extra?: string | null;
  /** Kapak/fotoğraf küçük resmi (K-87); satırların en az birinde varsa sütun açılır. */
  readonly thumb?: ThumbSrc | null;
}

type FormAction = (formData: FormData) => Promise<void>;

interface Props {
  readonly rows: readonly ContentRow[];
  /** Düzenleme bağlantısı: `${basePath}/${id}` */
  readonly basePath: string;
  readonly extraLabel?: string;
  readonly move?: FormAction;
  readonly remove?: FormAction;
}

/**
 * İçerik listeleri için ortak tablo (hizmet, proje, yazı…): ad · slug · durum · ek sütun · ↑↓ (tek RPC) · düzenle/sil.
 * Sunucu bileşeni; action'lar `<form action>` ile JS'siz çalışır. Kayıt sayısı büyüyünce TanStack Table'a geçilir.
 */
export async function ContentTable({ rows, basePath, extraLabel, move, remove }: Props) {
  const t = await getTranslations('Admin');
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t('common.empty')}</p>;
  const withThumb = rows.some((r) => r.thumb !== undefined);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {withThumb ? <TableHead className="w-14"><span className="sr-only">{t('form.image')}</span></TableHead> : null}
          <TableHead>{t('form.name')}</TableHead>
          <TableHead>{t('form.slug')}</TableHead>
          {extraLabel ? <TableHead>{extraLabel}</TableHead> : null}
          <TableHead>{t('form.status')}</TableHead>
          {move ? <TableHead>{t('form.order')}</TableHead> : null}
          <TableHead className="text-right">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.id}>
            {withThumb ? (
              <TableCell className="w-14 py-1">
                <Thumb src={row.thumb ?? null} alt={row.title['tr'] || t('form.untitled')} />
              </TableCell>
            ) : null}
            <TableCell className="font-medium">
              <NextLink href={`${basePath}/${row.id}`} className="underline-offset-4 hover:underline">
                {row.title['tr'] || t('form.untitled')}
              </NextLink>
              {row.is_featured ? <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{t('form.featured')}</span> : null}
            </TableCell>
            <TableCell className="font-mono text-xs">{row.slug?.['tr'] ?? ''}</TableCell>
            {extraLabel ? <TableCell className="text-sm text-muted-foreground">{row.extra ?? ''}</TableCell> : null}
            <TableCell>{row.status ? <StatusBadge status={row.status} locales={row.published_locales ?? []} /> : null}</TableCell>
            {move ? (
              <TableCell>
                <span className="flex gap-1">
                  <form action={move}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" variant="outline" size="sm" disabled={i === 0} aria-label={`${t('common.up')}: ${row.title['tr'] ?? ''}`}>
                      ↑
                    </Button>
                  </form>
                  <form action={move}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button type="submit" variant="outline" size="sm" disabled={i === rows.length - 1} aria-label={`${t('common.down')}: ${row.title['tr'] ?? ''}`}>
                      ↓
                    </Button>
                  </form>
                </span>
              </TableCell>
            ) : null}
            <TableCell className="text-right">
              <span className="inline-flex items-center gap-2">
                <NextLink href={`${basePath}/${row.id}`} className="text-sm underline underline-offset-4">
                  {t('common.edit')}
                </NextLink>
                {remove ? (
                  <form action={remove}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                      {t('common.delete')}
                    </Button>
                  </form>
                ) : null}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
