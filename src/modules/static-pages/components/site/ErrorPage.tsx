import type { ReactNode } from 'react';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { ErrorIllustration, type ErrorVariant } from './ErrorIllustration';

interface Props {
  readonly variant: ErrorVariant;
  readonly code: string;
  readonly title: string;
  readonly body: string;
  readonly homeLabel: string;
  /** Yeniden dene (500) gibi ek eylem. */
  readonly action?: ReactNode;
  /** Popüler sayfa önerileri (menüden); boşsa bölüm çıkmaz. */
  readonly suggestions?: { readonly heading: string; readonly items: ReactNode } | null;
}

/** Sunum bileşeni: sunucu (404, DB metni) ve istemci (500, messages) tarafından ortak kullanılır. */
export function ErrorPage({ variant, code, title, body, homeLabel, action, suggestions = null }: Props) {
  return (
    <Container as="section" className="grid justify-items-center gap-8 py-[var(--section-y)] text-center">
      <ErrorIllustration variant={variant} />
      <div className="grid gap-4">
        <p className="label-mono text-[var(--color-accent-text)]">{code}</p>
        <h1>{title}</h1>
        {body ? <p className="mx-auto max-w-[var(--prose-max)] text-[length:var(--fs-body-lg)] text-[var(--color-text-muted)]">{body}</p> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button href="/">{homeLabel}</Button>
        {action}
      </div>
      {suggestions ? (
        <nav aria-label={suggestions.heading} className="grid gap-3">
          <h2 className="label-mono text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">{suggestions.heading}</h2>
          {suggestions.items}
        </nav>
      ) : null}
    </Container>
  );
}
