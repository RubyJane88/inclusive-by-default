// Tests of the framework itself. For each check: it fails
// on the right page with the expected Fix line, and it
// passes on the fixed page. These choose their own pages.
import { expect, test, type Page } from '@playwright/test';
import { A11yPage } from '../../framework/a11y-page';
import { runAxe, violationsReport } from '../../framework/axe';
import {
  assertModalFocusContract, assertNamesMeaningful, nameProblem,
} from '../../framework/helpers';

const open = (page: Page, variant: string) => new A11yPage(page).goto(`${variant}/`);
const DIALOG = { trigger: 'Delete account', dialog: 'Delete your account?' };

test('lookup: unnamed textbox fails with the label fix', async ({ page }) => {
  const app = await open(page, 'broken');
  await expect(app.textbox('Email')).rejects.toThrow(
    'Fix:      Connect the visible text with <label for="...">Email</label>');
  await expect(app.textbox('Email')).rejects.toThrow('2 textboxes, none named');
});

test('lookup: div button fails with the button fix', async ({ page }) => {
  const app = await open(page, 'broken');
  await expect(app.button('Create account')).rejects.toThrow(
    'Fix:      Use a real <button>Create account</button>');
});

test('lookup: finds named controls on fixed', async ({ page }) => {
  const app = await open(page, 'fixed');
  await expect(await app.textbox('Email')).toBeVisible();
  await expect(await app.button('Create account')).toBeVisible();
  await expect(await app.image('Northwind dashboard showing a project summary')).toBeVisible();
});

test('names: hollow buttons fail, listing each weak name', async ({ page }) => {
  const app = await open(page, 'hollow');
  await (await app.button('Delete account')).click();
  const check = assertNamesMeaningful(app, 'button');
  await expect(check).rejects.toThrow('3 buttons with weak names');
  await expect(assertNamesMeaningful(app, 'button')).rejects.toThrow(
    'name each button by its action alone');
});

test('names: hollow image fails', async ({ page }) => {
  const app = await open(page, 'hollow');
  await expect(assertNamesMeaningful(app, 'img')).rejects.toThrow(
    '1 image with a weak name');
});

test('names: fixed passes', async ({ page }) => {
  const app = await open(page, 'fixed');
  await (await app.button('Delete account')).click();
  await assertNamesMeaningful(app, 'button');
  await assertNamesMeaningful(app, 'img');
});

test('focus contract: broken dialog fails at step 2', async ({ page }) => {
  const app = await open(page, 'broken');
  await expect(assertModalFocusContract(app, DIALOG)).rejects.toThrow(
    /step 2 of 5: focus moves into the dialog[\s\S]*showModal\(\)/);
});

test('focus contract: fixed dialog passes', async ({ page }) => {
  await assertModalFocusContract(await open(page, 'fixed'), DIALOG);
});

test('axe report: broken lists rules with fixes', async ({ page }) => {
  await open(page, 'broken');
  const report = violationsReport(await runAxe(page));
  expect(report).toContain('6 rules fail (rule, where, fix):');
  expect(report).toContain('add lang="en" to <html>');
  expect(report).toContain('Rule details: dequeuniversity.com/rules/axe/4.14');
});

for (const variant of ['fixed', 'hollow']) {
  test(`axe: ${variant} has no violations`, async ({ page }) => {
    await open(page, variant);
    expect((await runAxe(page)).violations).toEqual([]);
  });
}

test('axe: gradient banner is incomplete, not a pass or a failure', async ({ page }) => {
  await open(page, 'fixed');
  const results = await runAxe(page, ['color-contrast']);
  expect(results.violations).toEqual([]);
  expect(results.incomplete.flatMap((r) => r.nodes.map((n) => n.target.join(' '))))
    .toEqual(['.promo']);
});

test('name rules', () => {
  expect(nameProblem(null, 'button')).toBe('no name');
  expect(nameProblem('icon', 'button')).toBe('generic word');
  expect(nameProblem('Submit button', 'button')).toBe('repeats the role');
  expect(nameProblem('img_001.png', 'img')).toBe('looks like a file name or id');
  expect(nameProblem('Save', 'button', 'Save draft')).toBe('visible text is not in the name');
  expect(nameProblem('Close dialog', 'button')).toBeNull();
  // The stated limit: a plausible wrong name passes.
  expect(nameProblem('Settings', 'button')).toBeNull();
});
