'use client';

import { Link, usePathname, type AppHref } from '@/i18n/navigation';
import type { MenuNode } from '../../domain/types';

interface Props {
  readonly node: MenuNode;
  readonly className?: string;
  readonly onNavigate?: () => void;
}

/** Bağlantı türüne göre doğru öğe: tipli next-intl Link · dış <a> · çapa. `aria-current` yolu eşleştirir. */
export function MenuLinkView({ node, className = '', onNavigate }: Props) {
  const pathname = usePathname();
  const { link } = node;

  if (link.kind === 'internal') {
    const current = pathname === link.pathname;
    return (
      <Link href={link.pathname as AppHref} className={className} aria-current={current ? 'page' : undefined} onClick={onNavigate}>
        {node.label}
      </Link>
    );
  }
  if (link.kind === 'external') {
    return (
      <a href={link.url} className={className} rel={link.newTab ? 'noopener noreferrer' : undefined} target={link.newTab ? '_blank' : undefined} onClick={onNavigate}>
        {node.label}
      </a>
    );
  }
  if (link.kind === 'anchor') {
    return (
      <a href={`#${link.anchor}`} className={className} onClick={onNavigate}>
        {node.label}
      </a>
    );
  }
  return <span className={className}>{node.label}</span>;
}
