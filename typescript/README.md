# TypeScript version

The same patterns as [`../python/`](../python/), for Playwright Test.
Both versions test the same three pages in [`../app/`](../app/), and
their failure messages are the same, word for word.

**Only want the 15-minute start?** Copy
[`starter/a11y-test.ts`](starter/a11y-test.ts). Its header says how to
use it. It needs `@axe-core/playwright` and nothing else from this repo.
It checks every tab a test leaves open, including content in iframes, and
leaves tests that never open a page alone. `tests-starter/` is a stand-in
suite that proves each case.

## How to run it

```
cd typescript
npm run setup         # once, needs network: packages and Chromium
npm run demo1-catch   # accessibility tests fail on broken, with fixes
npm run demo1-after   # the same tests pass on fixed
npm run check         # every demo, expected vs actual
```

| Demo | Commands |
|---|---|
| 1. Green tests, broken page | `npm run demo1-before`, `demo1-catch`, `demo1-after` |
| 2. What axe can't see | `npm run demo2-broken`, `demo2-fixed` |
| 3. Names that mean nothing | `npm run demo3-axe`, `demo3-names`, `demo3-after` |

Each page is a Playwright project, so any test file can run against any
page: `npx playwright test tests/a11y --project=hollow`.

## The four ideas, in TypeScript

1. **Find elements by role and name.** `framework/a11y-page.ts` has
   `button(name)`, `textbox(name)`, `dialog(name)` and no CSS access.
2. **Run axe after every test.** `framework/fixtures.ts` exports a `test`
   with an automatic fixture. Skipping it takes a `skip_axe` annotation
   with a written reason; an empty reason fails the test.
3. **Make failures say the fix.** `framework/messages.ts` holds the
   Expected, Found, Fix messages. `framework/reporter.ts` prints the
   message alone, with no stack trace.
4. **Check what scanners miss.** `framework/helpers.ts` has the name
   check and the five-step dialog focus check.

## Differences from the Python version

- The page is chosen with `--project=broken`, not `--variant broken`.
- Lookups are asynchronous: `await app.textbox('Email')`.
- Opting out of axe uses a test annotation, not a marker. A missing
  reason fails that test; in Python it stops the whole run.
- axe runs through `@axe-core/playwright`, not a vendored file.
- There are no `snapshot`, `incomplete` or on-screen key display
  scripts here. Use the Python ones.

## What `npm run check` proves

It runs every demo target and compares pass or fail with what the talk
expects. For the three demos that fail on purpose, it also compares
each Expected, Found, Fix message with the Python version's recorded
output in `../site/outputs.json`. Any difference fails the check.

## Versions

Playwright Test 1.64.0 (the same Chromium build as the Python version),
@axe-core/playwright 4.14.0 with axe-core 4.14.0, TypeScript 7.0.2.
