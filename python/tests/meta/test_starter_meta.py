"""The drop-in starter, used the way a real suite would
use it: alone in an empty folder, with tests of many
shapes. Each case below is one way a real test differs
from the demo."""

import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

PYTHON = Path(__file__).resolve().parents[2]
APP = PYTHON.parent / "app"
BROKEN = "http://demo.test/broken/"
RULES = "6 rules fail on "

# The suite the starter is dropped into. Pages are served
# from memory at http://demo.test and http://other.test.
SUITE = '''
from pathlib import Path

import pytest

APP = Path(r"{app}")
TYPES = {{".html": "text/html", ".css": "text/css",
          ".svg": "image/svg+xml"}}
HOST = (
    '<html lang="en"><title>Host</title><main><h1>Host</h1>'
    '<iframe title="Sign-up" src="http://other.test/broken/">'
    "</iframe></main></html>"
)


def _serve(route):
    path = route.request.url.split(".test/", 1)[1]
    if path == "host.html":
        return route.fulfill(content_type="text/html", body=HOST)
    headers = {{}}
    if path == "strict-csp.html":
        path = "broken/"
        headers["Content-Security-Policy"] = "script-src 'none'"
    file = APP / (path + "index.html" if path.endswith("/")
                  else path)
    route.fulfill(
        path=str(file), headers=headers,
        content_type=TYPES.get(file.suffix, "text/plain"),
    )


@pytest.fixture(autouse=True)
def demo_pages(request):
    if "context" in request.fixturenames:
        context = request.getfixturevalue("context")
        context.route("**/*", _serve)


def test_broken(page):
    page.goto("http://demo.test/broken/")


def test_fixed(page):
    page.goto("http://demo.test/fixed/")


def test_closes_its_page(page):
    page.goto("http://demo.test/fixed/")
    page.close()


def test_never_navigates(page):
    assert 1 + 1 == 2


def test_no_browser_at_all():
    assert 1 + 1 == 2


def test_set_content(page):
    page.set_content("<button></button>")


def test_second_tab(page, context):
    page.goto("http://demo.test/fixed/")
    other = context.new_page()
    other.goto("http://demo.test/broken/")


def test_context_only(context):
    context.new_page().goto("http://demo.test/broken/")


def test_strict_csp(page):
    page.goto("http://demo.test/strict-csp.html")


def test_iframe(page):
    page.goto("http://demo.test/host.html")
    page.frame_locator("iframe").locator("h1").wait_for()


@pytest.mark.skip_axe(reason="meta test of the opt-out")
def test_skips_with_reason(page):
    page.goto("http://demo.test/broken/")


def test_body_fails_first(page):
    page.goto("http://demo.test/broken/")
    assert False, "the body failed"
'''
NO_REASON = '''
import pytest


@pytest.mark.skip_axe(reason="  ")
def test_skips_without_reason(page):
    pass
'''


def _run(folder, source):
    folder.mkdir()
    starter = PYTHON / "starter" / "conftest.py"
    axe = PYTHON / "framework" / "vendor" / "axe.min.js"
    shutil.copy(starter, folder)
    shutil.copy(axe, folder)
    (folder / "test_suite.py").write_text(source)
    return subprocess.run(
        [sys.executable, "-m", "pytest", "-q", "-rA",
         "-p", "no:cacheprovider",
         "--browser-channel", "chromium"],
        cwd=folder, env=dict(os.environ),
        capture_output=True, text=True, check=False,
    )


@pytest.fixture(scope="module")
def suite(tmp_path_factory):
    folder = tmp_path_factory.mktemp("starter") / "suite"
    done = _run(folder, SUITE.format(app=APP))
    return done.stdout + done.stderr


def _section(output, test):
    """What pytest printed for one failing test."""
    start = output.index(f"_ {test}[chromium] _")
    end = output.find("\n___", start)
    return output[start:end if end > 0 else None]


@pytest.mark.parametrize("test", [
    "test_fixed", "test_closes_its_page",
    "test_never_navigates", "test_no_browser_at_all",
    "test_skips_with_reason",
])
def test_starter_passes(suite, test):
    assert f"PASSED test_suite.py::{test}" in suite


@pytest.mark.parametrize("test, found", [
    ("test_broken", RULES + BROKEN),
    ("test_second_tab", RULES + BROKEN),
    ("test_context_only", RULES + BROKEN),
    ("test_strict_csp", RULES + "http://demo.test/strict-csp"),
    ("test_set_content", "button-name"),
    ("test_iframe", "label"),
])
def test_starter_fails_with_a_report(suite, test, found):
    section = _section(suite, test)
    assert "Expected: no WCAG A or AA failures" in section
    assert found in section
    assert "Fix:      fix each rule above" in section
    # The message alone: no traceback.
    assert "Traceback" not in section
    assert "conftest.py" not in section


def test_starter_reports_a_body_failure_once(suite):
    section = _section(suite, "test_body_fails_first")
    assert "the body failed" in section
    assert "rules fail" not in section


def test_starter_stops_on_a_missing_reason(tmp_path):
    done = _run(tmp_path / "suite", NO_REASON)
    assert done.returncode != 0
    assert "skip_axe needs a reason" in done.stdout + done.stderr
