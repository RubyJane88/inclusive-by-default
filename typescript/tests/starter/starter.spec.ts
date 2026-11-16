// The drop-in starter file, used on its own with no framework.
import { test } from '../../starter/a11y-test';

test.fail('starter: the broken page fails the axe check', async ({ page }) => {
  await page.goto('broken/');
});

test('starter: the fixed page passes', async ({ page }) => {
  await page.goto('fixed/');
});

test('starter: skipping with a reason is allowed', {
  annotation: { type: 'skip_axe', description: 'meta test of the opt-out' },
}, async ({ page }) => {
  await page.goto('broken/');
});

test.fail('starter: skipping without a reason fails', {
  annotation: { type: 'skip_axe', description: '  ' },
}, async ({ page }) => {
  await page.goto('fixed/');
});
