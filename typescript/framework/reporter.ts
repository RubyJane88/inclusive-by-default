/** Prints each failure as its message and nothing else:
 * no stack trace, no code frame. The message is the lesson. */
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

const ANSI = /\u001b\[[0-9;]*m/g;

export default class TeachingReporter implements Reporter {
  private passed = 0;
  private skipped = 0;
  private failures: { title: string; message: string }[] = [];
  private started = Date.now();

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'skipped') {
      this.skipped += 1;
    } else if (result.status === test.expectedStatus) {
      this.passed += 1;
    } else {
      const message = result.error?.message ?? `test ${result.status}`;
      this.failures.push({
        title: test.title,
        message: message.replace(ANSI, '').replace(/^(A11yFailure|Error): /, ''),
      });
    }
  }

  // What tests print is still shown.
  onStdOut(chunk: string | Buffer) {
    console.log(String(chunk).trimEnd());
  }

  onStdErr(chunk: string | Buffer) {
    console.error(String(chunk).trimEnd());
  }

  onEnd() {
    for (const { title, message } of this.failures) {
      console.log(`___ ${title} ___\n${message}`);
    }
    const parts = [];
    if (this.failures.length) parts.push(`${this.failures.length} failed`);
    if (this.passed) parts.push(`${this.passed} passed`);
    if (this.skipped) parts.push(`${this.skipped} skipped`);
    const seconds = ((Date.now() - this.started) / 1000).toFixed(2);
    console.log(`${parts.join(', ') || 'no tests ran'} in ${seconds}s`);
  }

  printsToStdio() {
    return true;
  }
}
