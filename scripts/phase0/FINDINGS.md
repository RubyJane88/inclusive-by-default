# Phase 0 findings

Date: 2026-10-14. Playwright for Python 1.64.0, Chromium 156.0.8078.4, axe-core 4.14.0 (vendored from npm), pytest 9.1.1, pytest-playwright 0.10.0, Python 3.12.9, macOS (arm64).

Raw output: `output-headless.txt` and `output-headed.txt`, produced by `probe.py`. WCAG tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.

## Results against the brief's predictions

| # | Prediction | Observed | Holds |
|---|---|---|---|
| 1 | `hollow` has zero axe violations | 0 violations, dialog closed and open | Yes |
| 2 | Broken `role="dialog"` with no focus management has no axe violation for its behavior | No dialog-related violation. Its only new violations when open are contrast on its gray text | Yes |
| 3 | `fixed` has zero violations, including `target-size` | 0 violations, dialog closed and open. Icon buttons are 44 by 44 | Yes |
| 4 | Native `<dialog>` focus in Chromium | See below | Yes, with the step-out rule |
| 5 | Gradient banner reported under `incomplete` | `color-contrast` incomplete on `.promo`: "Element's background color could not be determined due to a background gradient" | Yes |

## Axe violations on `broken` (dialog closed)

Six rules: `button-name` (critical, 1), `color-contrast` (serious, 6), `document-title` (serious, 1), `html-has-lang` (serious, 1), `image-alt` (critical, 1), `label` (critical, 2).

Not reported by axe, as expected: the `div` used as a submit button, and every dialog focus defect. The demo tests catch these instead.

## Item 4: native dialog focus

Fixed variant, both modes:

- Opening moves focus to the first control (Close dialog).
- Tab and Shift+Tab never land on page content behind the modal.
- Once per cycle, focus leaves the page for the browser's own controls: `document.activeElement` is `body` and `document.hasFocus()` is `false`. The next key returns focus to the dialog.
- When this happens differs by mode. Headless: on the first Tab past the last control. Headed: the first wrap stays inside, and the step out happens on the second cycle.
- Escape closes the dialog. Focus returns to the trigger, both on Escape and on the Cancel button.

Rule for `assert_modal_focus_contract` step 3, based on this: every focused element must be inside the dialog, except a step where `document.hasFocus()` is `false` (focus is outside the page). The helper must not depend on how many presses it takes to wrap, because that differs between headless and headed.

Broken variant, both modes:

- Opening leaves focus on the trigger (step 2 fails here).
- Tab reaches the settings button and the form fields behind the open dialog.
- Escape does nothing; the dialog stays open.
- Closing with Cancel drops focus to `body`.
- Because the dialog markup follows the page content in the DOM, the first Tab after opening happens to reach the dialog's buttons. On video, show the step 2 failure and then Tab onward into the page behind.

## Prediction that was wrong: placeholder as a label

The original brief made `broken` inputs "placeholder only, no label". In this axe and Chromium version:

- axe's `label` rule passes an input whose only name source is `placeholder`.
- Chromium uses the placeholder as the accessible name, so `get_by_role("textbox", name="Email")` finds it.

A placeholder-only input would have passed both axe and the demo 1 test. Changed: `broken` inputs have visible text in an unassociated `div` and no placeholder. That is a real, common defect, and both axe (`label`) and the role lookup catch it.

A note for the talk: placeholder-only fields are still poor practice (the text disappears on input and often fails contrast), but axe does not flag them. Do not imply that it does.

## Other observations

- With the native dialog open, axe reports no `incomplete` for the banner, because the content behind a modal dialog is inert. `show_incomplete.py` must run with the dialog closed.
- The demo app has no links, so "empty links", one of the six WebAIM errors, is not shown. The other five are.

## Environment notes

- The sandbox blocked binding a local port, so the probe ran outside it. Setting `sandbox.network.allowLocalBinding: true` allows the server without leaving the sandbox.
- Chromium is installed in `.pw-browsers/` in the repo (set `PLAYWRIGHT_BROWSERS_PATH`) because the sandbox blocks the default cache folder. A normal setup can use the default location.
- pip needed `--use-deprecated=legacy-certs` inside the sandbox because of a keychain lookup failure. A normal setup does not.
