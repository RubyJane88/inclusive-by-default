"""Build the demo site into _site/.

Standard library only, so it runs on Netlify with no
install step:  python3 site/build.py

It fills site/template.html with
- real test output recorded by site/capture.py,
- code read straight from the repo's files,
and copies the three demo pages and axe-core next to it.
"""

import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = ROOT / "_site"
VENDOR = ROOT / "python" / "framework" / "vendor"
PLACEHOLDER = re.compile(r"\{\{(\w+):([^}]+)\}\}")


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def starter_blocks():
    """Code blocks in STARTER.md, keyed by the heading
    they sit under."""
    blocks, heading, inside, buf = {}, None, False, []
    for line in read("python/STARTER.md").splitlines():
        if line.lstrip().startswith("```"):
            if inside:
                blocks.setdefault(heading, []).append(
                    "\n".join(buf)
                )
                buf = []
            inside = not inside
        elif inside:
            buf.append(line)
        elif line.startswith("#"):
            heading = line.lstrip("# ").strip()
    return blocks


def dedent(text):
    lines = text.splitlines()
    pad = min(
        (len(x) - len(x.lstrip()) for x in lines if x.strip()),
        default=0,
    )
    return "\n".join(x[pad:] for x in lines)


def resolver(outputs, blocks):
    def resolve(match):
        kind, arg = match.group(1), match.group(2).strip()
        if kind == "out":
            return html.escape(outputs["targets"][arg]["output"])
        if kind == "cmd":
            return html.escape(outputs["targets"][arg]["command"])
        if kind == "file":
            return html.escape(read(arg).rstrip())
        if kind == "starter":
            heading, _, index = arg.partition("|")
            block = blocks[heading.strip()][int(index or 0)]
            return html.escape(dedent(block))
        if kind == "meta":
            if arg == "captured":
                return html.escape(outputs["captured"])
            return html.escape(outputs["versions"][arg])
        raise KeyError(f"unknown placeholder {match.group(0)}")
    return resolve


def main():
    outputs = json.loads(read("site/outputs.json"))
    template = read("site/template.html")
    try:
        page = PLACEHOLDER.sub(
            resolver(outputs, starter_blocks()), template
        )
    except (KeyError, IndexError) as err:
        sys.exit(f"build failed: missing content for {err}")

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    (OUT / "index.html").write_text(page, encoding="utf-8")
    shutil.copytree(SITE / "assets", OUT / "assets")
    shutil.copytree(ROOT / "app", OUT / "app")
    (OUT / "vendor").mkdir()
    for name in ("axe.min.js", "axe-LICENSE"):
        shutil.copy(VENDOR / name, OUT / "vendor" / name)
    shutil.copy(
        ROOT / "python" / "starter" / "conftest.py",
        OUT / "vendor" / "conftest.py",
    )
    shutil.copy(
        ROOT / "typescript" / "starter" / "a11y-test.ts",
        OUT / "vendor" / "a11y-test.ts",
    )
    print(f"built {OUT.relative_to(ROOT)}/ "
          f"(output captured {outputs['captured']})")


if __name__ == "__main__":
    main()
