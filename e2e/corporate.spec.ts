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

// Faz 11: kurumsal sayfalar (hakkımızda, ekip, referanslar, belgeler, kariyer, SSS); admin: ilan oluştur → yayınla → başvuru → İK listesi.
test.describe('kurumsal sayfalar', () => {
  for (const [path, h1] of [
    ['/tr/hakkimizda', /./],
    ['/tr/ekibimiz', 'Ekibimiz'],
    ['/tr/referanslarimiz', 'Referanslarımız'],
    ['/tr/belgelerimiz', 'Belgelerimiz'],
    ['/tr/kariyer', 'Kariyer'],
    ['/tr/sss', 'Sık sorulan sorular'],
  ] as const) {
    test(`${path}: tek h1, BreadcrumbList, axe temiz`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
      expect((await page.locator('script[type=\"application/ld+json\"]').allTextContents()).join(' ')).toContain('BreadcrumbList');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  test("footer kurumsal sütunu route'u olan sayfalara bağlanır (öksüz sayfa yok)", async ({ page }) => {
    await page.goto('/tr');
    const footer = page.getByRole('contentinfo');
    test.skip((await footer.locator('a[href="/tr/hakkimizda"]').count()) === 0, 'Veritabanı yok (CI): menü yok');
    for (const href of ['/tr/hakkimizda', '/tr/ekibimiz', '/tr/referanslarimiz', '/tr/belgelerimiz', '/tr/kariyer', '/tr/iletisim']) {
      await expect(footer.locator(`a[href="${href}"]`)).toHaveCount(1);
    }
  });
});

test.describe('kariyer yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('ilan oluştur → yayınla → sitede JobPosting + form → ziyaretçi başvurur → İK listesinde → sil', async ({ page, browser }) => {
    test.slow();
    await login(page, '/admin/careers/new');
    const name = `E2E İlan ${Date.now()}`;
    await page.getByLabel('Ad (Türkçe)').fill(name);
    await page.getByLabel('Konum (Türkçe)').fill('İstanbul');
    await page.getByLabel('İlan metni (Markdown) (Türkçe)').fill('Çelik yapı projelerinde görev alacak mühendis.');
    await page.getByLabel('Durum').selectOption('published');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/careers\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel('Slug (TR)').inputValue();
    expect(slug).toMatch(/^e2e-ilan-\d+$/);

    const visitor = await browser.newContext();
    const vp = await visitor.newPage();
    const res = await vp.goto(`/tr/kariyer/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(vp.getByRole('heading', { level: 1 })).toHaveText(name);
    expect((await vp.locator('script[type=\"application/ld+json\"]').allTextContents()).join(' ')).toContain('"@type":"JobPosting"');
    await vp.waitForLoadState('networkidle');
    // Mobilde çerez bandı formun onay kutusunu örtebilir → önce kapat
    const onlyNecessary = vp.getByRole('button', { name: 'Yalnız zorunlu' });
    if (await onlyNecessary.isVisible().catch(() => false)) await onlyNecessary.click();
    await vp.getByLabel('Ad Soyad').fill('E2E Aday');
    const adayMail = `e2e-aday-${Date.now()}@example.com`; // K-104: başvuru e-posta başına 2/gün
    await vp.getByLabel('E-posta').fill(adayMail);
    await vp.getByLabel(/KVKK/).check();
    await vp.getByRole('button', { name: 'Başvuruyu gönder' }).click();
    await expect(vp.locator('#main-content [role="status"]')).toContainText('Başvurunuz alındı');
    await visitor.close();

    await page.goto('/admin/careers/applications?status=new');
    await expect(page.getByText(adayMail).first()).toBeVisible();

    await page.goto('/admin/careers');
    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Sil' }).click();
    await expect(row).toHaveCount(0);
  });
});
