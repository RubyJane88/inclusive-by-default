// Tests shaped like a real suite's. Several fail on purpose.
import type { BrowserContext } from '@playwright/test';
import { expect, test } from '../starter/a11y-test';

const HOST = '<html lang="en"><title>Host</title><main><h1>Host</h1>'
  + '<iframe title="Sign-up" src="http://other.test/broken/"></iframe></main></html>';

// A page with a strict Content Security Policy, and a page
// that embeds the broken page from another origin.
async function extraPages(context: BrowserContext, baseURL: string) {
  await context.route('**/strict-csp.html', async (route) => {
    const response = await route.fetch({ url: `${baseURL}broken/` });
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': "script-src 'none'" },
    });
  });
  await context.route('**/host.html', (route) =>
    route.fulfill({ contentType: 'text/html', body: HOST }));
  await context.route('http://other.test/**', async (route) => {
    const path = new URL(route.request().url()).pathname.slice(1);
    await route.fulfill({ response: await route.fetch({ url: baseURL + path }) });
  });
}

test('broken', async ({ page }) => {
  await page.goto('broken/');
});

test('fixed', async ({ page }) => {
  await page.goto('fixed/');
});

test('closes its page', async ({ page }) => {
  await page.goto('fixed/');
  await page.close();
});

test('never navigates', async ({ page }) => {
  expect(page).toBeTruthy();
});

test('no browser at all', async ({}) => {
  expect(1 + 1).toBe(2);
});

test('set content', async ({ page }) => {
  await page.setContent('<button></button>');
});

test('second tab', async ({ page, context }) => {
  await page.goto('fixed/');
  const other = await context.newPage();
  await other.goto('broken/');
});

test('context only', async ({ context }) => {
  await (await context.newPage()).goto('broken/');
});

test('strict CSP', async ({ page, context, baseURL }) => {
  await extraPages(context, baseURL!);
  await page.goto('strict-csp.html');
});

test('cross-origin iframe', async ({ page, context, baseURL }) => {
  await extraPages(context, baseURL!);
  await page.goto('host.html');
  await page.frameLocator('iframe').locator('h1').waitFor();
});

test('skips with a reason', {
  annotation: { type: 'skip_axe', description: 'meta test of the opt-out' },
}, async ({ page }) => {
  await page.goto('broken/');
});

test('skips without a reason', {
  annotation: { type: 'skip_axe', description: '  ' },
}, async ({ page }) => {
  await page.goto('fixed/');
});

test('body fails first', async ({ page }) => {
  await page.goto('broken/');
  expect(1, 'the body failed').toBe(2);
});
