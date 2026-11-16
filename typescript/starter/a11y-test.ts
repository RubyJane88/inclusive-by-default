/**
 * Drop-in accessibility check for Playwright Test.
 *
 * 1. npm install --save-dev @axe-core/playwright
 * 2. Copy this file into your tests folder.
 * 3. In your tests, import from it instead of '@playwright/test':
 *      import { test, expect } from './a11y-test';
 *
 * axe then runs after every test that passes, and the test
 * fails if axe finds WCAG A or AA problems.
 *
 * Opt out per test, with a reason:
 *   test('partner widget', {
 *     annotation: { type: 'skip_axe', description: 'third-party embed, ticket A11Y-12' },
 *   }, async ({ page }) => { ... });
 */
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export const test = base.extend<{ axeAfterEveryTest: void }>({
  axeAfterEveryTest: [async ({ page }, use, testInfo) => {
    // Opting out costs a written reason.
    const skip = testInfo.annotations.find((a) => a.type === 'skip_axe');
    if (skip && !skip.description?.trim()) {
      throw new Error(`${testInfo.title}: skip_axe needs a reason`);
    }
    await use();
    // Runs after the test body. If the body failed, axe is
    // skipped, so one problem is not reported twice.
    if (skip || testInfo.status !== 'passed') return;
    if (page.url() === 'about:blank') return;
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .analyze();
    if (violations.length) throw new Error(report(violations));
  }, { auto: true }],
});

function report(violations: { id: string; help: string; nodes: unknown[] }[]) {
  const rows = violations.map(
    (v) => `  ${v.id.padEnd(16)} ${v.nodes.length} x  ${v.help}`,
  );
  return [
    'Expected: no WCAG A or AA failures that axe can detect',
    `Found:    ${rows.length} rules fail:`,
    ...rows,
    'Fix:      fix each rule above. Rule details: dequeuniversity.com/rules/axe/4.14',
  ].join('\n');
}

export { expect };
