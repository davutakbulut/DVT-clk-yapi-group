import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Elle <a href> yerine bunlar kullanılır: NEXT_LOCALE çerezi yalnız bu sarmalayıcılarla yazılır.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

/** Tipli iç yol: '/' veya { pathname: '/projects/[slug]', params: { slug } }. */
export type AppHref = Parameters<typeof getPathname>[0]['href'];
