"""Demo 2: a dialog that a scanner cannot judge.
The test drives it by keyboard alone."""

from framework.helpers import assert_modal_focus_contract


def test_delete_dialog_keeps_focus(app):
    app.goto()
    assert_modal_focus_contract(
        app,
        trigger="Delete account",
        dialog="Delete your account?",
    )
