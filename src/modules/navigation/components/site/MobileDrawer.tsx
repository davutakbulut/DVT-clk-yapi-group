'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MenuNode } from '../../domain/types';
import { BrandIcon } from '@/ui/BrandMark';
import { MenuLinkView } from './MenuLinkView';
import { SocialLinks } from './SocialLinks';

interface Props {
  readonly items: readonly MenuNode[];
  readonly cta: MenuNode | null;
  /** Çekmece başlığında marka. Dil değiştirici çekmecede DEĞİL, header'da: her kırılımda tek yerden erişilir. */
  readonly brand: ReactNode;
  /** K-97: slogan, hızlı iletişim ve sosyal bağlantılar (site ayarlarından; boşsa gösterilmez) */
  readonly tagline?: string | null;
  readonly contact?: { readonly phone: string | null; readonly email: string | null } | null;
  readonly socialLinks?: readonly { readonly platform: string; readonly url: string }[];
}

/** Yerel <dialog>: odak tuzağı, Esc ile kapanma ve arka plan kilidi tarayıcıdan gelir; JS'siz de zararsız (buton görünmez). */
export function MobileDrawer({ items, cta, brand, tagline = null, contact = null, socialLinks = [] }: Props) {
  const t = useTranslations('Nav');
  const tf = useTranslations('Footer');
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => setOpen(false);

  // Gösterecek öğe yoksa (route'lar henüz yok — K-50) boş bir çekmece açan düğme de yok.
  if (items.length === 0 && !cta) return null;

  return (
    <>
      {/* K-95: hamburger yerine canlı logo ikonu menüyü açar (çubuklar sırayla yükselir → dokunulabilir ipucu); oran korunur */}
      <button type="button" className="brand-menu-button lg:hidden" aria-label={t('openMenu')} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <BrandIcon height={26} animated />
      </button>
      <dialog ref={ref} className="site-drawer" aria-label={t('menu')} onClose={close} onClick={(e) => e.target === ref.current && close()}>
        <div className="flex h-full flex-col p-6" data-on-dark="">
          <div className="flex items-center justify-between">
            {brand}
            <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label={t('closeMenu')} onClick={close}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {tagline ? <p className="site-drawer-tagline">{tagline}</p> : null}
          <nav aria-label={t('menu')} className="mt-6 flex-1 overflow-y-auto">
            <ul className="site-drawer-list">
              {items.map((node, i) => (
                <li key={node.id} className="site-drawer-item" style={{ '--i': i } as React.CSSProperties}>
                  <span className="site-drawer-index label-mono" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <MenuLinkView node={node} className="site-drawer-link" onNavigate={close} />
                  {node.children.length > 0 ? (
                    <ul className="pl-4">
                      {node.children.map((child) => (
                        <li key={child.id}>
                          <MenuLinkView node={child} className="block py-2 text-[var(--color-text-inverse-muted)]" onNavigate={close} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>
          {contact?.phone || contact?.email ? (
            <div className="site-drawer-contact">
              {contact.phone ? (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="site-drawer-quick">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
                  <span><small className="label-mono">{tf('phone')}</small>{contact.phone}</span>
                </a>
              ) : null}
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className="site-drawer-quick">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 7 9 6 9-6" /></svg>
                  <span><small className="label-mono">{tf('email')}</small>{contact.email}</span>
                </a>
              ) : null}
            </div>
          ) : null}
          {socialLinks.length > 0 ? (
            <div className="site-drawer-social">
              <SocialLinks links={socialLinks} label={tf('followUs')} />
            </div>
          ) : null}
          {cta ? (
            <div className="mt-5 site-drawer-cta">
              <MenuLinkView node={cta} className="btn btn-primary w-full" onNavigate={close} />
            </div>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
