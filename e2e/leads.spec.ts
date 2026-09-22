import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);

async function login(page: Page, next: string) {
  await page.goto(`/tr/giris?next=${encodeURIComponent(next)}`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-posta').fill(EMAIL!);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL((url) => `${url.pathname}${url.search}` === next);
  await page.waitForLoadState('networkidle');
}

// Faz 10: iletişim + teklif formu (ziyaretçi) → talep; admin liste/detay/not/cevap; mail şablonları; cron kapısı.
test.describe('talep formu', () => {
  test('/tr/iletisim ve /tr/teklif-al: h1, form, axe temiz', async ({ page }) => {
    await page.goto('/tr/iletisim');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('İletişim');
    await expect(page.getByLabel('Ad Soyad')).toBeVisible();
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await page.goto('/tr/teklif-al');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Teklif alın');
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('ana sayfa hero CTA teklif sayfasına gider', async ({ page }) => {
    await page.goto('/tr');
    const cta = page.locator('section.hero a[href="/tr/teklif-al"]');
    test.skip((await cta.count()) === 0, 'Veritabanı yok (CI): hero CTA yok');
    await expect(cta).toBeVisible();
  });

  test('cron route: sırsız 401', async ({ request }) => {
    const res = await request.get('/api/cron/mail');
    expect(res.status()).toBe(401);
  });
});

test.describe('talep akışı', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('ziyaretçi teklif gönderir → ref no; admin listede görür, not ekler, cevap kuyruğa girer', async ({ page, browser }) => {
    test.slow();
    const visitor = await browser.newContext();
    const vp = await visitor.newPage();
    await vp.goto('/tr/teklif-al');
    await vp.waitForLoadState('networkidle');
    const name = `E2E Talep ${Date.now()}`;
    await vp.getByLabel('Ad Soyad').fill(name);
    await vp.getByLabel('E-posta', { exact: true }).fill('e2e-talep@example.com');
    await vp.getByLabel('Telefon').fill('+90 555 000 00 00');
    await vp.getByLabel('Mesajınız').fill('E2E test talebi. Depo yapısı.');
    await vp.getByLabel(/KVKK/).check();
    await vp.getByRole('button', { name: 'Gönder' }).click();
    const status = vp.locator('#main-content [role="status"]');
    await expect(status).toContainText('Talebiniz alındı');
    const ref = (await status.textContent())!.match(/TLP-\d{4}-\d{4}/)?.[0];
    expect(ref).toBeTruthy();
    await visitor.close();

    await login(page, '/admin/leads');
    const row = page.getByRole('row').filter({ hasText: ref! });
    await expect(row).toBeVisible();
    await row.getByRole('link', { name: ref! }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
    await page.getByLabel('Not').fill('E2E iç notu');
    await page.getByRole('button', { name: 'Not ekle' }).click();
    await expect(page.getByText('E2E iç notu')).toBeVisible();
    await page.getByLabel('Konu').fill('Teklifiniz hakkında');
    await page.getByLabel('Cevap').fill('Merhaba, talebinizi aldık.');
    await page.getByRole('button', { name: 'Cevabı gönder (kuyruğa)' }).click();
    await expect(page.getByText('Teklifiniz hakkında')).toBeVisible();
    await expect(page.getByText('Kuyruğa alındı').first()).toBeVisible();
  });

  test('mail şablonları ve teklif formu seçenekleri sayfaları açılır', async ({ page }) => {
    await login(page, '/admin/mail-templates');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mail Şablonları');
    await expect(page.getByText('lead.received.customer').first()).toBeVisible(); // anahtar hem şablon kartında hem kuyruk listesinde görünebilir
    await page.goto('/admin/settings/form');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Teklif Formu Seçenekleri');
  });
});
