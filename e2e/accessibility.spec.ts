import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/tr', '/en', '/tr/olmayan-sayfa'];

for (const path of PAGES) {
  test(`axe: ${path} ihlalsiz (WCAG 2.1 AA)`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  });
}

test.describe('klavye', () => {
  test('ilk Tab atlama bağlantısını görünür kılar, Enter ana içeriğe taşır', async ({ page }) => {
    await page.goto('/tr');
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: 'İçeriğe geç' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('odak halkası görünür', async ({ page }) => {
    await page.goto('/tr');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
  });

  test('tüm etkileşimli öğelere yalnız klavyeyle ulaşılır', async ({ page }) => {
    await page.goto('/tr');
    const reached: string[] = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      reached.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? ''));
    }
    expect(reached).toEqual(expect.arrayContaining(['İçeriğe geç', 'CLK Yapı Group', 'English']));
  });
});
