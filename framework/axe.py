"""Thin wrapper over the vendored axe-core file."""

from pathlib import Path

from framework.messages import AXE_FIX, expected_found_fix

AXE_JS = Path(__file__).parent / "vendor" / "axe.min.js"
WCAG_TAGS = [
    "wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa",
]
# Recording aids are not part of the app under test.
EXCLUDE = [["#key-overlay"]]


def run_axe(page, rules=None):
    """Run axe on the page. Returns axe's result dict."""
    if not page.evaluate("() => 'axe' in window"):
        page.add_script_tag(path=str(AXE_JS))
    only = {"type": "tag", "values": WCAG_TAGS}
    if rules:
        only = {"type": "rule", "values": rules}
    return page.evaluate(
        "([ctx, opts]) => axe.run(ctx, opts)",
        [{"exclude": EXCLUDE}, {"runOnly": only}],
    )


def violations_report(results):
    """One line per failing rule: rule, where, fix."""
    rows = [_row(v) for v in results["violations"]]
    version = results["testEngine"]["version"]
    return expected_found_fix(
        "no WCAG A or AA failures that axe can detect",
        f"{len(rows)} rules fail (rule, where, fix):\n"
        + "\n".join(rows),
        "the change on each line. Rule details: "
        f"dequeuniversity.com/rules/axe/{version[:4]}",
    )


def _row(violation):
    nodes = violation["nodes"]
    where = " ".join(map(str, nodes[0]["target"]))
    if len(nodes) > 1:
        where += f" +{len(nodes) - 1}"
    fix = AXE_FIX.get(violation["id"], violation["help"])
    if violation["id"] == "color-contrast":
        fix = fix.format(need=_contrast(nodes[0]))
    return f"  {violation['id']:<15} {where:<26} {fix}"


def _contrast(node):
    data = node["any"][0]["data"]
    need = data["expectedContrastRatio"]
    return f"{need} (now {data['contrastRatio']}:1)"
