/** Accessibility checks that run whether or not a test
 * asks for them.
 *
 * Import `test` from this file instead of '@playwright/test'
 * and axe runs after every test.
 *
 * Opting out costs a written reason:
 *   test('partner widget', {
 *     annotation: { type: 'skip_axe', description: 'vendor embed, A11Y-12' },
 *   }, async ({ page }) => { ... });
 */
import { test as base, expect } from '@playwright/test';
import { A11yPage } from './a11y-page';
import { runAxe, violationsReport } from './axe';
import { fail } from './messages';

type Fixtures = { app: A11yPage; axeAfterEveryTest: void };

export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    await use(new A11yPage(page));
  },

  axeAfterEveryTest: [async ({ page }, use, testInfo) => {
    const skip = testInfo.annotations.find((a) => a.type === 'skip_axe');
    if (skip && !skip.description?.trim()) {
      fail(`${testInfo.title}: skip_axe needs a reason, e.g. `
        + "annotation: { type: 'skip_axe', description: '...' }");
    }
    await use();
    // Runs after the test body. If the body failed, axe is
    // skipped, so one problem is not reported twice.
    if (skip || testInfo.status !== 'passed') return;
    if (page.url() === 'about:blank') return;
    const results = await runAxe(page);
    if (results.violations.length) fail(violationsReport(results));
  }, { auto: true }],
});

export { expect };
