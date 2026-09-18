'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MenuNode } from '../../domain/types';
import { MenuLinkView } from './MenuLinkView';

interface Props {
  readonly items: readonly MenuNode[];
  readonly cta: MenuNode | null;
  /** Çekmece başlığında marka. Dil değiştirici çekmecede DEĞİL, header'da: her kırılımda tek yerden erişilir. */
  readonly brand: ReactNode;
}

/** Yerel <dialog>: odak tuzağı, Esc ile kapanma ve arka plan kilidi tarayıcıdan gelir; JS'siz de zararsız (buton görünmez). */
export function MobileDrawer({ items, cta, brand }: Props) {
  const t = useTranslations('Nav');
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
      <button type="button" className="inline-flex h-11 w-11 items-center justify-center lg:hidden" aria-label={t('openMenu')} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
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
          <nav aria-label={t('menu')} className="mt-8 flex-1 overflow-y-auto">
            <ul>
              {items.map((node) => (
                <li key={node.id}>
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
          {cta ? (
            <div className="mt-6">
              <MenuLinkView node={cta} className="btn btn-primary w-full" onNavigate={close} />
            </div>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
