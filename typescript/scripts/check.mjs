// Run every demo target and compare the outcome with what
// the talk expects. Then compare each failure message with
// the Python version's recorded output, word for word.
// Exit 1 if anything differs.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PYTHON_OUTPUT = new URL('../../site/outputs.json', import.meta.url);

// target, playwright arguments, expected: "pass" or "fail"
const TARGETS = [
  ['demo1-before', ['tests/conventional', '--project=broken'], 'pass'],
  ['demo1-catch', ['tests/a11y/signup.spec.ts', '--project=broken'], 'fail'],
  ['demo1-after', ['tests/a11y/signup.spec.ts', '--project=fixed'], 'pass'],
  ['demo2-broken', ['tests/a11y/dialog.spec.ts', '--project=broken'], 'fail'],
  ['demo2-fixed', ['tests/a11y/dialog.spec.ts', '--project=fixed'], 'pass'],
  ['demo3-axe', ['tests/axe-only', '--project=hollow'], 'pass'],
  ['demo3-names', ['tests/a11y/names.spec.ts', '--project=hollow'], 'fail'],
  ['demo3-after', ['tests/a11y/names.spec.ts', '--project=fixed'], 'pass'],
  ['all-a11y-fixed', ['tests/a11y', '--project=fixed'], 'pass'],
  ['meta', ['--project=meta'], 'pass'],
];

// The Expected / Found / Fix blocks in a run's output.
function messages(output) {
  const blocks = [];
  let block = null;
  for (const line of output.split('\n')) {
    if (line.startsWith('Expected: ')) block = [];
    if (block) block.push(line.trimEnd());
    if (block && line.startsWith('Fix: ')) {
      blocks.push(block.join('\n'));
      block = null;
    }
  }
  return blocks;
}

const python = existsSync(PYTHON_OUTPUT)
  ? JSON.parse(readFileSync(PYTHON_OUTPUT, 'utf8')).targets
  : null;
let mismatches = 0;
console.log(`${'target'.padEnd(16)}${'expected'.padEnd(10)}${'actual'.padEnd(10)}same words as Python`);
for (const [name, args, expected] of TARGETS) {
  const done = spawnSync('npx', ['playwright', 'test', ...args], { encoding: 'utf8' });
  const output = done.stdout + done.stderr;
  const found = messages(output);
  let actual = done.status === 0 ? 'pass' : 'fail';
  // A failure only counts if it is a teaching message,
  // not a crash or a timeout.
  if (actual === 'fail' && !found.length) actual = 'crash';
  let parity = '-';
  if (expected === 'fail' && python?.[name]) {
    const wanted = messages(python[name].output);
    parity = JSON.stringify(wanted) === JSON.stringify(found) ? 'yes' : 'NO';
  }
  const ok = actual === expected && parity !== 'NO';
  if (!ok) mismatches += 1;
  console.log(`${name.padEnd(16)}${expected.padEnd(10)}${actual.padEnd(10)}${parity.padEnd(6)}${ok ? 'ok' : 'MISMATCH'}`);
  if (parity === 'NO' || actual === 'crash') console.log(output);
}
console.log(`\n${TARGETS.length - mismatches} of ${TARGETS.length} targets behaved as expected`);
process.exit(mismatches ? 1 : 0);
