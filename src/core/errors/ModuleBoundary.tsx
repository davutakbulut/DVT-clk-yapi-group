'use client';

import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/core/observability/logger';

interface ModuleBoundaryProps {
  /** error_logs kaydına yazılacak etiket — "bir yerlerde hata var" yerine "testimonials'ta hata var". */
  readonly module: string;
  readonly children: ReactNode;
  /** Hata durumunda gösterilecek. Varsayılan null: içerik bölümü sessizce kapanır, hata kutusu göstermez. */
  readonly fallback?: ReactNode;
  /** Veri beklenirken gösterilecek iskelet. */
  readonly loading?: ReactNode;
}

interface BoundaryState {
  readonly failed: boolean;
}

class Boundary extends Component<Omit<ModuleBoundaryProps, 'loading'>, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(error.message, { module: this.props.module, componentStack: info.componentStack, digest: (error as { digest?: string }).digest });
  }

  override render(): ReactNode {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

/** Hata sınırı + Suspense + modül etiketli log. Bir bölüm patlarsa yalnız o bölüm kaybolur. */
export function ModuleBoundary({ module, children, fallback = null, loading = null }: ModuleBoundaryProps) {
  return (
    <Boundary module={module} fallback={fallback}>
      <Suspense fallback={loading}>{children}</Suspense>
    </Boundary>
  );
}
