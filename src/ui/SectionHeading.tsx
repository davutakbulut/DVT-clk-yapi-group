import type { ReactNode } from 'react';

interface Props {
  /** "01" gibi numaralı kicker — 01-DESIGN-SYSTEM › Hiyerarşi. */
  readonly index?: string;
  readonly kicker?: string;
  readonly title: ReactNode;
  readonly lead?: ReactNode;
  readonly as?: 'h1' | 'h2' | 'h3';
  readonly align?: 'start' | 'center';
  readonly onDark?: boolean;
}

export function SectionHeading({ index, kicker, title, lead, as: Tag = 'h2', align = 'start', onDark = false }: Props) {
  const color = onDark ? 'text-[var(--color-text-inverse)]' : 'text-[var(--color-text)]';
  const leadColor = onDark ? 'text-[var(--color-text-inverse-muted)]' : 'text-[var(--color-text-muted)]';
  return (
    <div className={`grid gap-4 ${align === 'center' ? 'justify-items-center text-center' : ''}`}>
      {kicker ? (
        <p className="label-mono flex items-center gap-3 text-[var(--color-accent-text)]">
          {index ? <span className="bg-[var(--color-accent)] px-2 py-1 font-[family-name:var(--font-heading)] text-[var(--color-text)]">{index}</span> : null}
          <span className={onDark ? 'text-[var(--color-accent-on-dark)]' : ''}>{kicker}</span>
        </p>
      ) : null}
      <Tag className={color}>{title}</Tag>
      {lead ? <p className={`max-w-[var(--prose-max)] text-[length:var(--fs-body-lg)] ${leadColor}`}>{lead}</p> : null}
    </div>
  );
}
