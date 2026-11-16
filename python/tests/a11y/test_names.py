"""Demo 3: names that exist and say nothing.
axe checks that a name is there. These check that it
means something."""

from framework.helpers import assert_names_meaningful


def test_buttons_have_meaningful_names(app):
    app.goto()
    # Open the dialog so its close button is checked too.
    app.button("Delete account").click()
    assert_names_meaningful(app, "button")


def test_images_have_meaningful_names(app):
    app.goto()
    assert_names_meaningful(app, "img")
