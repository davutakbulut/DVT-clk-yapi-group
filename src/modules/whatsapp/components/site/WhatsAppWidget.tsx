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
  readonly email?: string | null;
  readonly address?: string | null;
  readonly hours?: string | null;
}

function formatPhone(e164: string): string {
  // +905xxxxxxxxx → 0 5xx xxx xx xx (yurt içi okunuş); diğer ülkeler olduğu gibi
  const tr = /^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  if (tr) return `0 ${tr[1]} ${tr[2]} ${tr[3]} ${tr[4]}`;
  const m = /^\+(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : e164;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');
}

/**
 * Yüzen WhatsApp (01-PUBLIC-PAGES). Kapalı: yeşil yuvarlak + hap etiket; açık: panel. N sn sonra yumuşak giriş,
 * `prefers-reduced-motion`'da animasyonsuz. Dönüşüm olayı kaydı Faz 23 (analitik) ile bağlanır.
 */
export function WhatsAppWidget({ phone, displayName, greeting, replyTime, messageTemplate, delaySeconds, hiddenPaths, email = null, address = null, hours = null }: WhatsAppWidgetProps) {
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
  // Kayıtlı şablon anlamsız kısaysa (ör. yanlışlıkla "/") yok sayılır → varsayılan mesaj
  const template = messageTemplate && messageTemplate.trim().length >= 10 ? messageTemplate : null;
  const message = (template ?? t('defaultMessage', { url: '{{url}}' })).replaceAll('{{url}}', url);
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

  const name = displayName || formatPhone(phone);
  return (
    <>
      {open ? (
        <section id={panelId} className="wa-panel" aria-label={t('panelLabel')}>
          <header className="wa-head">
            <span className="wa-avatar" aria-hidden="true">
              {initialsOf(name) || <WhatsAppIcon />}
              <i className="wa-dot" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="wa-name">
                <span className="truncate">{name}</span>
                <span className="wa-badge">{t('online')}</span>
              </p>
              {replyTime ? (
                <p className="wa-reply">
                  <Icon d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" />
                  {replyTime}
                </p>
              ) : null}
            </div>
            <button type="button" className="wa-close" aria-label={t('close')} onClick={() => setOpen(false)}>
              <Icon d="M6 6l12 12M18 6L6 18" size={20} />
            </button>
          </header>
          <div className="wa-body">
            {greeting ? (
              <div className="wa-bubble">
                <p>{greeting}</p>
                <p className="wa-bubble-meta">{t('live')}</p>
              </div>
            ) : null}
            <ul className="wa-card">
              <li>
                <span className="wa-ic wa-ic-phone" aria-hidden="true">
                  <Icon d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2" />
                </span>
                <a href={`tel:${phone}`} className="wa-phone">
                  {formatPhone(phone)}
                </a>
                <button type="button" className="wa-copy" onClick={copy} aria-label={copied ? t('copied') : t('copy')}>
                  <Icon d={copied ? 'M5 13l4 4L19 7' : 'M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'} size={18} />
                </button>
              </li>
              {email ? (
                <li>
                  <span className="wa-ic wa-ic-mail" aria-hidden="true">
                    <Icon d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 3-10 6L2 7" />
                  </span>
                  <a href={`mailto:${email}`} className="truncate">
                    {email}
                  </a>
                </li>
              ) : null}
              {address ? (
                <li>
                  <span className="wa-ic wa-ic-pin" aria-hidden="true">
                    <Icon d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  </span>
                  <span className="text-[length:var(--fs-sm)]">{address}</span>
                </li>
              ) : null}
            </ul>
            <a href={chatHref} target="_blank" rel="noopener noreferrer" className="wa-cta">
              <WhatsAppIcon size={20} />
              {t('start')}
              <Icon d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" size={18} />
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${phone}`} className="wa-alt">
                <Icon d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2" size={16} />
                {t('call')}
              </a>
              <button type="button" className="wa-alt" onClick={copy}>
                <Icon d="M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" size={16} />
                <span aria-live="polite">{copied ? t('copied') : t('copy')}</span>
              </button>
            </div>
          </div>
          {hours ? (
            <footer className="wa-foot">
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" size={14} />
              {hours}
            </footer>
          ) : null}
        </section>
      ) : null}
      <div className="wa-fab" data-open={open ? '' : undefined}>
        {!open ? (
          <span className="wa-fab-label hidden sm:inline-flex" aria-hidden="true">
            <i className="wa-dot wa-dot-inline" />
            {t('label', { phone: formatPhone(phone) })}
          </span>
        ) : null}
        <button type="button" className="wa-fab-button" aria-label={open ? t('close') : t('open')} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((v) => !v)}>
          {open ? <Icon d="M6 6l12 12M18 6L6 18" size={24} /> : <WhatsAppIcon />}
        </button>
      </div>
    </>
  );
}

function Icon({ d, size = 16 }: { readonly d: string; readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}

function WhatsAppIcon({ size = 28 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 1.67c4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m-3.4 4.4c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.12.17 1.74 2.77 4.3 3.78 2.13.84 2.56.67 3.02.63.46-.04 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.1-.23-.17-.48-.29-.25-.13-1.49-.74-1.72-.82-.23-.08-.4-.13-.57.12-.17.25-.65.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.87-.2-.49-.4-.42-.57-.43z" />
    </svg>
  );
}
