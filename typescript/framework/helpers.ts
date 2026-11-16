/** Checks that scanners cannot do on their own.
 *
 * Helpers reach the raw Playwright page through
 * app._page. Tests should not.
 */
import type { Locator, Page } from '@playwright/test';
import { A11yPage, parseNode } from './a11y-page';
import { fail, focusStepFailed, weakNames, type NameProblem } from './messages';

// --- Name quality ---------------------------------------
// This rejects known-bad patterns. It cannot judge whether
// a plausible name is correct: "Settings" on a delete
// button passes. People still review names.
const GENERIC = new Set([
  'button', 'icon', 'image', 'img', 'picture',
  'graphic', 'photo', 'click here', 'here', 'link',
  'more', 'read more', 'svg', 'input', 'untitled',
]);
const ROLE_WORD: Record<string, string> = { button: 'button', img: 'image', link: 'link' };
const FILE_OR_ID = /\.(png|jpe?g|gif|svg|webp)$|^[a-z]+[_-]?\d+$/i;
type Role = Parameters<Page['getByRole']>[0];

/** The first rule a name breaks, or null. */
export function nameProblem(name: string | null, role: string, visibleText = '') {
  if (!name) return 'no name';
  const low = name.toLowerCase();
  if (GENERIC.has(low)) return 'generic word';
  if (low.endsWith(' ' + (ROLE_WORD[role] ?? '-'))) return 'repeats the role';
  if (FILE_OR_ID.test(name)) return 'looks like a file name or id';
  if (visibleText && !low.includes(visibleText.toLowerCase())) {
    return 'visible text is not in the name';
  }
  return null;
}

/** Every visible element of this role has a name that
 * says what it is. */
export async function assertNamesMeaningful(app: A11yPage, role: Role) {
  const problems: NameProblem[] = [];
  for (const element of await app._page.getByRole(role).all()) {
    const [name, text, where] = await describe(element);
    const reason = nameProblem(name, role, text);
    if (reason) problems.push([name, where, reason]);
  }
  if (problems.length) fail(weakNames(role, problems));
}

async function describe(element: Locator): Promise<[string | null, string, string]> {
  const first = (await element.ariaSnapshot()).split('\n')[0];
  const [, name] = parseNode(first);
  const text = (await element.innerText()).trim();
  const where = await element.evaluate((el) => {
    const box = el.closest('header, main, dialog, [role=dialog], nav, footer');
    return box ? 'in ' + box.tagName.toLowerCase().replace('div', 'dialog') : '';
  });
  return [name, text, where];
}

// --- Modal focus contract -------------------------------
/** trigger: name of the opening button.
 * dialog: name of the dialog. */
export async function assertModalFocusContract(
  app: A11yPage, { trigger, dialog }: { trigger: string; dialog: string },
) {
  const page = app._page;
  const opener = await app.button(trigger);
  await opener.focus();
  await page.keyboard.press('Enter');
  const box = page.getByRole('dialog', { name: dialog });
  step(1, await becomes(box, 'visible'), `no dialog named "${dialog}"`);
  step(2, await holdsFocus(box), await focusOutside(page));
  step(3, ...(await tabStaysInside(page, box)));
  await page.keyboard.press('Escape');
  step(4, await becomes(box, 'hidden'), 'the dialog is still open');
  step(5, await isFocused(opener), await focusOutside(page));
}

function step(number: number, ok: boolean, found: string) {
  if (!ok) fail(focusStepFailed(number, found));
}

async function becomes(locator: Locator, state: 'visible' | 'hidden') {
  try {
    await locator.waitFor({ state, timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

function holdsFocus(box: Locator) {
  return box.evaluate((d) => d.contains(document.activeElement));
}

function isFocused(locator: Locator) {
  return locator.evaluate((el) => el === document.activeElement);
}

async function tabStaysInside(page: Page, box: Locator): Promise<[boolean, string]> {
  // Chromium's native modal lets focus step out to the
  // browser's own controls once per cycle (seen as
  // document.hasFocus() being false). That is allowed.
  // Reaching the page behind the modal is not.
  const presses = (await box.evaluate((d) => d.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  ).length)) + 1;
  const keys = [...Array(presses).fill('Tab'), ...Array(presses).fill('Shift+Tab')];
  for (const key of keys) {
    await page.keyboard.press(key);
    const leftPage = !(await page.evaluate(() => document.hasFocus()));
    if (!leftPage && !(await holdsFocus(box))) {
      return [false, `after ${key}: ${await focusOutside(page)}`];
    }
  }
  return [true, ''];
}

function focusOutside(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return 'focus is lost (on the page body)';
    const role = el.getAttribute('role') || el.tagName.toLowerCase();
    const name = el.getAttribute('aria-label') || el.innerText.trim();
    const what = name ? `${role} "${name}"` : `${role} with no name`;
    return `focus is on ${what}, outside the dialog`;
  });
}
