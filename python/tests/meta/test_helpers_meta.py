"""Tests of the framework itself. Each helper must fail
on the variant that has the defect, with the right Fix
line, and pass on fixed. Variants are chosen here, so
--variant is ignored."""

import pytest

from framework.a11y_page import A11yPage
from framework.axe import run_axe, violations_report
from framework.helpers import (
    assert_modal_focus_contract,
    assert_names_meaningful,
    name_problem,
)

Failed = pytest.fail.Exception

# Page patches that break one step of the focus contract.
NOT_MODAL = """HTMLDialogElement.prototype.showModal =
  function () { this.show(); };"""
ESCAPE_IGNORED = """document.addEventListener('cancel',
  e => e.preventDefault(), true);"""
FOCUS_DROPPED = """document.addEventListener('keydown',
  e => {
    const open = document.querySelector('dialog[open]');
    if (e.key !== 'Escape' || !open) return;
    e.preventDefault();
    open.close();
    document.activeElement.blur();
  }, true);"""


@pytest.fixture
def open_app(page, app_server):
    def _open(variant, patch=None):
        if patch:
            page.add_init_script(patch)
        app = A11yPage(page)
        app.goto(f"{app_server}/{variant}/")
        return app
    return _open


def failure_text(action, *args, **kwargs):
    with pytest.raises(Failed) as info:
        action(*args, **kwargs)
    return str(info.value)


# --- A11yPage lookups -----------------------------------
def test_lookup_fails_on_broken_with_label_fix(open_app):
    app = open_app("broken")
    text = failure_text(app.textbox, "Email")
    assert "2 textboxes, none named" in text
    assert '<label for="...">Email</label>' in text


def test_lookup_finds_named_button_on_fixed(open_app):
    app = open_app("fixed")
    assert app.button("Create account").count() == 1


# --- axe wrapper ----------------------------------------
def test_axe_report_lists_rules_on_broken(open_app):
    app = open_app("broken")
    report = violations_report(run_axe(app._page))
    for rule in ["label", "image-alt", "html-has-lang"]:
        assert rule in report
    assert 'add lang="en" to <html>' in report


@pytest.mark.parametrize("variant", ["fixed", "hollow"])
def test_axe_finds_nothing(open_app, variant):
    app = open_app(variant)
    assert run_axe(app._page)["violations"] == []


def test_gradient_is_incomplete_not_pass(open_app):
    app = open_app("fixed")
    results = run_axe(app._page, rules=["color-contrast"])
    targets = [n["target"] for i in results["incomplete"]
               for n in i["nodes"]]
    assert [".promo"] in targets


# --- name quality ---------------------------------------
@pytest.mark.parametrize("name, role, text, problem", [
    (None, "button", "", "no name"),
    ("icon", "button", "", "generic word"),
    ("click here", "link", "", "generic word"),
    ("Submit button", "button", "", "repeats the role"),
    ("img_001.png", "img", "", "looks like a file name or id"),
    ("Save", "button", "Save draft",
     "visible text is not in the name"),
    ("Close dialog", "button", "", None),
    ("Settings", "button", "", None),
])
def test_name_rules(name, role, text, problem):
    assert name_problem(name, role, text) == problem


def test_names_fail_on_hollow(open_app):
    app = open_app("hollow")
    text = failure_text(assert_names_meaningful, app, "img")
    assert '"image"' in text
    assert 'alt="Project dashboard"' in text


def test_names_pass_on_fixed(open_app):
    app = open_app("fixed")
    app.button("Delete account").click()
    assert_names_meaningful(app, "button")
    assert_names_meaningful(app, "img")


# --- modal focus contract -------------------------------
def _contract(app):
    assert_modal_focus_contract(
        app, "Delete account", "Delete your account?"
    )


@pytest.mark.parametrize("variant, patch, step", [
    ("broken", None, "step 2 of 5"),
    ("fixed", NOT_MODAL, "step 3 of 5"),
    ("fixed", ESCAPE_IGNORED, "step 4 of 5"),
    ("fixed", FOCUS_DROPPED, "step 5 of 5"),
])
def test_focus_contract_names_the_step(
    open_app, variant, patch, step
):
    app = open_app(variant, patch)
    assert step in failure_text(_contract, app)


def test_focus_contract_passes_on_fixed(open_app):
    _contract(open_app("fixed"))
