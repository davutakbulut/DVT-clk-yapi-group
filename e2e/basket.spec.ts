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

// Faz 14: ürün → sepete ekle (varyant + miktar) → rozet → /teklif-sepeti → form → talep; admin talep detayında kalemler (anlık görüntü).
test.describe('teklif sepeti', () => {
  test('/tr/teklif-sepeti boş durum + noindex', async ({ page }) => {
    await page.goto('/tr/teklif-sepeti');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Teklif sepeti');
    await expect(page.locator('#main-content')).toContainText('Sepetiniz boş');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test.describe('uçtan uca', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');

    test('ürün oluştur → sepete ekle → talep gönder → admin kalemleri görür → sil', async ({ page, browser }) => {
      test.slow();
      await login(page, '/admin/products/new');
      const stamp = Date.now();
      const name = `E2E Ürün ${stamp}`;
      const code = `E2E-B50-${stamp}`; // stock_code global benzersiz (0003) → paralel projeler çakışmasın
      await page.getByLabel('Ürün adı (Türkçe)').fill(name);
      await page.getByLabel('Ölçü tablosu (varyantlar)').fill(`40×40 mm | 40 | 40 | 2 | 6000 | 2,31 | E2E-B40-${stamp}\n50×50 mm | 50 | 50 | 2 | 6000 | 2,93 | ${code}`);
      await page.getByLabel('Durum').selectOption('published');
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}$/);
      const slug = await page.getByLabel('Slug (TR)').inputValue();

      const visitor = await browser.newContext();
      const vp = await visitor.newPage();
      await vp.goto(`/tr/urunler/${slug}`);
      await vp.waitForLoadState('networkidle');
      // Mobilde çerez bandı sepet düğmesini örtüyor
      await vp.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
      // K-88 seçici: ölçü (H×B) → seçili kesitin stok kodu çizim panelinde; miktar → sepet
      await vp.getByRole('combobox', { name: 'Ölçü', exact: true }).selectOption({ label: '50×50' });
      await expect(vp.getByTestId('pcfg-code')).toHaveText(code);
      await vp.getByLabel(/^Miktar/).fill('12');
      await vp.getByRole('button', { name: 'Teklif sepetine ekle' }).click();
      await expect(vp.locator('#main-content').getByRole('status').filter({ hasText: 'teklif sepetine eklendi' })).toBeVisible();
      await expect(vp.getByRole('link', { name: 'Teklif sepeti, 1 kalem' })).toBeVisible();

      await vp.goto('/tr/teklif-sepeti');
      await vp.waitForLoadState('networkidle');
      const row = vp.getByRole('row').filter({ hasText: name });
      await expect(row).toBeVisible();
      await expect(row).toContainText(code);
      await expect(row.getByLabel('Miktar')).toHaveValue('12');
      await row.getByLabel('Not').fill('Galvanizli');
      const person = `E2E Sepet ${Date.now()}`;
      await vp.getByLabel('Ad Soyad').fill(person);
      await vp.getByLabel('E-posta', { exact: true }).fill('e2e-sepet@example.com');
      await vp.getByLabel(/KVKK/).check();
      await vp.getByRole('button', { name: 'Gönder' }).click();
      const status = vp.locator('#main-content [role="status"]');
      await expect(status).toContainText('Talebiniz alındı');
      const ref = (await status.textContent())!.match(/TLP-\d{4}-\d{4}/)?.[0];
      expect(ref).toBeTruthy();
      await vp.reload();
      await expect(vp.locator('#main-content')).toContainText('Sepetiniz boş');
      await visitor.close();

      await page.goto('/admin/leads');
      const leadRow = page.getByRole('row').filter({ hasText: ref! });
      await expect(leadRow).toBeVisible();
      await leadRow.getByRole('link', { name: ref! }).click();
      await expect(page.getByRole('heading', { level: 1 })).toContainText(person);
      const items = page.getByRole('table').filter({ hasText: code });
      await expect(items).toBeVisible();
      await expect(items).toContainText(name);
      await expect(items).toContainText('12');
      await expect(items).toContainText('Galvanizli');

      await page.goto('/admin/products');
      const productRow = page.getByRole('row').filter({ hasText: name });
      await productRow.getByRole('button', { name: 'Sil' }).click();
      await expect(productRow).toHaveCount(0);
      // Ürün silindi; kalem anlık görüntüsü kalır (K-27)
      await page.goto('/admin/leads');
      await page.getByRole('row').filter({ hasText: ref! }).getByRole('link', { name: ref! }).click();
      await expect(page.getByRole('table').filter({ hasText: code })).toContainText(name);
    });
  });
});
