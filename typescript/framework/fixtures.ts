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

export const test = base.extend<{ app: A11yPage }>({
  app: async ({ page }, use) => {
    await use(new A11yPage(page));
  },

  // Wraps Playwright's own `context`, which `page` is built on. So the
  // check runs only in tests that open a page, and sees every tab.
  context: async ({ context }, use, testInfo) => {
    const skip = testInfo.annotations.find((a) => a.type === 'skip_axe');
    if (skip && !skip.description?.trim()) {
      fail(`${testInfo.title}: skip_axe needs a reason, e.g. `
        + "annotation: { type: 'skip_axe', description: '...' }");
    }
    await use(context);
    // Runs after the test body. If the body failed, axe is
    // skipped, so one problem is not reported twice.
    if (skip || testInfo.status !== 'passed') return;
    for (const page of context.pages()) {
      if (page.isClosed() || page.url() === 'about:blank') continue;
      const results = await runAxe(page);
      if (results.violations.length) fail(violationsReport(results));
    }
  },
});

export { expect };
