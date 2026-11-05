# Inclusive by Default

**Came from the talk? Start here: [STARTER.md](STARTER.md).** It shows what to copy into your own test suite, in what order, starting with one file you can add in 15 minutes.

---

Demo code for the talk "Inclusive by Default: Designing Accessible Test Automation from Day One". One sign-up page in three versions, and a small pytest and Playwright framework that makes accessibility checks run on every test.

- `broken`: looks fine, unusable by keyboard or screen reader.
- `fixed`: the same page, done properly.
- `hollow`: every control has a name, and the names say nothing.

The app passes automated checks. It is a demo, not a claim of WCAG conformance.

## How to run the demo

```
make setup         # once, needs network: venv, packages, Chromium
make demo1-catch   # accessibility tests fail on broken, with fixes
make demo1-after   # the same tests pass on fixed
make check         # every demo, expected vs actual
```

After `make setup`, nothing needs the network.

## The three demos

| Demo | Commands | What you see |
|---|---|---|
| 1. Green tests, broken page | `make demo1-before`, `demo1-catch`, `demo1-after` | Conventional tests pass on `broken`. Role-based tests fail with Expected, Found, Fix. They pass on `fixed`. |
| 2. What axe can't see | `make demo2-broken`, `demo2-fixed` | A visible, slowed browser with pressed keys on screen. The broken dialog has correct ARIA and fails at step 2 (focus never moves in). The fixed dialog keeps focus and returns it. |
| 3. Names that mean nothing | `make demo3-axe`, `demo3-names`, `demo3-after` | axe passes on `hollow`. The name check lists "icon", "Button", "button" and "image". It passes on `fixed`. |

Slide assets: `make snapshot` (accessibility tree, broken next to fixed) and `make incomplete` (what axe says about text on a gradient).

## Four ideas to copy

1. **Find elements by role and name.** `framework/a11y_page.py` has `button(name)`, `textbox(name)`, `dialog(name)` and no CSS access. A control with no name cannot be found, so the test fails.
2. **Run axe after every test.** `tests/a11y/conftest.py` runs it without being asked. Skipping it takes `@pytest.mark.skip_axe(reason="...")`, and an empty reason stops the run.
3. **Make failures say the fix.** Every failure reads Expected, Found, Fix (`framework/messages.py`). A developer new to accessibility can act on it, and so can an AI assistant.
4. **Check what scanners miss.** `framework/helpers.py` has a name-quality check and a five-step dialog focus check.

Start with idea 2: [`starter/conftest.py`](starter/conftest.py) is a single drop-in file of about 60 lines. The whole framework in this repo is 385 lines, not counting blank lines and comments.

## Layout

```
STARTER.md        what to copy into your own suite
starter/          drop-in conftest.py: axe after every test
app/              broken, fixed, hollow, shared assets
framework/        page object, helpers, messages, axe wrapper
framework/vendor/ axe-core 4.14.0 (MPL-2.0, see axe-LICENSE)
tests/conventional/  CSS selectors, no axe
tests/axe_only/      axe alone, no framework helpers
tests/a11y/          demo tests, axe after every test
tests/meta/          tests of the framework itself
scripts/          check, snapshot, incomplete, phase0 probe
recording/        key overlay used with --show-keys
RECORDING.md      shot list for the demo videos
```

## Versions

Python 3.12, Playwright for Python 1.64.0 (Chromium 156), pytest 9.1.1, pytest-playwright 0.10.0, axe-core 4.14.0, ruff 0.17.0.

## What the checks cannot do

- The name check rejects known-bad names. It cannot tell whether a plausible name is right.
- The dialog check tests the keyboard path written in the test, not every path.
- axe returns text over gradients and images as "incomplete", not as a pass or a fail.
- axe and Chromium accept a placeholder as an input's name, so placeholder-only fields pass automated checks.
- None of this replaces testing with disabled people and assistive technology.

## If something breaks

- **Tests time out at the first click on macOS:** the headless shell's GPU process can crash. `pytest.ini` already uses full Chromium (`--browser-channel chromium`); keep that setting.
- **Browser not found:** run `make setup` again. Browsers are installed into `.pw-browsers/` in this folder.
- **Port or permission errors in a sandboxed tool:** the tests start a local web server and launch Chromium. Run them in a normal terminal.
- **Check the whole repo:** `make check` prints expected vs actual for every target. A failure only counts as expected if it shows an Expected/Found/Fix message.

## Licence

MIT, see [LICENSE](LICENSE). Copy what helps. `framework/vendor/axe.min.js` is axe-core by Deque Systems, under MPL-2.0 ([axe-LICENSE](framework/vendor/axe-LICENSE)).
