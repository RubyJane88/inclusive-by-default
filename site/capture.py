"""Record the real output of every demo target into
site/outputs.json. The site shows these outputs; nothing
on it is typed by hand.

Run from python/ with the project's virtualenv:
    make site-capture
"""

import datetime
import json
import os
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PYTHON_DIR = ROOT / "python"
OUT = ROOT / "site" / "outputs.json"

sys.path.insert(0, str(PYTHON_DIR / "scripts"))
from check import TARGETS  # noqa: E402  same commands as make check

# Targets the site shows.
SHOWN = {
    "demo1-before", "demo1-catch", "demo1-after",
    "demo2-broken", "demo2-fixed",
    "demo3-axe", "demo3-names", "demo3-after",
    "snapshot", "incomplete",
}


def run(cmd, env):
    done = subprocess.run(
        cmd, cwd=PYTHON_DIR, env=env, capture_output=True,
        text=True, check=False,
    )
    text = (done.stdout + done.stderr).rstrip()
    lines = [line.rstrip() for line in text.splitlines()]
    return done.returncode, "\n".join(lines)


def chromium_version(env):
    code = (
        "from playwright.sync_api import sync_playwright\n"
        "with sync_playwright() as p:\n"
        "    b = p.chromium.launch(channel='chromium')\n"
        "    print(b.version)\n"
        "    b.close()\n"
    )
    _, out = run([".venv/bin/python", "-c", code], env)
    return out.strip().splitlines()[-1]


def axe_version():
    js = PYTHON_DIR / "framework" / "vendor" / "axe.min.js"
    head = js.read_text(encoding="utf-8")[:200]
    return head.split("axe v")[1].split()[0]


def main():
    env = dict(os.environ)
    env["PLAYWRIGHT_BROWSERS_PATH"] = str(
        PYTHON_DIR / ".pw-browsers"
    )
    targets = {}
    for name, cmd, expected in TARGETS:
        if name not in SHOWN:
            continue
        code, output = run(cmd, env)
        actual = "pass" if code == 0 else "fail"
        if actual != expected:
            sys.exit(f"{name}: expected {expected}, got {actual}")
        if str(ROOT) in output or "/Users/" in output:
            sys.exit(f"{name}: output contains a local path")
        targets[name] = {
            "command": " ".join(cmd).replace(".venv/bin/", ""),
            "result": actual,
            "output": output,
        }
        print(f"{name:<14} {actual}")
    data = {
        "captured": datetime.date.today().isoformat(),
        "versions": {
            "axe": axe_version(),
            "playwright": version("playwright"),
            "pytest": version("pytest"),
            "chromium": chromium_version(env),
            "python": ".".join(map(str, sys.version_info[:2])),
        },
        "targets": targets,
    }
    OUT.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
