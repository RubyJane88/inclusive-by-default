// The drop-in starter, used the way a real suite would use
// it. This runs the stand-in suite in tests-starter/ with
// plain Playwright and checks what happened to each test.
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

type Outcome = { status: string; message: string };
const BROKEN = '6 rules fail on http://127.0.0.1:4173/broken/';
let outcomes: Record<string, Outcome>;

function collect(suite: any, into: Record<string, Outcome>) {
  for (const spec of suite.specs ?? []) {
    const result = spec.tests[0].results[0];
    into[spec.title] = {
      status: result.status,
      message: (result.error?.message ?? '').replace(/\u001b\[[0-9;]*m/g, ''),
    };
  }
  for (const child of suite.suites ?? []) collect(child, into);
  return into;
}

test.beforeAll(() => {
  test.setTimeout(120_000);
  const done = spawnSync('npx', [
    'playwright', 'test', '--config', 'tests-starter/playwright.config.ts',
    '--reporter=json',
  ], { encoding: 'utf8' });
  outcomes = collect(JSON.parse(done.stdout), {});
});

for (const title of [
  'fixed', 'closes its page', 'never navigates', 'no browser at all',
  'skips with a reason',
]) {
  test(`starter passes: ${title}`, () => {
    expect(outcomes[title]).toEqual({ status: 'passed', message: '' });
  });
}

for (const [title, found] of [
  ['broken', BROKEN],
  ['second tab', BROKEN],
  ['context only', BROKEN],
  ['strict CSP', '6 rules fail on http://127.0.0.1:4173/strict-csp.html'],
  ['set content', 'button-name'],
  ['cross-origin iframe', 'label'],
]) {
  test(`starter fails with a report: ${title}`, () => {
    const { status, message } = outcomes[title];
    expect(status).toBe('failed');
    expect(message).toContain('Expected: no WCAG A or AA failures');
    expect(message).toContain(found);
    expect(message).toContain('Fix:      fix each rule above');
  });
}

test('starter reports a body failure once', () => {
  const { status, message } = outcomes['body fails first'];
  expect(status).toBe('failed');
  expect(message).toContain('the body failed');
  expect(message).not.toContain('rules fail');
});

test('starter fails a test that skips without a reason', () => {
  const { status, message } = outcomes['skips without a reason'];
  expect(status).toBe('failed');
  expect(message).toContain('skip_axe needs a reason');
});
