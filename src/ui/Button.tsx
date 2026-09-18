import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link, type AppHref } from '@/i18n/navigation';

type Variant = 'primary' | 'ghost';

interface BaseProps {
  readonly variant?: Variant;
  readonly className?: string;
  readonly children: ReactNode;
}

type ButtonProps = BaseProps & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children'> & { readonly href?: undefined };
type LinkProps = BaseProps & Omit<ComponentPropsWithoutRef<'a'>, 'className' | 'children' | 'href'> & { readonly href: AppHref };

function classes(variant: Variant, className: string): string {
  return `btn btn-${variant} ${className}`.trim();
}

/**
 * Ön yüz butonu — markalı, büyük. Admin butonuyla PAYLAŞILMAZ (02-STYLE-ISOLATION).
 * `href` verilirse tipli next-intl Link, verilmezse <button type="button">.
 */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', className = '', children, ...rest } = props;
  if (rest.href !== undefined) {
    const { href, ...anchor } = rest as Omit<LinkProps, keyof BaseProps>;
    return (
      <Link href={href} className={classes(variant, className)} {...anchor}>
        {children}
      </Link>
    );
  }
  const { type = 'button', ...button } = rest as Omit<ButtonProps, keyof BaseProps>;
  return (
    <button type={type} className={classes(variant, className)} {...button}>
      {children}
    </button>
  );
}
