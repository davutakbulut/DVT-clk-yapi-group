import type { ReactNode } from 'react';

// Geçirgen kök layout: <html lang> dile bağlı olduğu için [locale]/layout.tsx içinde render edilir;
// /admin kendi <html data-surface="admin">'ini kurar. (Faz 1 deney #2 ile doğrulandı.)
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
