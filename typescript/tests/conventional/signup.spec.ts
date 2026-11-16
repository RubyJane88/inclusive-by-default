// A conventional suite: CSS selectors, no accessibility
// checks. It proves the clicks work, not that anyone without
// a mouse can use the page.
import { expect, test } from '@playwright/test';

test('signup succeeds', async ({ page }) => {
  await page.goto('./');
  await page.fill('#email', 'ada@example.com');
  await page.fill('#name', 'Ada Lovelace');
  await page.click('#save');
  await expect(page.locator('#status')).toHaveText('Account created');
});

test('signup rejects a bad email', async ({ page }) => {
  await page.goto('./');
  await page.fill('#email', 'not-an-email');
  await page.click('#save');
  await expect(page.locator('#email-error')).not.toBeEmpty();
});
