# Demo targets. Browsers live in .pw-browsers/ so the repo
# runs offline once set up.
export PLAYWRIGHT_BROWSERS_PATH := $(CURDIR)/.pw-browsers
PY := .venv/bin/python
PYTEST := .venv/bin/pytest
HEADED := --headed --slowmo 400 --show-keys

.PHONY: setup serve demo1-before demo1-catch demo1-after \
	demo2-broken demo2-fixed demo3-axe demo3-names \
	demo3-after snapshot incomplete meta check lint

setup:
	python3 -m venv .venv
	.venv/bin/pip install -r requirements.txt
	.venv/bin/playwright install chromium

# Open http://localhost:8000/broken/ (or fixed, hollow)
# in Safari for VoiceOver recording.
serve:
	$(PY) -m http.server 8000 --bind 127.0.0.1 -d app

# Demo 1: green tests, broken page
demo1-before:
	$(PYTEST) tests/conventional --variant broken

demo1-catch:
	-$(PYTEST) tests/a11y/test_signup.py --variant broken

demo1-after:
	$(PYTEST) tests/a11y/test_signup.py --variant fixed

# Demo 2: what axe can't see (headed, slowed, keys shown)
demo2-broken:
	-$(PYTEST) tests/a11y/test_dialog.py --variant broken $(HEADED)

demo2-fixed:
	$(PYTEST) tests/a11y/test_dialog.py --variant fixed $(HEADED)

# Demo 3: names that mean nothing
demo3-axe:
	$(PYTEST) tests/axe_only --variant hollow

demo3-names:
	-$(PYTEST) tests/a11y/test_names.py --variant hollow

demo3-after:
	$(PYTEST) tests/a11y/test_names.py --variant fixed

# Slide assets
snapshot:
	$(PY) scripts/show_snapshot.py

incomplete:
	$(PY) scripts/show_incomplete.py

# Confidence
meta:
	$(PYTEST) tests/meta

check:
	$(PY) scripts/check.py

lint:
	.venv/bin/ruff check framework tests conftest.py scripts starter
