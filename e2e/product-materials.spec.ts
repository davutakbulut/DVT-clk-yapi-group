import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);

async function open(page: Page, slug: string) {
  await page.goto(`/tr/urunler/${slug}`);
  await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
}

// K-114: yapı malzemesi ürün sayfaları (ürün sahibinin 17 örnek sayfası) — alan/palet modu, yalnız teklif, aile, ek seçimler, form kartları.
test.describe('yapı malzemesi ürün sayfaları', () => {
  test('tuğla: alan modu (m² → adet + palet), yalnız-teklif grubu, açık tablo sütunları, 3B yok', async ({ page }) => {
    await open(page, 'tugla');
    const cfg = page.locator('.pcfg');
    test.skip((await cfg.count()) === 0, 'veri yok');
    await expect(page.locator('.pcfg-vt')).toHaveCount(0); // 3B yalnız çelik kesitlerde
    await cfg.getByRole('group', { name: 'Çeşit' }).getByRole('button', { name: 'Yatay Delikli (Blok) Tuğla' }).click();
    await cfg.getByRole('group', { name: 'Kalınlık' }).getByRole('button', { name: '10', exact: true }).click();
    await cfg.getByLabel('Duvar/döşeme alanı (m²)').fill('20');
    // 19×19 cm yüz: 20 / 0,0361 = 554,02 → 555 adet; 332 adet/palet → 2 palet
    await expect(cfg.locator('.pcfg-result')).toContainText('555');
    await expect(page.getByTestId('pcfg-total')).toHaveText('2');
    await expect(cfg).toContainText('palet başına 332 adet');
    await expect(page.locator('.pcfg-table thead')).toContainText('Palet (adet)');
    // Asmolen: hesap yok, teklif kutusu
    await cfg.getByRole('group', { name: 'Çeşit' }).getByRole('button', { name: 'Asmolen Tuğla' }).click();
    await expect(cfg.locator('.pcfg-quotebox')).toContainText('teklif');
    await expect(cfg.getByRole('button', { name: 'Teklif sepetine ekle' })).toHaveCount(0);
    await expect(cfg.locator('.pcfg-quotebox').getByRole('link', { name: 'Teklif iste' })).toHaveAttribute('href', /\/tr\/teklif-al\?product=tugla/);
  });

  test('çelik hasır: aile (Q/R/TR) tabloyu ve grupları süzer; sandviç panel: ek seçimler sepete, fotoğraf/kesit', async ({ page }) => {
    await open(page, 'cesan');
    const cfg = page.locator('.pcfg');
    test.skip((await cfg.count()) === 0, 'veri yok');
    await expect(page.getByTestId('pcfg-code')).toHaveText('Q188');
    await cfg.getByRole('group', { name: 'Tip' }).getByRole('button', { name: 'R Tipi (Dikdörtgen)' }).click();
    await expect(page.getByTestId('pcfg-code')).toHaveText('R188');
    await expect(page.locator('.pcfg-table tbody tr').first()).toContainText(/^R/);
    await expect(page.locator('.pcfg-table tbody')).not.toContainText('Q188');

    await open(page, 'cati-sandvic-paneli');
    await expect(cfg.getByRole('button', { name: 'Fotoğraf' })).toHaveAttribute('aria-pressed', 'true');
    await expect(cfg.locator('.pcfg-photo')).toBeVisible();
    await cfg.getByRole('button', { name: 'Kesit' }).click();
    await expect(cfg.locator('svg.pcfg-svg')).toBeVisible();
    await cfg.getByLabel('Hadve Profili').selectOption('5 Hadveli');
    await cfg.getByRole('button', { name: 'Teklif sepetine ekle' }).click();
    await expect(cfg.locator('.pcfg-toast')).toContainText('teklif sepetine eklendi');
    await page.goto('/tr/teklif-sepeti');
    await expect(page.locator('main')).toContainText('5 Hadveli');
  });

  test('taş yünü: form kartları + teklif bandı (hesaplayıcı yok); alçıpan: renkli levha, 3B yok', async ({ page }) => {
    await open(page, 'tas-yunu');
    const forms = page.locator('.product-form');
    test.skip((await forms.count()) === 0, 'veri yok');
    await expect(forms).toHaveCount(2);
    await expect(page.locator('.product-forms-cta').getByRole('link', { name: 'Teklif iste' })).toHaveAttribute('href', /\/tr\/teklif-al\?product=tas-yunu/);
    await expect(page.locator('.pcfg')).toHaveCount(0);
    await open(page, 'beyaz-alcipan');
    await expect(page.locator('.pcfg-vt')).toHaveCount(0);
    await expect(page.getByTestId('pcfg-code')).toHaveText(/^STD-/);
  });
});

test.describe('yapı malzemesi ürün yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'yalnız desktop: paylaşılan ürün kaydını yazar');
  });
  test('panel: gelişmiş seçici ayarları (JSON) dolu gelir; değiştirmeden kaydet → sitede alan modu korunur; bozuk JSON reddedilir', async ({ page }) => {
    await page.goto('/tr/giris?next=%2Fadmin%2Fproducts');
    await page.getByLabel('E-posta').fill(EMAIL!);
    await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    await page.waitForURL(/\/admin\/products$/);
    await page.getByRole('link', { name: 'Tuğla', exact: true }).first().click();
    const adv = page.getByLabel('Gelişmiş seçici ayarları (JSON)');
    await expect(adv).toHaveValue(/"pallet_mode": true/);
    await expect(adv).toHaveValue(/"quote_only": true/);
    const original = await adv.inputValue();
    await adv.fill('{bozuk');
    await page.getByRole('button', { name: 'Kaydet' }).first().click();
    await expect(page.getByText('Geçersiz').or(page.locator('[aria-invalid="true"]#f-advanced'))).toBeVisible();
    await adv.fill(original);
    await page.getByRole('button', { name: 'Kaydet' }).first().click();
    await expect(page.getByRole('status').first()).toHaveText('Kaydedildi');
    await page.goto('/tr/urunler/tugla');
    await expect(page.locator('.pcfg').getByLabel('Duvar/döşeme alanı (m²)')).toBeVisible();
  });
});
