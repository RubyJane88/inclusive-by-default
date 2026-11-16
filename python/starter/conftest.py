"""Drop-in accessibility check for pytest-playwright.

Copy this file into your tests folder and put axe.min.js (from the axe-core
npm package) next to it. axe then runs after every test that passes, on every
page the test left open, and the test fails if axe finds WCAG A or AA problems.

Opt out per test, with a reason:
    @pytest.mark.skip_axe(reason="third-party embed, ticket A11Y-12")

It uses pytest-playwright's sync fixtures, `page` and `context`. Pages a test
opens in a browser context of its own are not checked.
"""

import inspect
from pathlib import Path

import pytest
from playwright.sync_api import Error as PlaywrightError

AXE_JS = Path(__file__).parent / "axe.min.js"
WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
RUN_AXE = "tags => axe.run(document, {runOnly: {type: 'tag', values: tags}})"
ALLOW_FRAMES = "() => axe.configure({allowedOrigins: ['<unsafe_all_origins>']})"
# True for a page the test never put anything into.
UNTOUCHED = "() => location.href === 'about:blank' && !document.body?.children.length"


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "skip_axe(reason): skip the axe check; reason required"
    )


def pytest_collection_modifyitems(items):
    # Opting out costs a written reason.
    for item in items:
        mark = item.get_closest_marker("skip_axe")
        if mark and not str(mark.kwargs.get("reason", "")).strip():
            raise pytest.UsageError(f"{item.nodeid}: skip_axe needs a reason")


@pytest.hookimpl(wrapper=True)
def pytest_runtest_call(item):
    # Runs after the test body. If the body failed, the yield raises and axe
    # is skipped, so one problem is not reported twice.
    result = yield
    if not item.get_closest_marker("skip_axe"):
        for page in _open_pages(item):
            _check_axe(page)
    return result


def _open_pages(item):
    # Every page the test left open, not only `page`.
    pages = []
    for name in ("page", "context"):
        fixture = item.funcargs.get(name)
        context = getattr(fixture, "context", fixture)
        pages += [p for p in getattr(context, "pages", []) if p not in pages]
    if pages and inspect.iscoroutinefunction(pages[0].goto):
        pytest.fail(_message(
            "pytest-playwright's sync fixtures",
            "this test uses the async API",
            "use the sync fixtures for tests that need the axe check",
        ), pytrace=False)
    return [page for page in pages if not page.is_closed()]


def _check_axe(page):
    __tracebackhide__ = True
    try:
        if page.evaluate(UNTOUCHED):
            return
        violations = _run_axe(page)["violations"]
    except PlaywrightError as error:
        pytest.fail(_message(
            f"axe to run on {page.url}",
            str(error).splitlines()[0],
            "let the page finish loading before the test ends, or skip the"
            " check with a reason",
        ), pytrace=False)
    if violations:
        rows = [f"  {v['id']:<16} {len(v['nodes'])} x  {v['help']}" for v in violations]
        pytest.fail(_message(
            "no WCAG A or AA failures that axe can detect",
            f"{len(rows)} rules fail on {page.url}\n" + "\n".join(rows),
            "fix each rule above. Rule details: dequeuniversity.com/rules/axe/4.14",
        ), pytrace=False)


def _run_axe(page):
    # Evaluated, not added as a script tag, so a strict Content Security
    # Policy does not block it. Each frame needs its own copy for axe to look
    # inside it, and leave to answer a page from another origin.
    source = AXE_JS.read_text(encoding="utf-8")
    for frame in page.frames:
        try:
            if not frame.evaluate("() => 'axe' in window"):
                frame.evaluate(source)
            frame.evaluate(ALLOW_FRAMES)
        except PlaywrightError:
            pass  # the frame went away; axe skips it
    return page.evaluate(RUN_AXE, WCAG_TAGS)


def _message(expected, found, fix):
    return f"Expected: {expected}\nFound:    {found}\nFix:      {fix}"
