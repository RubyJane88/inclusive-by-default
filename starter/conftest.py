"""Drop-in accessibility check for pytest-playwright.

Copy this file into your tests folder and put axe.min.js
(from the axe-core npm package) next to it. axe then runs
after every test that uses the `page` fixture, and a test
fails if axe finds WCAG A or AA problems.

Opt out per test, with a reason:
    @pytest.mark.skip_axe(reason="third-party embed, ticket A11Y-12")
"""

from pathlib import Path

import pytest

AXE_JS = Path(__file__).parent / "axe.min.js"
WCAG_TAGS = [
    "wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa",
]


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "skip_axe(reason): skip the axe check; reason required",
    )


def pytest_collection_modifyitems(items):
    # Opting out costs a written reason.
    for item in items:
        mark = item.get_closest_marker("skip_axe")
        reason = mark and mark.kwargs.get("reason", "")
        if mark and not str(reason).strip():
            raise pytest.UsageError(
                f"{item.nodeid}: skip_axe needs a reason"
            )


@pytest.hookimpl(wrapper=True)
def pytest_runtest_call(item):
    # Runs after the test body. If the body failed, the
    # yield raises and axe is skipped.
    result = yield
    page = item.funcargs.get("page")
    if page and not item.get_closest_marker("skip_axe"):
        _check_axe(page)
    return result


def _check_axe(page):
    __tracebackhide__ = True
    if not page.evaluate("() => 'axe' in window"):
        page.add_script_tag(path=str(AXE_JS))
    results = page.evaluate(
        "tags => axe.run(document,"
        " {runOnly: {type: 'tag', values: tags}})",
        WCAG_TAGS,
    )
    if results["violations"]:
        pytest.fail(_report(results["violations"]),
                    pytrace=False)


def _report(violations):
    rows = [
        f"  {v['id']:<16} {len(v['nodes'])} x  {v['help']}"
        for v in violations
    ]
    return (
        "Expected: no WCAG A or AA failures that axe can"
        " detect\n"
        f"Found:    {len(rows)} rules fail:\n"
        + "\n".join(rows)
        + "\nFix:      fix each rule above; details at"
        " dequeuniversity.com/rules/axe/"
    )
