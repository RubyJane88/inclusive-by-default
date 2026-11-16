/** Thin wrapper over @axe-core/playwright. */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { AXE_FIX, expectedFoundFix } from './messages';

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// The --show-keys display of the Python demo is not part of the app.
const EXCLUDE = '#key-overlay';

export type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
type Violation = AxeResults['violations'][number];

/** Run axe on the page. Returns axe's results. */
export async function runAxe(page: Page, rules?: string[]) {
  const builder = new AxeBuilder({ page }).exclude(EXCLUDE);
  return (rules ? builder.withRules(rules) : builder.withTags(WCAG_TAGS)).analyze();
}

/** One line per failing rule: rule, where, fix. */
export function violationsReport(results: AxeResults) {
  const rows = results.violations.map(row);
  const version = results.testEngine.version.slice(0, 4);
  return expectedFoundFix(
    'no WCAG A or AA failures that axe can detect',
    `${rows.length} rules fail (rule, where, fix):\n${rows.join('\n')}`,
    `fix each rule above. Rule details: dequeuniversity.com/rules/axe/${version}`,
  );
}

function row(violation: Violation) {
  const nodes = violation.nodes;
  let where = nodes[0].target.join(' ');
  if (nodes.length > 1) where += ` +${nodes.length - 1}`;
  let fix = AXE_FIX[violation.id] ?? violation.help;
  if (violation.id === 'color-contrast') {
    fix = fix.replace('{need}', contrast(nodes[0]));
  }
  return `  ${violation.id.padEnd(15)} ${where.padEnd(26)} ${fix}`;
}

function contrast(node: Violation['nodes'][number]) {
  const data = node.any[0].data;
  return `${data.expectedContrastRatio} (now ${data.contrastRatio}:1)`;
}
