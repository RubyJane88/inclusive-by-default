"""Run every demo target headless and compare the outcome
with what the talk expects. Exit 1 if any differ."""

import os
import subprocess
import sys

PYTEST = [".venv/bin/pytest"]
PY = [".venv/bin/python"]

# target, command, expected: "pass" or "fail"
TARGETS = [
    ("demo1-before", PYTEST + ["tests/conventional",
                               "--variant", "broken"], "pass"),
    ("demo1-catch", PYTEST + ["tests/a11y/test_signup.py",
                              "--variant", "broken"], "fail"),
    ("demo1-after", PYTEST + ["tests/a11y/test_signup.py",
                              "--variant", "fixed"], "pass"),
    ("demo2-broken", PYTEST + ["tests/a11y/test_dialog.py",
                               "--variant", "broken",
                               "--show-keys"], "fail"),
    ("demo2-fixed", PYTEST + ["tests/a11y/test_dialog.py",
                              "--variant", "fixed",
                              "--show-keys"], "pass"),
    ("demo3-axe", PYTEST + ["tests/axe_only",
                            "--variant", "hollow"], "pass"),
    ("demo3-names", PYTEST + ["tests/a11y/test_names.py",
                              "--variant", "hollow"], "fail"),
    ("demo3-after", PYTEST + ["tests/a11y/test_names.py",
                              "--variant", "fixed"], "pass"),
    ("all-a11y-fixed", PYTEST + ["tests/a11y",
                                 "--variant", "fixed"], "pass"),
    ("meta", PYTEST + ["tests/meta"], "pass"),
    ("snapshot", PY + ["scripts/show_snapshot.py"], "pass"),
    ("incomplete", PY + ["scripts/show_incomplete.py"],
     "pass"),
]


def main():
    env = dict(os.environ)
    mismatches = 0
    print(f"{'target':<16}{'expected':<10}{'actual':<10}")
    for name, cmd, expected in TARGETS:
        done = subprocess.run(cmd, capture_output=True,
                              env=env, check=False)
        actual = "pass" if done.returncode == 0 else "fail"
        # A failure only counts if it is a teaching message,
        # not a crash or a timeout.
        if actual == "fail" and b"Expected:" not in done.stdout:
            actual = "crash"
        mark = "ok" if actual == expected else "MISMATCH"
        mismatches += actual != expected
        print(f"{name:<16}{expected:<10}{actual:<10}{mark}")
    print(f"\n{len(TARGETS) - mismatches} of {len(TARGETS)}"
          " targets behaved as expected")
    sys.exit(1 if mismatches else 0)


if __name__ == "__main__":
    main()
