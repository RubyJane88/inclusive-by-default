"""axe on its own, with no framework helpers. It checks
that names exist, not what they say."""

from framework.axe import run_axe


def _rules(results):
    return [v["id"] for v in results["violations"]]


def test_page_passes_axe(page):
    page.goto("")
    assert _rules(run_axe(page)) == []


def test_open_dialog_passes_axe(page):
    page.goto("")
    page.get_by_role("button", name="Delete account").click()
    assert _rules(run_axe(page)) == []
