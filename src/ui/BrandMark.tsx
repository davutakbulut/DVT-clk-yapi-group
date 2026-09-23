import { Link } from '@/i18n/navigation';

interface Props {
  readonly siteName: string;
  /** Logo görseli yüklendiğinde (site.logo_media_id) kullanılır; yoksa kademe ikonu + metin. */
  readonly logo?: { readonly src: string; readonly width: number; readonly height: number } | null;
  readonly size?: 'sm' | 'md';
}

/**
 * Marka imzası. Logo dosyası gelene kadar (ROADMAP › Engelleyiciler) prototipteki kademe ikonu kullanılır.
 * Site adı veritabanından gelir; ilk kelime büyük, kalanı mono etiket.
 */
/** Kademe ikonu (üç dikey çubuk). `animated`: çubuklar soldan sağa sırayla hafifçe yükselir (K-95: mobil menü düğmesi, dokunulabilirlik ipucu). */
export function BrandIcon({ height = 26, animated = false, className = '' }: { readonly height?: number; readonly animated?: boolean; readonly className?: string }) {
  return (
    <svg viewBox="0 0 40 30" width={(height * 40) / 30} height={height} aria-hidden="true" focusable="false" className={`${animated ? 'brand-icon-live' : ''} ${className}`.trim() || undefined} style={{ overflow: 'visible' }}>
      <rect x="0" y="18" width="9" height="12" fill="var(--turq-light)" />
      <rect x="13" y="10" width="9" height="20" fill="var(--turq)" />
      <rect x="26" y="2" width="9" height="28" fill="currentColor" />
    </svg>
  );
}

export function BrandMark({ siteName, logo = null, size = 'md', iconHiddenBelowLg = false }: Props & { /** Mobilde ikon menü düğmesindedir (K-95); imzada yalnız yazı kalır */ readonly iconHiddenBelowLg?: boolean }) {
  const [first = '', ...rest] = siteName.split(' ');
  const tagline = rest.join(' ').toLocaleUpperCase('tr');
  const iconH = size === 'sm' ? 20 : 26;
  const iconVis = iconHiddenBelowLg ? 'hidden lg:inline' : '';

  return (
    <Link href="/" aria-label={siteName} className="inline-flex items-center gap-3">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage'dan gelen WebP; next/image kotasını harcamaz (K-49)
        <img src={logo.src} width={logo.width} height={logo.height} alt="" style={{ height: iconH + 8, width: 'auto' }} />
      ) : (
        <>
          <BrandIcon height={iconH} className={iconVis} />
          <span aria-hidden="true" className={`h-6 w-px bg-current opacity-25 ${iconVis}`.trim()} />
          <span className="leading-none">
            <span className="block font-[family-name:var(--font-heading)] text-[19px] font-extrabold tracking-wide">{first}</span>
            {tagline ? <span className="label-mono mt-1 block text-[9px] text-[var(--color-accent-on-dark)]">{tagline}</span> : null}
          </span>
        </>
      )}
    </Link>
  );
}
