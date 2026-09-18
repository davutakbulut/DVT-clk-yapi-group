import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// .env.local'daki E2E_* değişkenleri (test hesabı) — dotenv bağımlılığı olmadan. CI'da gizli değişken olarak verilir.
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = /^(E2E_[A-Z_]+)=(.*)$/.exec(line.trim());
    if (match?.[1] && process.env[match[1]] === undefined) process.env[match[1]] = match[2] ?? '';
  }
}

const PORT = 3200;

// Üretim derlemesine karşı koşar: global-error, ISR ve önbellek başlıkları yalnız `next start`ta gerçektir.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // 3 kırılım × büyüyen admin akışları: 2 çalışan + 60 sn, yük altındaki zaman aşımlarını (Faz 11) önler
  workers: process.env.CI ? 1 : 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'on-first-retry' },
  // Bitti Tanımı: 3 kırılım
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/tr`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
