import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

interface ContainerProps<T extends ElementType> {
  readonly as?: T;
  readonly className?: string;
  readonly children: ReactNode;
}

/** İçerik genişliği + akışkan yan boşluk (`--content-max`, `--gutter`). */
export function Container<T extends ElementType = 'div'>({ as, className = '', children, ...rest }: ContainerProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof ContainerProps<T>>) {
  // R3F'nin JSX genişletmesi (three öğeleri) ElementType birleşimine children:never ekler → props'a göre daralt
  const Tag = (as ?? 'div') as ElementType<{ className?: string; children?: ReactNode }>;
  return (
    <Tag className={`container-x ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
