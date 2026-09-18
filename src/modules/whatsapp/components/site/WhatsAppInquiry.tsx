import { logger } from '@/core/observability/logger';
import { getCachedWhatsAppConfig } from '../../data/whatsappRepository';
import { whatsappHref } from '../../domain/waLink';

interface Props {
  /** Hazır mesaj (çağıran modül kendi diline ve bağlamına göre üretir: ürün adı, ölçü, sayfa adresi). */
  readonly message: string;
  readonly label: string;
  /** 'button' = büyük yeşil düğme; 'link' = tablo satırı içinde küçük bağlantı. */
  readonly variant?: 'button' | 'link';
}

/**
 * Bağlama özel WhatsApp talebi (ürün stok/sipariş sorusu vb.). WhatsApp kapalıysa ya da numara yoksa HİÇ render edilmez →
 * çağıran sayfa diğer teklif yollarıyla (sepet, teklif formu) çalışmaya devam eder. Numara tek kaynaktan: whatsapp_settings.
 */
export async function WhatsAppInquiry({ message, label, variant = 'button' }: Props) {
  const result = await getCachedWhatsAppConfig();
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'whatsapp', code: result.error.code });
    return null;
  }
  if (!result.data) return null;
  const href = whatsappHref(result.data.phone_e164, message);
  if (variant === 'link') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="wa-inline" data-track="whatsapp_inquiry">
        <WaGlyph size={14} />
        {label}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="wa-cta wa-cta-page" data-track="whatsapp_inquiry">
      <WaGlyph size={20} />
      {label}
    </a>
  );
}

function WaGlyph({ size }: { readonly size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 1.67c4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m-3.4 4.4c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.12.17 1.74 2.77 4.3 3.78 2.13.84 2.56.67 3.02.63.46-.04 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.1-.23-.17-.48-.29-.25-.13-1.49-.74-1.72-.82-.23-.08-.4-.13-.57.12-.17.25-.65.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.87-.2-.49-.4-.42-.57-.43z" />
    </svg>
  );
}
