/** wa.me bağlantısı: numara E.164 (+ işaretsiz yazılır), mesaj URL-kodlanır. Saf fonksiyon — sunucu ve istemcide ortak. */
export function whatsappHref(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
}
