import { expect, type Page } from '@playwright/test';

/**
 * Mobil/tablet: konfigüratör ayrıntıları sağdan açılan panelde (K-81) → etkileşimden önce aç. Masaüstünde düğme yok, dokunulmaz.
 * Tıklama hidrasyondan önce gelirse işlenmez → açılana dek yeniden dener.
 */
export async function openConfiguratorPanel(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: /Ölçüler ve metraj|Dimensions & take-off/ });
  // Anlık görünürlük yerine görünüm genişliği: yönlendirme/hidrasyon sırasında düğme bir an görünmeyebilir
  if ((page.viewportSize()?.width ?? 1280) >= 1024) return;
  await expect(toggle).toBeVisible();
  await expect(async () => {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click({ timeout: 2000 });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
}
