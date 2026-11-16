/**
 * Drop-in accessibility check for Playwright Test.
 *
 * 1. npm install --save-dev @axe-core/playwright
 * 2. Copy this file into your tests folder.
 * 3. In your tests, import from it instead of '@playwright/test':
 *      import { test, expect } from './a11y-test';
 *
 * axe then runs after every test that passes, on every page the
 * test left open, and the test fails if axe finds WCAG A or AA
 * problems. Tests that never open a page are left alone.
 *
 * Opt out per test, with a reason:
 *   test('partner widget', {
 *     annotation: { type: 'skip_axe', description: 'third-party embed, ticket A11Y-12' },
 *   }, async ({ page }) => { ... });
 *
 * Pages a test opens in a browser context of its own
 * (browser.newContext()) are not checked.
 */
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export const test = base.extend({
  // Wraps Playwright's own `context`, which `page` is built on. So the
  // check runs only in tests that open a page, and sees every tab.
  context: async ({ context }, use, testInfo) => {
    // Opting out costs a written reason.
    const skip = testInfo.annotations.find((a) => a.type === 'skip_axe');
    if (skip && !skip.description?.trim()) {
      throw new Error(`${testInfo.title}: skip_axe needs a reason`);
    }
    await use(context);
    // Runs after the test body. If the body failed, axe is
    // skipped, so one problem is not reported twice.
    if (skip || testInfo.status !== 'passed') return;
    for (const page of context.pages()) await checkAxe(page);
  },
});

async function checkAxe(page: Page) {
  if (page.isClosed()) return;
  let violations;
  try {
    if (await untouched(page)) return;
    ({ violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze());
  } catch (error) {
    throw new Error(message(
      `axe to run on ${page.url()}`,
      String(error).split('\n')[0],
      'let the page finish loading before the test ends, or skip the check with a reason',
    ));
  }
  if (!violations.length) return;
  const rows = violations.map(
    (v) => `  ${v.id.padEnd(16)} ${v.nodes.length} x  ${v.help}`,
  );
  throw new Error(message(
    'no WCAG A or AA failures that axe can detect',
    `${rows.length} rules fail on ${page.url()}\n${rows.join('\n')}`,
    'fix each rule above. Rule details: dequeuniversity.com/rules/axe/4.14',
  ));
}

// True for a page the test never put anything into.
function untouched(page: Page) {
  return page.evaluate(
    () => location.href === 'about:blank' && !document.body?.children.length,
  );
}

function message(expected: string, found: string, fix: string) {
  return `Expected: ${expected}\nFound:    ${found}\nFix:      ${fix}`;
}

export { expect };
