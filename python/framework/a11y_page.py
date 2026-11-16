"""Role-based page object.

There is no locator(), no get_by_test_id() and no CSS.
Tests can reach only what assistive technology can reach.
The missing methods are the point.
"""

import re

import pytest
from playwright.sync_api import TimeoutError as PwTimeout

from framework.messages import (
    found_for_role,
    missing_element,
)

LOOKUP_MS = 1000
# One node of aria_snapshot(): '- textbox "Email"'
_NODE = re.compile(r'^\s*- (\w+)(?: "((?:[^"\\]|\\.)*)")?')


def parse_node(line):
    """'- button "Save"' -> ("button", "Save").
    An unnamed node gives a name of None."""
    match = _NODE.match(line)
    if not match:
        return None, None
    return match.group(1), match.group(2)


class A11yPage:
    def __init__(self, page):
        # Private on purpose: helpers may need the raw
        # page, tests should not.
        self._page = page

    def goto(self, path=""):
        self._page.goto(path)
        return self

    def button(self, name):
        return self._find("button", name)

    def textbox(self, name):
        return self._find("textbox", name)

    def dialog(self, name):
        return self._find("dialog", name)

    def heading(self, name):
        return self._find("heading", name)

    def image(self, name):
        return self._find("img", name)

    def status(self):
        return self._page.get_by_role("status")

    def _find(self, role, name):
        __tracebackhide__ = True
        found = self._page.get_by_role(
            role, name=name, exact=True
        )
        if not self._appears(found):
            pytest.fail(self._missing(role, name), pytrace=False)
        return found

    def _appears(self, found):
        try:
            found.first.wait_for(timeout=LOOKUP_MS)
            return True
        except PwTimeout:
            return False

    def _missing(self, role, name):
        names = self._names_for(role)
        on_page = self._page.get_by_text(name, exact=True)
        found = found_for_role(
            role, names, name, on_page.count() > 0
        )
        return missing_element(role, name, found)

    def _names_for(self, role):
        tree = self._page.locator("body").aria_snapshot()
        names = []
        for line in tree.splitlines():
            node_role, node_name = parse_node(line)
            if node_role == role:
                names.append(node_name)
        return names
