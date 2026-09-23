import { expect, test } from '@playwright/test';

// Faz 4 çatı: header (ortalanmış marka), footer, hata sayfası, WhatsApp (numara yokken görünmez).
test.describe('çatı', () => {
  test('header: marka bağlantısı ana sayfaya, dil değiştirici, tek h1', async ({ page }) => {
    await page.goto('/tr');
    const header = page.getByRole('banner');
    await expect(header).toBeVisible();
    await expect(header.getByRole('link', { name: 'CLK Yapı Group' })).toHaveAttribute('href', '/tr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    // Marka fontu yüklendi (latin-ext: Türkçe glifler)
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return getComputedStyle(document.querySelector('h1')!).fontFamily;
    });
    expect(fonts).toMatch(/Archivo/);
  });

  test('footer: contentinfo, telif satırı bu yılı içerir, yer tutucu iletişim bilgisi YOK', async ({ page }) => {
    await page.goto('/tr');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(String(new Date().getFullYear()));
    // Telefon panelden girilmişse gerçek numaradır; yer tutucu desen (555 000 00 00 / 000 000) kabul edilmez
    const phones = footer.getByRole('link', { name: /\+90/ });
    for (const text of await phones.allTextContents()) expect(text.replace(/\s/g, '')).not.toMatch(/5550000000|0000000/);
  });

  test('WhatsApp: numara yoksa buton YOK; varsa panel açılır ve hazır mesaj anlamlıdır', async ({ page }) => {
    await page.goto('/tr/hizmetler');
    await page.waitForTimeout(4500);
    const button = page.getByRole('button', { name: /WhatsApp/ });
    if ((await button.count()) === 0) return; // numara girilmemiş (CI / boş veritabanı): bilerek render edilmez
    // Çerez bandı alt köşeyi örtebilir → önce kapat
    const onlyNecessary = page.getByRole('button', { name: 'Yalnız zorunlu' });
    if (await onlyNecessary.isVisible().catch(() => false)) await onlyNecessary.click();
    await button.click();
    const chat = page.locator('.wa-panel a[href*="wa.me/"]').first();
    await expect(chat).toBeVisible();
    const text = decodeURIComponent((await chat.getAttribute('href'))!.split('text=')[1] ?? '');
    // Anlamsız kısa şablon ("/") yok sayılıp varsayılan mesaj kullanılmalı; sayfa adresi mesajda
    expect(text.length).toBeGreaterThan(15);
    expect(text).toContain('/tr/hizmetler');
  });

  test('404: çizim, kod etiketi, ana sayfa butonu; header ve footer yerinde', async ({ page }) => {
    const response = await page.goto('/tr/boyle-bir-sayfa-yok');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Hata 404')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ana sayfaya dön' })).toHaveAttribute('href', '/tr');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.locator('main svg[aria-hidden="true"]')).toBeVisible();
  });

  test('mobil menü düğmesi yalnız menü öğesi varken görünür; varsa klavyeyle açılıp kapanır', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'yalnız mobil kırılımda');
    await page.goto('/tr');
    const button = page.getByRole('button', { name: 'Menüyü aç' });
    if ((await button.count()) === 0) {
      // K-50: route'u olan menü öğesi yokken çekmece düğmesi de render edilmez
      await expect(page.getByRole('banner').getByRole('navigation')).toHaveCount(0);
      return;
    }
    await button.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Menü' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
