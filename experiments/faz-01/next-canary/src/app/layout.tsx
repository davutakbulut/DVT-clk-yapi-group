import type { ReactNode } from 'react';

// VARSAYIM #2: gecirgen kok layout — <html> burada DEGIL, [locale]/layout.tsx icinde.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
