/** Failure messages. Every failure reads the same way:
 * what was required, what is there, and one fix. */

// How to fix a missing element, by role.
const ROLE_FIX: Record<string, string> = {
  textbox: 'Connect the visible text with <label for="...">{name}</label>',
  button: 'Use a real <button>{name}</button>',
  img: 'Add alt="{name}" to the image',
  dialog: 'Use <dialog> with a heading named {name}',
  heading: 'Mark up the text as a heading, e.g. <h2>',
  status: 'Add role="status" to the message area',
};

// How to fix an axe rule failure, by rule id.
export const AXE_FIX: Record<string, string> = {
  'button-name': 'give the button text, or aria-label',
  'image-alt': 'add alt text that describes the image',
  label: 'connect text with <label for="...">',
  'color-contrast': 'darken the text to at least {need}',
  'html-has-lang': 'add lang="en" to <html>',
  'document-title': 'add a <title> that names the page',
  'link-name': 'give the link text that says where it goes',
};

// The five steps of the modal focus contract.
const FOCUS_STEPS: Record<number, [string, string]> = {
  1: ['the dialog opens', 'use <dialog> with a heading that names it'],
  2: ['focus moves into the dialog', 'use <dialog> and open it with showModal()'],
  3: ['Tab and Shift+Tab stay inside the dialog', 'showModal() makes the page behind inert'],
  4: ['Escape closes the dialog', 'use <dialog>: Escape closes it natively'],
  5: ['focus returns to the button that opened it', 'use <dialog>: closing it restores focus'],
};

// How to fix a weak name, by role.
const NAME_FIX: Record<string, string> = {
  button: 'name each button by its action alone — "Settings", not "Settings button"',
  img: 'describe what each image shows, e.g. alt="Project dashboard"',
  link: 'say where each link goes, e.g. "Pricing plans"',
};

/** A failure that carries its own explanation. The
 * reporter prints the message and nothing else. */
export class A11yFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'A11yFailure';
    this.stack = message;
  }
}

export function fail(message: string): never {
  throw new A11yFailure(message);
}

export function expectedFoundFix(expected: string, found: string, fix: string) {
  return `Expected: ${expected}\nFound:    ${found}\nFix:      ${fix}`;
}

export function missingElement(role: string, name: string, found: string) {
  const fix = ROLE_FIX[role] ?? 'Give the element a role and name';
  return expectedFoundFix(
    `a ${roleWord(role)} named "${name}"`,
    found,
    fix.replace('{name}', name),
  );
}

export function focusStepFailed(step: number, found: string) {
  const [what, fix] = FOCUS_STEPS[step];
  return expectedFoundFix(`step ${step} of 5: ${what}`, found, fix);
}

export type NameProblem = [name: string | null, where: string, reason: string];

export function weakNames(role: string, problems: NameProblem[]) {
  const count = problems.length;
  const weak = count === 1 ? 'a weak name' : 'weak names';
  const rows = problems.map(([name, where, reason]) =>
    `            ${quote(name).padEnd(24)} ${where.padEnd(10)} ${reason}`);
  return expectedFoundFix(
    `every ${roleWord(role)} has a name that says what it is`,
    `${count} ${plural(role, count)} with ${weak}:\n${rows.join('\n')}`,
    NAME_FIX[role] ?? 'give each a specific name',
  );
}

/** Describe what the page has for a role, e.g.
 * '2 textboxes, none named'. */
export function foundForRole(
  role: string, names: (string | null)[], wanted: string, textOnPage: boolean,
) {
  let found = countPhrase(role, names);
  if (textOnPage) {
    found += `\n          The text "${wanted}" is on the page`
      + ` but does not name any ${roleWord(role)}`;
  }
  return found;
}

function countPhrase(role: string, names: (string | null)[]) {
  const many = plural(role, names.length);
  if (!names.length) return `no ${many} on the page`;
  const unnamed = names.filter((n) => n === null).length;
  const named = names.filter((n) => n !== null).map((n) => `"${n}"`);
  if (!named.length) return `${names.length} ${many}, none named`;
  const parts = unnamed ? [...named, `${unnamed} unnamed`] : named;
  return `${names.length} ${many}: ${parts.join(', ')}`;
}

function quote(name: string | null) {
  return name === null ? '(no name)' : `"${name}"`;
}

function plural(role: string, count: number) {
  const word = roleWord(role);
  if (count === 1) return word;
  return word + (word.endsWith('x') ? 'es' : 's');
}

function roleWord(role: string) {
  return role === 'img' ? 'image' : role;
}
