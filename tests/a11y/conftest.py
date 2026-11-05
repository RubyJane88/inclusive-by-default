"""Accessibility checks that run whether or not a test
asks for them."""

import pytest

from framework.a11y_page import A11yPage
from framework.axe import run_axe, violations_report


@pytest.fixture
def app(page):
    return A11yPage(page)


def pytest_collection_modifyitems(items):
    # Opting out costs a written reason.
    for item in items:
        mark = item.get_closest_marker("skip_axe")
        if mark and not _reason(mark):
            raise pytest.UsageError(
                f"{item.nodeid}: skip_axe needs a reason, "
                'e.g. @pytest.mark.skip_axe(reason="...")'
            )


@pytest.hookimpl(wrapper=True)
def pytest_runtest_call(item):
    # Runs after the test body. If the body failed, the
    # yield raises and axe is skipped, so one problem is
    # not reported twice.
    result = yield
    page = item.funcargs.get("page")
    if page and not item.get_closest_marker("skip_axe"):
        _check_axe(page)
    return result


def _check_axe(page):
    __tracebackhide__ = True
    results = run_axe(page)
    if results["violations"]:
        pytest.fail(violations_report(results), pytrace=False)


def _reason(mark):
    reason = mark.kwargs.get("reason") or (
        mark.args[0] if mark.args else ""
    )
    return str(reason).strip()
