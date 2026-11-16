# Demo site

A static site that shows the three demos and the code to copy. It is
built from this repo, so it cannot drift from the code.

| File | What it does |
|---|---|
| `capture.py` | Runs each demo's tests and records the real output in `outputs.json`. |
| `outputs.json` | The recorded output, with the date and tool versions. |
| `template.html` | The page. Placeholders pull in recorded output and repo files. |
| `build.py` | Fills the template and copies `app/` and axe-core into `_site/`. Standard library only. |
| `assets/` | Stylesheet, script and icon. |

## Commands

Run these from `python/`:

```
make site-capture   # after any change to app/, the framework or the tests
make site           # build ../_site
make site-serve     # build, then preview at http://localhost:8080
```

Commit `outputs.json` after `make site-capture`. Publishing does not
run the tests; it only runs `python3 site/build.py`.

## Publishing

`.github/workflows/pages.yml` builds the site and publishes it with
GitHub Pages on every merge to `main`. It runs `python3 site/build.py`
and publishes `_site`. It does not run the tests.

The site is at https://rubyjane88.github.io/inclusive-by-default/.

`netlify.toml` at the repo root does the same for Netlify. Netlify's
free plan adds its own badge to every page, including the demo pages,
which adds keyboard stops to them.

## What is live and what is recorded

- The broken, fixed and hollow pages are live. Visitors can use them by
  keyboard or with a screen reader.
- The "Run axe" buttons run axe-core in the visitor's browser.
- The pytest output is recorded, and the page says when and with which
  versions.
