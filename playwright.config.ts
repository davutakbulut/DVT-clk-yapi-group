import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;

// Üretim derlemesine karşı koşar: global-error, ISR ve önbellek başlıkları yalnız `next start`ta gerçektir.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
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
