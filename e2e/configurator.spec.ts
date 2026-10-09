import { expect, test } from '@playwright/test';
import { openConfiguratorPanel } from './support/configuratorPanel';

// K-110: parametrik 3B motor — durum sorgu dizesinde; KPI/metraj anında; profil kataloğu; görünüşler; CSV; EN; mobil panel (K-81)
test.describe('konfigüratör (motor)', () => {
  test('hol: sorgu dizesi → KPI; kaydırıcı → URL ve tonaj; 30 m üstü makas; metraj tablosu ve bağlantı elemanları', async ({ page }) => {
    await page.goto('/tr/konfigurator/hol?width=24&length=60&eave=7&ridge=9&bay=6');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await openConfiguratorPanel(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Çelik hol · endüstriyel yapı');
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Taban alanı' })).toContainText('1.440 m²');
    await expect(page.getByTestId('tonnage').first()).toHaveText(/\d+,\d{3} t/);
    await expect(page.getByRole('note')).toContainText('ön metraj');
    const width = page.getByRole('slider', { name: 'Bina eni (açıklık)' });
    await expect(width).toHaveValue('24');
    await width.focus();
    await page.keyboard.press('ArrowRight');
    await expect(width).toHaveValue('25');
    await expect.poll(() => new URL(page.url()).searchParams.get('width')).toBe('25');
    await width.fill('40');
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Çatı sistemi' })).toContainText('Makas (2L)');
    await expect(page.getByLabel('Makas başlıkları (2L, > 30 m)')).toBeVisible();
    const bom = page.getByTestId('engine-bom');
    await expect(bom.getByRole('rowheader', { name: /^Kolon/ })).toBeVisible();
    await expect(bom.getByRole('rowheader', { name: /Bağlantı levhaları/ })).toBeVisible();
    await expect(bom.getByRole('rowheader', { name: /Cıvata M20/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: '3D görünüm bu cihazda açılamadı' })).toHaveCount(0);
  });

  test('profil kataloğu: alan için aç → satır seç → profil ve tonaj değişir; Esc kapatır', async ({ page }) => {
    await page.goto('/tr/konfigurator/hol');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await openConfiguratorPanel(page);
    const before = await page.getByTestId('tonnage').first().textContent();
    await page.locator('.engine-pf').filter({ hasText: 'Kolon' }).first().getByRole('button', { name: 'Katalog' }).click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { name: 'Çelik profil kataloğu' })).toBeVisible();
    await dialog.getByRole('tab', { name: 'HEA' }).click();
    await dialog.locator('tbody tr').filter({ hasText: 'HEA 300' }).first().click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('#p-col')).toHaveValue('HEA300');
    await expect(page.getByTestId('tonnage').first()).not.toHaveText(before ?? '');
    await expect.poll(() => new URL(page.url()).searchParams.get('col')).toBe('HEA300');
    await page.getByRole('button', { name: 'Profil kataloğu' }).first().click();
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test('diğer türler: varsayılan tonaj/KPI; segment seçimi URL ve metrajı günceller; CSV indirilir', async ({ page }) => {
    await page.goto('/tr/konfigurator/ara-kat');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await openConfiguratorPanel(page);
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Kolon adedi' })).toContainText('15');
    await expect(page.getByTestId('engine-bom')).toContainText('IPE 300');
    await page.getByRole('group', { name: 'Yük sınıfı' }).getByRole('button', { name: /Ağır/ }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('load')).toBe('agir');
    await expect(page.locator('#p-main')).toHaveValue('IPE330');
    await page.goto('/tr/konfigurator/cit-korkuluk');
    await openConfiguratorPanel(page);
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Direk adedi' })).toContainText('22');
    await page.goto('/tr/konfigurator/alcipan-duvar');
    await openConfiguratorPanel(page);
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Levha adedi' })).toContainText('19');
    await page.goto('/tr/konfigurator/cati-cephe');
    await openConfiguratorPanel(page);
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Çatı alanı' })).toContainText('846 m²');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Metraj (CSV)' }).click()]);
    expect(download.suggestedFilename()).toBe('cladding-metraj.csv');
  });

  test('sınır dışı parametre kırpılır; EN yolu; geri bağlantısı seçim sayfasına', async ({ page }) => {
    await page.goto('/en/configurator/hall?width=999&length=5');
    await openConfiguratorPanel(page);
    await expect(page.getByRole('slider', { name: 'Building width (span)' })).toHaveValue('60');
    await expect(page.getByRole('slider', { name: 'Building length' })).toHaveValue('8');
    await expect(page.locator('.configurator-bar a').first()).toHaveAttribute('href', '/en/configurator');
  });
});
