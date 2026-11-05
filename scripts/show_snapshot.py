"""Print what assistive technology, and an agent using
Playwright MCP, gets from the signup area of broken and
fixed. For talk slide 24."""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REGIONS = ["header", "#signup"]


def snapshot(page, variant):
    url = (ROOT / "app" / variant / "index.html").as_uri()
    page.goto(url)
    lines = []
    for region in REGIONS:
        tree = page.locator(region).aria_snapshot()
        lines += [ln for ln in tree.splitlines()
                  if not ln.strip().startswith("- img")]
    return [_drop_empty_colon(lines, i)
            for i in range(len(lines))]


def _drop_empty_colon(lines, i):
    # "- button:" whose only child was an icon reads as
    # "- button" once the icon line is removed.
    line = lines[i]
    nxt = lines[i + 1] if i + 1 < len(lines) else ""
    indent = len(line) - len(line.lstrip())
    has_child = len(nxt) - len(nxt.lstrip()) > indent
    if line.endswith(":") and not has_child:
        return line[:-1]
    return line


def main():
    variants = sys.argv[1:] or ["broken", "fixed"]
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chromium")
        page = browser.new_page()
        for variant in variants:
            print(f"== {variant}")
            print("\n".join(snapshot(page, variant)))
        browser.close()


if __name__ == "__main__":
    main()
