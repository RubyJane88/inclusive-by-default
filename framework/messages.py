"""Failure messages. Every failure reads the same way:
what was required, what is there, and one fix."""

# How to fix a missing element, by role.
ROLE_FIX = {
    "textbox": (
        'Connect the visible text with <label for="...">'
        "{name}</label>"
    ),
    "button": "Use a real <button>{name}</button>",
    "img": 'Add alt="{name}" to the image',
    "dialog": "Use <dialog> with a heading named {name}",
    "heading": "Mark up the text as a heading, e.g. <h2>",
    "status": 'Add role="status" to the message area',
}

# How to fix an axe rule failure, by rule id.
AXE_FIX = {
    "button-name": "give the button text, or aria-label",
    "image-alt": "add alt text that describes the image",
    "label": 'connect text with <label for="...">',
    "color-contrast": "darken the text to at least {need}",
    "html-has-lang": 'add lang="en" to <html>',
    "document-title": "add a <title> that names the page",
    "link-name": "give the link text that says where it goes",
}


# The five steps of the modal focus contract.
FOCUS_STEPS = {
    1: (
        "the dialog opens",
        "use <dialog> with a heading that names it",
    ),
    2: (
        "focus moves into the dialog",
        "use <dialog> and open it with showModal()",
    ),
    3: (
        "Tab and Shift+Tab stay inside the dialog",
        "showModal() makes the page behind inert",
    ),
    4: (
        "Escape closes the dialog",
        "use <dialog>: Escape closes it natively",
    ),
    5: (
        "focus returns to the button that opened it",
        "use <dialog>: closing it restores focus",
    ),
}

# How to fix a weak name, by role.
NAME_FIX = {
    "button": (
        "name each button by its action, e.g."
        ' aria-label="Settings"'
    ),
    "img": (
        "describe what each image shows, e.g."
        ' alt="Project dashboard"'
    ),
    "link": (
        'say where each link goes, e.g. "Pricing plans"'
    ),
}


def expected_found_fix(expected, found, fix):
    return (
        f"Expected: {expected}\n"
        f"Found:    {found}\n"
        f"Fix:      {fix}"
    )


def missing_element(role, name, found):
    fix = ROLE_FIX.get(role, "Give the element a role and name")
    return expected_found_fix(
        f'a {_role_word(role)} named "{name}"',
        found,
        fix.format(name=name),
    )


def focus_step_failed(step, found):
    what, fix = FOCUS_STEPS[step]
    return expected_found_fix(
        f"step {step} of 5: {what}", found, fix
    )


def weak_names(role, problems):
    """problems: list of (name, where, reason)."""
    count = len(problems)
    plural = _plural(role, count)
    weak = "a weak name" if count == 1 else "weak names"
    rows = [
        f'            {_quote(n):<12} {w:<10} {r}'
        for n, w, r in problems
    ]
    return expected_found_fix(
        f"every {_role_word(role)} has a name that says"
        " what it is",
        f"{count} {plural} with {weak}:\n"
        + "\n".join(rows),
        NAME_FIX.get(role, "give each a specific name"),
    )


def _quote(name):
    return "(no name)" if name is None else f'"{name}"'


def found_for_role(role, names, wanted, text_on_page):
    """Describe what the page has for a role, e.g.
    '2 textboxes, none named'."""
    found = _count_phrase(role, names)
    if text_on_page:
        found += (
            f'\n          The text "{wanted}" is on the page'
            f" but does not name any {_role_word(role)}"
        )
    return found


def _count_phrase(role, names):
    plural = _plural(role, len(names))
    if not names:
        return f"no {plural} on the page"
    unnamed = names.count(None)
    named = [f'"{n}"' for n in names if n is not None]
    if not named:
        return f"{len(names)} {plural}, none named"
    parts = named + ([f"{unnamed} unnamed"] if unnamed else [])
    return f"{len(names)} {plural}: " + ", ".join(parts)


def _plural(role, count):
    word = _role_word(role)
    if count == 1:
        return word
    return word + ("es" if word.endswith("x") else "s")


def _role_word(role):
    return "image" if role == "img" else role
