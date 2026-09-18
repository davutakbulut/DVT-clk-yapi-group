import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    // Testler modülün içinde yaşar (CONTRIBUTING) — merkezi tests/ klasörü yok
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx', 'supabase/tests/**/*.test.ts', 'scripts/__tests__/**/*.test.ts'],
  },
});
