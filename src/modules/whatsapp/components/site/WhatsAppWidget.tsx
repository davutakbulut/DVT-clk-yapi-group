'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { usePathname } from '@/i18n/navigation';

export interface WhatsAppWidgetProps {
  readonly phone: string;
  readonly displayName: string;
  readonly greeting: string;
  readonly replyTime: string;
  /** Sayfa bağlamlı şablon; {{url}} yer tutucusu mevcut adresle değiştirilir. Yoksa messages'taki varsayılan. */
  readonly messageTemplate: string | null;
  readonly delaySeconds: number;
  readonly hiddenPaths: readonly string[];
}

function formatPhone(e164: string): string {
  // +905xxxxxxxxx → +90 5xx xxx xx xx (yalnız görüntü)
  const m = /^\+(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : e164;
}

/**
 * Yüzen WhatsApp (01-PUBLIC-PAGES). Kapalı: yeşil yuvarlak + hap etiket; açık: panel. N sn sonra yumuşak giriş,
 * `prefers-reduced-motion`'da animasyonsuz. Dönüşüm olayı kaydı Faz 23 (analitik) ile bağlanır.
 */
export function WhatsAppWidget({ phone, displayName, greeting, replyTime, messageTemplate, delaySeconds, hiddenPaths }: WhatsAppWidgetProps) {
  const t = useTranslations('WhatsApp');
  const pathname = usePathname();
  const panelId = useId();
  const [visible, setVisible] = useState(delaySeconds === 0);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (delaySeconds === 0) return;
    const timer = window.setTimeout(() => setVisible(true), delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [delaySeconds]);

  if (!visible || hiddenPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const url = typeof window === 'undefined' ? '' : window.location.href;
  const message = (messageTemplate ?? t('defaultMessage', { url: '{{url}}' })).replaceAll('{{url}}', url);
  const chatHref = `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // pano izni yoksa sessiz: numara zaten ekranda
    }
  }

  return (
    <>
      {open ? (
        <section id={panelId} className="wa-panel" aria-label={t('panelLabel')}>
          <header className="flex items-center gap-3 bg-[var(--color-surface-dark)] p-4 text-[var(--color-text-inverse)]" data-on-dark="">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wa-green)] text-[var(--ink)]" aria-hidden="true">
              <WhatsAppIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{displayName || formatPhone(phone)}</p>
              <p className="text-[length:var(--fs-xs)] text-[var(--color-text-inverse-muted)]">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--wa-green)]" aria-hidden="true" />
                {t('online')}
                {replyTime ? ` · ${replyTime}` : ''}
              </p>
            </div>
            <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label={t('close')} onClick={() => setOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div className="grid gap-4 p-4">
            {greeting ? <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{greeting}</p> : null}
            <p className="font-mono text-[length:var(--fs-sm)]">{formatPhone(phone)}</p>
            <a href={chatHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              {t('start')}
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${phone}`} className="btn btn-ghost">
                {t('call')}
              </a>
              <button type="button" className="btn btn-ghost" onClick={copy} aria-live="polite">
                {copied ? t('copied') : t('copy')}
              </button>
            </div>
          </div>
        </section>
      ) : null}
      <div className="wa-fab">
        {!open ? <span className="wa-fab-label hidden sm:inline-block" aria-hidden="true">{t('open')}</span> : null}
        <button type="button" className="wa-fab-button" aria-label={open ? t('close') : t('open')} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((v) => !v)}>
          <WhatsAppIcon />
        </button>
      </div>
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 1.67c4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m-3.4 4.4c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.12.17 1.74 2.77 4.3 3.78 2.13.84 2.56.67 3.02.63.46-.04 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.1-.23-.17-.48-.29-.25-.13-1.49-.74-1.72-.82-.23-.08-.4-.13-.57.12-.17.25-.65.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.87-.2-.49-.4-.42-.57-.43z" />
    </svg>
  );
}
