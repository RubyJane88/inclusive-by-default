"""Print what axe says about text over a gradient.
It is neither a pass nor a violation. For talk slide 21.
Runs with the dialog closed: an open modal makes the page
behind inert, and axe then skips it."""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from framework.axe import run_axe


def main():
    variant = sys.argv[1] if len(sys.argv) > 1 else "fixed"
    url = (ROOT / "app" / variant / "index.html").as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chromium")
        page = browser.new_page()
        page.goto(url)
        results = run_axe(page, rules=["color-contrast"])
        browser.close()
    print(f"axe {results['testEngine']['version']},"
          f" color-contrast, {variant}")
    for kind in ("violations", "incomplete"):
        for item in results[kind]:
            for node in item["nodes"]:
                target = " ".join(map(str, node["target"]))
                print(f"  {kind}: {target}")
                for check in node["any"]:
                    print(f"    {check['message']}")
    print(f"  passes: {sum(len(i['nodes']) for i in results['passes'])} elements")


if __name__ == "__main__":
    main()
