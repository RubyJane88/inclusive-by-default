// axe on its own, with no framework helpers. It checks
// that names exist, not what they say.
import { expect, test } from '@playwright/test';
import { runAxe } from '../../framework/axe';

const rules = async (page: Parameters<typeof runAxe>[0]) =>
  (await runAxe(page)).violations.map((v) => v.id);

test('page passes axe', async ({ page }) => {
  await page.goto('./');
  expect(await rules(page)).toEqual([]);
});

test('open dialog passes axe', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Delete account' }).click();
  expect(await rules(page)).toEqual([]);
});
