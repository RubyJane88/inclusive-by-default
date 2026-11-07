# What axe and Chromium actually do

Before writing the tests, we checked how axe-core and Chromium behave on the demo pages. Several results are limits of automated checking that are worth knowing.

Checked on 14 October 2026 with axe-core 4.14.0, Chromium 156 and Playwright for Python 1.64.0. axe ran every rule tagged `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` or `wcag22aa`.

## axe passes things that are broken

| Page | axe result | What is actually wrong |
|---|---|---|
| `hollow` | No violations | Buttons named "icon" and "button", an image with alt text "image", and a submit button whose name is "Create account button", so screen readers say "button" twice |
| `broken`, dialog open | No violation for the dialog | It has `role="dialog"` and `aria-modal="true"`, but focus never moves in, Tab reaches the page behind, and Escape does nothing |
| `broken` | No violation for the submit control | It is a `div` with a click handler, not a button |

axe checks that names and roles exist. It cannot judge what a name says or how a component behaves. The name-quality and dialog focus checks in `framework/helpers.py` cover these cases.

## axe does check that visible text is in the name

axe's `label-content-name-mismatch` rule (WCAG 2.5.3, label in name) runs with the WCAG tags above. A button that shows "Create account" but has `aria-label="Button"` is flagged. A name that contains the visible text, such as "Create account button", passes, even though "button" repeats the role.

## What axe did flag on `broken`

Six rules: `button-name`, `color-contrast`, `document-title`, `html-has-lang`, `image-alt` and `label`.

## A placeholder counts as a name

An input with only `placeholder="Email"` passes axe's `label` rule, and Chromium uses the placeholder as its accessible name. So placeholder-only fields pass automated checks. They are still poor practice: the text disappears once you type, and placeholder text often fails contrast. The `broken` page uses visible text that is not connected to its input instead, which both axe and the role-based tests catch.

## Text on a gradient is "incomplete", not a pass

axe reports the gradient banner under `incomplete`: "Element's background color could not be determined due to a background gradient". Many teams only look at violations, so these need a person to check. Run `make incomplete` to see it.

## How Chromium's native dialog handles focus

With `<dialog>` opened by `showModal()`:

- Focus moves to the first control in the dialog.
- Tab past the last control moves focus to the browser's own controls once per cycle (`document.hasFocus()` is false), then back into the dialog. It never reaches the page behind.
- When that step out happens differs between headless and headed runs, so the dialog check does not count key presses.
- Escape closes the dialog, and focus returns to the button that opened it.

This was observed in Chromium only. Other browsers may differ.

## Check it yourself

`make meta` runs the framework's own tests, which assert most of the above: axe finds nothing on `fixed` and `hollow`, the gradient comes back as incomplete, and each step of the dialog check fails on a page that breaks it.
