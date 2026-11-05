# Starter kit: accessibility checks in your test suite

From the talk "Inclusive by Default: Designing Accessible Test Automation from Day One".

You do not need a new tool. You need the tools you already have to run on every test, and to say what to fix. This page tells you what to copy, in what order.

- [1. Start in 15 minutes](#1-start-in-15-minutes)
- [2. Templates to copy](#2-templates-to-copy)
- [3. Using it with AI assistants](#3-using-it-with-ai-assistants)
- [4. Roll it out](#4-roll-it-out)
- [5. What automation will not catch](#5-what-automation-will-not-catch)
- [6. Other test tools](#6-other-test-tools)
- [7. Sources](#7-sources)

The examples use Python, pytest and Playwright. The ideas work in any stack.

## 1. Start in 15 minutes

One file. axe runs after every test that uses Playwright's `page`, and the test fails if axe finds WCAG A or AA problems.

1. Install, if you have not already:
   ```
   pip install pytest-playwright
   playwright install chromium
   ```
2. Copy [`starter/conftest.py`](starter/conftest.py) into your tests folder. If you already have a `conftest.py`, paste its contents into yours.
3. Put `axe.min.js` next to it. Get it from the axe-core npm package (`npm pack axe-core`, then take `package/axe.min.js`), or copy [`framework/vendor/axe.min.js`](framework/vendor/axe.min.js) from this repo (axe-core 4.14.0, MPL-2.0).
4. Run your tests.

What you will see on a page with problems (real output from the demo app):

```
Expected: no WCAG A or AA failures that axe can detect
Found:    6 rules fail:
  button-name      1 x  Buttons must have discernible text
  color-contrast   6 x  Elements must meet minimum color contrast ratio thresholds
  document-title   1 x  Documents must have <title> element to aid in navigation
  html-has-lang    1 x  <html> element must have a lang attribute
  image-alt        1 x  Images must have alternative text
  label            2 x  Form elements must have labels
Fix:      fix each rule above; details at dequeuniversity.com/rules/axe/
```

To skip the check for one test, you must say why:

```python
@pytest.mark.skip_axe(reason="third-party embed, ticket A11Y-12")
def test_partner_widget(page):
    ...
```

A blank reason stops the whole run.

**If it fails on day one with many violations:** that is normal. Start the check on one test file, fix or ticket what it finds, then widen it.

**If your site has a strict Content Security Policy,** the injected script may be blocked. Create the browser context with `bypass_csp=True` in tests.

## 2. Templates to copy

### Find elements by role and name

Tests that find elements the way assistive technology does fail when a control has no name. You get that check for free.

```python
# Instead of
page.click("#save")
# write
page.get_by_role("button", name="Create account").click()
```

To make it the default, wrap the page in an object that only offers role-based methods. See [`framework/a11y_page.py`](framework/a11y_page.py): it has `button(name)`, `textbox(name)`, `dialog(name)` and no CSS access. The missing methods are the point.

### Failure messages that say the fix

Every failure reads the same way, so anyone can act on it:

```python
def expected_found_fix(expected, found, fix):
    return (
        f"Expected: {expected}\n"
        f"Found:    {found}\n"
        f"Fix:      {fix}"
    )

pytest.fail(expected_found_fix(
    'a textbox named "Email"',
    "2 textboxes, none named",
    'Connect the visible text with <label for="...">Email</label>',
), pytrace=False)
```

More examples: [`framework/messages.py`](framework/messages.py).

### Banned names

axe checks that a name exists, not what it says. A button named "button" passes axe. This check catches it:

```python
GENERIC = {
    "button", "icon", "image", "img", "picture",
    "graphic", "photo", "click here", "here", "link",
    "more", "read more", "svg", "input", "untitled",
}
```

Add your own words: internal codenames, "TODO", placeholder text. The full rules (generic words, names that repeat the role, file names, visible text missing from the name) are in `name_problem` in [`framework/helpers.py`](framework/helpers.py).

It rejects known-bad names. It cannot tell whether a plausible name is right: "Settings" on a delete button passes. People still review names.

### A behavior check for your riskiest component

Scanners cannot see behavior. A dialog can have perfect ARIA and still trap or lose keyboard focus. Test it by keyboard, in five steps:

1. Open it from its button. The dialog appears.
2. Focus moves into the dialog.
3. Tab and Shift+Tab stay inside it. Focus never reaches the page behind.
4. Escape closes it.
5. Focus returns to the button that opened it.

The working version is `assert_modal_focus_contract` in [`framework/helpers.py`](framework/helpers.py). Adapt the same idea to a date picker, a menu or tabs: write down what a keyboard user must be able to do, then test exactly that.

## 3. Using it with AI assistants

AI assistants fix accessibility problems well once they are pointed out, and rarely raise them on their own. Your tests do the pointing. These are suggested starting points; they were not tested in the talk.

### A prompt to paste with a failing test

```
This accessibility test failed. Fix the page markup, not the test.
Use the Fix line as the instruction. Do not add generic names such
as "button", "icon" or "image": a name must say what the control
does. Do not skip or weaken the test.

<paste the Expected / Found / Fix output here>
```

### A rules file for your assistant

Put this in the file your assistant reads for project rules (for example `CLAUDE.md` or `AGENTS.md`):

```
## Accessibility in tests
- Find elements by role and accessible name. Do not use CSS or test-id selectors in new tests.
- Never add @pytest.mark.skip_axe without a specific reason.
- Accessible names must say what the control does. Never use "button", "icon", "image" or "click here".
- When an accessibility test fails, fix the markup. Do not change the test to make it pass.
```

A rules file asks. A test enforces. Use both.

## 4. Roll it out

| When | What |
|---|---|
| Today, 15 minutes | Add `starter/conftest.py` to one test file and run it. |
| This week | Switch one page object to find by role and name. Rewrite its failures as Expected, Found, Fix. |
| This quarter | Banned names on one critical flow. One behavior check for your riskiest component. Let your assistant fix what they find. |

By role:

- **QA engineers:** you own the test suite. The first two rows are yours.
- **Developers:** when a test fails, the Fix line says what to change. Paste it into your assistant if you use one.
- **Leads and product:** ask for the axe check in CI and one behavior check per critical component.

## 5. What automation will not catch

These checks are a floor, not a ceiling. Passing them is not WCAG conformance. Once per release, for each key flow, take 10 minutes:

- **Keyboard only.** Unplug the mouse. Can you reach and use everything? Can you always see where focus is?
- **Screen reader.** Turn one on (VoiceOver: Command+F5 on a Mac; NVDA is free on Windows). Tab through the flow. Does every control announce what it does?
- **Zoom to 200%.** Does anything overlap, get cut off, or need sideways scrolling?

Also: axe reports text over gradients and images as "incomplete", not as a pass. Check those by eye. A placeholder alone counts as a name for axe and Chromium, so placeholder-only fields pass automated checks; they are still poor practice.

Nothing replaces testing with disabled people.

## 6. Other test tools

- **Playwright for JavaScript or TypeScript:** `@axe-core/playwright` (`AxeBuilder`), `getByRole`, and the `toHaveAccessibleName` and `toMatchAriaSnapshot` assertions.
- **Cypress:** the `cypress-axe` plugin (`cy.injectAxe()`, `cy.checkA11y()`), and role queries from Testing Library (`findByRole`).
- **Selenium 4:** `WebElement.accessible_name` and `WebElement.aria_role` read what the browser computes. Inject `axe.min.js` with `execute_script` to run axe. Check the properties exist in your version.

The same four ideas apply in each: find by role and name, run axe automatically, make failures say the fix, add checks for what scanners miss.

## 7. Sources

- WebAIM Million 2026: [webaim.org/projects/million](https://webaim.org/projects/million/)
- axe-core rules: [dequeuniversity.com/rules/axe](https://dequeuniversity.com/rules/axe/)
- FTC final order requiring accessiBe to pay $1 million, April 2025: [ftc.gov](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million)
- Domino's Pizza LLC v. Robles, certiorari denied 7 October 2019: [SCOTUSblog](https://www.scotusblog.com/cases/case-files/dominos-pizza-llc-v-robles/)
- ChatGPT (GPT-4o) accessibility case study: [arXiv 2501.03572](https://arxiv.org/abs/2501.03572)
- GitHub Copilot and accessibility (IHC): [sol.sbc.org.br](https://sol.sbc.org.br/index.php/ihc/article/download/37661/37443)
- Calò, Gurita and De Russis, CHI EA 2026: [doi.org/10.1145/3772363.3799364](https://doi.org/10.1145/3772363.3799364)
- Playwright Test Agents and Playwright MCP: [playwright.dev](https://playwright.dev/)
- European Accessibility Act, Directive (EU) 2019/882: [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/dir/2019/882/oj)

## The demo

This repo also holds the talk's demo: one sign-up page in three versions (`broken`, `fixed`, `hollow`) and the tests that tell them apart. See [README.md](README.md) to run it.
