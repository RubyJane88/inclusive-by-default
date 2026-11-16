/** Role-based page object.
 *
 * There is no locator(), no getByTestId() and no CSS.
 * Tests can reach only what assistive technology can reach.
 * The missing methods are the point.
 */
import type { Locator, Page } from '@playwright/test';
import { fail, foundForRole, missingElement } from './messages';

const LOOKUP_MS = 1000;
// One node of ariaSnapshot(): '- textbox "Email"'
const NODE = /^\s*- (\w+)(?: "((?:[^"\\]|\\.)*)")?/;
type Role = Parameters<Page['getByRole']>[0];

/** '- button "Save"' -> ['button', 'Save'].
 * An unnamed node gives a name of null. */
export function parseNode(line: string): [string | null, string | null] {
  const match = NODE.exec(line);
  if (!match) return [null, null];
  return [match[1], match[2] ?? null];
}

export class A11yPage {
  // Underscore on purpose: helpers may need the raw page,
  // tests should not.
  constructor(readonly _page: Page) {}

  async goto(path = './') {
    await this._page.goto(path);
    return this;
  }

  button(name: string) { return this.find('button', name); }
  textbox(name: string) { return this.find('textbox', name); }
  dialog(name: string) { return this.find('dialog', name); }
  heading(name: string) { return this.find('heading', name); }
  image(name: string) { return this.find('img', name); }
  status() { return this._page.getByRole('status'); }

  private async find(role: Role, name: string): Promise<Locator> {
    const found = this._page.getByRole(role, { name, exact: true });
    if (!(await appears(found))) fail(await this.missing(role, name));
    return found;
  }

  private async missing(role: Role, name: string) {
    const names = await this.namesFor(role);
    const onPage = await this._page.getByText(name, { exact: true }).count();
    return missingElement(role, name, foundForRole(role, names, name, onPage > 0));
  }

  private async namesFor(role: string) {
    const tree = await this._page.locator('body').ariaSnapshot();
    return tree.split('\n')
      .map(parseNode)
      .filter(([nodeRole]) => nodeRole === role)
      .map(([, nodeName]) => nodeName);
  }
}

async function appears(found: Locator) {
  try {
    await found.first().waitFor({ timeout: LOOKUP_MS });
    return true;
  } catch {
    return false;
  }
}
