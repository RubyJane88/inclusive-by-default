"""Checks that scanners cannot do on their own.

Helpers reach the raw Playwright page through
app._page. Tests should not.
"""

import re

import pytest
from playwright.sync_api import TimeoutError as PwTimeout

from framework.a11y_page import parse_node
from framework.messages import focus_step_failed, weak_names

# --- Name quality ---------------------------------------
# This rejects known-bad patterns. It cannot judge whether
# a plausible name is correct: "Settings" on a delete
# button passes. People still review names.
GENERIC = {
    "button", "icon", "image", "img", "picture",
    "graphic", "photo", "click here", "here", "link",
    "more", "read more", "svg", "input", "untitled",
}
ROLE_WORD = {"button": "button", "img": "image",
             "link": "link"}
FILE_OR_ID = re.compile(
    r"\.(png|jpe?g|gif|svg|webp)$|^[a-z]+[_-]?\d+$",
    re.IGNORECASE,
)


def name_problem(name, role, visible_text=""):
    """The first rule a name breaks, or None."""
    if not name:
        return "no name"
    low = name.lower()
    if low in GENERIC:
        return "generic word"
    if low.endswith(" " + ROLE_WORD.get(role, "-")):
        return "repeats the role"
    if FILE_OR_ID.search(name):
        return "looks like a file name or id"
    if visible_text and visible_text.lower() not in low:
        return "visible text is not in the name"
    return None


def assert_names_meaningful(app, role):
    """Every visible element of this role has a name
    that says what it is."""
    __tracebackhide__ = True
    problems = []
    for element in app._page.get_by_role(role).all():
        name, text, where = _describe(element)
        reason = name_problem(name, role, text)
        if reason:
            problems.append((name, where, reason))
    if problems:
        pytest.fail(weak_names(role, problems),
                    pytrace=False)


def _describe(element):
    first = element.aria_snapshot().splitlines()[0]
    _, name = parse_node(first)
    text = element.inner_text().strip()
    where = element.evaluate(_LANDMARK_JS)
    return name, text, where


_LANDMARK_JS = """el => {
  const box = el.closest('header, main, dialog,'
    + ' [role=dialog], nav, footer');
  return box ? 'in ' + box.tagName.toLowerCase()
    .replace('div', 'dialog') : '';
}"""


# --- Modal focus contract -------------------------------
def assert_modal_focus_contract(app, trigger, dialog):
    """trigger: name of the opening button.
    dialog: name of the dialog."""
    __tracebackhide__ = True
    page = app._page
    opener = app.button(trigger)
    opener.focus()
    page.keyboard.press("Enter")
    box = page.get_by_role("dialog", name=dialog)
    _step(1, _becomes(box, "visible"),
          f'no dialog named "{dialog}"')
    _step(2, _holds_focus(box), _focus_outside(page))
    _step(3, *_tab_stays_inside(page, box))
    page.keyboard.press("Escape")
    _step(4, _becomes(box, "hidden"),
          "the dialog is still open")
    _step(5, _is_focused(opener), _focus_outside(page))


def _step(number, ok, found):
    __tracebackhide__ = True
    if not ok:
        pytest.fail(focus_step_failed(number, found),
                    pytrace=False)


def _becomes(locator, state):
    try:
        locator.wait_for(state=state, timeout=1000)
        return True
    except PwTimeout:
        return False


def _holds_focus(box):
    return box.evaluate(
        "d => d.contains(document.activeElement)"
    )


def _is_focused(locator):
    return locator.evaluate(
        "el => el === document.activeElement"
    )


def _tab_stays_inside(page, box):
    # Chromium's native modal lets focus step out to the
    # browser's own controls once per cycle (seen as
    # document.hasFocus() being false). That is allowed.
    # Reaching the page behind the modal is not.
    presses = box.evaluate(_TABBABLE_COUNT_JS) + 1
    for key in ["Tab"] * presses + ["Shift+Tab"] * presses:
        page.keyboard.press(key)
        left_page = not page.evaluate("document.hasFocus()")
        if not left_page and not _holds_focus(box):
            where = _focus_outside(page)
            return False, f"after {key}: {where}"
    return True, ""


def _focus_outside(page):
    return page.evaluate(_FOCUS_JS)


_TABBABLE_COUNT_JS = """d => d.querySelectorAll(
  'button, [href], input, select, textarea,'
  + ' [tabindex]:not([tabindex="-1"])').length"""

_FOCUS_JS = """() => {
  const el = document.activeElement;
  if (!el || el === document.body)
    return 'focus is lost (on the page body)';
  const role = el.getAttribute('role')
    || el.tagName.toLowerCase();
  const name = el.getAttribute('aria-label')
    || el.innerText.trim();
  const what = name ? role + ' "' + name + '"'
    : role + ' with no name';
  return 'focus is on ' + what + ', outside the dialog';
}"""
