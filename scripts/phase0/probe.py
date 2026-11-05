"""Phase 0 probe. Checks the brief's predictions before the
framework is built. Prints raw observations, asserts nothing.

Usage: python scripts/phase0/probe.py [--headed]
"""

import functools
import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
AXE = ROOT / "framework" / "vendor" / "axe.min.js"
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
VARIANTS = ["broken", "fixed", "hollow"]

ACTIVE_JS = """() => {
  const el = document.activeElement;
  const dlg = document.getElementById('confirm');
  if (!el) return {tag: null};
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    text: (el.getAttribute('aria-label')
           || el.textContent || '').trim().slice(0, 30),
    inDialog: dlg ? dlg.contains(el) : null,
    hasFocus: document.hasFocus(),
  };
}"""


def serve():
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=str(ROOT / "app"),
    )
    http.server.SimpleHTTPRequestHandler.log_message = (
        lambda *a: None
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), handler
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def run_axe(page, rules=None):
    page.add_script_tag(path=str(AXE))
    opts = {"runOnly": {"type": "tag", "values": TAGS}}
    if rules:
        opts = {"runOnly": {"type": "rule", "values": rules}}
    return page.evaluate(
        "opts => axe.run(document, opts)", opts
    )


def summarize(results, label):
    print(f"\n--- {label}  (axe {results['testEngine']['version']})")
    for kind in ("violations", "incomplete"):
        items = results[kind]
        print(f"  {kind}: {len(items)}")
        for v in items:
            nodes = v["nodes"]
            print(f"    {v['id']} [{v.get('impact')}] "
                  f"nodes={len(nodes)}")
            for n in nodes[:4]:
                target = " ".join(map(str, n["target"]))
                msg = (n.get("failureSummary") or "").replace(
                    "\n", " | ")
                if kind == "incomplete":
                    any_msgs = [c.get("message") for c in n["any"]]
                    msg = "; ".join(m for m in any_msgs if m)
                print(f"      {target}: {msg[:160]}")


def axe_section(page, base):
    print("\n=== Items 1, 2, 3, 5: axe per variant")
    for v in VARIANTS:
        page.goto(f"{base}/{v}/")
        summarize(run_axe(page), f"{v}, dialog closed")
        page.click("#delete")
        page.wait_for_timeout(200)
        summarize(run_axe(page), f"{v}, dialog open")


def trace_focus(page, base, variant, presses):
    page.goto(f"{base}/{variant}/")
    page.focus("#delete")
    page.keyboard.press("Enter")
    page.wait_for_timeout(200)
    print(f"\n--- {variant}: after Enter on trigger")
    print("   ", page.evaluate(ACTIVE_JS))
    for key in presses:
        page.keyboard.press(key)
        page.wait_for_timeout(100)
        print(f"    {key:<10}", page.evaluate(ACTIVE_JS))
    open_ = page.evaluate(
        "() => { const d = document.getElementById('confirm');"
        " return d.open ?? d.offsetParent !== null; }"
    )
    print(f"    dialog still open: {open_}")


def focus_section(page, base):
    print("\n=== Item 4: focus through the dialog")
    tabs = ["Tab"] * 6
    back = ["Shift+Tab"] * 6
    for v in ("fixed", "broken"):
        trace_focus(page, base, v, tabs + back + ["Escape"])
        # Close by button to observe focus return on close.
        print(f"--- {v}: close via Cancel button, then active:")
        page.goto(f"{base}/{v}/")
        page.focus("#delete")
        page.keyboard.press("Enter")
        page.wait_for_timeout(100)
        page.click("#cancel")
        page.wait_for_timeout(100)
        print("   ", page.evaluate(ACTIVE_JS))


def placeholder_probe(page):
    print("\n=== Extra: does axe accept placeholder as a label?")
    page.set_content(
        '<html lang="en"><title>t</title><main>'
        '<input type="email" placeholder="Email"></main></html>'
    )
    res = run_axe(page, rules=["label"])
    print("  violations:", [v["id"] for v in res["violations"]])
    print("  passes:", [p["id"] for p in res["passes"]])
    name = page.get_by_role("textbox", name="Email").count()
    print("  get_by_role('textbox', name='Email') count:", name)


def main():
    headed = "--headed" in sys.argv
    server = serve()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        page = browser.new_page()
        print("Playwright Chromium", browser.version,
              "headed" if headed else "headless")
        if not headed:
            axe_section(page, base)
            placeholder_probe(page)
        focus_section(page, base)
        browser.close()
    server.shutdown()
    _ = json


if __name__ == "__main__":
    main()
