import { expect, test } from '@playwright/test';

// Faz 26: konfigüratör kendi route grubunda; parametreler sorgu dizesinde; istatistikler anında; kayar çubuk klavyeyle; EN yolu; kill switch nav'ı zaten süzer.
test.describe('konfigüratör', () => {
  test('sorgu dizesi → istatistikler; kaydırıcı → URL güncellenir; uyarı metni; kanvas', async ({ page }) => {
    await page.goto('/tr/konfigurator?w=24&l=60&e=7&r=9&b=6');
    await expect(page.getByRole('heading', { level: 2, name: 'Ölçüler' })).toBeVisible();
    await expect(page.getByTestId('footprint')).toHaveText(/1\.440 m²/);
    await expect(page.getByRole('note')).toContainText('ön metraj');
    await expect(page.getByRole('img', { name: /24 × 60 m/ })).toBeVisible();
    const width = page.getByRole('slider', { name: 'En (açıklık)' });
    await expect(width).toHaveValue('24');
    await width.focus();
    await page.keyboard.press('ArrowRight');
    await expect(width).toHaveValue('25');
    await expect(page.getByTestId('footprint')).toHaveText(/1\.500 m²/);
    await expect.poll(() => new URL(page.url()).searchParams.get('w')).toBe('25');
    // kanvas (WebGL) yüklendi ya da yedek yüklenme kutusu — hata sınırı tetiklenmedi
    await expect(page.getByRole('heading', { name: '3D görünüm bu cihazda açılamadı' })).toHaveCount(0);
  });

  test('sınır dışı parametre kırpılır; EN yolu; ana sayfaya dönüş bağlantısı', async ({ page }) => {
    await page.goto('/en/configurator?w=999&l=5');
    await expect(page.getByRole('slider', { name: 'Width (span)' })).toHaveValue('60');
    await expect(page.getByRole('slider', { name: 'Length' })).toHaveValue('10');
    await expect(page.getByRole('link', { name: /Home/ })).toHaveAttribute('href', '/en');
  });
});
