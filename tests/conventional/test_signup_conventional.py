"""A conventional suite: CSS selectors, no accessibility
checks. It proves the clicks work, not that anyone without
a mouse can use the page."""

from playwright.sync_api import expect


def test_signup_succeeds(page):
    page.goto("")
    page.fill("#email", "ada@example.com")
    page.fill("#name", "Ada Lovelace")
    page.click("#save")
    expect(page.locator("#status")).to_have_text(
        "Account created"
    )


def test_signup_rejects_bad_email(page):
    page.goto("")
    page.fill("#email", "not-an-email")
    page.click("#save")
    expect(page.locator("#email-error")).not_to_be_empty()
