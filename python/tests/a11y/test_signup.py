"""Demo 1: the signup flow, reached the way assistive
technology reaches it. axe runs after every test."""

from playwright.sync_api import expect

ERROR = "Enter an email address, like name@example.com"


def test_email_field_is_labelled(app):
    app.goto()
    email = app.textbox("Email")
    email.fill("ada@example.com")
    expect(email).to_have_value("ada@example.com")


def test_name_field_is_labelled(app):
    app.goto()
    name = app.textbox("Name")
    name.fill("Ada Lovelace")
    expect(name).to_have_value("Ada Lovelace")


def test_submit_is_a_named_button(app):
    app.goto()
    app.button("Create account").press("Enter")
    expect(app.textbox("Email")).to_have_accessible_description(
        ERROR
    )


def test_page_loads_clean(app):
    # Nothing to do here: the axe check after the test
    # reports language, title, alt text and contrast.
    app.goto()
