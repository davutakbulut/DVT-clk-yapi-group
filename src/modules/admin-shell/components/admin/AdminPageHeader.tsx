import NextLink from 'next/link';
import type { ReactNode } from 'react';

export function AdminPageHeader({ title, lead, action }: { readonly title: string; readonly lead?: string; readonly action?: { readonly href: string; readonly label: string } | ReactNode }) {
  const isLink = action && typeof action === 'object' && 'href' in (action as object);
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {lead ? <p className="text-muted-foreground">{lead}</p> : null}
      </div>
      {isLink ? (
        <NextLink href={(action as { href: string }).href} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/80">
          {(action as { label: string }).label}
        </NextLink>
      ) : (
        (action as ReactNode)
      )}
    </div>
  );
}
